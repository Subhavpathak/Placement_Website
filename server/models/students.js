// student model
const mongoose=require("mongoose");

const studentSchema=new mongoose.Schema({
    name:{
        type:String,
        required:true
    },
    email:{
        type:String,
        required:true,
        unique:true
    },
    password:{
        type:String,    
        required:true
    },
    role:{
        type:String,
        required:true,
        enum:["student","coordinator"]
    },
    details:{
        rollNo:{
            type:String,
        },
        semester:{
            type:String,
        },
        course:{
            type:String,
        },
        graduationYear:{
            type:Number,
        }
    },
    defaultResume:{
        type:String,
    },
    profileIsCompleted:{
        type:Boolean,
        default:false
    }
}, {
    timestamps: true // This adds createdAt and updatedAt fields
});

studentSchema.pre('save', function(next) {
    this.profileIsCompleted = !!this.defaultResume;
    next();
});

const Student=mongoose.model("Student",studentSchema);
module.exports=Student;
