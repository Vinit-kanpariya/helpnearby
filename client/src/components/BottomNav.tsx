import { Link, useLocation } from "react-router-dom";
import { Home, Search, CirclePlus, MessageCircle, User } from "lucide-react";

const navItems = [
  { icon: Home, label: "Home", path: "/" },
  { icon: Search, label: "Browse", path: "/browse" },
  { icon: CirclePlus, label: "", path: "/post", isCenter: true },
  { icon: MessageCircle, label: "Chat", path: "/chat" },
  { icon: User, label: "Profile", path: "/profile" },
];

export default function BottomNav() {
  const { pathname } = useLocation();

  return (
    <nav className="md:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-brand-card-border h-16 flex items-center justify-around px-2 z-50">
      {navItems.map((item) => {
        const active = pathname === item.path;
        const Icon = item.icon;

        if (item.isCenter) {
          return (
            <Link
              key={item.path}
              to={item.path}
              className="flex flex-col items-center gap-1 py-0 px-1"
            >
              <div className="bg-brand-dark rounded-full w-12 h-12 flex items-center justify-center">
                <CirclePlus className="w-[22px] h-[22px] text-brand-light" />
              </div>
            </Link>
          );
        }

        return (
          <Link
            key={item.path}
            to={item.path}
            className="flex flex-col items-center gap-1 py-1 px-2.5"
          >
            <Icon
              className={`w-5 h-5 ${
                active ? "text-brand-dark" : "text-gray-placeholder"
              }`}
            />
            <span
              className={`text-[10px] ${
                active
                  ? "text-brand-dark font-bold"
                  : "text-gray-placeholder font-normal"
              }`}
            >
              {item.label}
            </span>
          </Link>
        );
      })}
    </nav>
  );
}
