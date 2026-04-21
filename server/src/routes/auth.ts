import { Router, Request, Response } from "express";
import jwt from "jsonwebtoken";
import { OAuth2Client } from "google-auth-library";
import { body, validationResult } from "express-validator";
import User from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const googleClient = new OAuth2Client(process.env.GOOGLE_CLIENT_ID);

const router = Router();

const generateToken = (userId: string): string =>
  jwt.sign({ userId }, process.env.JWT_SECRET || "fallback_secret", {
    expiresIn: "30d",
  });

// POST /api/auth/register
router.post(
  "/register",
  [
    body("name").trim().notEmpty().withMessage("Name is required"),
    body("email").isEmail().withMessage("Valid email required"),
    body("password")
      .isLength({ min: 6 })
      .withMessage("Password must be at least 6 characters"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    try {
      const { name, email, password, location } = req.body;
      const existing = await User.findOne({ email });
      if (existing) {
        res.status(400).json({ message: "Email already registered" });
        return;
      }

      const user = await User.create({
        name,
        email,
        password,
        location: location
          ? { address: location, coordinates: [0, 0] }
          : undefined,
      });

      const token = generateToken(user._id.toString());
      res.status(201).json({ token, user });
    } catch (error) {
      console.error("[auth]", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/login
router.post(
  "/login",
  [
    body("email").isEmail().withMessage("Valid email required"),
    body("password").notEmpty().withMessage("Password is required"),
  ],
  async (req: Request, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    try {
      const { email, password } = req.body;
      const user = await User.findOne({ email }).select("+password");
      if (!user) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const isMatch = await user.comparePassword(password);
      if (!isMatch) {
        res.status(401).json({ message: "Invalid credentials" });
        return;
      }

      const token = generateToken(user._id.toString());
      const userObj = user.toJSON();
      res.json({ token, user: userObj });
    } catch (error) {
      console.error("[auth]", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/auth/me
router.get(
  "/me",
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
      console.error("[auth]", error);
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/auth/google
router.post("/google", async (req: Request, res: Response): Promise<void> => {
  const { credential, accessToken } = req.body;
  if (!credential && !accessToken) {
    res.status(400).json({ message: "Google credential required" });
    return;
  }

  try {
    let email: string | undefined;
    let name: string | undefined;
    let picture: string | undefined;

    if (credential) {
      if (!process.env.GOOGLE_CLIENT_ID) {
        res.status(500).json({ message: "Google OAuth not configured on server" });
        return;
      }
      const ticket = await googleClient.verifyIdToken({
        idToken: credential,
        audience: process.env.GOOGLE_CLIENT_ID,
      });
      const payload = ticket.getPayload();
      if (!payload || !payload.email) {
        res.status(400).json({ message: "Invalid Google token" });
        return;
      }
      email = payload.email;
      name = payload.name;
      picture = payload.picture;
    } else {
      const response = await fetch("https://www.googleapis.com/oauth2/v3/userinfo", {
        headers: { Authorization: `Bearer ${accessToken}` },
      });
      if (!response.ok) {
        res.status(401).json({ message: "Invalid Google access token" });
        return;
      }
      const info = await response.json() as { email?: string; name?: string; picture?: string };
      email = info.email;
      name = info.name;
      picture = info.picture;
    }

    if (!email) {
      res.status(400).json({ message: "Could not retrieve email from Google" });
      return;
    }

    let user = await User.findOne({ email });
    if (!user) {
      const randomPassword = `google_${Math.random().toString(36).slice(2)}${Date.now()}`;
      user = await User.create({
        name: name || email.split("@")[0],
        email,
        password: randomPassword,
        avatar: picture,
      });
    }

    const token = generateToken(user._id.toString());
    res.json({ token, user: user.toJSON() });
  } catch {
    res.status(401).json({ message: "Google authentication failed" });
  }
});

export default router;
