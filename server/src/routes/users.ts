import { Router, Response } from "express";
import mongoose from "mongoose";
import User from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const MAX_NAME_LENGTH = 80;
const MAX_BIO_LENGTH = 500;
const MAX_PHONE_LENGTH = 20;
const MAX_ADDRESS_LENGTH = 200;
const MAX_AVATAR_LENGTH = 4 * 1024 * 1024; // ~4MB base64

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

      if (name !== undefined && (typeof name !== "string" || name.length > MAX_NAME_LENGTH)) {
        res.status(400).json({ message: "Invalid name" });
        return;
      }
      if (phone !== undefined && (typeof phone !== "string" || phone.length > MAX_PHONE_LENGTH)) {
        res.status(400).json({ message: "Invalid phone" });
        return;
      }
      if (bio !== undefined && (typeof bio !== "string" || bio.length > MAX_BIO_LENGTH)) {
        res.status(400).json({ message: "Bio too long" });
        return;
      }
      if (avatar !== undefined && avatar !== null) {
        if (typeof avatar !== "string" || avatar.length > MAX_AVATAR_LENGTH) {
          res.status(400).json({ message: "Avatar too large" });
          return;
        }
        if (avatar && !/^(data:image\/(png|jpeg|jpg|webp);base64,|https?:\/\/)/.test(avatar)) {
          res.status(400).json({ message: "Avatar must be an image" });
          return;
        }
      }

      const update: Record<string, unknown> = {};
      if (name !== undefined) update.name = name;
      if (phone !== undefined) update.phone = phone;
      if (bio !== undefined) update.bio = bio;
      if (avatar !== undefined) update.avatar = avatar;

      // Only set location if it has at least an address; preserve existing
      // coordinates when caller didn't send them, so saving the profile tab
      // doesn't wipe geocoded coords with [0, 0].
      if (location !== undefined) {
        if (
          location &&
          typeof location === "object" &&
          typeof (location as { address?: unknown }).address === "string" &&
          (location as { address: string }).address.length <= MAX_ADDRESS_LENGTH
        ) {
          const existing = await User.findById(req.userId).select("location");
          const incoming = location as {
            address: string;
            coordinates?: number[];
          };
          const incomingCoords = Array.isArray(incoming.coordinates)
            ? incoming.coordinates
            : null;
          const hasIncomingCoords =
            !!incomingCoords &&
            incomingCoords.length === 2 &&
            !(incomingCoords[0] === 0 && incomingCoords[1] === 0);
          update.location = {
            address: incoming.address,
            coordinates: hasIncomingCoords
              ? incomingCoords
              : existing?.location?.coordinates ?? [0, 0],
          };
        } else {
          res.status(400).json({ message: "Invalid location" });
          return;
        }
      }

      const user = await User.findByIdAndUpdate(req.userId, update, {
        new: true,
        runValidators: true,
      });
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
  if (!mongoose.Types.ObjectId.isValid(req.params.id)) {
    res.status(400).json({ message: "Invalid user id" });
    return;
  }
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
