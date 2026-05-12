import { Router, Response } from "express";
import mongoose from "mongoose";
import { body, validationResult } from "express-validator";
import HelpRequest from "../models/HelpRequest";
import Notification from "../models/Notification";
import User from "../models/User";
import { authMiddleware, AuthRequest } from "../middleware/auth";

const router = Router();

const isValidObjectId = (id: string | undefined): boolean =>
  !!id && mongoose.Types.ObjectId.isValid(id);

const VALID_OFFER_STATUSES = new Set(["accepted", "rejected"]);

// GET /api/requests
router.get("/", async (req: AuthRequest, res: Response): Promise<void> => {
  try {
    const { category, status } = req.query;
    const filter: Record<string, unknown> = {};
    if (category) filter.category = category;
    if (status) filter.status = status;
    else filter.status = "active";

    const limit = Math.min(Number(req.query.limit) || 50, 100);
    const skip = Math.max(Number(req.query.skip) || 0, 0);

    const requests = await HelpRequest.find(filter)
      .populate("requester", "name rating tasksHelped avatar")
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit);

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
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const skip = Math.max(Number(req.query.skip) || 0, 0);
      const requests = await HelpRequest.find({ requester: req.userId })
        .populate("requester", "name rating")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
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
      const limit = Math.min(Number(req.query.limit) || 50, 100);
      const skip = Math.max(Number(req.query.skip) || 0, 0);
      const requests = await HelpRequest.find({
        "offers.user": req.userId,
      })
        .populate("requester", "name rating")
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);
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
      // Whitelist the fields a client may set, so users can't inject helper,
      // status, offers, etc. via the body.
      const {
        title,
        description,
        category,
        date,
        time,
        location,
        rewardType,
        rewardAmount,
        rewardDescription,
      } = req.body;

      const request = await HelpRequest.create({
        title,
        description,
        category,
        date,
        time,
        location,
        rewardType,
        rewardAmount,
        rewardDescription,
        requester: req.userId,
      });
      // Counter is incremented after creation succeeds. We intentionally do
      // not fail the request if this update fails — it is best-effort.
      User.findByIdAndUpdate(req.userId, { $inc: { requestsPosted: 1 } }).catch(
        (err) => console.error("[requests] failed to increment requestsPosted", err)
      );
      res.status(201).json({ request });
    } catch (error) {
      res.status(500).json({ message: "Server error" });
    }
  }
);

// GET /api/requests/:id
router.get("/:id", async (req: AuthRequest, res: Response): Promise<void> => {
  if (!isValidObjectId(req.params.id)) {
    res.status(400).json({ message: "Invalid request id" });
    return;
  }
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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid request id" });
      return;
    }
    try {
      // Atomic insert: only push the offer if the request is still active and
      // the user hasn't already offered. Prevents duplicate offers and offers
      // on completed/cancelled/in_progress requests.
      const updated = await HelpRequest.findOneAndUpdate(
        {
          _id: req.params.id,
          status: "active",
          "offers.user": { $ne: req.userId },
        },
        {
          $push: {
            offers: {
              user: req.userId,
              message: req.body.message || "",
              status: "pending",
              createdAt: new Date(),
            },
          },
        },
        { new: true }
      );

      if (!updated) {
        // Either the request doesn't exist, isn't active, or the user already offered.
        const existing = await HelpRequest.findById(req.params.id).select(
          "status offers.user requester title"
        );
        if (!existing) {
          res.status(404).json({ message: "Request not found" });
          return;
        }
        if (existing.status !== "active") {
          res.status(400).json({ message: "This request is no longer accepting offers" });
          return;
        }
        res.status(400).json({ message: "Already offered" });
        return;
      }

      await Notification.create({
        user: updated.requester,
        type: "offer",
        title: "New offer on your request",
        body: `Someone offered to help with "${updated.title}"`,
        relatedRequest: updated._id,
        relatedUser: req.userId,
      });

      res.json({ request: updated });
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
    if (!isValidObjectId(req.params.id) || !isValidObjectId(req.params.offerId)) {
      res.status(400).json({ message: "Invalid id" });
      return;
    }
    const status = req.body?.status;
    if (!VALID_OFFER_STATUSES.has(status)) {
      res.status(400).json({ message: "status must be 'accepted' or 'rejected'" });
      return;
    }

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

      if (offer.status !== "pending") {
        res.status(400).json({ message: `Offer is already ${offer.status}` });
        return;
      }

      if (status === "accepted") {
        if (request.status !== "active") {
          res.status(400).json({ message: "Request is no longer active" });
          return;
        }
        offer.status = "accepted";
        request.status = "in_progress";
        request.helper = offer.user;

        // Auto-reject any other pending offers so they don't sit in limbo.
        const rejectedUserIds: mongoose.Types.ObjectId[] = [];
        for (const other of request.offers) {
          if (
            other._id?.toString() !== offer._id?.toString() &&
            other.status === "pending"
          ) {
            other.status = "rejected";
            rejectedUserIds.push(other.user);
          }
        }

        await request.save();

        await Notification.create({
          user: offer.user,
          type: "accepted",
          title: "Your offer was accepted!",
          body: `Your offer to help with "${request.title}" has been accepted.`,
          relatedRequest: request._id,
        });

        if (rejectedUserIds.length > 0) {
          await Notification.insertMany(
            rejectedUserIds.map((uid) => ({
              user: uid,
              type: "offer",
              title: "Offer not selected",
              body: `Another helper was chosen for "${request.title}".`,
              relatedRequest: request._id,
            }))
          );
        }
      } else {
        offer.status = "rejected";
        await request.save();
      }

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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid request id" });
      return;
    }
    try {
      // Atomic transition: only flip from in_progress to completed once. This
      // prevents repeat /complete calls from inflating the helper's rating.
      const request = await HelpRequest.findOneAndUpdate(
        {
          _id: req.params.id,
          requester: req.userId,
          status: "in_progress",
        },
        { $set: { status: "completed" } },
        { new: true }
      );
      if (!request) {
        const existing = await HelpRequest.findById(req.params.id).select(
          "status requester"
        );
        if (!existing) {
          res.status(404).json({ message: "Request not found" });
          return;
        }
        if (existing.requester.toString() !== req.userId) {
          res.status(403).json({ message: "Not authorized" });
          return;
        }
        res.status(400).json({
          message: "Only in-progress requests with an accepted helper can be completed",
        });
        return;
      }

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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid request id" });
      return;
    }
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

      // Reject any pending offers and notify their owners so helpers don't
      // think their offer is still under consideration.
      const pendingHelpers: mongoose.Types.ObjectId[] = [];
      for (const offer of request.offers) {
        if (offer.status === "pending") {
          offer.status = "rejected";
          pendingHelpers.push(offer.user);
        }
      }
      request.status = "cancelled";
      await request.save();

      if (pendingHelpers.length > 0) {
        await Notification.insertMany(
          pendingHelpers.map((uid) => ({
            user: uid,
            type: "offer",
            title: "Request withdrawn",
            body: `"${request.title}" was withdrawn by the requester.`,
            relatedRequest: request._id,
          }))
        );
      }

      // Best-effort decrement of the requester's posted counter.
      User.findByIdAndUpdate(req.userId, {
        $inc: { requestsPosted: -1 },
      }).catch((err) =>
        console.error("[requests] failed to decrement requestsPosted", err)
      );

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
    if (!isValidObjectId(req.params.id)) {
      res.status(400).json({ message: "Invalid request id" });
      return;
    }
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
