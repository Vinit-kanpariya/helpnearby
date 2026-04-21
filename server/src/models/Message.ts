import mongoose, { Document, Schema } from "mongoose";

export interface IMessage extends Document {
  sender: mongoose.Types.ObjectId;
  receiver: mongoose.Types.ObjectId;
  requestId?: mongoose.Types.ObjectId;
  content: string;
  read: boolean;
  createdAt: Date;
}

const messageSchema = new Schema<IMessage>(
  {
    sender: { type: Schema.Types.ObjectId, ref: "User", required: true },
    receiver: { type: Schema.Types.ObjectId, ref: "User", required: true },
    requestId: { type: Schema.Types.ObjectId, ref: "HelpRequest" },
    content: { type: String, required: true },
    read: { type: Boolean, default: false },
  },
  { timestamps: true }
);

export default mongoose.model<IMessage>("Message", messageSchema);
