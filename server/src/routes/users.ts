import { Router, Response } from "express";
import User from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/users/profile
router.get(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const user = await User.findById(req.userId);
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PUT /api/users/profile
router.put(
  "/profile",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const { name, phone, bio, location, avatar } = req.body;
      const user = await User.findByIdAndUpdate(
        req.userId,
        { name, phone, bio, location, avatar },
        { new: true, runValidators: true }
      );
      if (!user) {
        res.status(404).json({ message: "User not found" });
        return;
      }
      res.json({ user });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/users/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const user = await User.findById(req.params.id).select(
      "name bio avatar rating tasksHelped requestsPosted verified location createdAt"
    );
    if (!user) {
      res.status(404).json({ message: "User not found" });
      return;
    }
    res.json({ user });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

export default router;
