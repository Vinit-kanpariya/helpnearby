import { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  MapPin,
  ClipboardList,
  Users,
  CheckCircle,
} from "lucide-react";
import { getStats } from "../services/api";
import Navbar from "../components/Navbar";

export default function Landing() {
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
              <MapPin className="w-3.5 h-3.5" /> Location-Based Community Help
              Platform
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
                <strong className="text-gray-text">
                  {stats ? fmt(stats.userCount) : "—"}
                </strong>{" "}
                active users
              </span>
              <span>
                <strong className="text-gray-text">
                  {stats ? fmt(stats.completedCount) : "—"}
                </strong>{" "}
                requests fulfilled
              </span>
            </div>
          </div>
          {/* Hero illustration placeholder */}
          <div className="flex-1 max-lg:hidden relative">
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
                <span className="text-brand-dark text-[13px] font-semibold">
                  Offer Help →
                </span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* How it works */}
      <section
        id="how-it-works"
        className="py-16 max-md:py-10 px-[120px] max-xl:px-8 max-md:px-4 text-center"
      >
        <span className="text-[12px] font-semibold tracking-widest text-gray-muted uppercase">
          How it works
        </span>
        <h2 className="text-[28px] max-md:text-[22px] font-extrabold text-gray-text mt-2 mb-12">
          Help and get helped in 3 simple steps
        </h2>
        <div className="grid grid-cols-3 max-md:grid-cols-1 gap-8">
          {[
            {
              icon: ClipboardList,
              title: "Post a Request",
              desc: "Describe what you need, set a time and location. Takes under 60 seconds.",
            },
            {
              icon: Users,
              title: "Get Matched Nearby",
              desc: "Nearby community members see your request and respond if they can help.",
            },
            {
              icon: CheckCircle,
              title: "Get It Done",
              desc: "Chat, confirm details, and complete the task. Rate your helper afterwards.",
            },
          ].map((step) => (
            <div key={step.title} className="flex flex-col items-center gap-4">
              <div className="w-14 h-14 rounded-full bg-brand-card-bg border border-brand-card-border flex items-center justify-center">
                <step.icon className="w-6 h-6 text-brand-dark" />
              </div>
              <h3 className="text-[16px] font-bold text-gray-text">
                {step.title}
              </h3>
              <p className="text-[13px] text-gray-muted max-w-[260px]">
                {step.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* Stats Banner */}
      <section className="bg-brand-dark py-10 px-[120px] max-xl:px-8 max-md:px-4">
        <div className="grid grid-cols-3 gap-4 text-center max-md:divide-x max-md:divide-green-700">
          {[
            { value: stats ? fmt(stats.userCount) : "—", label: "Active Users" },
            { value: stats ? fmt(stats.requestCount) : "—", label: "Requests Posted" },
            { value: stats ? fmt(stats.completedCount) : "—", label: "Requests Fulfilled" },
          ].map((stat) => (
            <div key={stat.label} className="max-md:px-2">
              <div className="text-[32px] max-md:text-[22px] font-extrabold text-brand-light leading-tight">
                {stat.value}
              </div>
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
          <Link
            to="/post"
            className="bg-brand-dark text-white text-[14px] font-semibold py-3 px-6 rounded-[10px] hover:bg-green-800 transition-colors"
          >
            Post Your First Request
          </Link>
          <Link
            to="/browse"
            className="bg-white text-gray-text text-[14px] font-semibold py-3 px-6 rounded-[10px] border border-brand-card-border hover:bg-brand-card-bg transition-colors"
          >
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
          <span className="text-[12px] text-green-200">
            &copy; 2025 HelpNearby. Mumbai, India. Helping communities.
          </span>
          <div className="flex gap-4 text-[12px] text-green-200">
            <a href="#" className="hover:text-white">
              Privacy
            </a>
            <a href="#" className="hover:text-white">
              Terms
            </a>
            <a href="#" className="hover:text-white">
              Contact
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
