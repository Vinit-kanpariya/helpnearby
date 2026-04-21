import mongoose, { Document, Schema } from "mongoose";

export interface INotification extends Document {
  user: mongoose.Types.ObjectId;
  type: string;
  title: string;
  body: string;
  relatedRequest?: mongoose.Types.ObjectId;
  relatedUser?: mongoose.Types.ObjectId;
  read: boolean;
  createdAt: Date;
}

const notificationSchema = new Schema<INotification>(
  {
    user: { type: Schema.Types.ObjectId, ref: "User", required: true },
    type: {
      type: String,
      enum: ["offer", "message", "completed", "rating", "nearby", "accepted"],
      required: true,
    },
    title: { type: String, required: true },
    body: { type: String, default: "" },
    relatedRequest: { type: Schema.Types.ObjectId, ref: "HelpRequest" },
    relatedUser: { type: Schema.Types.ObjectId, ref: "User" },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<INotification>("Notification", notificationSchema);
