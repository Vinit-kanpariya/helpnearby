import mongoose, { Document, Schema } from "mongoose";
import bcrypt from "bcryptjs";

export interface IUser extends Document {
  name: string;
  email: string;
  password: string;
  phone?: string;
  location?: { type: string; coordinates: number[]; address?: string };
  bio?: string;
  avatar?: string;
  rating: number;
  tasksHelped: number;
  requestsPosted: number;
  verified: boolean;
  createdAt: Date;
  comparePassword(candidate: string): Promise<boolean>;
}

const userSchema = new Schema<IUser>(
  {
    name: { type: String, required: true, trim: true },
    email: { type: String, required: true, unique: true, lowercase: true },
    password: { type: String, required: true, minlength: 6 },
    phone: String,
    location: {
      type: { type: String, default: "Point" },
      coordinates: { type: [Number], default: [0, 0] },
      address: String,
    },
    bio: String,
    avatar: String,
    rating: { type: Number, default: 0 },
    tasksHelped: { type: Number, default: 0 },
    requestsPosted: { type: Number, default: 0 },
    verified: { type: Boolean, default: false },
  },
  { timestamps: true }
);

userSchema.pre("save", async function (next) {
  if (!this.isModified("password")) return next();
  this.password = await bcrypt.hash(this.password, 12);
  next();
});

userSchema.methods.comparePassword = async function (
  candidate: string
): Promise<boolean> {
  return bcrypt.compare(candidate, this.password);
};

userSchema.set("toJSON", {
  transform: (_doc, ret) => {
    delete (ret as unknown as Record<string, unknown>).password;
    return ret;
  },
});

export default mongoose.model<IUser>("User", userSchema);
