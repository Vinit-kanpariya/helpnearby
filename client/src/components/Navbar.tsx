import { Link, useNavigate, useLocation } from "react-router-dom";
import { MapPin, Bell } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";

export default function Navbar() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { pathname } = useLocation();

  const authNavLinks = [
    { to: "/", label: "Dashboard", match: "/" },
    { to: "/browse", label: "Browse", match: "/browse" },
    { to: "/post", label: "Post Help", match: "/post" },
    { to: "/chat", label: "Messages", match: "/chat" },
  ];

  const guestNavLinks = [
    { to: "/browse", label: "Browse", match: "/browse" },
    { to: "/post", label: "Post Help", match: "/post" },
    { to: "/chat", label: "Messages", match: "/chat" },
  ];

  const navLinks = user ? authNavLinks : guestNavLinks;

  const initials = user
    ? user.name.split(" ").map((n) => n[0]).join("").slice(0, 2).toUpperCase()
    : "";

  return (
    <header className="bg-white border-b border-brand-card-border">
      <nav className="flex items-center justify-between h-[72px] px-[120px] max-xl:px-8 max-md:px-4 max-md:h-[56px]">
        {/* Logo */}
        <Link to="/" className="flex items-center gap-2.5 shrink-0">
          <MapPin className="w-[20px] h-[20px] text-brand-dark" />
          <span className="text-[18px] font-bold text-gray-text max-md:text-[15px]">
            HelpNearby
          </span>
        </Link>

        {/* Nav Links — desktop only */}
        <div className="hidden md:flex items-center gap-8">
          {navLinks.map((link) => {
            const active =
              link.match === "/"
                ? pathname === "/"
                : pathname.startsWith(link.match);
            return (
              <Link
                key={link.to}
                to={link.to}
                className={`text-[14px] font-medium pb-0.5 transition-colors border-b-2 ${
                  active
                    ? "text-brand-dark font-semibold border-brand-dark"
                    : "text-gray-secondary hover:text-brand-dark border-transparent"
                }`}
              >
                {link.label}
              </Link>
            );
          })}
        </div>

        {/* Right side */}
        <div className="flex items-center gap-3">
          {user ? (
            <>
              <Link
                to="/notifications"
                className="w-9 h-9 flex items-center justify-center rounded-full hover:bg-brand-card-bg transition-colors"
                title="Notifications"
              >
                <Bell className="w-5 h-5 text-gray-secondary" />
              </Link>
              <button
                onClick={() => navigate("/profile")}
                className="w-9 h-9 rounded-full bg-brand-dark flex items-center justify-center hover:bg-green-800 transition-colors overflow-hidden shrink-0"
                title={user.name}
              >
                {user.avatar ? (
                  <img
                    src={user.avatar}
                    alt={user.name}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="text-[13px] font-bold text-white">
                    {initials}
                  </span>
                )}
              </button>
            </>
          ) : (
            <>
              {/* Browse link visible on mobile for guests */}
              <Link
                to="/browse"
                className="md:hidden text-[13px] font-medium text-gray-secondary hover:text-brand-dark"
              >
                Browse
              </Link>
              <Link
                to="/login"
                className="text-[14px] font-medium text-gray-secondary hover:text-brand-dark px-4 py-2 rounded-[10px] border border-brand-card-border hover:bg-brand-card-bg transition-colors max-md:text-[13px] max-md:px-3 max-md:py-1.5"
              >
                Log in
              </Link>
              <Link
                to="/signup"
                className="bg-brand-dark text-white text-[14px] font-semibold py-2 px-5 rounded-[10px] hover:bg-green-800 transition-colors max-md:text-[13px] max-md:px-4 max-md:py-1.5"
              >
                Sign up
              </Link>
            </>
          )}
        </div>
      </nav>
    </header>
  );
}
