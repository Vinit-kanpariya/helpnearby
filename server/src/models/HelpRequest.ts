import mongoose, { Document, Schema } from "mongoose";

export interface IHelpRequest extends Document {
  title: string;
  description: string;
  requester: mongoose.Types.ObjectId;
  category: string;
  status: string;
  date: string;
  time: string;
  location: { address: string; coordinates: number[] };
  rewardType: string;
  rewardAmount?: number;
  rewardDescription?: string;
  offers: {
    _id?: mongoose.Types.ObjectId;
    user: mongoose.Types.ObjectId;
    message: string;
    status: string;
    createdAt: Date;
  }[];
  helper?: mongoose.Types.ObjectId;
  createdAt: Date;
}

const helpRequestSchema = new Schema<IHelpRequest>(
  {
    title: { type: String, required: true },
    description: { type: String, default: "" },
    requester: { type: Schema.Types.ObjectId, ref: "User", required: true },
    category: {
      type: String,
      enum: ["moving", "groceries", "tutoring", "tech", "cleaning", "other"],
      default: "other",
    },
    status: {
      type: String,
      enum: ["active", "in_progress", "completed", "cancelled"],
      default: "active",
    },
    date: String,
    time: String,
    location: {
      address: { type: String, default: "" },
      coordinates: { type: [Number], default: [0, 0] },
    },
    rewardType: {
      type: String,
      enum: ["cash", "food", "favour", "free"],
      default: "cash",
    },
    rewardAmount: Number,
    rewardDescription: String,
    offers: [
      {
        user: { type: Schema.Types.ObjectId, ref: "User" },
        message: { type: String, default: "" },
        status: {
          type: String,
          enum: ["pending", "accepted", "rejected"],
          default: "pending",
        },
        createdAt: { type: Date, default: Date.now },
      },
    ],
    helper: { type: Schema.Types.ObjectId, ref: "User" },
  },
  { timestamps: true }
);

export default mongoose.model<IHelpRequest>("HelpRequest", helpRequestSchema);
