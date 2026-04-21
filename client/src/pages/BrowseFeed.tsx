import { useState, useEffect, useMemo, useRef } from "react";
import { MapPin, Loader2, AlertCircle, X } from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import RequestCard from "../components/RequestCard";
import { getRequests } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import { Link } from "react-router-dom";
import type { HelpRequest } from "../types";

const distances = ["Within 1km", "Within 2km", "Within 5km", "Within 10km"];
const rewardOptions = ["All", "₹ Money", "Free"];

function haversineKm(lon1: number, lat1: number, lon2: number, lat2: number) {
  const R = 6371;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLon = ((lon2 - lon1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) *
      Math.cos((lat2 * Math.PI) / 180) *
      Math.sin(dLon / 2) ** 2;
  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

function distanceLimitKm(label: string) {
  if (label === "Within 1km") return 1;
  if (label === "Within 2km") return 2;
  if (label === "Within 5km") return 5;
  if (label === "Within 10km") return 10;
  return Infinity;
}

export default function BrowseFeed() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<HelpRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [distance, setDistance] = useState("Within 2km");
  const [rewardFilter, setRewardFilter] = useState("All");
  const [sort, setSort] = useState("Newest First");

  // User's detected location
  const [locationInput, setLocationInput] = useState(user?.location?.address || "");
  const storedCoords = user?.location?.coordinates;
  const initialCoords: [number, number] | null =
    storedCoords && storedCoords[0] !== 0 ? [storedCoords[0], storedCoords[1]] : null;
  const [userCoords, setUserCoords] = useState<[number, number] | null>(initialCoords);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [suggestionCoords, setSuggestionCoords] = useState<[number, number][]>([]);
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [locating, setLocating] = useState(false);
  const [locationBannerDismissed, setLocationBannerDismissed] = useState(false);
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const showLocationBanner =
    !!user &&
    !locationBannerDismissed &&
    !(user?.location?.coordinates && user.location.coordinates[0] !== 0);

  // Auto-detect location on mount; fall back to stored profile coords
  useEffect(() => {
    if (!navigator.geolocation) return;
    setLocating(true);
    navigator.geolocation.getCurrentPosition(
      async (pos) => {
        const { latitude, longitude } = pos.coords;
        setUserCoords([longitude, latitude]);
        try {
          const res = await fetch(
            `https://nominatim.openstreetmap.org/reverse?lat=${latitude}&lon=${longitude}&format=json`
          );
          const data = await res.json();
          const addr =
            data.address?.suburb ||
            data.address?.city_district ||
            data.address?.city ||
            data.display_name ||
            `${latitude.toFixed(4)}, ${longitude.toFixed(4)}`;
          setLocationInput(addr);
        } catch {
          setLocationInput(`${latitude.toFixed(4)}, ${longitude.toFixed(4)}`);
        } finally {
          setLocating(false);
        }
      },
      () => setLocating(false)
    );
  }, []);

  // Fetch location suggestions as user types
  const handleLocationChange = (value: string) => {
    setLocationInput(value);
    setUserCoords(null); // reset coords when user edits the text
    setShowSuggestions(true);
    if (debounceRef.current) clearTimeout(debounceRef.current);
    if (value.length < 3) { setSuggestions([]); return; }
    debounceRef.current = setTimeout(async () => {
      try {
        const res = await fetch(
          `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(value)}&format=json&limit=5&addressdetails=1`
        );
        const data: { display_name: string; lat: string; lon: string; address?: Record<string, string> }[] = await res.json();
        setSuggestions(
          data.map(
            (item) =>
              item.address?.suburb ||
              item.address?.city_district ||
              item.address?.city ||
              item.display_name
          )
        );
        setSuggestionCoords(data.map((item) => [parseFloat(item.lon), parseFloat(item.lat)]));
      } catch {
        setSuggestions([]);
      }
    }, 400);
  };

  const selectSuggestion = (label: string, coords: [number, number]) => {
    setLocationInput(label);
    setUserCoords(coords);
    setSuggestions([]);
    setShowSuggestions(false);
  };

  const handleLocationBlur = async () => {
    setTimeout(() => setShowSuggestions(false), 200);
    if (userCoords || locationInput.length < 3) return;
    try {
      const res = await fetch(
        `https://nominatim.openstreetmap.org/search?q=${encodeURIComponent(locationInput)}&format=json&limit=1`
      );
      const data: { lat: string; lon: string }[] = await res.json();
      if (data[0]) setUserCoords([parseFloat(data[0].lon), parseFloat(data[0].lat)]);
    } catch { /* ignore */ }
  };

  const [completedRequests, setCompletedRequests] = useState<HelpRequest[]>([]);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      getRequests({ status: "active" }),
      getRequests({ status: "completed" }),
      getRequests({ status: "in_progress" }),
    ])
      .then(([activeRes, completedRes, inProgressRes]) => {
        const inProgress = inProgressRes.data.requests || inProgressRes.data || [];
        setRequests([...(activeRes.data.requests || activeRes.data || []), ...inProgress]);
        setCompletedRequests(completedRes.data.requests || completedRes.data || []);
      })
      .catch(() => { setRequests([]); setCompletedRequests([]); })
      .finally(() => setLoading(false));
  }, []);

  const filterByDistance = (list: HelpRequest[]) => {
    if (!userCoords) return list;
    const limitKm = distanceLimitKm(distance);
    return list.filter((r) => {
      const [lon, lat] = r.location?.coordinates ?? [0, 0];
      if (lon === 0 && lat === 0) return false; // exclude posts without valid location
      return haversineKm(userCoords[0], userCoords[1], lon, lat) <= limitKm;
    });
  };

  const displayed = useMemo(() => {
    let list = filterByDistance([...requests]);

    // Reward filter
    if (rewardFilter === "₹ Money") {
      list = list.filter((r) => r.rewardType === "cash");
    } else if (rewardFilter === "Free") {
      list = list.filter(
        (r) => r.rewardType === "free" || r.rewardType === "favour"
      );
    }

    // Sort
    if (sort === "Newest First") {
      list.sort(
        (a, b) =>
          new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime()
      );
    } else if (sort === "Highest Reward") {
      list.sort((a, b) => (b.rewardAmount ?? 0) - (a.rewardAmount ?? 0));
    }

    return list;
  }, [requests, rewardFilter, sort, distance, userCoords]);

  const displayedCompleted = useMemo(
    () => filterByDistance([...completedRequests]),
    [completedRequests, distance, userCoords]
  );

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <div className="flex-1 flex overflow-hidden">
        {/* Sidebar filters */}
        <aside className="hidden md:flex flex-col w-[220px] border-r border-brand-card-border bg-white p-6 gap-6 shrink-0 overflow-y-auto">
          <div>
            <h3 className="text-[12px] font-semibold text-brand-dark uppercase tracking-wide mb-3">
              Filters
            </h3>

            {/* Location with suggestions */}
            <div className="mb-4">
              <h4 className="text-[13px] font-semibold text-gray-text mb-2">
                Location
              </h4>
              <div className="relative">
                <div className="flex items-center gap-1.5 border border-brand-card-border rounded-[8px] px-2.5 py-2 focus-within:ring-2 focus-within:ring-brand-dark/20 bg-white">
                  {locating ? (
                    <Loader2 className="w-3.5 h-3.5 text-brand-dark animate-spin shrink-0" />
                  ) : (
                    <MapPin className="w-3.5 h-3.5 text-gray-placeholder shrink-0" />
                  )}
                  <input
                    value={locationInput}
                    onChange={(e) => handleLocationChange(e.target.value)}
                    onFocus={() => setShowSuggestions(true)}
                    onBlur={handleLocationBlur}
                    placeholder={locating ? "Detecting…" : "Enter location"}
                    className="flex-1 text-[12px] text-gray-text outline-none placeholder-gray-placeholder bg-transparent min-w-0"
                  />
                </div>
                {showSuggestions && suggestions.length > 0 && (
                  <div className="absolute z-10 top-full left-0 right-0 mt-1 bg-white border border-brand-card-border rounded-[8px] shadow-lg overflow-hidden">
                    {suggestions.map((s, i) => (
                      <button
                        key={i}
                        onMouseDown={() => selectSuggestion(s, suggestionCoords[i])}
                        className="w-full text-left px-3 py-2 text-[12px] text-gray-text hover:bg-brand-card-bg truncate"
                      >
                        {s}
                      </button>
                    ))}
                  </div>
                )}
              </div>
              {userCoords && (
                <p className="text-[10px] text-brand-dark mt-1 flex items-center gap-0.5">
                  <MapPin className="w-2.5 h-2.5" /> Location set
                </p>
              )}
            </div>

            {/* Distance */}
            <div className="mb-4">
              <h4 className="text-[13px] font-semibold text-gray-text mb-2">
                Distance
              </h4>
              <div className="flex flex-col gap-1.5">
                {distances.map((d) => (
                  <label
                    key={d}
                    onClick={() => setDistance(d)}
                    className="flex items-center gap-2 text-[13px] text-gray-muted cursor-pointer select-none"
                  >
                    <span
                      className={`w-3.5 h-3.5 rounded-full border-2 shrink-0 transition-colors ${
                        distance === d
                          ? "border-brand-dark bg-brand-dark"
                          : "border-gray-300"
                      }`}
                    />
                    {d}
                  </label>
                ))}
              </div>
            </div>
          </div>

          {/* Reward Type */}
          <div>
            <h4 className="text-[13px] font-semibold text-gray-text mb-2">
              Reward Type
            </h4>
            <div className="flex flex-wrap gap-1.5">
              {rewardOptions.map((r) => (
                <button
                  key={r}
                  onClick={() => setRewardFilter(r)}
                  className={`text-[12px] px-3 py-1 rounded-md border transition-colors ${
                    rewardFilter === r
                      ? "bg-brand-dark text-white border-brand-dark"
                      : "border-brand-card-border text-gray-muted hover:bg-brand-card-bg"
                  }`}
                >
                  {r}
                </button>
              ))}
            </div>
          </div>
        </aside>

        {/* Main content */}
        <main className="flex-1 overflow-y-auto p-6 max-md:p-4 max-md:pb-20">
          {showLocationBanner && (
            <div className="flex items-center gap-3 bg-amber-50 border border-amber-200 rounded-xl px-4 py-3 mb-5">
              <AlertCircle className="w-4 h-4 text-amber-600 shrink-0" />
              <p className="flex-1 text-[13px] text-amber-800">
                Set your location to see requests near you.{" "}
                <Link to="/settings?tab=location" className="font-semibold underline hover:text-amber-900">
                  Set location
                </Link>
              </p>
              <button onClick={() => setLocationBannerDismissed(true)}>
                <X className="w-4 h-4 text-amber-500 hover:text-amber-700" />
              </button>
            </div>
          )}
          <div className="flex items-center justify-between mb-6">
            <h1 className="text-[18px] font-bold text-gray-text">
              {displayed.length} requests nearby
            </h1>
            <select
              value={sort}
              onChange={(e) => setSort(e.target.value)}
              className="hidden md:block text-[13px] text-gray-muted bg-white border border-brand-card-border rounded-lg px-3 py-2"
            >
              <option>Newest First</option>
              <option>Highest Reward</option>
            </select>
          </div>

          {loading ? (
            <div className="flex items-center justify-center py-20">
              <div className="w-8 h-8 border-4 border-brand-card-border border-t-brand-dark rounded-full animate-spin" />
            </div>
          ) : displayed.length === 0 && displayedCompleted.length === 0 ? (
            <div className="text-center py-20 text-gray-muted">
              <p className="text-[16px] font-semibold mb-2">No requests found</p>
              <p className="text-[13px]">
                Try a wider distance or adjust your filters.
              </p>
            </div>
          ) : (
            <>
              {/* Active requests */}
              {displayed.length > 0 && (
                <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4 mb-8">
                  {displayed.map((req) => (
                    <RequestCard key={req._id} request={req} />
                  ))}
                </div>
              )}

              {/* Fulfilled requests */}
              {displayedCompleted.length > 0 && (
                <>
                  <div className="flex items-center gap-3 mb-4">
                    <div className="h-px flex-1 bg-brand-card-border" />
                    <span className="text-[12px] font-semibold text-gray-muted uppercase tracking-wide">
                      {displayedCompleted.length} Fulfilled Requests
                    </span>
                    <div className="h-px flex-1 bg-brand-card-border" />
                  </div>
                  <div className="grid grid-cols-3 max-lg:grid-cols-2 max-md:grid-cols-1 gap-4">
                    {displayedCompleted.map((req) => (
                      <RequestCard key={req._id} request={req} />
                    ))}
                  </div>
                </>
              )}
            </>
          )}
        </main>
      </div>

      <BottomNav />
    </div>
  );
}
