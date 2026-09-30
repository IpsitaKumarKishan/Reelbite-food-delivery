import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
import Item from "../models/item.model.js"
import Coupon from "../models/coupon.model.js"
import { sendDeliveryOtpMail } from "../utils/mail.js"
import RazorPay from "razorpay"
import dotenv from "dotenv"
import { computeOrderSplit } from "../utils/orderSplit.js"

dotenv.config()
let instance = new RazorPay({
    key_id: process.env.RAZORPAY_KEY_ID,
    key_secret: process.env.RAZORPAY_KEY_SECRET,
});

export const placeOrder = async (req, res) => {
    try {
        const { cartItems, paymentMethod, deliveryAddress, totalAmount, couponCode, contactMobile } = req.body
        if (cartItems.length == 0 || !cartItems) {
            return res.status(400).json({ message: "cart is empty" })
        }
        if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
            return res.status(400).json({ message: "send complete deliveryAddress" })
        }

        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }

        const rawMobile = contactMobile || req.body.mobile || user.mobile || ""
        const cleanMobile = String(rawMobile).replace(/\D/g, "")
        if (!cleanMobile || cleanMobile.length < 10 || cleanMobile === "0000000000") {
            return res.status(400).json({
                message: "A valid 10-digit contact mobile number is mandatory so our delivery partner can contact you."
            })
        }

        // If user profile has placeholder or no number, save the valid contact number
        if (!user.mobile || user.mobile === "0000000000" || user.mobile.length < 10) {
            user.mobile = cleanMobile
            await user.save()
        }

        // Security: Verify dish prices against database (Anti-price-tampering)
        const itemIds = cartItems.map(i => i.id || i._id).filter(Boolean);
        if (itemIds.length !== cartItems.length) {
            return res.status(400).json({ message: "Invalid item reference in cart" });
        }

        const dbItems = await Item.find({ _id: { $in: itemIds } }).populate("shop");
        if (dbItems.length !== itemIds.length) {
            return res.status(400).json({ message: "One or more dishes in your cart are no longer available" });
        }

        const dbItemMap = new Map();
        dbItems.forEach(item => dbItemMap.set(item._id.toString(), item));

        const groupItemsByShop = {};

        for (const item of cartItems) {
            const rawId = String(item.id || item._id || "");
            const dbItem = dbItemMap.get(rawId);
            if (!dbItem) {
                return res.status(400).json({ message: `Item ${item.name || rawId} not found` });
            }
            const verifiedPrice = Number(dbItem.price);
            const verifiedQty = Math.max(1, Number(item.quantity) || 1);
            const shopId = (dbItem.shop?._id || dbItem.shop).toString();

            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = [];
            }

            groupItemsByShop[shopId].push({
                id: dbItem._id,
                _id: dbItem._id,
                name: dbItem.name,
                price: verifiedPrice,
                quantity: verifiedQty,
                image: dbItem.image,
                shop: shopId
            });
        }

        // Business rule: Enforce single-restaurant orders to ensure clear delivery routing and accurate driver payout
        if (Object.keys(groupItemsByShop).length > 1) {
            return res.status(400).json({
                message: "Items in your cart belong to multiple restaurants. Orders can only be placed from one restaurant at a time."
            });
        }

        const shopCommissionRates = {}
        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            const shop = await Shop.findById(shopId).populate("owner")
            if (!shop) {
                throw new Error(`Shop ${shopId} not found`)
            }
            shopCommissionRates[shop._id.toString()] = shop.commissionRate || 20;
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + i.price * i.quantity, 0)
            const rate = shop.commissionRate || 20;
            const commissionAmount = Math.round((subtotal * (rate / 100)) * 100) / 100;
            const restaurantPayout = Math.round((subtotal - commissionAmount) * 100) / 100;

            return {
                shop: shop._id,
                owner: shop.owner._id,
                subtotal,
                commissionRate: rate,
                commissionAmount,
                restaurantPayout,
                settlementStatus: "unsettled",
                shopOrderItems: items.map((i) => ({
                    item: i.id,
                    price: i.price,
                    quantity: i.quantity,
                    name: i.name
                }))
            }
        }
        ))

        const calculatedSplit = computeOrderSplit({ shopOrders }, shopCommissionRates);

        // Coupon discount validation
        let couponData = { code: null, discountAmount: 0 };
        let matchedCoupon = null;
        if (couponCode && typeof couponCode === "string" && couponCode.trim()) {
            const foundCoupon = await Coupon.findOne({ code: couponCode.trim().toUpperCase(), isActive: true });
            if (foundCoupon && foundCoupon.validUntil >= new Date()) {
                const meetsMin = !foundCoupon.minOrderValue || calculatedSplit.subtotal >= foundCoupon.minOrderValue;
                const timesUsed = foundCoupon.usedBy?.filter(u => u.user && u.user.toString() === req.userId.toString()).length || 0;
                const withinLimit = timesUsed < (foundCoupon.usageLimitPerUser || 1);

                if (meetsMin && withinLimit) {
                    let discount = 0;
                    if (foundCoupon.discountType === "flat") {
                        discount = Math.min(foundCoupon.discountValue, calculatedSplit.subtotal);
                    } else if (foundCoupon.discountType === "percentage") {
                        const calc = Math.round((calculatedSplit.subtotal * foundCoupon.discountValue) / 100);
                        discount = foundCoupon.maxDiscount ? Math.min(calc, foundCoupon.maxDiscount) : calc;
                    }
                    discount = Math.min(discount, calculatedSplit.subtotal);
                    couponData = { code: foundCoupon.code, discountAmount: discount };
                    matchedCoupon = foundCoupon;
                }
            }
        }

        const payableTotal = Math.max(0, (calculatedSplit.subtotal - couponData.discountAmount) + calculatedSplit.deliveryFee + calculatedSplit.platformFee);

        if (paymentMethod == "online") {
            const razorOrder = await instance.orders.create({
                amount: Math.round(payableTotal * 100),
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            })
            const newOrder = await Order.create({
                user: req.userId,
                paymentMethod,
                deliveryAddress,
                contactMobile: cleanMobile,
                totalAmount: payableTotal,
                subtotal: calculatedSplit.subtotal,
                deliveryFee: calculatedSplit.deliveryFee,
                platformFee: calculatedSplit.platformFee,
                commissionAmount: calculatedSplit.commissionAmount,
                restaurantPayout: calculatedSplit.restaurantPayout,
                deliveryPartnerPayout: calculatedSplit.deliveryPartnerPayout,
                platformRevenue: calculatedSplit.platformRevenue,
                settlementStatus: "unsettled",
                shopOrders: calculatedSplit.shopOrders,
                coupon: couponData,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            // Note: For online payments, coupon is marked as used only after payment is verified in verifyPayment

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
            })

        }

        const newOrder = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            contactMobile: cleanMobile,
            totalAmount: payableTotal,
            subtotal: calculatedSplit.subtotal,
            deliveryFee: calculatedSplit.deliveryFee,
            platformFee: calculatedSplit.platformFee,
            commissionAmount: calculatedSplit.commissionAmount,
            restaurantPayout: calculatedSplit.restaurantPayout,
            deliveryPartnerPayout: calculatedSplit.deliveryPartnerPayout,
            platformRevenue: calculatedSplit.platformRevenue,
            settlementStatus: "unsettled",
            shopOrders: calculatedSplit.shopOrders,
            coupon: couponData
        })

        if (matchedCoupon) {
            matchedCoupon.usedBy.push({ user: req.userId, order: newOrder._id });
            await matchedCoupon.save();
        }

        await newOrder.populate("shopOrders.shopOrderItems.item", "name image price")
        await newOrder.populate("shopOrders.shop", "name")
        await newOrder.populate("shopOrders.owner", "name socketId")
        await newOrder.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            newOrder.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: newOrder._id,
                        paymentMethod: newOrder.paymentMethod,
                        user: newOrder.user,
                        shopOrders: shopOrder,
                        createdAt: newOrder.createdAt,
                        deliveryAddress: newOrder.deliveryAddress,
                        payment: newOrder.payment
                    })
                }
            });
        }

        await User.findByIdAndUpdate(req.userId, { cart: [] });

        return res.status(201).json(newOrder)
    } catch (error) {
        const isClientError = error.message && error.message.includes("not found");
        return res.status(isClientError ? 400 : 500).json({ message: `place order error: ${error.message || error}` })
    }
}

export const verifyPayment = async (req, res) => {
    try {
        const { razorpay_payment_id, orderId } = req.body
        const payment = await instance.payments.fetch(razorpay_payment_id)
        if (!payment || payment.status != "captured") {
            return res.status(400).json({ message: "payment not captured" })
        }
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        const calculatedSplit = computeOrderSplit(order);

        order.payment = true
        order.razorpayPaymentId = razorpay_payment_id
        order.subtotal = calculatedSplit.subtotal;
        order.deliveryFee = calculatedSplit.deliveryFee;
        order.platformFee = calculatedSplit.platformFee;
        order.commissionAmount = calculatedSplit.commissionAmount;
        order.restaurantPayout = calculatedSplit.restaurantPayout;
        order.deliveryPartnerPayout = calculatedSplit.deliveryPartnerPayout;
        order.platformRevenue = calculatedSplit.platformRevenue;
        order.settlementStatus = calculatedSplit.settlementStatus;
        order.shopOrders = calculatedSplit.shopOrders;

        await order.save()
        await User.findByIdAndUpdate(req.userId, { cart: [] });

        // Phase 2.3: Record coupon usage atomically now that payment is confirmed captured
        if (order.coupon?.code) {
            await Coupon.updateOne(
                { code: order.coupon.code.trim().toUpperCase() },
                { $push: { usedBy: { user: req.userId, order: order._id } } }
            );
        }

        await order.populate("shopOrders.shopOrderItems.item", "name image price")
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.owner", "name socketId")
        await order.populate("user", "name email mobile")

        const io = req.app.get('io')

        if (io) {
            order.shopOrders.forEach(shopOrder => {
                const ownerSocketId = shopOrder.owner.socketId
                if (ownerSocketId) {
                    io.to(ownerSocketId).emit('newOrder', {
                        _id: order._id,
                        paymentMethod: order.paymentMethod,
                        user: order.user,
                        shopOrders: shopOrder,
                        createdAt: order.createdAt,
                        deliveryAddress: order.deliveryAddress,
                        payment: order.payment
                    })
                }
            });
        }


        return res.status(200).json(order)

    } catch (error) {
        return res.status(500).json({ message: `verify payment  error ${error}` })
    }
}



export const getMyOrders = async (req, res) => {
    try {
        const user = await User.findById(req.userId)
        if (!user) {
            return res.status(404).json({ message: "User not found" })
        }
        const page = req.query.page ? parseInt(req.query.page) : null
        const limit = req.query.limit ? parseInt(req.query.limit) : null
        const skip = page && limit ? (page - 1) * limit : 0

        if (user.role == "user") {
            let query = Order.find({ user: req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("shopOrders.owner", "name email mobile")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .lean()

            if (page && limit) {
                const [orders, total] = await Promise.all([
                    query.skip(skip).limit(limit),
                    Order.countDocuments({ user: req.userId })
                ])
                return res.status(200).json({ data: orders, page, totalPages: Math.ceil(total / limit), total })
            }

            const orders = await query
            return res.status(200).json(orders)
        } else if (user.role == "owner") {
            let query = Order.find({ "shopOrders.owner": req.userId })
                .sort({ createdAt: -1 })
                .populate("shopOrders.shop", "name")
                .populate("user")
                .populate("shopOrders.shopOrderItems.item", "name image price")
                .populate("shopOrders.assignedDeliveryBoy", "fullName mobile")
                .lean()

            if (page && limit) {
                const [orders, total] = await Promise.all([
                    query.skip(skip).limit(limit),
                    Order.countDocuments({ "shopOrders.owner": req.userId })
                ])
                const filteredOrders = orders.map((order => ({
                    _id: order._id,
                    paymentMethod: order.paymentMethod,
                    user: order.user,
                    shopOrders: order.shopOrders?.find(o => o.owner?._id?.toString() == req.userId || o.owner?.toString() == req.userId),
                    createdAt: order.createdAt,
                    deliveryAddress: order.deliveryAddress,
                    payment: order.payment
                })))
                return res.status(200).json({ data: filteredOrders, page, totalPages: Math.ceil(total / limit), total })
            }

            const orders = await query
            const filteredOrders = orders.map((order => ({
                _id: order._id,
                paymentMethod: order.paymentMethod,
                user: order.user,
                shopOrders: order.shopOrders?.find(o => o.owner?._id?.toString() == req.userId || o.owner?.toString() == req.userId),
                createdAt: order.createdAt,
                deliveryAddress: order.deliveryAddress,
                payment: order.payment
            })))

            return res.status(200).json(filteredOrders)
        }

        return res.status(200).json([])
    } catch (error) {
        return res.status(500).json({ message: `get User order error ${error}` })
    }
}


export const updateOrderStatus = async (req, res) => {
    try {
        const { orderId, shopId } = req.params
        const { status } = req.body
        const order = await Order.findById(orderId)
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }

        const shop = await Shop.findById(shopId)
        if (!shop) {
            return res.status(404).json({ message: "Shop not found" })
        }

        // Security check: Only the owner of this shop or an admin can update order status
        if (shop.owner.toString() !== req.userId.toString() && req.userRole !== "admin") {
            return res.status(403).json({ message: "Unauthorized: You can only update orders for your own restaurant." })
        }

        const shopOrder = order.shopOrders.find(o => String(o.shop) === String(shopId))
        if (!shopOrder) {
            return res.status(400).json({ message: "Shop order not found in this order" })
        }
        shopOrder.status = status
        let deliveryBoysPayload = []
        if (status == "out of delivery" && !shopOrder.assignment) {
            // Phase 3.2: Target search near restaurant pickup location first, fallback to deliveryAddress
            let searchCoords = null;
            if (shop.location?.coordinates && shop.location.coordinates.length === 2 && (shop.location.coordinates[0] !== 0 || shop.location.coordinates[1] !== 0)) {
                searchCoords = [Number(shop.location.coordinates[0]), Number(shop.location.coordinates[1])];
            } else {
                searchCoords = [Number(order.deliveryAddress.longitude), Number(order.deliveryAddress.latitude)];
            }

            const nearByDeliveryBoys = await User.find({
                role: "deliveryBoy",
                isOnline: true,
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: searchCoords },
                        $maxDistance: 7000
                    }
                }
            })

            const nearByIds = nearByDeliveryBoys.map(b => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["broadcasted", "brodcasted", "completed", "cancelled"] }

            }).distinct("assignedTo")

            const busyIdSet = new Set(busyIds.map(id => String(id)))

            const availableBoys = nearByDeliveryBoys.filter(b => !busyIdSet.has(String(b._id)))
            const candidates = availableBoys.map(b => b._id)

            if (candidates.length == 0) {
                await order.save()
                return res.json({
                    message: "order status updated but there is no available delivery boys"
                })
            }

            const deliveryAssignment = await DeliveryAssignment.create({
                order: order?._id,
                shop: shopOrder.shop,
                shopOrderId: shopOrder?._id,
                broadcastedTo: candidates,
                brodcastedTo: candidates,
                status: "broadcasted"
            })

            shopOrder.assignedDeliveryBoy = deliveryAssignment.assignedTo
            shopOrder.assignment = deliveryAssignment._id
            deliveryBoysPayload = availableBoys.map(b => ({
                id: b._id,
                fullName: b.fullName,
                longitude: b.location.coordinates?.[0],
                latitude: b.location.coordinates?.[1],
                mobile: b.mobile
            }))

            await deliveryAssignment.populate('order')
            await deliveryAssignment.populate('shop')
            const io = req.app.get('io')
            if (io) {
                availableBoys.forEach(boy => {
                    const boySocketId = boy.socketId
                    if (boySocketId) {
                        io.to(boySocketId).emit('newAssignment', {
                            sentTo:boy._id,
                            assignmentId: deliveryAssignment._id,
                            orderId: deliveryAssignment.order._id,
                            shopName: deliveryAssignment.shop.name,
                            deliveryAddress: deliveryAssignment.order.deliveryAddress,
                            items: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId)).shopOrderItems || [],
                            subtotal: deliveryAssignment.order.shopOrders.find(so => so._id.equals(deliveryAssignment.shopOrderId))?.subtotal
                        })
                    }
                });
            }





        }


        await order.save()
        const updatedShopOrder = order.shopOrders.find(o => o.shop == shopId)
        await order.populate("shopOrders.shop", "name")
        await order.populate("shopOrders.assignedDeliveryBoy", "fullName email mobile")
        await order.populate("user", "socketId")

        const io = req.app.get('io')
        if (io) {
            const userSocketId = order.user.socketId
            if (userSocketId) {
                io.to(userSocketId).emit('update-status', {
                    orderId: order._id,
                    shopId: updatedShopOrder.shop._id,
                    shopName: updatedShopOrder.shop?.name || "Restaurant",
                    status: updatedShopOrder.status,
                    userId: order.user._id,
                    timestamp: new Date()
                })
            }
        }



        return res.status(200).json({
            shopOrder: updatedShopOrder,
            assignedDeliveryBoy: updatedShopOrder?.assignedDeliveryBoy,
            availableBoys: deliveryBoysPayload,
            assignment: updatedShopOrder?.assignment?._id

        })



    } catch (error) {
        return res.status(500).json({ message: `order status error ${error}` })
    }
}


export const getDeliveryBoyAssignment = async (req, res) => {
    try {
        const deliveryBoyId = req.userId
        const assignments = await DeliveryAssignment.find({
            $or: [
                { broadcastedTo: deliveryBoyId },
                { brodcastedTo: deliveryBoyId }
            ],
            status: { $in: ["broadcasted", "brodcasted"] }
        })
            .populate("order")
            .populate("shop")

        const formated = assignments.map(a => ({
            assignmentId: a._id,
            orderId: a.order._id,
            shopName: a.shop.name,
            deliveryAddress: a.order.deliveryAddress,
            items: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId)).shopOrderItems || [],
            subtotal: a.order.shopOrders.find(so => so._id.equals(a.shopOrderId))?.subtotal
        }))

        return res.status(200).json(formated)
    } catch (error) {
        return res.status(500).json({ message: `get Assignment error ${error}` })
    }
}


export const acceptOrder = async (req, res) => {
    try {
        const { assignmentId } = req.params

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["broadcasted", "brodcasted", "completed", "cancelled"] }
        })

        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another active order" })
        }

        // Phase 3.3: Atomic acceptance to prevent race condition when multiple drivers accept simultaneously
        const assignment = await DeliveryAssignment.findOneAndUpdate(
            {
                _id: assignmentId,
                status: { $in: ["broadcasted", "brodcasted"] }
            },
            {
                $set: {
                    assignedTo: req.userId,
                    status: "assigned",
                    acceptedAt: new Date()
                }
            },
            { new: true }
        )

        if (!assignment) {
            return res.status(409).json({ message: "This delivery assignment was already accepted by another driver or is no longer available." })
        }

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(404).json({ message: "Order not found" })
        }

        let shopOrder = order.shopOrders.id(assignment.shopOrderId)
        if (shopOrder) {
            shopOrder.assignedDeliveryBoy = req.userId
            await order.save()
        }

        const io = req.app.get("io")
        if (io) {
            io.to(`order_${assignment.order}`).emit("driverAssigned", {
                orderId: assignment.order,
                shopOrderId: assignment.shopOrderId,
                deliveryBoyId: req.userId
            })
        }

        return res.status(200).json({
            message: 'order accepted'
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error.message || error}` })
    }
}



export const getCurrentOrder = async (req, res) => {
    try {
        const assignment = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: "assigned"
        })
            .populate("shop", "name")
            .populate("assignedTo", "fullName email mobile location")
            .populate({
                path: "order",
                populate: [{ path: "user", select: "fullName email location mobile" }]

            })

        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (!assignment.order) {
            return res.status(400).json({ message: "order not found" })
        }

        const shopOrder = assignment.order.shopOrders.find(so => String(so._id) == String(assignment.shopOrderId))

        if (!shopOrder) {
            return res.status(400).json({ message: "shopOrder not found" })
        }

        let deliveryBoyLocation = { lat: null, lon: null }
        if (assignment.assignedTo.location.coordinates.length == 2) {
            deliveryBoyLocation.lat = assignment.assignedTo.location.coordinates[1]
            deliveryBoyLocation.lon = assignment.assignedTo.location.coordinates[0]
        }

        let customerLocation = { lat: null, lon: null }
        if (assignment.order.deliveryAddress) {
            customerLocation.lat = assignment.order.deliveryAddress.latitude
            customerLocation.lon = assignment.order.deliveryAddress.longitude
        }

        return res.status(200).json({
            _id: assignment.order._id,
            user: assignment.order.user,
            contactMobile: assignment.order.contactMobile || assignment.order.user?.mobile || "",
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation,
            assignmentId: assignment._id,
            acceptedAt: assignment.acceptedAt || assignment.createdAt,
            elapsedMinutes: Math.max(0, Math.floor((Date.now() - new Date(assignment.acceptedAt || assignment.createdAt).getTime()) / (60 * 1000))),
            hasActiveOtp: Boolean(shopOrder.deliveryOtp && shopOrder.otpExpires && new Date(shopOrder.otpExpires) > new Date())
        })


    } catch (error) {
        return res.status(500).json({ message: `get current order error: ${error.message || error}` })
    }
}

export const getOrderById = async (req, res) => {
    try {
        const { orderId } = req.params
        const order = await Order.findById(orderId)
            .populate("user")
            .populate({
                path: "shopOrders.shop",
                model: "Shop"
            })
            .populate({
                path: "shopOrders.assignedDeliveryBoy",
                model: "User"
            })
            .populate({
                path: "shopOrders.shopOrderItems.item",
                model: "Item"
            })
            .lean()

        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }
        return res.status(200).json(order)
    } catch (error) {
        return res.status(500).json({ message: `get by id order error ${error}` })
    }
}

export const sendDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId } = req.body
        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return res.status(400).json({ message: "Order not found" })
        }
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "Enter valid order/shopOrderId" })
        }
        const otp = Math.floor(1000 + Math.random() * 9000).toString()
        shopOrder.deliveryOtp = otp
        shopOrder.otpExpires = Date.now() + 5 * 60 * 1000
        await order.save()

        try {
            await sendDeliveryOtpMail(order.user, otp)
        } catch (mailError) {
            console.log("Nodemailer email dispatch error (proceeding with DB OTP):", mailError.message || mailError);
        }

        console.log(`[DELIVERY OTP VIA EMAIL] Email: ${order?.user?.email} | OTP: ${otp}`);

        return res.status(200).json({ 
            message: `OTP sent successfully to email ${order?.user?.email || order?.user?.fullName || 'customer'}`, 
            email: order?.user?.email
        })
    } catch (error) {
        console.error("sendDeliveryOtp error:", error);
        return res.status(500).json({ message: `Delivery OTP error: ${error.message || error}` })
    }
}

export const verifyDeliveryOtp = async (req, res) => {
    try {
        const { orderId, shopOrderId, otp } = req.body
        const order = await Order.findById(orderId).populate("user")
        if (!order) {
            return res.status(400).json({ message: "Order not found" })
        }
        const shopOrder = order.shopOrders.id(shopOrderId)
        if (!shopOrder) {
            return res.status(400).json({ message: "Enter valid order/shopOrderId" })
        }
        if (!shopOrder.deliveryOtp || String(shopOrder.deliveryOtp).trim() !== String(otp).trim() || !shopOrder.otpExpires || shopOrder.otpExpires < Date.now()) {
            return res.status(400).json({ message: "Invalid or Expired OTP" })
        }

        shopOrder.status = "delivered"
        shopOrder.deliveredAt = Date.now()

        // Phase 2.5: Mark COD order as paid on delivery OTP confirmation
        if (order.paymentMethod === "cod") {
            order.payment = true
            order.paidAt = new Date()
        }

        await order.save()

        // Phase 3.5: Preserve delivery assignment history instead of deleting records
        await DeliveryAssignment.updateOne(
            {
                shopOrderId: shopOrder._id,
                order: order._id,
                assignedTo: shopOrder.assignedDeliveryBoy
            },
            {
                $set: {
                    status: "completed",
                    deliveredAt: new Date()
                }
            }
        )

        // Real-time synchronization: notify user and order room
        const io = req.app.get("io")
        if (io) {
            if (order.user?.socketId) {
                io.to(order.user.socketId).emit("update-status", {
                    orderId: order._id,
                    shopId: shopOrder.shop,
                    status: "delivered"
                })
            }
            io.to(`order_${order._id}`).emit("orderDelivered", {
                orderId: order._id,
                shopOrderId: shopOrder._id
            })
        }

        return res.status(200).json({ message: "Order Delivered Successfully!" })

    } catch (error) {
        console.error("verifyDeliveryOtp error:", error);
        return res.status(500).json({ message: `Verify delivery OTP error: ${error.message || error}` })
    }
}

export const getTodayDeliveries=async (req,res) => {
    try {
        const deliveryBoyId=req.userId
        const startsOfDay=new Date()
        startsOfDay.setHours(0,0,0,0)

        const orders=await Order.find({
           "shopOrders.assignedDeliveryBoy":deliveryBoyId,
           "shopOrders.status":"delivered",
           "shopOrders.deliveredAt":{$gte:startsOfDay}
        }).lean()

        let todaysDeliveries=[] 
     
        orders.forEach(order=>{
           order.shopOrders.forEach(shopOrder=>{
               if(shopOrder.assignedDeliveryBoy==deliveryBoyId &&
                   shopOrder.status=="delivered" &&
                   shopOrder.deliveredAt &&
                   new Date(shopOrder.deliveredAt)>=startsOfDay
               ){
                   todaysDeliveries.push(shopOrder)
               }
           })
        })

        let stats={}

        todaysDeliveries.forEach(shopOrder=>{
            const hour=new Date(shopOrder.deliveredAt).getHours()
            stats[hour]=(stats[hour] || 0) + 1
        })

        let formattedStats=Object.keys(stats).map(hour=>({
         hour:parseInt(hour),
         count:stats[hour]   
        }))

        formattedStats.sort((a,b)=>a.hour-b.hour)

        // Delivery earnings: ₹50 flat per completed delivery
        const totalEarning = todaysDeliveries.length * 50

        return res.status(200).json({
            stats: formattedStats,
            totalDeliveriesToday: todaysDeliveries.length,
            totalEarning
        })

    } catch (error) {
        return res.status(500).json({ message: `today deliveries error ${error}` }) 
    }
}

/**
 * POST /api/order/cancel/:orderId
 * Customer cancellation within 120s window or while all shopOrders are pending
 * Automatically initiates Razorpay refund if paid online
 */
export const cancelOrder = async (req, res) => {
    try {
        const { orderId } = req.params;
        const { reason = "Customer requested cancellation" } = req.body;
        const userId = req.userId;

        const order = await Order.findById(orderId)
            .populate("shopOrders.owner", "socketId name")
            .populate("user");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const orderUserId = order.user?._id ? order.user._id.toString() : order.user?.toString();
        if (orderUserId !== userId.toString()) {
            return res.status(403).json({ message: "You are not authorized to cancel this order" });
        }

        if (order.cancellation?.isCancelled) {
            return res.status(400).json({ message: "Order is already cancelled" });
        }

        // Cancellation Window: Allowed within 120s OR if all shop orders are strictly pending
        const placedTime = new Date(order.createdAt).getTime();
        const elapsedSeconds = (Date.now() - placedTime) / 1000;
        const anyStarted = order.shopOrders.some(so => ["preparing", "out of delivery", "delivered"].includes(so.status));

        if (anyStarted && elapsedSeconds > 120) {
            return res.status(400).json({
                message: "Order cannot be cancelled. The kitchen has already started preparing your food."
            });
        }

        // Handle automated refund if online payment was captured
        let refundInfo = { refundId: null, amount: 0, status: "none", notes: null };
        if (order.paymentMethod === "online" && order.payment && order.razorpayPaymentId) {
            try {
                const refundAmountInPaise = Math.round(order.totalAmount * 100);
                const razorRefund = await instance.payments.refund(order.razorpayPaymentId, {
                    amount: refundAmountInPaise,
                    notes: { reason, orderId: order._id.toString() }
                });

                refundInfo = {
                    refundId: razorRefund.id,
                    amount: order.totalAmount,
                    status: "initiated",
                    notes: `Refund of ₹${order.totalAmount} initiated via Razorpay (ID: ${razorRefund.id})`
                };
            } catch (refundError) {
                console.error("Razorpay refund error:", refundError.message || refundError);
                refundInfo = {
                    refundId: null,
                    amount: order.totalAmount,
                    status: "failed",
                    notes: `Automated refund failed: ${refundError.message}. Customer support will process manually.`
                };
            }
        }

        // Update all shop order statuses to cancelled
        order.shopOrders.forEach(so => {
            so.status = "cancelled";
        });

        order.cancellation = {
            isCancelled: true,
            cancelledBy: "customer",
            reason,
            cancelledAt: new Date()
        };
        await order.save();

        // Phase 2.3: Restore user coupon if one was consumed for this order
        if (order.coupon?.code) {
            await Coupon.updateOne(
                { code: order.coupon.code.trim().toUpperCase() },
                { $pull: { usedBy: { order: order._id } } }
            );
        }

        // Cancel any pending delivery assignments
        await DeliveryAssignment.updateMany(
            { order: order._id },
            { status: "cancelled" }
        );

        // Notify restaurant owners via Socket
        const io = req.app.get("io");
        if (io) {
            order.shopOrders.forEach(so => {
                if (so.owner?.socketId) {
                    io.to(so.owner.socketId).emit("orderCancelled", {
                        orderId: order._id,
                        shopId: so.shop,
                        reason
                    });
                }
            });
        }

        return res.status(200).json({
            success: true,
            message: refundInfo.status === "initiated"
                ? `Order cancelled. Refund of ₹${order.totalAmount} has been initiated to your original payment method.`
                : "Order cancelled successfully.",
            order
        });

    } catch (error) {
        console.error("cancelOrder error:", error);
        return res.status(500).json({ message: `Cancel order error: ${error.message}` });
    }
};

/**
 * POST /api/order/reject/:orderId/:shopId
 * Restaurant owner rejects an order item/sub-order
 */
export const rejectShopOrder = async (req, res) => {
    try {
        const { orderId, shopId } = req.params;
        const { reason = "Restaurant unable to prepare dish" } = req.body;
        const ownerId = req.userId;

        const order = await Order.findById(orderId).populate("user");
        if (!order) return res.status(404).json({ message: "Order not found" });

        const shopOrder = order.shopOrders.find(so => so.shop?.toString() === shopId.toString());
        if (!shopOrder) return res.status(404).json({ message: "Shop order not found" });

        if (shopOrder.owner?.toString() !== ownerId.toString()) {
            return res.status(403).json({ message: "Unauthorized: not your shop order" });
        }

        shopOrder.status = "cancelled";

        const allCancelled = order.shopOrders.every(so => so.status === "cancelled");
        if (allCancelled) {
            order.cancellation = {
                isCancelled: true,
                cancelledBy: "owner",
                reason,
                cancelledAt: new Date()
            };
        }

        // Automatic refund if online payment was made
        if (order.paymentMethod === "online" && order.payment && order.razorpayPaymentId) {
            try {
                const refundAmount = allCancelled ? order.totalAmount : shopOrder.subtotal;
                const razorRefund = await instance.payments.refund(order.razorpayPaymentId, {
                    amount: Math.round(refundAmount * 100),
                    notes: { reason, shopId, orderId: order._id.toString() }
                });

                order.refund = {
                    refundId: razorRefund.id,
                    amount: (order.refund?.amount || 0) + refundAmount,
                    status: "initiated",
                    notes: `Refund of ₹${refundAmount} initiated due to kitchen rejection`
                };
            } catch (refundError) {
                console.error("Refund error during shop rejection:", refundError.message || refundError);
            }
        }

        await order.save();

        const io = req.app.get("io");
        if (io && order.user?.socketId) {
            io.to(order.user.socketId).emit("orderRejected", {
                orderId: order._id,
                shopId,
                reason
            });
        }

        return res.status(200).json({
            success: true,
            message: "Shop order rejected and refund recorded",
            order
        });

    } catch (error) {
        console.error("rejectShopOrder error:", error);
        return res.status(500).json({ message: `Reject shop order error: ${error.message}` });
    }
};

/**
 * POST /api/order/rider-cancel
 * Delivery boy / Rider cancels the assigned order
 * Typically after average 20m if the receiver does not accept the delivery or another valid reason
 */
export const riderCancelOrder = async (req, res) => {
    try {
        const { orderId, shopOrderId, reason } = req.body;
        const deliveryBoyId = req.userId;

        if (!reason || !reason.trim()) {
            return res.status(400).json({ message: "A valid cancellation reason is required" });
        }

        const order = await Order.findById(orderId)
            .populate("user")
            .populate("shopOrders.owner", "socketId name");

        if (!order) {
            return res.status(404).json({ message: "Order not found" });
        }

        const targetShopOrderId = shopOrderId || req.params.shopOrderId;
        const shopOrder = order.shopOrders.find(so => String(so._id) === String(targetShopOrderId));

        if (!shopOrder) {
            return res.status(404).json({ message: "Shop order not found" });
        }

        // Authorization: verify that this delivery boy is assigned to this order
        const isAssigned = String(shopOrder.assignedDeliveryBoy) === String(deliveryBoyId);
        const assignment = await DeliveryAssignment.findOne({
            order: order._id,
            shopOrderId: shopOrder._id,
            assignedTo: deliveryBoyId
        });

        if (!isAssigned && !assignment) {
            return res.status(403).json({ message: "You are not authorized to cancel this order" });
        }

        if (shopOrder.status === "delivered") {
            return res.status(400).json({ message: "Delivered order cannot be cancelled" });
        }

        if (shopOrder.status === "cancelled") {
            return res.status(400).json({ message: "Order is already cancelled" });
        }

        // Calculate elapsed minutes since rider accepted the assignment
        const acceptedTime = assignment?.acceptedAt 
            ? new Date(assignment.acceptedAt).getTime() 
            : new Date(assignment?.createdAt || shopOrder.updatedAt || order.createdAt).getTime();
        const elapsedMinutes = Math.max(0, Math.floor((Date.now() - acceptedTime) / (60 * 1000)));

        const cancellationNote = `${reason.trim()} (Wait time: ~${elapsedMinutes}m)`;

        // Mark the shop order as cancelled
        shopOrder.status = "cancelled";

        const allCancelled = order.shopOrders.every(so => so.status === "cancelled");
        if (allCancelled) {
            order.cancellation = {
                isCancelled: true,
                cancelledBy: "rider",
                reason: cancellationNote,
                cancelledAt: new Date()
            };
        }

        // Automated refund if online payment was captured
        let refundInfo = order.refund || { refundId: null, amount: 0, status: "none", notes: null };
        if (order.paymentMethod === "online" && order.payment && order.razorpayPaymentId) {
            try {
                const refundAmount = allCancelled ? order.totalAmount : shopOrder.subtotal;
                if (refundAmount > 0) {
                    const refundAmountInPaise = Math.round(refundAmount * 100);
                    const razorRefund = await instance.payments.refund(order.razorpayPaymentId, {
                        amount: refundAmountInPaise,
                        notes: {
                            reason: cancellationNote,
                            orderId: order._id.toString(),
                            shopOrderId: shopOrder._id.toString()
                        }
                    });

                    refundInfo = {
                        refundId: razorRefund.id,
                        amount: (refundInfo.amount || 0) + refundAmount,
                        status: "initiated",
                        notes: `Refund of ₹${refundAmount} initiated due to delivery partner cancellation (${cancellationNote})`
                    };
                }
            } catch (refundError) {
                console.error("Razorpay refund error on rider cancellation:", refundError.message || refundError);
                refundInfo = {
                    refundId: null,
                    amount: (refundInfo.amount || 0) + (allCancelled ? order.totalAmount : shopOrder.subtotal),
                    status: "failed",
                    notes: `Automated refund failed: ${refundError.message}. Admin will process manually.`
                };
            }
        }
        order.refund = refundInfo;

        await order.save();

        // Release the delivery boy assignment so they can accept new orders
        await DeliveryAssignment.updateMany(
            { order: order._id, shopOrderId: shopOrder._id },
            { status: "cancelled" }
        );

        // Real-time socket notifications to customer and restaurant owner
        const io = req.app.get("io");
        if (io) {
            if (order.user?.socketId) {
                io.to(order.user.socketId).emit("update-status", {
                    orderId: order._id,
                    shopId: shopOrder.shop,
                    status: "cancelled",
                    reason: cancellationNote,
                    timestamp: new Date()
                });
                io.to(order.user.socketId).emit("orderCancelled", {
                    orderId: order._id,
                    shopId: shopOrder.shop,
                    reason: `Delivery partner cancelled: ${cancellationNote}`
                });
            }

            if (shopOrder.owner?.socketId) {
                io.to(shopOrder.owner.socketId).emit("orderCancelled", {
                    orderId: order._id,
                    shopId: shopOrder.shop,
                    reason: `Delivery partner cancelled: ${cancellationNote}`
                });
            }
        }

        return res.status(200).json({
            success: true,
            message: refundInfo.status === "initiated"
                ? `Order cancelled. Refund of ₹${allCancelled ? order.totalAmount : shopOrder.subtotal} has been initiated to customer.`
                : "Order cancelled successfully.",
            order,
            elapsedMinutes
        });

    } catch (error) {
        console.error("riderCancelOrder error:", error);
        return res.status(500).json({ message: `Rider cancel order error: ${error.message}` });
    }
};
