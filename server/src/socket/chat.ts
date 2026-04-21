import { Server as HttpServer } from "http";
import { Server, Socket } from "socket.io";
import jwt from "jsonwebtoken";
import Message from "../models/Message";
import Notification from "../models/Notification";

export function setupSocket(httpServer: HttpServer): Server {
  const io = new Server(httpServer, {
    cors: {
      origin: (origin, callback) => {
        if (
          !origin ||
          origin === "http://localhost:5173" ||
          /\.ngrok-free\.app$/.test(origin) ||
          /\.ngrok\.io$/.test(origin) ||
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
      const decoded = jwt.verify(
        token,
        process.env.JWT_SECRET || "fallback_secret"
      ) as { userId: string };
      (socket as any).userId = decoded.userId;
      next();
    } catch {
      next(new Error("Invalid token"));
    }
  });

  io.on("connection", (socket: Socket) => {
    const userId = (socket as any).userId;
    console.log(`User connected: ${userId}`);

    // Join user's personal room
    socket.on("join", (roomUserId: string) => {
      socket.join(roomUserId);
    });

    // Send message
    socket.on(
      "sendMessage",
      async (data: { sender: string; receiver: string; content: string; requestId?: string }) => {
        try {
          const message = await Message.create({
            sender: data.sender,
            receiver: data.receiver,
            content: data.content,
            requestId: data.requestId,
          });

          // Emit to receiver's room
          io.to(data.receiver).emit("newMessage", message);

          // Create notification
          await Notification.create({
            user: data.receiver,
            type: "message",
            title: "New message",
            body: data.content.substring(0, 100),
            relatedUser: data.sender,
          });
        } catch (error) {
          console.error("Error sending message:", error);
        }
      }
    );

    // Deliver an already-saved message to receiver in real-time (no DB write)
    socket.on(
      "deliverMessage",
      (data: { receiver: string; message: Record<string, unknown> }) => {
        io.to(data.receiver).emit("newMessage", data.message);
      }
    );

    // Typing indicator
    socket.on(
      "typing",
      (data: { sender: string; receiver: string; isTyping: boolean }) => {
        io.to(data.receiver).emit("userTyping", {
          userId: data.sender,
          isTyping: data.isTyping,
        });
      }
    );

    // Mark messages as read
    socket.on(
      "messageRead",
      async (data: { messageIds: string[]; readBy: string }) => {
        try {
          await Message.updateMany(
            { _id: { $in: data.messageIds } },
            { read: true }
          );
          // Notify sender that messages were read
          io.emit("messagesRead", {
            messageIds: data.messageIds,
            readBy: data.readBy,
          });
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
