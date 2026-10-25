import mongoose from "mongoose";

const connection = async ()=>{
    try {
        await mongoose.connect(process.env.MONGODB_URI)
        console.log("Database connected successfully");
    } catch (error) {
        console.log("MongoDB connection failed:",error);
    }
};
export default connection;