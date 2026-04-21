import { Link, useNavigate, useLocation } from "react-router-dom";
import { MapPin, Bell, UserCircle, MessageCircle } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

const navLinks = [
  // { to: "/#how-it-works", label: "How it Works", match: "" },
  { to: "/browse", label: "Browse", match: "/browse" },
  { to: "/post", label: "Post Help", match: "/post" },
  { to: "/about", label: "About", match: "/about" },
];

export default function Navbar() {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  return (
    <header className="bg-white border-b border-brand-card-border">
      <nav className="flex items-center justify-between h-[80px] px-[120px] max-xl:px-8 max-md:px-4 max-md:h-[56px]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5">
          <MapPin className="w-[22px] h-[22px] text-brand-dark" />
          <span className="text-[20px] font-bold text-gray-text max-md:text-[16px] max-md:font-extrabold">
            HelpNearby
          </span>
        </Link>

        {/* Nav Links - desktop only */}
        <div className="hidden md:flex items-center gap-9">
          {navLinks.map((link) => {
            const active = link.match !== "" && pathname === link.match;
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-[15px] font-medium transition-colors ${
                  active
                    ? "text-brand-dark font-semibold"
                    : "text-gray-secondary hover:text-brand-dark"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* CTA */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/chat"
                className={`transition-colors ${pathname === "/chat" ? "text-brand-dark" : "text-gray-secondary hover:text-brand-dark"}`}
                title="Messages"
              >
                <MessageCircle className="w-6 h-5" />
              </Link>
              <Link to="/notifications" className="relative">
                <Bell className="w-6 h-5 text-gray-secondary" />
              </Link>
              <button
                onClick={() => navigate("/profile")}
                className="text-gray-secondary hover:text-brand-dark transition-colors"
                title={user.name}
              >
                <UserCircle className="w-6 h-5" />
              </button>
              <button
                onClick={logout}
                className="text-[15px] font-medium text-gray-secondary hover:text-brand-dark"
              >
                Log out
              </button>
            </>
          ) : (
            <>
              <Link
                to="/login"
                className="text-[15px] font-medium text-gray-secondary max-md:hidden"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-brand-dark text-white text-[15px] font-semibold py-2.5 px-6 rounded-[10px] hover:bg-green-800 transition-colors"
              >
                Get Started
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
