const mongoose=require("mongoose");
const { create } = require("./students");

const applicationSchema=new mongoose.Schema({
    userId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Student",
        required:true
    },
    companyId:{
        type:mongoose.Schema.Types.ObjectId,
        ref:"Company",
        required:true
    },
    resume:{
        type:String,
        required:true
    },
    status:{
        type:String,
        enum:["applied","interviewing","offered","rejected"],
        default:"applied"
    },
    createdAt:{
        type:Date,
        default:Date.now
    }
});

const Application=mongoose.model("Application",applicationSchema);
module.exports=Application;
