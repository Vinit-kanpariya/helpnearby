import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { Send, MapPin, Loader2 } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import TimePicker from "../components/TimePicker";
import { createRequest } from "../services/api";

const rewardTypes = [
  { label: "Cash", value: "cash" },
  { label: "Food / Chai", value: "food" },
  { label: "Favour back", value: "favour" },
  { label: "Free", value: "free" },
];

interface NominatimResult {
  display_name: string;
  lat: string;
  lon: string;
  address?: Record<string, string>;
}

export default function PostRequest() {
  const navigate = useNavigate();
  const { user } = useAuth();
  const hasLocation =
    user?.location?.coordinates && user.location.coordinates[0] !== 0;

  if (!hasLocation) {
    return (
      <div className="h-full flex flex-col bg-brand-bg">
        <Navbar />
        <div className="h-px bg-brand-card-border" />
        <main className="flex-1 flex items-center justify-center p-8">
          <div className="max-w-[400px] text-center">
            <div className="w-16 h-16 rounded-full bg-brand-card-bg border border-brand-card-border flex items-center justify-center mx-auto mb-5">
              <MapPin className="w-8 h-8 text-brand-dark" />
            </div>
            <h2 className="text-[20px] font-extrabold text-gray-text mb-2">
              Set your location first
            </h2>
            <p className="text-[14px] text-gray-muted mb-6 leading-relaxed">
              Your location helps nearby helpers discover your request. Please set it in Settings before posting.
            </p>
            <Link
              to="/settings?tab=location"
              className="inline-block bg-brand-dark text-white text-[14px] font-semibold px-6 py-3 rounded-[10px] hover:bg-green-800 transition-colors"
            >
              Go to Location Settings
            </Link>
          </div>
        </main>
        <BottomNav />
      </div>
    );
  }
  const [form, setForm] = useState({
    title: "",
    description: "",
    date: "",
    time: "",
    location: "",
    rewardType: "cash",
    rewardAmount: "",
    category: "other",
  });
  const [coords, setCoords] = useState<[number, number]>([0, 0]);
  const [rewardDescription, setRewardDescription] = useState("");
  const [suggestions, setSuggestions] = useState<NominatimResult[]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [geocoding, setGeocoding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const update = (field: string, value: string) =>
    setForm((f) => ({ ...f, [field]: value }));

  const handleLocationInput = (value: string) => {
    update("location", value);
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      setGeocoding(true);
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`
        );
        const data: NominatimResult[] = await res.json();
        setSuggestions(data);
      } catch {
        setSuggestions([]);
      } finally {
        setGeocoding(false);
      }
    }, 400);
  };

  const selectSuggestion = (item: NominatimResult) => {
    const addr = item.address;
    const full = [
      addr?.house_number,
      addr?.road || addr?.pedestrian,
      addr?.suburb || addr?.neighbourhood,
      addr?.city_district,
      addr?.city || addr?.town || addr?.village,
      addr?.state,
      addr?.postcode,
      addr?.country,
    ]
      .filter(Boolean)
      .join(", ");
    update("location", full || item.display_name);
    setCoords([parseFloat(item.lon), parseFloat(item.lat)]);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    // Reject titles/descriptions that are only dots or whitespace
    if (!form.title.trim() || /^[.\s]+$/.test(form.title.trim())) {
      setError("Title must contain meaningful text.");
      return;
    }
    if (!form.description.trim() || /^[.\s]+$/.test(form.description.trim())) {
      setError("Description must contain meaningful text.");
      return;
    }
    if ((form.rewardType === "food" || form.rewardType === "favour") && !rewardDescription.trim()) {
      setError("Please describe your reward.");
      return;
    }
    if (!form.location.trim()) { setError("Please enter a location."); return; }
    setLoading(true);
    setError("");
    try {
      // If coords are still [0,0] (user typed but didn't pick suggestion), geocode now
      let finalCoords = coords;
      if (coords[0] === 0 && coords[1] === 0 && form.location.trim()) {
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(form.location)}&format=json&limit=1`
          );
          const data: NominatimResult[] = await res.json();
          if (data[0]) finalCoords = [parseFloat(data[0].lon), parseFloat(data[0].lat)];
        } catch { /* use [0,0] fallback */ }
      }

      const data: Record<string, unknown> = {
        ...form,
        location: { address: form.location, coordinates: finalCoords },
        rewardAmount: form.rewardAmount ? Number(form.rewardAmount) : undefined,
        rewardDescription: rewardDescription || undefined,
      };
      const res = await createRequest(data);
      navigate(`/request/${res.data.request?._id || res.data._id}`);
    } catch (err: unknown) {
      const e = err as { response?: { data?: { message?: string } } };
      setError(e.response?.data?.message || "Failed to post request");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <main className="flex-1 overflow-y-auto p-8 max-md:p-4 max-md:pb-24">
        <form
          onSubmit={handleSubmit}
          className="w-full max-w-[640px] mx-auto flex flex-col gap-6"
        >
          <div>
            <h1 className="text-[24px] max-md:text-[20px] font-extrabold text-gray-text mb-1">
              Post a Help Request
            </h1>
            <p className="text-[14px] text-gray-muted">
              Tell your neighbours what you need — someone nearby will help.
            </p>
          </div>

          {error && (
            <div className="bg-red-50 text-red-600 text-[13px] px-4 py-3 rounded-lg border border-red-200">
              {error}
            </div>
          )}

          <div>
            <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
              What do you need help with?
            </label>
            <input
              value={form.title}
              onChange={(e) => update("title", e.target.value)}
              placeholder="e.g. Help me carry boxes to 3rd floor"
              required
              className="w-full border border-brand-card-border rounded-[10px] px-4 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder"
            />
          </div>

          <div>
            <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
              Describe your request
            </label>
            <textarea
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
              placeholder="Share any details that will help someone assist you better..."
              rows={4}
              required
              className="w-full border border-brand-card-border rounded-[10px] px-4 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder resize-none"
            />
          </div>

          <div className="grid grid-cols-2 max-md:grid-cols-1 gap-4">
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Date
              </label>
              <input
                type="date"
                value={form.date}
                min={new Date().toISOString().split("T")[0]}
                onChange={(e) => update("date", e.target.value)}
                className="w-full border border-brand-card-border rounded-[10px] px-4 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20"
              />
            </div>
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Time
              </label>
              <TimePicker
                value={form.time}
                onChange={(v) => update("time", v)}
                placeholder="Select time"
              />
            </div>
          </div>

          {/* Location with autocomplete */}
          <div>
            <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
              Full Address / Location
            </label>
            <div className="relative">
              <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-4 py-3 focus-within:ring-2 focus-within:ring-brand-dark/20 bg-white">
                {geocoding ? (
                  <Loader2 className="w-4 h-4 text-brand-dark animate-spin shrink-0" />
                ) : (
                  <MapPin className="w-4 h-4 text-gray-placeholder shrink-0" />
                )}
                <input
                  value={form.location}
                  onChange={(e) => handleLocationInput(e.target.value)}
                  onFocus={() => suggestions.length > 0 && setShowSuggestions(true)}
                  onBlur={() => setTimeout(() => setShowSuggestions(false), 200)}
                  placeholder="Start typing your full address…"
                  required
                  className="flex-1 text-[14px] text-gray-text outline-none placeholder-gray-placeholder"
                />
              </div>
              {showSuggestions && suggestions.length > 0 && (
                <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-brand-card-border rounded-[10px] shadow-lg overflow-hidden">
                  {suggestions.map((item, i) => (
                    <button
                      key={i}
                      type="button"
                      onMouseDown={() => selectSuggestion(item)}
                      className="w-full text-left px-4 py-2.5 text-[13px] text-gray-text hover:bg-brand-card-bg border-b border-brand-card-border last:border-b-0"
                    >
                      <span className="font-medium">
                        {[item.address?.road, item.address?.suburb, item.address?.city || item.address?.town]
                          .filter(Boolean)
                          .join(", ") || item.display_name.split(",").slice(0, 3).join(",")}
                      </span>
                      <br />
                      <span className="text-[11px] text-gray-muted truncate block">
                        {item.display_name}
                      </span>
                    </button>
                  ))}
                </div>
              )}
            </div>
            {coords[0] !== 0 && (
              <p className="text-[11px] text-brand-dark mt-1 flex items-center gap-1">
                <MapPin className="w-3 h-3" /> Location confirmed
              </p>
            )}
          </div>

          <div>
            <label className="text-[13px] font-semibold text-gray-secondary mb-2 block">
              Reward Type
            </label>
            <div className="flex gap-2 flex-wrap">
              {rewardTypes.map((r) => (
                <button
                  key={r.value}
                  type="button"
                  onClick={() => update("rewardType", r.value)}
                  className={`text-[13px] font-semibold px-4 py-2 rounded-full border transition-colors ${
                    form.rewardType === r.value
                      ? "bg-brand-dark text-white border-brand-dark"
                      : "bg-white border-brand-card-border text-gray-secondary"
                  }`}
                >
                  {r.label}
                </button>
              ))}
            </div>
          </div>

          {form.rewardType === "cash" && (
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Reward Amount (optional)
              </label>
              <div className="flex items-center gap-2 border border-brand-card-border rounded-[10px] px-4 py-3 focus-within:ring-2 focus-within:ring-brand-dark/20 bg-white">
                <span className="text-gray-placeholder text-[14px]">₹</span>
                <input
                  type="number"
                  value={form.rewardAmount}
                  onChange={(e) => update("rewardAmount", e.target.value)}
                  placeholder="Enter amount"
                  className="flex-1 text-[14px] text-gray-text outline-none placeholder-gray-placeholder"
                />
              </div>
            </div>
          )}

          {(form.rewardType === "food" || form.rewardType === "favour") && (
            <div>
              <label className="text-[13px] font-semibold text-gray-secondary mb-1.5 block">
                Reward Description{" "}
                <span className="text-red-500 font-normal">*</span>
              </label>
              <input
                type="text"
                value={rewardDescription}
                onChange={(e) => setRewardDescription(e.target.value)}
                placeholder={
                  form.rewardType === "food"
                    ? "e.g. Home-cooked meal, tea & snacks…"
                    : "e.g. I'll help you move next time, fix your WiFi…"
                }
                className="w-full border border-brand-card-border rounded-[10px] px-4 py-3 text-[14px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder"
              />
            </div>
          )}

          <button
            type="submit"
            disabled={loading}
            className="w-full bg-brand-dark text-white text-[16px] font-semibold py-4 rounded-[10px] hover:bg-green-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
          >
            <Send className="w-5 h-5" />
            {loading ? "Posting..." : "Post Request"}
          </button>
        </form>
      </main>

      <BottomNav />
    </div>
  );
}
