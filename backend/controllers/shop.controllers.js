import Shop from "../models/shop.model.js";
import uploadOnCloudinary from "../utils/cloudinary.js";

export const createEditShop=async (req,res) => {
    try {
        const { name, city, state, address, latitude, longitude, lat, lon } = req.body
        const validLat = Number(latitude ?? lat);
        const validLon = Number(longitude ?? lon);
        const hasCoords = !isNaN(validLat) && !isNaN(validLon) && (validLat !== 0 || validLon !== 0);

        let uploadedImage;
        if(req.file){
            uploadedImage = await uploadOnCloudinary(req.file.path)
        } 
        let shop = await Shop.findOne({owner:req.userId})
        if(!shop){
            const newShopData = {
                name,
                city,
                state,
                address,
                image: uploadedImage || "https://images.unsplash.com/photo-1517248135467-4c7edcad34c4?w=600&auto=format&fit=crop&q=80",
                owner: req.userId
            }
            if (hasCoords) {
                newShopData.location = { type: 'Point', coordinates: [validLon, validLat] }
            }
            shop = await Shop.create(newShopData)
        } else {
            const updatePayload = { name, city, state, address, owner: req.userId }
            if (uploadedImage) {
                updatePayload.image = uploadedImage
            }
            if (hasCoords) {
                updatePayload.location = { type: 'Point', coordinates: [validLon, validLat] }
            }
            shop = await Shop.findByIdAndUpdate(shop._id, updatePayload, { new: true })
        }
      
        await shop.populate("owner items")
        return res.status(201).json(shop)
    } catch (error) {
        return res.status(500).json({ message: `create shop error ${error.message || error}` })
    }
}

export const getMyShop=async (req,res) => {
    try {
        const shop=await Shop.findOne({owner:req.userId}).populate("owner").populate({
            path:"items",
            options:{sort:{updatedAt:-1}}
        }).lean()
        if(!shop){
            return res.status(200).json(null)
        }
        return res.status(200).json(shop)
    } catch (error) {
        return res.status(500).json({message:`get my shop error ${error}`})
    }
}

export const getShopByCity = async (req, res) => {
    try {
        const { city } = req.params;
        const activeFilter = {
            status: "active",
            isApproved: { $ne: false },
        };

        let query = { ...activeFilter };
        if (city && city !== "null" && city !== "undefined" && city !== "all") {
            query.city = { $regex: new RegExp(city, "i") };
        }

        let shops = await Shop.find(query)
            .populate('items')
            .populate('owner', 'fullName email mobile status')
            .lean();

        // Fallback: If no shops match the specific city, return active shops
        if ((!shops || shops.length === 0) && query.city) {
            shops = await Shop.find(activeFilter)
                .populate('items')
                .populate('owner', 'fullName email mobile status')
                .lean();
        }

        // Integrity Guard: Filter out shops whose owner account was deleted or suspended
        const validShops = (shops || []).filter(
            (shop) => shop.owner && shop.owner.status !== "suspended"
        );

        return res.status(200).json(validShops);
    } catch (error) {
        return res.status(500).json({ message: `get shop by city error ${error.message || error}` });
    }
};