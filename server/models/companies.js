const mongoose=require("mongoose");

const companySchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    description:{
        type:String,
        required:true
    },
    type:{
        type:String,
        enum:["Remote","onsite","hybrid"]
    },
    stipend:{
        type:Number,
    }
})

const Company=mongoose.model("Company",companySchema);
module.exports=Company;
