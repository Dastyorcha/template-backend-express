import mongoose, { Document } from "mongoose";

export interface IUser extends Document {
  name: string;
  email: string;
  hashedPassword: string;
  loginedCount: number;
  isBlocked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new mongoose.Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    hashedPassword: { type: String, required: true },
    loginedCount: { type: Number, default: 0 },
    isBlocked: { type: Boolean, default: false },
  },
  { timestamps: true },
);

export default mongoose.model<IUser>("User", userSchema);
