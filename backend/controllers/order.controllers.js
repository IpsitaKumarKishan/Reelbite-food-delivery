import DeliveryAssignment from "../models/deliveryAssignment.model.js"
import Order from "../models/order.model.js"
import Shop from "../models/shop.model.js"
import User from "../models/user.model.js"
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
        const { cartItems, paymentMethod, deliveryAddress, totalAmount } = req.body
        if (cartItems.length == 0 || !cartItems) {
            return res.status(400).json({ message: "cart is empty" })
        }
        if (!deliveryAddress.text || !deliveryAddress.latitude || !deliveryAddress.longitude) {
            return res.status(400).json({ message: "send complete deliveryAddress" })
        }

        const groupItemsByShop = {}

        cartItems.forEach(item => {
            const shopId = item.shop
            if (!groupItemsByShop[shopId]) {
                groupItemsByShop[shopId] = []
            }
            groupItemsByShop[shopId].push(item)
        });

        const shopCommissionRates = {}
        const shopOrders = await Promise.all(Object.keys(groupItemsByShop).map(async (shopId) => {
            const shop = await Shop.findById(shopId).populate("owner")
            if (!shop) {
                throw new Error(`Shop ${shopId} not found`)
            }
            shopCommissionRates[shop._id.toString()] = shop.commissionRate || 20;
            const items = groupItemsByShop[shopId]
            const subtotal = items.reduce((sum, i) => sum + Number(i.price) * Number(i.quantity), 0)
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

        if (paymentMethod == "online") {
            const razorOrder = await instance.orders.create({
                amount: Math.round(totalAmount * 100),
                currency: 'INR',
                receipt: `receipt_${Date.now()}`
            })
            const newOrder = await Order.create({
                user: req.userId,
                paymentMethod,
                deliveryAddress,
                totalAmount,
                subtotal: calculatedSplit.subtotal,
                deliveryFee: calculatedSplit.deliveryFee,
                platformFee: calculatedSplit.platformFee,
                commissionAmount: calculatedSplit.commissionAmount,
                restaurantPayout: calculatedSplit.restaurantPayout,
                deliveryPartnerPayout: calculatedSplit.deliveryPartnerPayout,
                platformRevenue: calculatedSplit.platformRevenue,
                settlementStatus: "unsettled",
                shopOrders: calculatedSplit.shopOrders,
                razorpayOrderId: razorOrder.id,
                payment: false
            })

            return res.status(200).json({
                razorOrder,
                orderId: newOrder._id,
            })

        }

        const newOrder = await Order.create({
            user: req.userId,
            paymentMethod,
            deliveryAddress,
            totalAmount,
            subtotal: calculatedSplit.subtotal,
            deliveryFee: calculatedSplit.deliveryFee,
            platformFee: calculatedSplit.platformFee,
            commissionAmount: calculatedSplit.commissionAmount,
            restaurantPayout: calculatedSplit.restaurantPayout,
            deliveryPartnerPayout: calculatedSplit.deliveryPartnerPayout,
            platformRevenue: calculatedSplit.platformRevenue,
            settlementStatus: "unsettled",
            shopOrders: calculatedSplit.shopOrders
        })

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

        const shopOrder = order.shopOrders.find(o => o.shop == shopId)
        if (!shopOrder) {
            return res.status(400).json({ message: "shop order not found" })
        }
        shopOrder.status = status
        let deliveryBoysPayload = []
        if (status == "out of delivery" && !shopOrder.assignment) {
            const { longitude, latitude } = order.deliveryAddress
            const nearByDeliveryBoys = await User.find({
                role: "deliveryBoy",
                location: {
                    $near: {
                        $geometry: { type: "Point", coordinates: [Number(longitude), Number(latitude)] },
                        $maxDistance: 5000
                    }
                }
            })

            const nearByIds = nearByDeliveryBoys.map(b => b._id)
            const busyIds = await DeliveryAssignment.find({
                assignedTo: { $in: nearByIds },
                status: { $nin: ["broadcasted", "brodcasted", "completed"] }

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
                    status: updatedShopOrder.status,
                    userId: order.user._id
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
        const assignment = await DeliveryAssignment.findById(assignmentId)
        if (!assignment) {
            return res.status(400).json({ message: "assignment not found" })
        }
        if (assignment.status !== "broadcasted" && assignment.status !== "brodcasted") {
            return res.status(400).json({ message: "assignment is expired" })
        }

        const alreadyAssigned = await DeliveryAssignment.findOne({
            assignedTo: req.userId,
            status: { $nin: ["broadcasted", "brodcasted", "completed"] }
        })

        if (alreadyAssigned) {
            return res.status(400).json({ message: "You are already assigned to another order" })
        }

        assignment.assignedTo = req.userId
        assignment.status = 'assigned'
        assignment.acceptedAt = new Date()
        await assignment.save()

        const order = await Order.findById(assignment.order)
        if (!order) {
            return res.status(400).json({ message: "order not found" })
        }

        let shopOrder = order.shopOrders.id(assignment.shopOrderId)
        shopOrder.assignedDeliveryBoy = req.userId
        await order.save()


        return res.status(200).json({
            message: 'order accepted'
        })
    } catch (error) {
        return res.status(500).json({ message: `accept order error ${error}` })
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
            shopOrder,
            deliveryAddress: assignment.order.deliveryAddress,
            deliveryBoyLocation,
            customerLocation,
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
        await order.save()
        await DeliveryAssignment.deleteOne({
            shopOrderId: shopOrder._id,
            order: order._id,
            assignedTo: shopOrder.assignedDeliveryBoy
        })

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
