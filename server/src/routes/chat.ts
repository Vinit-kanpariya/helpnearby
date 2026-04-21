import { Router, Response } from "express";
import mongoose from "mongoose";
import Message from "../models/Message";
import User from "../models/User";
import Notification from "../models/Notification";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/chat/conversations
router.get(
  "/conversations",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const userOid = new mongoose.Types.ObjectId(req.userId as string);
      // Get all distinct users the current user has chatted with
      const messages = await Message.aggregate([
        {
          $match: {
            $or: [
              { sender: userOid },
              { receiver: userOid },
            ],
          },
        },
        { $sort: { createdAt: -1 } },
        {
          $group: {
            _id: {
              $cond: [
                { $eq: ["$sender", userOid] },
                "$receiver",
                "$sender",
              ],
            },
            lastMessage: { $first: "$$ROOT" },
            unreadCount: {
              $sum: {
                $cond: [
                  {
                    $and: [
                      { $eq: ["$receiver", userOid] },
                      { $eq: ["$read", false] },
                    ],
                  },
                  1,
                  0,
                ],
              },
            },
          },
        },
      ]);

      const conversations = await Promise.all(
        messages.map(async (msg) => {
          const user = await User.findById(msg._id).select(
            "name avatar rating"
          );
          return {
            _id: msg._id?.toString(),
            user,
            lastMessage: msg.lastMessage,
            unreadCount: msg.unreadCount,
          };
        })
      );

      res.json({ conversations });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/chat/messages/:userId
router.get(
  "/messages/:userId",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const messages = await Message.find({
        $or: [
          { sender: req.userId, receiver: req.params.userId },
          { sender: req.params.userId, receiver: req.userId },
        ],
      })
        .sort({ createdAt: 1 })
        .limit(100);

      // Mark received messages as read
      await Message.updateMany(
        {
          sender: req.params.userId,
          receiver: req.userId,
          read: false,
        },
        { read: true }
      );

      res.json({ messages });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/chat/messages — REST fallback for sending a message
router.post(
  "/messages",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { receiver, content } = req.body;
      if (!receiver || !content?.trim()) {
        res.status(400).json({ message: "receiver and content are required" });
        return;
      }
      const message = await Message.create({
        sender: req.userId,
        receiver,
        content: content.trim(),
      });

      await Notification.create({
        user: receiver,
        type: "message",
        title: "New message",
        body: content.trim().substring(0, 100),
        relatedUser: req.userId,
      });

      res.status(201).json({ message });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
