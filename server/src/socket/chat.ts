import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message";
import Notification from "../models/Notification";

export function setupSocket(httpServer: HttpServer): Server {
  const jwtSecret = process.env.JWT_SECRET;
  if (!jwtSecret) {
    throw new Error("JWT_SECRET environment variable is required");
  }

  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          origin === "http://localhost:5173" ||
          /\.ngrok-free\.app$/.test(origin) ||
          /\.ngrok\.io$/.test(origin) ||
          /\.trycloudflare\.com$/.test(origin) ||
          /\.vercel\.app$/.test(origin) ||
          origin === (process.env.CLIENT_URL || "")
        ) {
          callback(null, true);
        } else {
          callback(new Error(`CORS: origin ${origin} not allowed`));
        }
      },
      methods: ["GET", "POST"],
      credentials: true,
    },
  });

  // Auth middleware
  io.use((socket, next) => {
    const token = socket.handshake.auth?.token;
    if (!token) return next(new Error("Authentication required"));

    try {
      const decoded = jwt.verify(token, jwtSecret) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId as string;
    console.log(`User connected: ${userId}`);

    // Auto-join the authenticated user's personal room. The client may still
    // emit "join", but we ignore the supplied id and only join the user's own
    // room — preventing eavesdropping on other users' rooms.
    socket.join(userId);
    socket.on("join", () => {
      socket.join(userId);
    });

    // Send message — sender is taken from the authenticated socket, never
    // from the client payload.
    socket.on(
      "sendMessage",
      async (data: { receiver: string; content: string; requestId?: string }) => {
        try {
          if (!data?.receiver || !data?.content?.trim()) return;
          const message = await Message.create({
            sender: userId,
            receiver: data.receiver,
            content: data.content.trim(),
            requestId: data.requestId,
          });

          io.to(data.receiver).emit("newMessage", message);

          await Notification.create({
            user: data.receiver,
            type: "message",
            title: "New message",
            body: data.content.trim().substring(0, 100),
            relatedUser: userId,
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
    );

    // Deliver an already-saved message to receiver in real-time (no DB write).
    // We require the saved message to have been created by this socket's user.
    socket.on(
      "deliverMessage",
      (data: { receiver: string; message: Record<string, unknown> }) => {
        if (!data?.receiver || !data?.message) return;
        const senderField = (data.message as { sender?: unknown }).sender;
        const senderId =
          typeof senderField === "string"
            ? senderField
            : senderField && typeof senderField === "object" && "_id" in senderField
              ? String((senderField as { _id: unknown })._id)
              : "";
        if (senderId !== userId) return;
        io.to(data.receiver).emit("newMessage", data.message);
      }
    );

    // Typing indicator — sender is the authenticated user.
    socket.on(
      "typing",
      (data: { receiver: string; isTyping: boolean }) => {
        if (!data?.receiver) return;
        io.to(data.receiver).emit("userTyping", {
          userId,
          isTyping: !!data.isTyping,
        });
      }
    );

    // Mark messages as read — only messages the user actually received.
    // Notify only the original senders, not the entire server.
    socket.on(
      "messageRead",
      async (data: { messageIds: string[] }) => {
        try {
          if (!Array.isArray(data?.messageIds) || data.messageIds.length === 0) return;
          const messages = await Message.find({
            _id: { $in: data.messageIds },
            receiver: userId,
          }).select("_id sender");
          if (messages.length === 0) return;

          const ids = messages.map((m) => m._id);
          await Message.updateMany(
            { _id: { $in: ids } },
            { read: true }
          );

          const senders = new Set(messages.map((m) => m.sender.toString()));
          for (const senderId of senders) {
            io.to(senderId).emit("messagesRead", {
              messageIds: messages
                .filter((m) => m.sender.toString() === senderId)
                .map((m) => m._id.toString()),
              readBy: userId,
            });
          }
        } catch (error) {
          console.error("Error marking messages read:", error);
        }
      }
    );

    socket.on("disconnect", () => {
      console.log(`User disconnected: ${userId}`);
    });
  });

  return io;
}
