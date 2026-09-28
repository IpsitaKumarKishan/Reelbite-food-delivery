import Item from "../models/item.model.js";
import Shop from "../models/shop.model.js";
import Rating from "../models/rating.model.js";
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
        let image;
        if (req.file) {
            image = await uploadOnCloudinary(req.file.path)
        }
        const item = await Item.findByIdAndUpdate(itemId, {
            name, category, foodType, price, image
        }, { new: true })
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId }).populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `edit item error ${error}` })
    }
}

export const getItemById = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findById(itemId).populate("shop", "name image city").lean()
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        return res.status(200).json(item)
    } catch (error) {
        return res.status(500).json({ message: `get item error ${error}` })
    }
}

export const deleteItem = async (req, res) => {
    try {
        const itemId = req.params.itemId
        const item = await Item.findByIdAndDelete(itemId)
        if (!item) {
            return res.status(400).json({ message: "item not found" })
        }
        const shop = await Shop.findOne({ owner: req.userId })
        shop.items = shop.items.filter(i => !i.equals(item._id))
        await shop.save()
        await shop.populate({
            path: "items",
            options: { sort: { updatedAt: -1 } }
        })
        return res.status(200).json(shop)

    } catch (error) {
        return res.status(500).json({ message: `delete item error ${error}` })
    }
}

export const getItemByCity = async (req, res) => {
    try {
        const { city } = req.params
        let shops = []
        if (city && city !== "null" && city !== "undefined" && city !== "all") {
            shops = await Shop.find({
                city: { $regex: new RegExp(city, "i") }
            }).populate('items')
        }
        
        if (!shops || shops.length === 0) {
            shops = await Shop.find({}).populate('items')
        }
        
        const shopIds = shops.map((shop) => shop._id)
        const items = await Item.find({ shop: { $in: shopIds } }).populate("shop", "name image city").lean()
        return res.status(200).json(items)

    } catch (error) {
        return res.status(500).json({ message: `get item by city error ${error}` })
    }
}

export const getItemsByShop=async (req,res) => {
    try {
        const {shopId}=req.params
        const shop=await Shop.findById(shopId).populate("items").lean()
        if(!shop){
            return res.status(400).json("shop not found")
        }
        return res.status(200).json({
            shop,items:shop.items
        })
    } catch (error) {
         return res.status(500).json({ message: `get item by shop error ${error}` })
    }
}

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

        // 1. Resolve shops in the target city (or matching query by shop name)
        let shopFilter = {};
        if (city) {
            shopFilter.city = { $regex: new RegExp(`^${city}$`, "i") };
        }

        const shops = await Shop.find(shopFilter).select("_id name city").lean();
        const cityShopIds = shops.map(s => s._id);

        // Find any shops whose names match the query (e.g. searching "Dominos")
        let matchingShopIdsByName = [];
        if (query && query.trim() !== "") {
            const matchedShops = await Shop.find({
                ...shopFilter,
                name: { $regex: query.trim(), $options: "i" }
            }).select("_id").lean();
            matchingShopIdsByName = matchedShops.map(s => s._id);
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