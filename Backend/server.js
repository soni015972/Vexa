import express from "express";
import "dotenv/config";
import cors from "cors";
import mongoose from "mongoose";
import chatRoutes from "./routes/chat.js";

const app = express();
const PORT = process.env.PORT || 8080;

app.use(express.json());
app.use(cors());

app.use("/api", chatRoutes);

app.listen(PORT, () => {
    console.log(`✦ Vexa backend running on port ${PORT}`);
    connectDB();
});

const connectDB = async () => {
    if (!process.env.MONGODB_URI) {
        console.log("ℹ️ MONGODB_URI not provided. Operating with in-memory storage.");
        return;
    }
    try {
        await mongoose.connect(process.env.MONGODB_URI);
        console.log("✅ Connected to MongoDB!");
    } catch (err) {
        console.log("❌ Failed to connect to MongoDB:", err);
    }
};
