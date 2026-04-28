import { useState, useRef } from "react";
import { useSearchParams } from "react-router-dom";
import {
  User,
  Bell,
  Shield,
  MapPin,
  LogOut,
  Camera,
  ChevronRight,
  ArrowLeft,
  Eye,
  EyeOff,
} from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { useAuth } from "../contexts/AuthContext";
import { updateProfile } from "../services/api";

const sidebarItems = [
  { icon: User, label: "Profile", id: "profile" },
  { icon: Bell, label: "Notifications", id: "notifications" },
  { icon: Shield, label: "Privacy & Security", id: "privacy" },
  { icon: MapPin, label: "Location", id: "location" },
];

function AvatarDisplay({ name, avatar, size = 72 }: { name: string; avatar?: string; size?: number }) {
  if (avatar) {
    return (
      <img
        src={avatar}
        alt={name}
        style={{ width: size, height: size }}
        className="rounded-full object-cover"
      />
    );
  }
  const initials = name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();
  return (
    <div
      style={{ width: size, height: size, fontSize: size * 0.35 }}
      className="rounded-full bg-brand-dark flex items-center justify-center text-white font-bold shrink-0"
    >
      {initials}
    </div>
  );
}

export default function Settings() {
  const { user, logout, updateUser } = useAuth();
  const [searchParams] = useSearchParams();
  const initialTab = searchParams.get("tab") || "profile";
  const [activeTab, setActiveTab] = useState(initialTab);
  const [mobileView, setMobileView] = useState<string | null>(
    initialTab !== "profile" ? initialTab : null
  );
  const [form, setForm] = useState({
    name: user?.name || "",
    email: user?.email || "",
    phone: user?.phone || "",
    location: user?.location?.address || "",
    bio: user?.bio || "",
  });
  const [avatarPreview, setAvatarPreview] = useState<string | undefined>(user?.avatar);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [saving, setSaving] = useState(false);
  const [saveSuccess, setSaveSuccess] = useState(false);
  const [prefs, setPrefs] = useState({
    push: true,
    email: true,
    nearby: true,
    offerUpdates: true,
  });
  const [passwords, setPasswords] = useState({
    current: "",
    next: "",
    confirm: "",
  });
  const [showPw, setShowPw] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationInput, setLocationInput] = useState(
    user?.location?.address || ""
  );
  const [locationCoords, setLocationCoords] = useState<[number, number]>(
    (user?.location?.coordinates && user.location.coordinates[0] !== 0)
      ? [user.location.coordinates[0], user.location.coordinates[1]]
      : [0, 0]
  );

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleAvatarChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (file.size > 3 * 1024 * 1024) {
      alert("Image must be under 3 MB.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setAvatarPreview(reader.result as string);
    };
    reader.readAsDataURL(file);
  };

  const handleSave = async () => {
    setSaving(true);
    setSaveSuccess(false);
    try {
      const res = await updateProfile({
        name: form.name,
        phone: form.phone,
        bio: form.bio,
        location: { address: form.location, coordinates: [0, 0] },
        avatar: avatarPreview,
      });
      updateUser(res.data.user || res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save");
    } finally {
      setSaving(false);
    }
  };

  const detectLocation = () => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setLocationCoords([longitude, latitude]);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr =
            data.address?.suburb ||
            data.address?.city_district ||
            data.address?.city ||
            data.display_name;
          setLocationInput(addr);
          setForm((f) => ({ ...f, location: addr }));
        } catch {
          const fallback = `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationInput(fallback);
          setForm((f) => ({ ...f, location: fallback }));
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false)
    );
  };

  const handleLocationSave = async () => {
    setSaving(true);
    try {
      let coords = locationCoords;
      if ((coords[0] === 0 && coords[1] === 0) && locationInput.trim()) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=json&limit=1`
          );
          const data: { lat: string; lon: string }[] = await res.json();
          if (data[0]) coords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        } catch { /* keep [0,0] */ }
      }
      const res = await updateProfile({
        name: form.name,
        phone: form.phone,
        bio: form.bio,
        location: { address: locationInput, coordinates: coords },
      });
      setLocationCoords(coords);
      updateUser(res.data.user || res.data);
      setSaveSuccess(true);
      setTimeout(() => setSaveSuccess(false), 3000);
    } catch {
      alert("Failed to save location");
    } finally {
      setSaving(false);
    }
  };

  /* ── Tab content ── */
  const renderTabContent = (tab: string) => {
    if (tab === "profile") {
      return (
        <div className="max-w-[700px]">
          {/* Avatar */}
          <div className="flex items-center gap-5 mb-7">
            <div className="relative">
              <AvatarDisplay name={form.name || user?.name || ""} avatar={avatarPreview} size={72} />
              <button
                onClick={() => fileInputRef.current?.click()}
                className="absolute -bottom-1 -right-1 w-7 h-7 bg-brand-dark rounded-full flex items-center justify-center border-2 border-white hover:bg-green-800 transition-colors"
                title="Change photo"
              >
                <Camera className="w-3.5 h-3.5 text-white" />
              </button>
            </div>
            <div className="flex-1">
              <div className="text-[20px] font-bold text-gray-text">
                {user?.name}
              </div>
              <div className="text-[13px] text-gray-muted">{user?.email}</div>
            </div>
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center gap-1.5 bg-brand-card-bg text-brand-dark text-[13px] font-semibold px-4 py-2 rounded-[10px] border border-brand-card-border hover:bg-brand-card-border transition-colors"
            >
              <Camera className="w-4 h-4" /> Change Photo
            </button>
          </div>

          {/* Hidden file input */}
          <input
            ref={fileInputRef}
            type="file"
            accept="image/png,image/jpeg,image/webp"
            className="hidden"
            onChange={handleAvatarChange}
          />

          <div className="h-px bg-brand-card-border mb-7" />

          <h3 className="text-[16px] font-bold text-gray-text mb-5">
            Personal Information
          </h3>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Full Name
              </label>
              <input
                value={form.name}
                onChange={(e) => update("name", e.target.value)}
                className="w-full border border-brand-card-border rounded-[10px] px-3.5 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Email
              </label>
              <input
                value={form.email}
                disabled
                className="w-full border border-brand-card-border rounded-[10px] px-3.5 py-3 text-[14px] text-gray-text bg-gray-50 outline-none"
              />
            </div>
          </div>

          <div className="grid grid-cols-2 gap-5 mb-5">
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Phone
              </label>
              <input
                value={form.phone}
                onChange={(e) => update("phone", e.target.value)}
                placeholder="+91 98765 43210"
                className="w-full border border-brand-card-border rounded-[10px] px-3.5 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Location
              </label>
              <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-3.5 py-3 focus-within:ring-2 focus-within:ring-brand-dark/20">
                <MapPin className="w-4 h-4 text-gray-placeholder" />
                <input
                  value={form.location}
                  onChange={(e) => update("location", e.target.value)}
                  placeholder="Powai, Mumbai"
                  className="flex-1 text-[14px] text-gray-text outline-none placeholder-gray-placeholder"
                />
              </div>
            </div>
          </div>

          <div className="mb-7">
            <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
              Bio
            </label>
            <textarea
              value={form.bio}
              onChange={(e) => update("bio", e.target.value)}
              rows={3}
              placeholder="Tell the community about yourself..."
              className="w-full border border-brand-card-border rounded-[10px] px-3.5 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 resize-none placeholder-gray-placeholder"
            />
          </div>

          <div className="h-px bg-brand-card-border mb-5" />

          <div className="flex justify-end gap-3 items-center">
            {saveSuccess && (
              <span className="text-[13px] text-brand-dark font-medium">
                Saved successfully!
              </span>
            )}
            <button
              onClick={handleSave}
              disabled={saving}
              className="px-7 py-3 rounded-[10px] bg-brand-dark text-white text-[14px] font-semibold hover:bg-green-800 transition-colors disabled:opacity-60"
            >
              {saving ? "Saving..." : "Save Changes"}
            </button>
          </div>
        </div>
      );
    }

    if (tab === "notifications") {
      return (
        <div className="max-w-[600px]">
          <h3 className="text-[16px] font-bold text-gray-text mb-1">
            Notification Preferences
          </h3>
          <p className="text-[13px] text-gray-muted mb-7">
            Choose what you want to be notified about.
          </p>

          <div className="bg-white rounded-xl border border-brand-card-border overflow-hidden">
            {[
              {
                key: "push" as const,
                label: "Push Notifications",
                desc: "Get notified for offers and messages on your device",
              },
              {
                key: "email" as const,
                label: "Email Notifications",
                desc: "Receive updates in your inbox",
              },
              {
                key: "nearby" as const,
                label: "Nearby Request Alerts",
                desc: "Be notified when someone posts a request near you",
              },
              {
                key: "offerUpdates" as const,
                label: "Offer Status Updates",
                desc: "Know when your offer is accepted or rejected",
              },
            ].map((pref, i, arr) => (
              <div
                key={pref.key}
                className={`flex items-center justify-between px-5 py-4 ${i < arr.length - 1 ? "border-b border-brand-card-border" : ""}`}
              >
                <div>
                  <div className="text-[14px] font-semibold text-gray-text">
                    {pref.label}
                  </div>
                  <div className="text-[12px] text-gray-muted">{pref.desc}</div>
                </div>
                <button
                  onClick={() =>
                    setPrefs((p) => ({ ...p, [pref.key]: !p[pref.key] }))
                  }
                  className={`w-11 h-6 rounded-full relative shrink-0 transition-colors ${
                    prefs[pref.key] ? "bg-brand-dark" : "bg-gray-200"
                  }`}
                >
                  <div
                    className={`w-4 h-4 bg-white rounded-full absolute top-1 transition-all shadow ${
                      prefs[pref.key] ? "right-1" : "left-1"
                    }`}
                  />
                </button>
              </div>
            ))}
          </div>
        </div>
      );
    }

    if (tab === "privacy") {
      return (
        <div className="max-w-[600px]">
          <h3 className="text-[16px] font-bold text-gray-text mb-1">
            Privacy & Security
          </h3>
          <p className="text-[13px] text-gray-muted mb-7">
            Manage your account security settings.
          </p>

          <div className="bg-white rounded-xl border border-brand-card-border p-6 mb-5">
            <h4 className="text-[14px] font-bold text-gray-text mb-4">
              Change Password
            </h4>
            <div className="flex flex-col gap-4">
              <div>
                <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                  Current Password
                </label>
                <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-3.5 py-3 focus-within:ring-2 focus-within:ring-brand-dark/20">
                  <input
                    type={showPw ? "text" : "password"}
                    value={passwords.current}
                    onChange={(e) =>
                      setPasswords((p) => ({ ...p, current: e.target.value }))
                    }
                    placeholder="Enter current password"
                    className="flex-1 text-[14px] text-gray-text outline-none placeholder-gray-placeholder"
                  />
                  <button
                    onClick={() => setShowPw((v) => !v)}
                    className="text-gray-placeholder"
                  >
                    {showPw ? (
                      <EyeOff className="w-4 h-4" />
                    ) : (
                      <Eye className="w-4 h-4" />
                    )}
                  </button>
                </div>
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                  New Password
                </label>
                <input
                  type="password"
                  value={passwords.next}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, next: e.target.value }))
                  }
                  placeholder="Min 6 characters"
                  className="w-full border border-brand-card-border rounded-[10px] px-3.5 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder"
                />
              </div>
              <div>
                <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                  Confirm New Password
                </label>
                <input
                  type="password"
                  value={passwords.confirm}
                  onChange={(e) =>
                    setPasswords((p) => ({ ...p, confirm: e.target.value }))
                  }
                  placeholder="Repeat new password"
                  className="w-full border border-brand-card-border rounded-[10px] px-3.5 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder"
                />
              </div>
              <div className="flex justify-end">
                <button
                  disabled={
                    !passwords.current ||
                    !passwords.next ||
                    passwords.next !== passwords.confirm
                  }
                  className="px-6 py-2.5 rounded-[10px] bg-brand-dark text-white text-[14px] font-semibold hover:bg-green-800 transition-colors disabled:opacity-40"
                >
                  Update Password
                </button>
              </div>
            </div>
          </div>

          <div className="bg-white rounded-xl border border-red-100 p-6">
            <h4 className="text-[14px] font-bold text-red-600 mb-1">
              Danger Zone
            </h4>
            <p className="text-[12px] text-gray-muted mb-4">
              Permanently delete your account and all data. This cannot be undone.
            </p>
            <button className="px-6 py-2.5 rounded-[10px] border border-red-500 text-red-600 text-[14px] font-semibold hover:bg-red-50 transition-colors">
              Delete Account
            </button>
          </div>
        </div>
      );
    }

    if (tab === "location") {
      return (
        <div className="max-w-[600px]">
          <h3 className="text-[16px] font-bold text-gray-text mb-1">
            Location Settings
          </h3>
          <p className="text-[13px] text-gray-muted mb-7">
            Set your location so nearby requests are shown to you.
          </p>

          <div className="bg-white rounded-xl border border-brand-card-border p-6 mb-5">
            <h4 className="text-[14px] font-bold text-gray-text mb-4">
              Current Location
            </h4>
            <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-3.5 py-3 focus-within:ring-2 focus-within:ring-brand-dark/20 mb-4">
              <MapPin className="w-4 h-4 text-gray-placeholder shrink-0" />
              <input
                value={locationInput}
                onChange={(e) => setLocationInput(e.target.value)}
                placeholder="Enter your area or neighbourhood"
                className="flex-1 text-[14px] text-gray-text outline-none placeholder-gray-placeholder"
              />
            </div>
            <div className="flex gap-3">
              <button
                onClick={detectLocation}
                disabled={locating}
                className="flex items-center gap-1.5 px-5 py-2.5 rounded-[10px] border border-brand-card-border text-[13px] font-semibold text-brand-dark hover:bg-brand-card-bg transition-colors disabled:opacity-60"
              >
                <MapPin className="w-4 h-4" />
                {locating ? "Detecting..." : "Use My Location"}
              </button>
              <button
                onClick={handleLocationSave}
                disabled={saving || !locationInput}
                className="px-6 py-2.5 rounded-[10px] bg-brand-dark text-white text-[13px] font-semibold hover:bg-green-800 transition-colors disabled:opacity-60"
              >
                {saving ? "Saving..." : "Save Location"}
              </button>
            </div>
            {saveSuccess && (
              <p className="text-[13px] text-brand-dark font-medium mt-3">
                Location saved!
              </p>
            )}
          </div>

          <div className="bg-white rounded-xl border border-brand-card-border p-6">
            <h4 className="text-[14px] font-bold text-gray-text mb-1">
              Location Visibility
            </h4>
            <p className="text-[12px] text-gray-muted mb-4">
              Only your neighbourhood name is shared — never your exact address.
            </p>
            <div className="flex items-center gap-2 text-[13px] text-brand-dark font-semibold">
              <Shield className="w-4 h-4" /> Your precise location stays private
            </div>
          </div>
        </div>
      );
    }

    return null;
  };

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <div className="flex-1 flex overflow-hidden">
        {/* Desktop sidebar */}
        <aside className="hidden md:flex flex-col w-[260px] bg-white border-r border-brand-card-border py-7 gap-1 shrink-0">
          <div className="px-6 mb-2">
            <h2 className="text-[20px] font-extrabold text-gray-text">
              Settings
            </h2>
          </div>
          <div className="h-2" />
          {sidebarItems.map((item) => (
            <button
              key={item.id}
              onClick={() => setActiveTab(item.id)}
              className={`flex items-center gap-2.5 w-full px-6 py-2.5 text-left text-[14px] transition-colors ${
                activeTab === item.id
                  ? "bg-brand-card-bg text-brand-dark font-semibold"
                  : "text-gray-secondary font-medium hover:bg-gray-50"
              }`}
            >
              <item.icon
                className={`w-[18px] h-[18px] ${
                  activeTab === item.id ? "text-brand-dark" : "text-gray-muted"
                }`}
              />
              {item.label}
            </button>
          ))}
          <button
            onClick={logout}
            className="flex items-center gap-2.5 w-full px-6 py-2.5 text-left text-[14px] text-red-600 font-medium hover:bg-red-50 transition-colors"
          >
            <LogOut className="w-[18px] h-[18px] text-red-600" />
            Log out
          </button>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-9 max-md:p-4 max-md:pb-20">
          {/* Mobile: detail view when tab selected */}
          <div className="md:hidden">
            {mobileView ? (
              <div>
                <button
                  onClick={() => setMobileView(null)}
                  className="flex items-center gap-1.5 text-[13px] text-gray-muted mb-5 hover:text-brand-dark"
                >
                  <ArrowLeft className="w-4 h-4" /> Back to Settings
                </button>
                {renderTabContent(mobileView)}
              </div>
            ) : (
              <div className="flex flex-col gap-5">
                <h1 className="text-[22px] font-extrabold text-gray-text">
                  Settings
                </h1>

                {/* Profile card */}
                <div className="flex items-center gap-3.5 bg-white rounded-xl p-4 border border-brand-card-border">
                  <AvatarDisplay name={user?.name || ""} avatar={avatarPreview} size={48} />
                  <div className="flex-1">
                    <div className="text-[15px] font-bold text-gray-text">
                      {user?.name}
                    </div>
                    <div className="text-[11px] text-gray-muted">
                      {user?.email}
                    </div>
                  </div>
                  <ChevronRight className="w-5 h-5 text-gray-placeholder" />
                </div>

                <span className="text-[11px] font-bold text-gray-placeholder tracking-wider">
                  ACCOUNT
                </span>
                <div className="bg-white rounded-xl border border-brand-card-border overflow-hidden">
                  {sidebarItems.map((item) => (
                    <button
                      key={item.id}
                      onClick={() => setMobileView(item.id)}
                      className="flex items-center gap-3 px-4 py-3.5 border-b border-brand-card-border last:border-b-0 w-full text-left"
                    >
                      <item.icon className="w-[18px] h-[18px] text-brand-dark" />
                      <span className="flex-1 text-[14px] text-gray-secondary font-medium">
                        {item.label === "Profile"
                          ? "Edit Profile"
                          : item.label}{" "}
                        Settings
                      </span>
                      <ChevronRight className="w-[18px] h-[18px] text-gray-placeholder" />
                    </button>
                  ))}
                </div>

                <button
                  onClick={logout}
                  className="w-full rounded-xl border border-red-500 py-3.5 flex items-center justify-center gap-2 text-red-600 text-[14px] font-semibold"
                >
                  <LogOut className="w-[18px] h-[18px]" /> Log Out
                </button>
                <p className="text-center text-[11px] text-gray-placeholder">
                  HelpNearby v1.0.0
                </p>
              </div>
            )}
          </div>

          {/* Desktop: tab content */}
          <div className="hidden md:block">
            {renderTabContent(activeTab)}
          </div>
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
