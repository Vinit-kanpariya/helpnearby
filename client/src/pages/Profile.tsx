import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import { Pencil, CheckCircle, MessageSquare, BookOpen } from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { getMyPostedRequests, getMyOffers, getMe } from "../services/api";
import type { HelpRequest, User } from "../types";

export default function Profile() {
  const { user: ctxUser, updateUser } = useAuth();
  const [freshUser, setFreshUser] = useState<User | null>(null);
  const [posted, setPosted] = useState<HelpRequest[]>([]);
  const [offers, setOffers] = useState<HelpRequest[]>([]);

  useEffect(() => {
    getMe()
      .then((res) => {
        const u = res.data.user || res.data;
        setFreshUser(u);
        updateUser(u);
      })
      .catch(() => {});

    getMyPostedRequests()
      .then((res) => setPosted(res.data.requests || res.data || []))
      .catch(() => {});

    getMyOffers()
      .then((res) => setOffers(res.data.requests || res.data || []))
      .catch(() => {});
  }, []);

  const u = freshUser || ctxUser;
  if (!u) return null;

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <main className="flex-1 overflow-y-auto max-md:pb-20">
        {/* Hero */}
        <div className="bg-brand-dark py-10 px-[120px] max-xl:px-8 max-md:px-4 flex flex-col items-center gap-3">
          <div className="w-[80px] h-[80px] bg-brand-light rounded-full" />
          <h1 className="text-[22px] font-extrabold text-white">{u.name}</h1>
          <p className="text-[13px] text-green-200">
            {u.location?.address || "Mumbai"} · Member since{" "}
            {new Date(u.createdAt).toLocaleDateString("en-IN", {
              month: "short",
              year: "numeric",
            })}
          </p>
          {u.bio && (
            <p className="text-[12px] text-green-200 max-w-md text-center">
              {u.bio}
            </p>
          )}
          <div className="flex gap-2 mt-1">
            {u.verified && (
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-brand-light/20 text-brand-light border border-brand-light/30">
                Verified
              </span>
            )}
            {(u.tasksHelped || 0) >= 10 && (
              <span className="text-[11px] font-semibold px-3 py-1 rounded-full bg-brand-light/20 text-brand-light border border-brand-light/30">
                Top Helper
              </span>
            )}
          </div>
        </div>

        {/* Stats */}
        <div className="bg-white border-y border-brand-card-border flex justify-center">
          <div className="flex">
            {[
              { value: u.tasksHelped ?? 0, label: "Tasks Helped" },
              { value: u.requestsPosted ?? posted.length, label: "Requests Posted" },
              { value: `${u.rating?.toFixed(1) ?? "0.0"}★`, label: "Average Rating" },
            ].map((stat) => (
              <div
                key={stat.label}
                className="text-center px-10 max-md:px-6 py-5 border-r border-brand-card-border last:border-r-0"
              >
                <div className="text-[22px] font-extrabold text-brand-dark">
                  {stat.value}
                </div>
                <div className="text-[12px] text-gray-muted">{stat.label}</div>
              </div>
            ))}
          </div>
        </div>

        {/* Content */}
        <div className="px-[120px] max-xl:px-8 max-md:px-4 py-8 flex gap-8 max-md:flex-col">
          {/* Reviews */}
          <div className="flex-1">
            <h2 className="text-[16px] font-extrabold text-gray-text mb-4">
              Reviews
            </h2>
            <p className="text-[13px] text-gray-muted">
              No reviews yet. Reviews appear here after completed tasks.
            </p>
          </div>

          {/* Recent Activity */}
          <div className="w-[340px] max-md:w-full shrink-0">
            <h2 className="text-[16px] font-extrabold text-gray-text mb-4">
              Recent Activity
            </h2>
            <div className="flex flex-col gap-3">
              {[...posted.slice(0, 2), ...offers.slice(0, 1)].map((req, i) => (
                <Link
                  key={req._id || i}
                  to={`/request/${req._id}`}
                  className="flex items-center gap-3 bg-white rounded-xl p-4 border border-brand-card-border hover:shadow-sm transition-shadow"
                >
                  <div className="w-9 h-9 bg-brand-card-bg rounded-lg flex items-center justify-center">
                    {i === 0 ? (
                      <CheckCircle className="w-5 h-5 text-brand-dark" />
                    ) : i === 1 ? (
                      <MessageSquare className="w-5 h-5 text-brand-dark" />
                    ) : (
                      <BookOpen className="w-5 h-5 text-brand-dark" />
                    )}
                  </div>
                  <div>
                    <div className="text-[13px] font-bold text-gray-text">
                      {req.title}
                    </div>
                    <div className="text-[11px] text-gray-muted">
                      {new Date(req.createdAt).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })}
                    </div>
                  </div>
                </Link>
              ))}
              {posted.length === 0 && offers.length === 0 && (
                <p className="text-[13px] text-gray-muted">No activity yet</p>
              )}
            </div>

            <Link
              to="/settings"
              className="mt-6 w-full bg-brand-dark text-white text-[14px] font-semibold py-3 rounded-[10px] hover:bg-green-800 transition-colors flex items-center justify-center gap-2"
            >
              <Pencil className="w-4 h-4" /> Edit Profile
            </Link>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
