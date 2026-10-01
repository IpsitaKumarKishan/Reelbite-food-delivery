import mongoose from "mongoose";

const itemSchema = new mongoose.Schema({
    name: {
        type: String,
        required: true
    },
    image: {
        type: String,
        required: true
    },
    shop: {
        type: mongoose.Schema.Types.ObjectId,
        ref: "Shop"
    },
    category: {
        type: String,
        enum: ["Snacks",
            "Main Course",
            "Desserts",
            "Pizza",
            "Burgers",
            "Sandwiches",
            "South Indian",
            "North Indian",
            "Chinese",
            "Fast Food",
            "Others"
        ],
        required:true
    },
    price:{
        type:Number,
        min:0,
        required:true
    },
    foodType:{
        type:String,
        enum:["veg","non veg"],
        required:true
    },
    tasteProfile: {
        spiceLevel: {
            type: String,
            enum: ["mild", "medium", "spicy", "extra-spicy"],
            default: "medium"
        },
        flavorTags: {
            type: [String],
            default: []
        },
        isJainFriendly: {
            type: Boolean,
            default: false
        },
        isVegan: {
            type: Boolean,
            default: false
        }
    },
   rating:{
    average:{type:Number,default:0},
    count:{type:Number,default:0}
   }
}, { timestamps: true })

const Item=mongoose.model("Item",itemSchema)
export default Item