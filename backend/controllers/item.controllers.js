import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

export const addItem = async (req, res) => {
    try {
        const { name, category, foodType, price } = req.body
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop) {
            return res.status(400).json({ message: "shop not found" })
        }
        const item = await Item.create({
            name, category, foodType, price, image, shop: shop._id
        })

        shop.items.push(item._id)
        await shop.save()
        await shop.populate("owner")
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(201).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `add item error ${error}` })
    }
}

export const editItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const { name, category, foodType, price } = req.body

        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(404).json({ message: "item not found" })
        }

        // Security: IDOR protection - verify item belongs to authenticated owner's shop
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop || String(item.shop) !== String(shop._id)) {
            return res.status(403).json({ message: "Unauthorized: You can only edit dishes belonging to your own restaurant." })
        }

        const updateData = { name, category, foodType, price: Number(price) }
        if (req.file) {
            const uploadedUrl = await uploadOnCloudinary(req.file.path)
            if (uploadedUrl) {
                updateData.image = uploadedUrl
            }
        }

        await Item.findByIdAndUpdate(itemId, updateData, { new: true })
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `edit item error ${error.message || error}` })
    }
}

export const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId).populate("shop", "name image city").lean()
        if (!item) {
            return res.status(404).json({ message: "item not found" })
        }
        return res.status(200).json(item)
    } catch (error) {
        return res.status(500).json({ message: `get item error ${error.message || error}` })
    }
}

export const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId)
        if (!item) {
            return res.status(404).json({ message: "item not found" })
        }

        // Security: IDOR protection - verify item belongs to authenticated owner's shop
        const shop = await Shop.findOne({ owner: req.userId })
        if (!shop || String(item.shop) !== String(shop._id)) {
            return res.status(403).json({ message: "Unauthorized: You can only delete dishes belonging to your own restaurant." })
        }

        await Item.findByIdAndDelete(itemId)
        shop.items = shop.items.filter(i => !i.equals(item._id))
        await shop.save()
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error.message || error}` })
    }
}

export const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params;
        const activeFilter = {
            status: { $ne: "suspended" },
            isApproved: { $ne: false },
        };

        let query = { ...activeFilter };
        if (city && city !== "null" && city !== "undefined" && city !== "all") {
            query.city = { $regex: new RegExp(city, "i") };
        }

        let shops = await Shop.find(query).populate('owner', 'status').lean();

        if ((!shops || shops.length === 0) && query.city) {
            shops = await Shop.find(activeFilter).populate('owner', 'status').lean();
        }

        const validShopIds = (shops || [])
            .filter((shop) => shop.owner && shop.owner.status !== "suspended")
            .map((shop) => shop._id);

        let items = await Item.find({ shop: { $in: validShopIds } })
            .populate("shop", "name image city")
            .lean();

        if ((!items || items.length === 0) && validShopIds.length === 0) {
            const allActiveShops = await Shop.find(activeFilter).populate('owner', 'status').lean();
            const allActiveShopIds = allActiveShops
                .filter(s => s.owner && s.owner.status !== "suspended")
                .map(s => s._id);
            items = await Item.find({ shop: { $in: allActiveShopIds } })
                .populate("shop", "name image city")
                .lean();
        }

        return res.status(200).json(items || []);

    } catch (error) {
        return res.status(500).json({ message: `get item by city error ${error.message || error}` });
    }
};

export const getItemsByShop = async (req, res) => {
    try {
        const { shopId } = req.params;
        const shop = await Shop.findById(shopId)
            .populate("items")
            .populate("owner", "status")
            .lean();

        if (!shop || shop.status === "suspended" || !shop.owner || shop.owner.status === "suspended") {
            return res.status(404).json({ message: "Shop not found or currently unavailable" });
        }
        return res.status(200).json({
            shop,
            items: shop.items || []
        });
    } catch (error) {
        return res.status(500).json({ message: `get item by shop error ${error.message || error}` });
    }
};

export const searchItems = async (req, res) => {
    try {
        const {
            query = "",
            city = "",
            foodType,
            category,
            minPrice,
            maxPrice,
            minRating,
            sortBy
        } = req.query;

        // 1. Resolve active shops in the target city (or matching query by shop name)
        let shopFilter = {
            status: "active",
            isApproved: { $ne: false },
        };
        if (city) {
            shopFilter.city = { $regex: new RegExp(`^${city}$`, "i") };
        }

        const shops = await Shop.find(shopFilter).populate("owner", "status").select("_id name city owner").lean();
        const cityShopIds = shops
            .filter((s) => s.owner && s.owner.status !== "suspended")
            .map((s) => s._id);

        // Find any shops whose names match the query (e.g. searching "Dominos")
        let matchingShopIdsByName = [];
        if (query && query.trim() !== "") {
            const matchedShops = await Shop.find({
                ...shopFilter,
                name: { $regex: query.trim(), $options: "i" }
            }).populate("owner", "status").select("_id owner").lean();
            matchingShopIdsByName = matchedShops
                .filter((s) => s.owner && s.owner.status !== "suspended")
                .map((s) => s._id);
        }

        // 2. Build Item Query
        const itemFilter = {};

        // Restrict to city shops if city provided
        if (cityShopIds.length > 0) {
            itemFilter.shop = { $in: cityShopIds };
        }

        // Query text matching (dish name, category, or belonging to a matched shop)
        if (query && query.trim() !== "") {
            const regex = new RegExp(query.trim(), "i");
            const orConditions = [
                { name: regex },
                { category: regex }
            ];

            if (matchingShopIdsByName.length > 0) {
                orConditions.push({ shop: { $in: matchingShopIdsByName } });
            }

            itemFilter.$or = orConditions;
        }

        // Food type filter (veg / non veg)
        if (foodType && ["veg", "non veg"].includes(foodType.toLowerCase())) {
            itemFilter.foodType = foodType.toLowerCase();
        }

        // Category filter
        if (category && category !== "All") {
            itemFilter.category = category;
        }

        // Price bracket filtering
        if (minPrice !== undefined || maxPrice !== undefined) {
            itemFilter.price = {};
            if (minPrice !== undefined && minPrice !== "") {
                itemFilter.price.$gte = Number(minPrice);
            }
            if (maxPrice !== undefined && maxPrice !== "") {
                itemFilter.price.$lte = Number(maxPrice);
            }
        }

        // Minimum Rating filtering
        if (minRating !== undefined && minRating !== "") {
            itemFilter["rating.average"] = { $gte: Number(minRating) };
        }

        // 3. Sorting configuration
        let sortOption = { "rating.average": -1, createdAt: -1 };
        if (sortBy === "price_asc") {
            sortOption = { price: 1 };
        } else if (sortBy === "price_desc") {
            sortOption = { price: -1 };
        } else if (sortBy === "rating_desc") {
            sortOption = { "rating.average": -1 };
        }

        const items = await Item.find(itemFilter)
            .sort(sortOption)
            .populate("shop", "name image city")
            .lean();

        return res.status(200).json(items);

    } catch (error) {
        return res.status(500).json({ message: `search item error: ${error.message}` });
    }
};


export const rating=async (req,res) => {
    try {
        const {itemId,rating}=req.body

        if(!itemId || !rating){
            return res.status(400).json({message:"itemId and rating is required"})
        }

        if(rating<1 || rating>5){
             return res.status(400).json({message:"rating must be between 1 to 5"})
        }

        const item=await Item.findById(itemId)
        if(!item){
              return res.status(400).json({message:"item not found"})
        }

        let existingRating = await Rating.findOne({ user: req.userId, item: itemId });
        if (existingRating) {
            const oldCount = item.rating.count;
            const oldAverage = item.rating.average;
            const oldVal = existingRating.rating;
            const newAverage = oldCount > 1 
                ? ((oldAverage * oldCount) - oldVal + rating) / oldCount
                : rating;
            item.rating.average = Math.round(newAverage * 10) / 10;
            existingRating.rating = rating;
            await existingRating.save();
            await item.save();
            return res.status(200).json({ rating: item.rating, message: "Rating updated" });
        } else {
            await Rating.create({ user: req.userId, item: itemId, rating });
            const newCount = (item.rating.count || 0) + 1;
            const newAverage = (((item.rating.average || 0) * (item.rating.count || 0)) + rating) / newCount;
            item.rating.count = newCount;
            item.rating.average = Math.round(newAverage * 10) / 10;
            await item.save();
            return res.status(200).json({ rating: item.rating, message: "Rating submitted" });
        }

    } catch (error) {
         return res.status(500).json({ message: `rating error ${error}` })
    }
}