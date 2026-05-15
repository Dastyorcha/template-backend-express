import mongoose from "mongoose";
import { env } from "./env";

const connectDB = async (): Promise<void> => {
  await mongoose.connect(env.MONGO_URI);
  console.log("MongoDB connected");
};

export default connectDB;
