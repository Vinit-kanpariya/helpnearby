import { Link } from "react-router-dom";
import { MapPin, Heart, Users, Shield, Zap } from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";

const values = [
  {
    icon: Heart,
    title: "Community First",
    desc: "We believe every neighbourhood has enough goodwill to solve its own problems. HelpNearby makes that goodwill visible and actionable.",
  },
  {
    icon: Shield,
    title: "Safe & Trusted",
    desc: "Every helper is a real person from your community. Ratings, reviews, and verified profiles help you connect with confidence.",
  },
  {
    icon: Zap,
    title: "Fast & Simple",
    desc: "Post a request in under 60 seconds. Get your first offer within minutes. No apps, no subscriptions, no friction.",
  },
  {
    icon: Users,
    title: "Built for Everyone",
    desc: "Whether you need help moving a sofa or want to tutor a neighbour's kid — HelpNearby is for all kinds of help, big and small.",
  },
];

const team = [
  { name: "Vinit K.", role: "Founder & CEO", initials: "VK" },
  { name: "Priya S.", role: "Head of Product", initials: "PS" },
  { name: "Arjun M.", role: "Lead Engineer", initials: "AM" },
];

export default function About() {
  return (
    <div className="bg-brand-bg min-h-screen flex flex-col">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <main className="flex-1 pb-20 md:pb-0">
        {/* Hero */}
        <section className="bg-brand-dark py-16 px-[120px] max-xl:px-8 max-md:px-4 text-center">
          <div className="flex justify-center mb-4">
            <div className="w-14 h-14 bg-brand-light/20 rounded-full flex items-center justify-center">
              <MapPin className="w-7 h-7 text-brand-light" />
            </div>
          </div>
          <h1 className="text-[36px] max-md:text-[26px] font-extrabold text-white mb-4">
            About HelpNearby
          </h1>
          <p className="text-[16px] text-green-200 max-w-xl mx-auto leading-relaxed">
            We're on a mission to rebuild neighbourly trust — one small act of
            help at a time. HelpNearby connects people who need a hand with
            people nearby who are happy to give one.
          </p>
        </section>

        {/* Mission */}
        <section className="py-16 max-md:py-10 px-[120px] max-xl:px-8 max-md:px-4">
          <div className="max-w-[720px] mx-auto text-center">
            <span className="text-[12px] font-semibold tracking-widest text-gray-muted uppercase">
              Our Mission
            </span>
            <h2 className="text-[28px] max-md:text-[22px] font-extrabold text-gray-text mt-2 mb-5">
              Turning strangers into neighbours
            </h2>
            <p className="text-[15px] text-gray-muted leading-relaxed">
              Modern cities are full of people living side by side who have never
              spoken. HelpNearby changes that. When you post a request or offer
              help, you're not just solving a practical problem — you're building
              a relationship with someone who lives down the street.
            </p>
          </div>
        </section>

        {/* Values */}
        <section className="py-12 max-md:py-8 px-[120px] max-xl:px-8 max-md:px-4 bg-white border-y border-brand-card-border">
          <h2 className="text-[22px] font-extrabold text-gray-text text-center mb-10">
            What we stand for
          </h2>
          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-8 max-w-[860px] mx-auto">
            {values.map((v) => (
              <div key={v.title} className="flex gap-4">
                <div className="w-11 h-11 rounded-full bg-brand-card-bg border border-brand-card-border flex items-center justify-center shrink-0">
                  <v.icon className="w-5 h-5 text-brand-dark" />
                </div>
                <div>
                  <h3 className="text-[15px] font-bold text-gray-text mb-1">
                    {v.title}
                  </h3>
                  <p className="text-[13px] text-gray-muted leading-relaxed">
                    {v.desc}
                  </p>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* Team */}
        <section className="py-16 max-md:py-10 px-[120px] max-xl:px-8 max-md:px-4">
          <h2 className="text-[22px] font-extrabold text-gray-text text-center mb-10">
            The team
          </h2>
          <div className="flex justify-center gap-8 max-md:flex-col max-md:items-center">
            {team.map((member) => (
              <div key={member.name} className="flex flex-col items-center gap-3">
                <div className="w-16 h-16 rounded-full bg-brand-dark flex items-center justify-center">
                  <span className="text-[18px] font-extrabold text-brand-light">
                    {member.initials}
                  </span>
                </div>
                <div className="text-center">
                  <div className="text-[14px] font-bold text-gray-text">
                    {member.name}
                  </div>
                  <div className="text-[12px] text-gray-muted">{member.role}</div>
                </div>
              </div>
            ))}
          </div>
        </section>

        {/* CTA */}
        <section className="bg-brand-dark py-12 px-[120px] max-xl:px-8 max-md:px-4 text-center">
          <h2 className="text-[24px] max-md:text-[20px] font-extrabold text-white mb-3">
            Ready to help or get helped?
          </h2>
          <p className="text-[14px] text-green-200 mb-7">
            Join thousands of people building stronger communities every day.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link
              to="/signup"
              className="bg-brand-light text-brand-dark text-[14px] font-semibold py-3 px-6 rounded-[10px] hover:bg-white transition-colors"
            >
              Join HelpNearby
            </Link>
            <Link
              to="/browse"
              className="bg-white/10 text-white text-[14px] font-semibold py-3 px-6 rounded-[10px] hover:bg-white/20 transition-colors border border-white/20"
            >
              Browse Requests
            </Link>
          </div>
        </section>
      </main>

      <BottomNav />
    </div>
  );
}
