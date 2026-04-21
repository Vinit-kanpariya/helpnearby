import { Router, Response } from "express";
import Notification from "../models/Notification";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/notifications
router.get(
  "/",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const notifications = await Notification.find({ user: req.userId })
        .sort({ createdAt: -1 })
        .limit(50);
      res.json({ notifications });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH /api/notifications/read-all
router.patch(
  "/read-all",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      await Notification.updateMany(
        { user: req.userId, read: false },
        { read: true }
      );
      res.json({ message: "All notifications marked as read" });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH /api/notifications/:id/read
router.patch(
  "/:id/read",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const notification = await Notification.findOneAndUpdate(
        { _id: req.params.id, user: req.userId },
        { read: true },
        { new: true }
      );
      if (!notification) {
        res.status(404).json({ message: "Notification not found" });
        return;
      }
      res.json({ notification });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
