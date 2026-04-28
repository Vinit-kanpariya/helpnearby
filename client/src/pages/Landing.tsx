import { useState, useEffect } from "react";
import { Link, useNavigate } from "react-router-dom";
import {
  MapPin,
  ClipboardList,
  Users,
  CheckCircle,
  ChevronRight,
  ShieldCheck,
  Clock,
} from "lucide-react";
import { getStats, getMyPostedRequests, getMyOffers } from "../services/api";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../contexts/AuthContext";
import type { HelpRequest } from "../types";

/* ─── helpers ─── */
function statusBadge(status: string) {
  if (status === "active")
    return { text: "Active", cls: "bg-green-100 text-green-700" };
  if (status === "in_progress")
    return { text: "Pending", cls: "bg-yellow-100 text-yellow-700" };
  if (status === "completed")
    return { text: "Completed", cls: "bg-gray-100 text-gray-500" };
  if (status === "cancelled")
    return { text: "Withdrawn", cls: "bg-red-100 text-red-500" };
  return { text: status, cls: "bg-gray-100 text-gray-500" };
}

function cardBorderColor(status: string) {
  if (status === "active") return "border-l-4 border-l-green-600";
  if (status === "in_progress") return "border-l-4 border-l-yellow-500";
  return "border-l-4 border-l-gray-200";
}

function rewardLabel(req: HelpRequest) {
  if (req.rewardType === "cash") return `₹${req.rewardAmount ?? 0} reward`;
  if (req.rewardType === "free") return "Free / Volunteer";
  return req.rewardType.charAt(0).toUpperCase() + req.rewardType.slice(1);
}

type FilterTab = "all" | "active" | "completed";

function FilterTabs({
  value,
  onChange,
}: {
  value: FilterTab;
  onChange: (v: FilterTab) => void;
}) {
  return (
    <div className="flex items-center gap-1">
      {(["all", "active", "completed"] as FilterTab[]).map((tab) => (
        <button
          key={tab}
          onClick={() => onChange(tab)}
          className={`text-[12px] font-semibold px-3 py-1 rounded-full transition-colors capitalize ${
            value === tab
              ? "bg-brand-dark text-white"
              : "text-gray-secondary hover:bg-brand-card-bg"
          }`}
        >
          {tab === "all" ? "All" : tab.charAt(0).toUpperCase() + tab.slice(1)}
        </button>
      ))}
    </div>
  );
}

/* ─── Dashboard ─── */
function Dashboard() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [posts, setPosts] = useState<HelpRequest[]>([]);
  const [myOffers, setMyOffers] = useState<HelpRequest[]>([]);
  const [communityCount, setCommunityCount] = useState<number>(0);
  const [postedFilter, setPostedFilter] = useState<FilterTab>("all");
  const [offersFilter, setOffersFilter] = useState<FilterTab>("all");
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    Promise.all([
      getMyPostedRequests(),
      getMyOffers(),
      getStats(),
    ])
      .then(([postsRes, offersRes, statsRes]) => {
        setPosts(postsRes.data.requests || postsRes.data || []);
        setMyOffers(offersRes.data.requests || offersRes.data || []);
        setCommunityCount(statsRes.data?.userCount ?? 0);
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  if (!user) return null;

  /* computed stats */
  const activeRequestsCount = posts.filter((p) => p.status === "active").length;
  const pendingOffersCount = posts.reduce(
    (sum, p) => sum + (p.offers?.filter((o) => o.status === "pending").length ?? 0),
    0
  );
  const totalOffersReceived = posts.reduce(
    (sum, p) => sum + (p.offers?.length ?? 0),
    0
  );

  /* filtered lists */
  const filteredPosts = posts.filter((p) => {
    if (postedFilter === "active") return p.status === "active";
    if (postedFilter === "completed") return p.status === "completed";
    return true;
  });

  const filteredOffers = myOffers.filter((req) => {
    if (offersFilter === "active")
      return req.status === "active" || req.status === "in_progress";
    if (offersFilter === "completed") return req.status === "completed";
    return true;
  });

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k` : String(n);

  return (
    <div className="bg-[#f5f7f5] min-h-full max-md:pb-20">
      {/* ── Welcome banner ── */}
      <div className="px-[120px] max-xl:px-8 max-md:px-4 pt-8 pb-6">
        <div className="bg-[#eaf4ea] rounded-2xl px-8 py-7 max-md:px-5 max-md:py-5">
          <h2 className="text-[22px] font-extrabold text-gray-text mb-1">
            Welcome Back!
          </h2>
          <p className="text-[14px] text-gray-secondary mb-5">
            {pendingOffersCount > 0
              ? `You have ${pendingOffersCount} new offer${pendingOffersCount !== 1 ? "s" : ""} waiting. Keep up the great community spirit!`
              : "Welcome back! Check your requests and offers below."}
          </p>
          <div className="flex gap-3">
            <Link
              to="/browse"
              onClick={() => document.getElementById("my-offers")?.scrollIntoView({ behavior: "smooth" })}
              className="bg-brand-dark text-white text-[13px] font-semibold px-5 py-2.5 rounded-[10px] hover:bg-green-800 transition-colors"
            >
              View Offers
            </Link>
            <Link
              to="/post"
              className="bg-white text-gray-text text-[13px] font-semibold px-5 py-2.5 rounded-[10px] border border-brand-card-border hover:bg-brand-card-bg transition-colors"
            >
              Post a Request
            </Link>
          </div>
        </div>
      </div>

      {/* ── Stats row ── */}
      <div className="px-[120px] max-xl:px-8 max-md:px-4 pb-8">
        <div className="grid grid-cols-4 max-lg:grid-cols-2 max-md:grid-cols-2 gap-4">
          {[
            {
              icon: ClipboardList,
              value: loading ? "—" : activeRequestsCount,
              label: "Active Requests",
              badge: pendingOffersCount > 0 ? `↑ ${pendingOffersCount} new` : null,
            },
            {
              icon: ShieldCheck,
              value: loading ? "—" : totalOffersReceived,
              label: "Offers Received",
              badge: null,
            },
            {
              icon: Clock,
              value: loading ? "—" : user.tasksHelped ?? 0,
              label: "Tasks Completed",
              badge: null,
            },
            {
              icon: Users,
              value: loading ? "—" : fmt(communityCount),
              label: "Community Members",
              badge: null,
            },
          ].map((s) => (
            <div
              key={s.label}
              className="bg-white rounded-xl border border-brand-card-border px-5 py-5 relative"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="w-9 h-9 rounded-lg bg-brand-card-bg flex items-center justify-center">
                  <s.icon className="w-4.5 h-4.5 text-brand-dark" style={{ width: 18, height: 18 }} />
                </div>
                {s.badge && (
                  <span className="text-[11px] font-semibold bg-green-100 text-green-700 px-2 py-0.5 rounded-full flex items-center gap-0.5">
                    {s.badge}
                  </span>
                )}
              </div>
              <div className="text-[32px] max-md:text-[24px] font-extrabold text-gray-text leading-none mb-1">
                {s.value}
              </div>
              <div className="text-[13px] text-gray-muted">{s.label}</div>
            </div>
          ))}
        </div>
      </div>

      {/* ── My Posted Requests ── */}
      <div className="px-[120px] max-xl:px-8 max-md:px-4 pb-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-extrabold text-gray-text">
            My Posted Requests
          </h2>
          <FilterTabs value={postedFilter} onChange={setPostedFilter} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-4 border-brand-card-border border-t-brand-dark rounded-full animate-spin" />
          </div>
        ) : filteredPosts.length === 0 ? (
          <div className="bg-white rounded-xl border border-brand-card-border p-8 text-center">
            <p className="text-[14px] font-semibold text-gray-text mb-1">
              No requests yet
            </p>
            <p className="text-[13px] text-gray-muted mb-4">
              Post a request and get help from your community.
            </p>
            <Link
              to="/post"
              className="inline-flex items-center gap-2 bg-brand-dark text-white text-[13px] font-semibold px-5 py-2.5 rounded-[10px] hover:bg-green-800 transition-colors"
            >
              Post a Request
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
            {filteredPosts.map((req) => {
              const badge = statusBadge(req.status);
              const borderCls = cardBorderColor(req.status);
              return (
                <button
                  key={req._id}
                  onClick={() => navigate(`/request/${req._id}`)}
                  className={`bg-white rounded-xl border border-brand-card-border ${borderCls} px-5 py-4 text-left hover:shadow-sm transition-shadow w-full`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[14px] font-bold text-gray-text leading-snug line-clamp-2">
                      {req.title}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-muted mb-2 flex items-center gap-2 flex-wrap">
                    {req.date && (
                      <span>
                        {new Date(req.date).toLocaleDateString("en-IN", {
                          month: "short",
                          day: "numeric",
                          year: "numeric",
                        })}
                      </span>
                    )}
                    <span className="text-brand-dark font-semibold">
                      {rewardLabel(req)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between">
                    <span className="text-[12px] text-gray-muted">
                      {req.offers?.length ?? 0} respondent
                      {req.offers?.length !== 1 ? "s" : ""}
                    </span>
                    <ChevronRight className="w-4 h-4 text-gray-muted" />
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>

      {/* ── My Offers ── */}
      <div
        id="my-offers"
        className="px-[120px] max-xl:px-8 max-md:px-4 pb-10"
      >
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[16px] font-extrabold text-gray-text">
            My Offers
          </h2>
          <FilterTabs value={offersFilter} onChange={setOffersFilter} />
        </div>

        {loading ? (
          <div className="flex items-center justify-center py-12">
            <div className="w-7 h-7 border-4 border-brand-card-border border-t-brand-dark rounded-full animate-spin" />
          </div>
        ) : filteredOffers.length === 0 ? (
          <div className="bg-white rounded-xl border border-brand-card-border p-8 text-center">
            <p className="text-[14px] font-semibold text-gray-text mb-1">
              No offers yet
            </p>
            <p className="text-[13px] text-gray-muted mb-4">
              Browse nearby requests and offer to help someone.
            </p>
            <Link
              to="/browse"
              className="inline-flex items-center gap-2 bg-brand-dark text-white text-[13px] font-semibold px-5 py-2.5 rounded-[10px] hover:bg-green-800 transition-colors"
            >
              Browse Nearby
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
            {filteredOffers.map((req) => {
              const badge = statusBadge(req.status);
              const borderCls = cardBorderColor(req.status);
              return (
                <button
                  key={req._id}
                  onClick={() => navigate(`/request/${req._id}`)}
                  className={`bg-white rounded-xl border border-brand-card-border ${borderCls} px-5 py-4 text-left hover:shadow-sm transition-shadow w-full`}
                >
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <span className="text-[14px] font-bold text-gray-text leading-snug line-clamp-2">
                      {req.title}
                    </span>
                    <span
                      className={`text-[11px] font-semibold px-2 py-0.5 rounded-full shrink-0 ${badge.cls}`}
                    >
                      {badge.text}
                    </span>
                  </div>
                  <div className="text-[12px] text-gray-muted flex items-center gap-1.5 flex-wrap">
                    <span className="text-brand-dark font-semibold">
                      {rewardLabel(req)}
                    </span>
                    {req.requester?.name && (
                      <>
                        <span>·</span>
                        <span>Posted by {req.requester.name.split(" ")[0]} {req.requester.name.split(" ")[1]?.[0] ?? ""}.</span>
                      </>
                    )}
                  </div>
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

/* ─── Landing (public) ─── */
export default function Landing() {
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    userCount: number;
    requestCount: number;
    completedCount: number;
  } | null>(null);

  useEffect(() => {
    getStats()
      .then((res) => setStats(res.data))
      .catch(() => {});
  }, []);

  if (user) {
    return (
      <div className="bg-[#f5f7f5] h-full flex flex-col overflow-hidden">
        <Navbar />
        <div className="h-px bg-brand-card-border" />
        <div className="flex-1 overflow-y-auto">
          <Dashboard />
        </div>
        <BottomNav />
      </div>
    );
  }

  const fmt = (n: number) =>
    n >= 1000 ? `${(n / 1000).toFixed(1).replace(/\.0$/, "")}k+` : `${n}+`;

  return (
    <div className="bg-brand-bg">
      <Navbar />

      {/* Hero */}
      <section className="px-[120px] max-xl:px-8 max-md:px-4 py-16 max-md:py-10">
        <div className="flex items-start gap-12 max-lg:flex-col">
          <div className="flex-1">
            <span className="inline-flex items-center gap-2 bg-brand-card-bg text-brand-dark text-[12px] font-semibold px-3 py-1.5 rounded-full border border-brand-card-border mb-6">
              <MapPin className="w-3.5 h-3.5" /> Location-Based Community Help Platform
            </span>
            <h1 className="text-[42px] max-md:text-[28px] font-extrabold text-gray-text leading-tight mb-5">
              Get real help from
              <br />
              people near you
            </h1>
            <p className="text-[15px] text-gray-muted leading-relaxed mb-8 max-w-md">
              Post a request and connect with helpful neighbours within minutes.
              From moving boxes to fixing WiFi — your community has got you.
            </p>
            <div className="flex gap-3 mb-8">
              <Link
                to="/post"
                className="bg-brand-dark text-white text-[14px] font-semibold py-3 px-6 rounded-[10px] hover:bg-green-800 transition-colors"
              >
                Post a Request
              </Link>
              <Link
                to="/browse"
                className="bg-white text-gray-text text-[14px] font-semibold py-3 px-6 rounded-[10px] border border-brand-card-border hover:bg-brand-card-bg transition-colors"
              >
                Browse Nearby
              </Link>
            </div>
            <div className="flex gap-6 text-[13px] text-gray-muted">
              <span>
                <strong className="text-gray-text">{stats ? fmt(stats.userCount) : "—"}</strong> active users
              </span>
              <span>
                <strong className="text-gray-text">{stats ? fmt(stats.completedCount) : "—"}</strong> requests fulfilled
              </span>
            </div>
          </div>
          <div className="flex-1 max-lg:hidden">
            <div className="bg-white rounded-xl border border-brand-card-border p-5 shadow-lg max-w-[340px] mx-auto">
              <div className="flex items-center justify-between mb-2">
                <span className="font-bold text-[14px] text-gray-text">
                  Need help moving boxes to new flat
                </span>
                <span className="text-[12px] font-semibold bg-brand-card-border text-brand-dark px-2 py-0.5 rounded">
                  ₹200
                </span>
              </div>
              <div className="text-[12px] text-gray-muted flex gap-3 mb-3">
                <span className="flex items-center gap-1">
                  <MapPin className="w-3 h-3" /> 0.8km, Andheri West
                </span>
                <span>Today, 5 PM</span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-[12px] text-gray-muted">Rahul S.</span>
                <span className="text-brand-dark text-[13px] font-semibold">Offer Help →</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section className="py-16 max-md:py-10 px-[120px] max-xl:px-8 max-md:px-4 text-center">
        <span className="text-[12px] font-semibold tracking-widest text-gray-muted uppercase">
          How it works
        </span>
        <h2 className="text-[28px] max-md:text-[22px] font-extrabold text-gray-text mt-2 mb-12">
          Help and get helped in 3 simple steps
        </h2>
        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-8">
          {[
            { icon: ClipboardList, title: "Post a Request", desc: "Describe what you need, set a time and location. Takes under 60 seconds." },
            { icon: Users, title: "Get Matched Nearby", desc: "Nearby community members see your request and respond if they can help." },
            { icon: CheckCircle, title: "Get It Done", desc: "Chat, confirm details, and complete the task. Rate your helper afterwards." },
          ].map((step) => (
            <div key={step.title} className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-card-bg border border-brand-card-border flex items-center justify-center">
                <step.icon className="w-6 h-6 text-brand-dark" />
              </div>
              <h3 className="text-[16px] font-bold text-gray-text">{step.title}</h3>
              <p className="text-[13px] text-gray-muted max-w-[260px]">{step.desc}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-brand-dark py-10 px-[120px] max-xl:px-8 max-md:px-4">
        <div className="grid grid-cols-3 gap-4 text-center">
          {[
            { value: stats ? fmt(stats.userCount) : "—", label: "Active Users" },
            { value: stats ? fmt(stats.requestCount) : "—", label: "Requests Posted" },
            { value: stats ? fmt(stats.completedCount) : "—", label: "Requests Fulfilled" },
          ].map((stat) => (
            <div key={stat.label}>
              <div className="text-[32px] max-md:text-[22px] font-extrabold text-brand-light leading-tight">{stat.value}</div>
              <div className="text-[14px] max-md:text-[11px] text-green-200 mt-0.5">{stat.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="py-16 max-md:py-10 px-[120px] max-xl:px-8 max-md:px-4 text-center">
        <h2 className="text-[28px] max-md:text-[22px] font-extrabold text-gray-text mb-3">
          Ready to get help from your community?
        </h2>
        <p className="text-[15px] text-gray-muted mb-8">
          Join thousands of people in Mumbai who help each other every day.
        </p>
        <div className="flex gap-3 justify-center">
          <Link to="/post" className="bg-brand-dark text-white text-[14px] font-semibold py-3 px-6 rounded-[10px] hover:bg-green-800 transition-colors">
            Post Your First Request
          </Link>
          <Link to="/browse" className="bg-white text-gray-text text-[14px] font-semibold py-3 px-6 rounded-[10px] border border-brand-card-border hover:bg-brand-card-bg transition-colors">
            See Nearby Requests
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-brand-dark py-6 px-[120px] max-xl:px-8 max-md:px-4">
        <div className="flex items-center justify-between max-md:flex-col max-md:gap-4">
          <div className="flex items-center gap-2">
            <MapPin className="w-4 h-4 text-green-300" />
            <span className="text-[14px] font-bold text-white">HelpNearby</span>
          </div>
          <span className="text-[12px] text-green-200">&copy; 2025 HelpNearby. Mumbai, India.</span>
          <div className="flex gap-4 text-[12px] text-green-200">
            <a href="#" className="hover:text-white">Privacy</a>
            <a href="#" className="hover:text-white">Terms</a>
            <a href="#" className="hover:text-white">Contact</a>
          </div>
        </div>
      </footer>

      <BottomNav />
    </div>
  );
}
