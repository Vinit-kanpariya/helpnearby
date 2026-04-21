import { useState, useEffect } from "react";
import {
  HandHelping,
  MessageCircle,
  CircleCheck,
  Star,
  MapPin,
  UserPlus,
  Check,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import {
  getNotifications,
  markAllRead,
  markNotificationRead,
} from "../services/api";
import type { Notification } from "../types";

const iconMap: Record<string, typeof HandHelping> = {
  offer: HandHelping,
  message: MessageCircle,
  completed: CircleCheck,
  rating: Star,
  nearby: MapPin,
  accepted: UserPlus,
};

const iconColorMap: Record<string, string> = {
  offer: "text-brand-dark",
  message: "text-brand-dark",
  completed: "text-brand-dark",
  rating: "text-yellow-600",
  nearby: "text-brand-dark",
  accepted: "text-brand-dark",
};

export default function Notifications() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "unread" | "read">("all");
  const [prefs, setPrefs] = useState({
    push: true,
    email: false,
    nearby: true,
  });

  useEffect(() => {
    getNotifications()
      .then((res) =>
        setNotifications(res.data.notifications || res.data || [])
      )
      .finally(() => setLoading(false));
  }, []);

  const handleMarkAll = async () => {
    await markAllRead();
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
  };

  const handleMarkOne = async (id: string) => {
    await markNotificationRead(id);
    setNotifications((prev) =>
      prev.map((n) => (n._id === id ? { ...n, read: true } : n))
    );
  };

  const filtered = notifications.filter((n) => {
    if (filter === "unread") return !n.read;
    if (filter === "read") return n.read;
    return true;
  });

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <main className="flex-1 overflow-y-auto p-8 max-md:p-4 max-md:pb-20">
        <div className="max-w-[900px] mx-auto flex gap-8 max-lg:flex-col">
          {/* Main list */}
          <div className="flex-1">
            <div className="flex items-center justify-between mb-5">
              <h1 className="text-[26px] max-md:text-[20px] font-extrabold text-gray-text">
                Notifications
              </h1>
              <button
                onClick={handleMarkAll}
                className="text-brand-dark text-[13px] font-semibold hover:underline hidden md:inline max-md:text-[12px]"
              >
                Mark all read
              </button>
              <button
                onClick={handleMarkAll}
                className="text-brand-dark text-[12px] font-semibold hover:underline md:hidden"
              >
                Mark all read
              </button>
            </div>

            {/* Filter tabs */}
            <div className="flex gap-1.5 mb-5">
              {(["all", "unread", "read"] as const).map((f) => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`text-[13px] font-semibold px-4 py-2 rounded-lg capitalize ${
                    filter === f
                      ? "bg-brand-dark text-white"
                      : f === "unread"
                        ? "bg-brand-card-bg text-brand-dark border border-brand-card-border"
                        : "text-gray-muted"
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            {loading ? (
              <div className="flex justify-center py-16">
                <div className="w-8 h-8 border-4 border-brand-card-border border-t-brand-dark rounded-full animate-spin" />
              </div>
            ) : filtered.length === 0 ? (
              <p className="text-center text-gray-muted text-[14px] py-16">
                No notifications
              </p>
            ) : (
              <div className="bg-white rounded-xl border border-brand-card-border overflow-hidden max-md:rounded-none max-md:border-x-0">
                {filtered.map((notif) => {
                  const Icon = iconMap[notif.type] || HandHelping;
                  return (
                    <div
                      key={notif._id}
                      onClick={() => !notif.read && handleMarkOne(notif._id)}
                      className={`flex items-start gap-3.5 px-5 py-4 border-b border-brand-card-border last:border-b-0 cursor-pointer hover:bg-brand-card-bg/50 transition-colors max-md:px-4 max-md:py-3.5 max-md:gap-2.5 ${
                        !notif.read ? "bg-brand-card-bg" : "bg-white"
                      }`}
                    >
                      <div className="w-10 h-10 max-md:w-8 max-md:h-8 rounded-full bg-brand-card-border flex items-center justify-center shrink-0">
                        <Icon
                          className={`w-5 h-5 max-md:w-4 max-md:h-4 ${iconColorMap[notif.type] || "text-brand-dark"}`}
                        />
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-[14px] max-md:text-[13px] font-bold text-gray-text">
                          {notif.title}
                        </h3>
                        <p className="text-[13px] max-md:text-[11px] text-gray-muted leading-relaxed">
                          {notif.body}
                        </p>
                        <span className="text-[11px] max-md:text-[10px] text-gray-placeholder">
                          {timeAgo(notif.createdAt)}
                        </span>
                      </div>
                      {!notif.read && (
                        <div className="w-2.5 h-2.5 max-md:w-2 max-md:h-2 bg-brand-dark rounded-full shrink-0 mt-1.5" />
                      )}
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Sidebar - desktop only */}
          <div className="w-[320px] shrink-0 flex flex-col gap-5 max-lg:hidden">
            <h3 className="text-[18px] font-bold text-gray-text">
              Quick Stats
            </h3>
            <div className="bg-white rounded-xl border border-brand-card-border p-5 flex flex-col gap-4">
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-muted">Unread</span>
                <span className="bg-brand-dark text-white text-[13px] font-bold px-3 py-1 rounded-full">
                  {unreadCount}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-muted">This week</span>
                <span className="text-[13px] font-bold text-gray-text">
                  {notifications.length}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[13px] text-gray-muted">Total</span>
                <span className="text-[13px] font-bold text-gray-text">
                  {notifications.length}
                </span>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-brand-card-border p-5 flex flex-col gap-3.5">
              <h4 className="text-[15px] font-bold text-gray-text">
                Preferences
              </h4>
              {(
                [
                  { label: "Push notifications", key: "push" as const },
                  { label: "Email digest", key: "email" as const },
                  { label: "Nearby alerts", key: "nearby" as const },
                ] as const
              ).map((pref) => (
                <div
                  key={pref.key}
                  className="flex items-center justify-between"
                >
                  <span className="text-[13px] text-gray-secondary">
                    {pref.label}
                  </span>
                  <button
                    onClick={() =>
                      setPrefs((p) => ({ ...p, [pref.key]: !p[pref.key] }))
                    }
                    className={`w-10 h-[22px] rounded-full relative transition-colors ${
                      prefs[pref.key] ? "bg-brand-dark" : "bg-gray-300"
                    }`}
                  >
                    <div
                      className={`w-4 h-4 bg-white rounded-full absolute top-[3px] transition-all shadow ${
                        prefs[pref.key] ? "right-[3px]" : "left-[3px]"
                      }`}
                    />
                  </button>
                </div>
              ))}
            </div>

            <button
              onClick={handleMarkAll}
              className="flex items-center justify-center gap-1.5 text-brand-dark text-[13px] font-semibold"
            >
              <Check className="w-4 h-4" /> Mark all as read
            </button>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}

function timeAgo(dateStr: string): string {
  const diff = Date.now() - new Date(dateStr).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 1) return "Just now";
  if (mins < 60) return `${mins} min ago`;
  const hours = Math.floor(mins / 60);
  if (hours < 24) return `${hours} hour${hours > 1 ? "s" : ""} ago`;
  const days = Math.floor(hours / 24);
  if (days === 1) return "Yesterday";
  return `${days} days ago`;
}
