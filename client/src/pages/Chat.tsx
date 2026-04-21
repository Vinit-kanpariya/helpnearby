import { useState, useEffect, useRef } from "react";
import { Search, Send } from "lucide-react";
import { useSearchParams } from "react-router-dom";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { getConversations, getMessages, sendMessage as sendMessageApi, getPublicProfile } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { useSocket } from "../contexts/SocketContext";
import type { Conversation, Message as MsgType } from "../types";

export default function Chat() {
  const { user } = useAuth();
  const { socket } = useSocket();
  const [searchParams] = useSearchParams();
  const [conversations, setConversations] = useState<Conversation[]>([]);
  const [activeChat, setActiveChat] = useState<Conversation | null>(null);
  const [messages, setMessages] = useState<MsgType[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    getConversations()
      .then(async (res) => {
        const convos: Conversation[] = res.data.conversations || res.data || [];
        setConversations(convos);

        // Auto-open conversation if ?with=userId is present
        const withId = searchParams.get("with");
        if (withId) {
          const existing = convos.find((c) => c.user._id === withId);
          if (existing) {
            setActiveChat(existing);
          } else {
            // Fetch the user's profile to create a new conversation entry
            try {
              const profileRes = await getPublicProfile(withId);
              const otherUser = profileRes.data.user || profileRes.data;
              const synthetic: Conversation = {
                _id: withId,
                user: otherUser,
                lastMessage: null as unknown as MsgType,
                unreadCount: 0,
              };
              setConversations((prev) => [synthetic, ...prev]);
              setActiveChat(synthetic);
            } catch { /* ignore */ }
          }
        }
      })
      .finally(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (activeChat) {
      getMessages(activeChat.user._id).then((res) => {
        setMessages(res.data.messages || res.data || []);
      });
    }
  }, [activeChat]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages]);

  useEffect(() => {
    if (socket) {
      socket.on("newMessage", (msg: MsgType) => {
        setMessages((prev) => [...prev, msg]);
      });
      return () => {
        socket.off("newMessage");
      };
    }
  }, [socket]);

  const sendMessage = async () => {
    if (!input.trim() || !activeChat || !user) return;
    const content = input.trim();
    const receiverId = activeChat.user._id;
    setInput("");

    try {
      // Save via REST so the message is always persisted
      const res = await sendMessageApi(receiverId, content);
      const saved: MsgType = res.data.message;
      setMessages((prev) => [...prev, saved]);

      // Deliver via socket for real-time (message already saved by REST above)
      if (socket) {
        socket.emit("deliverMessage", { receiver: receiverId, message: saved });
      }
    } catch {
      // Restore input if save failed
      setInput(content);
    }
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      sendMessage();
    }
  };

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar */}
        <aside
          className={`w-[360px] max-md:w-full bg-white border-r border-brand-card-border flex flex-col ${
            activeChat ? "max-md:hidden" : ""
          }`}
        >
          <div className="p-5">
            <h2 className="text-[18px] font-extrabold text-gray-text mb-4">
              Messages
            </h2>
            <div className="flex items-center gap-2 bg-brand-card-bg border border-brand-card-border rounded-[10px] px-3 py-2.5">
              <Search className="w-4 h-4 text-gray-placeholder" />
              <input
                placeholder="Search conversations..."
                className="flex-1 text-[13px] outline-none bg-transparent placeholder-gray-placeholder"
              />
            </div>
          </div>
          <div className="flex-1 overflow-y-auto">
            {conversations.length === 0 && !loading && (
              <p className="text-center text-[13px] text-gray-muted py-10">
                No conversations yet
              </p>
            )}
            {conversations.map((conv) => (
              <button
                key={conv._id}
                onClick={() => setActiveChat(conv)}
                className={`w-full text-left flex items-center gap-3 px-5 py-4 border-b border-brand-card-border hover:bg-brand-card-bg transition-colors ${
                  activeChat?._id === conv._id ? "bg-brand-card-bg" : ""
                }`}
              >
                <div className="w-10 h-10 bg-brand-light rounded-full shrink-0" />
                <div className="flex-1 min-w-0">
                  <div className="text-[14px] font-bold text-gray-text truncate">
                    {conv.user.name}
                  </div>
                  <div className="text-[12px] text-gray-muted truncate">
                    {conv.lastMessage?.content || "Start chatting"}
                  </div>
                </div>
              </button>
            ))}
          </div>
        </aside>

        {/* Chat area */}
        <div
          className={`flex-1 flex flex-col bg-brand-accent ${
            !activeChat ? "max-md:hidden" : ""
          }`}
        >
          {activeChat ? (
            <>
              {/* Chat header */}
              <div className="flex items-center gap-3 px-6 py-4 bg-white border-b border-brand-card-border">
                <button
                  onClick={() => setActiveChat(null)}
                  className="md:hidden text-gray-muted mr-1"
                >
                  ←
                </button>
                <div className="w-9 h-9 bg-brand-light rounded-full" />
                <div>
                  <div className="text-[14px] font-bold text-gray-text">
                    {activeChat.user.name}
                  </div>
                  <div className="text-[11px] text-gray-muted">
                    {activeChat.lastMessage?.createdAt
                      ? `Last active ${new Date(activeChat.lastMessage.createdAt).toLocaleString()}`
                      : "Online"}
                  </div>
                </div>
              </div>

              {/* Messages */}
              <div className="flex-1 overflow-y-auto px-6 py-4 flex flex-col gap-3">
                {messages.map((msg) => {
                  const isMine =
                    (typeof msg.sender === "object"
                      ? msg.sender._id
                      : msg.sender) === user?._id;
                  return (
                    <div
                      key={msg._id}
                      className={`flex ${isMine ? "justify-end" : "justify-start"}`}
                    >
                      <div
                        className={`max-w-[70%] px-4 py-2.5 rounded-2xl text-[14px] ${
                          isMine
                            ? "bg-brand-dark text-white rounded-br-md"
                            : "bg-white text-gray-text border border-brand-card-border rounded-bl-md"
                        }`}
                      >
                        {msg.content}
                      </div>
                    </div>
                  );
                })}
                <div ref={messagesEndRef} />
              </div>

              {/* Input */}
              <div className="flex items-center gap-2.5 px-4 py-3 bg-white border-t border-brand-card-border max-md:mb-16">
                <div className="flex-1 flex items-center bg-brand-card-bg border border-brand-card-border rounded-full px-4 py-2.5">
                  <input
                    value={input}
                    onChange={(e) => setInput(e.target.value)}
                    onKeyDown={handleKeyPress}
                    placeholder="Type a message..."
                    className="flex-1 text-[14px] outline-none bg-transparent placeholder-gray-placeholder"
                  />
                </div>
                <button
                  onClick={sendMessage}
                  className="w-10 h-10 bg-brand-dark rounded-full flex items-center justify-center hover:bg-green-800 transition-colors"
                >
                  <Send className="w-4 h-4 text-white" />
                </button>
              </div>
            </>
          ) : (
            <div className="flex-1 flex items-center justify-center max-md:hidden">
              <p className="text-gray-muted text-[14px]">
                Select a conversation to start chatting
              </p>
            </div>
          )}
        </div>
      </div>

      <BottomNav />
    </div>
  );
}
