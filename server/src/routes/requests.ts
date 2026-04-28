import { Router, Response } from "express";
import { body, validationResult } from "express-validator";
import HelpRequest from "../models/HelpRequest";
import Notification from "../models/Notification";
import User from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

// GET /api/requests
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    else filter.status = "active";

    const requests = await HelpRequest.find(filter)
      .populate("requester", "name rating tasksHelped avatar")
      .sort({ createdAt: -1 })
      .limit(50);

    res.json({ requests });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// GET /api/requests/my/posted
router.get(
  "/my/posted",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const requests = await HelpRequest.find({ requester: req.userId })
        .populate("requester", "name rating")
        .sort({ createdAt: -1 });
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/requests/my/offers
router.get(
  "/my/offers",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const requests = await HelpRequest.find({
        "offers.user": req.userId,
      })
        .populate("requester", "name rating")
        .sort({ createdAt: -1 });
      res.json({ requests });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// POST /api/requests
router.post(
  "/",
  authMiddleware,
  [body("title").trim().notEmpty().withMessage("Title is required")],
  async (req: AuthRequest, res: Response): Promise<void> => {
    const errors = validationResult(req);
    if (!errors.isEmpty()) {
      res.status(400).json({ message: errors.array()[0].msg });
      return;
    }

    try {
      const request = await HelpRequest.create({
        ...req.body,
        requester: req.userId,
      });
      await User.findByIdAndUpdate(req.userId, { $inc: { requestsPosted: 1 } });
      res.status(201).json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/requests/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const request = await HelpRequest.findById(req.params.id)
      .populate("requester", "name rating tasksHelped avatar bio")
      .populate("offers.user", "name rating avatar")
      .populate("helper", "name rating avatar");

    if (!request) {
      res.status(404).json({ message: "Request not found" });
      return;
    }
    res.json({ request });
  } catch (error) {
    res.status(500).json({ message: "Server error" });
  }
});

// POST /api/requests/:id/offer
router.post(
  "/:id/offer",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const request = await HelpRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return;
      }

      const alreadyOffered = request.offers.some(
        (o) => o.user.toString() === req.userId
      );
      if (alreadyOffered) {
        res.status(400).json({ message: "Already offered" });
        return;
      }

      request.offers.push({
        user: req.userId as any,
        message: req.body.message || "",
        status: "pending",
        createdAt: new Date(),
      });
      await request.save();

      // Create notification for requester
      await Notification.create({
        user: request.requester,
        type: "offer",
        title: "New offer on your request",
        body: `Someone offered to help with "${request.title}"`,
        relatedRequest: request._id,
        relatedUser: req.userId,
      });

      res.json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH /api/requests/:id/offer/:offerId
router.patch(
  "/:id/offer/:offerId",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const request = await HelpRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return;
      }
      if (request.requester.toString() !== req.userId) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }

      const offer = request.offers.find(
        (o) => o._id?.toString() === req.params.offerId
      );
      if (!offer) {
        res.status(404).json({ message: "Offer not found" });
        return;
      }

      offer.status = req.body.status;
      if (req.body.status === "accepted") {
        request.status = "in_progress";
        request.helper = offer.user;

        await Notification.create({
          user: offer.user,
          type: "accepted",
          title: "Your offer was accepted!",
          body: `Your offer to help with "${request.title}" has been accepted.`,
          relatedRequest: request._id,
        });
      }

      await request.save();
      res.json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH /api/requests/:id/complete
router.patch(
  "/:id/complete",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const request = await HelpRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return;
      }
      if (request.requester.toString() !== req.userId) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }
      request.status = "completed";
      await request.save();

      // Update helper's rating and tasksHelped if a rating was provided
      const { rating, comment } = req.body;
      if (request.helper && rating && rating >= 1 && rating <= 5) {
        const helper = await User.findById(request.helper);
        if (helper) {
          const count = helper.tasksHelped || 0;
          helper.rating = count > 0
            ? Math.round(((helper.rating * count + rating) / (count + 1)) * 10) / 10
            : rating;
          helper.tasksHelped = count + 1;
          await helper.save();
        }
      }

      if (request.helper) {
        await Notification.create({
          user: request.helper,
          type: "completed",
          title: "Request completed!",
          body: comment
            ? `"${request.title}" was completed. Review: "${comment}"`
            : `"${request.title}" was marked as completed.`,
          relatedRequest: request._id,
        });
      }

      res.json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH /api/requests/:id/cancel - Withdraw/cancel a request (owner only, active only)
router.patch(
  "/:id/cancel",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const request = await HelpRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return;
      }
      if (request.requester.toString() !== req.userId) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }
      if (request.status !== "active") {
        res.status(400).json({ message: "Only active requests can be withdrawn" });
        return;
      }
      request.status = "cancelled";
      await request.save();
      res.json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// PATCH /api/requests/:id - Update a request (owner only, active only)
router.patch(
  "/:id",
  authMiddleware,
  async (req: AuthRequest, res: Response): Promise<void> => {
    try {
      const request = await HelpRequest.findById(req.params.id);
      if (!request) {
        res.status(404).json({ message: "Request not found" });
        return;
      }
      if (request.requester.toString() !== req.userId) {
        res.status(403).json({ message: "Not authorized" });
        return;
      }
      if (request.status !== "active") {
        res.status(400).json({ message: "Only active requests can be edited" });
        return;
      }

      const { title, description, date, time, rewardType, rewardAmount, rewardDescription, category } = req.body;
      if (title !== undefined) request.title = title;
      if (description !== undefined) request.description = description;
      if (date !== undefined) request.date = date;
      if (time !== undefined) request.time = time;
      if (rewardType !== undefined) request.rewardType = rewardType;
      if (rewardAmount !== undefined) request.rewardAmount = rewardAmount;
      if (rewardDescription !== undefined) request.rewardDescription = rewardDescription;
      if (category !== undefined) request.category = category;

      await request.save();
      res.json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

export default router;
