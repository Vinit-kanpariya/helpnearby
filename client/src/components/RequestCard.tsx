import { Link } from "react-router-dom";
import { MapPin, Clock, User } from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import type { HelpRequest } from "../types";

const rewardBadgeColor: Record<string, string> = {
  cash: "bg-brand-card-border text-brand-dark",
  food: "bg-yellow-100 text-yellow-700",
  favour: "bg-purple-100 text-purple-700",
  free: "bg-brand-card-bg text-brand-dark",
};

export default function RequestCard({ request }: { request: HelpRequest }) {
  const { user } = useAuth();

  const isOwner =
    user?._id === (typeof request.requester === "object" ? request.requester._id : request.requester);

  const alreadyOffered = !isOwner && !!request.offers?.some(
    (o) => (typeof o.user === "object" ? o.user._id : o.user) === user?._id
  );

  const rewardText =
    request.rewardType === "cash"
      ? `\u20B9${request.rewardAmount || ""}`
      : request.rewardType === "free"
        ? "Free"
        : request.rewardType.charAt(0).toUpperCase() +
          request.rewardType.slice(1);

  const isCompleted = request.status === "completed";

  return (
    <Link
      to={`/request/${request._id}`}
      className={`bg-white rounded-xl border p-5 hover:shadow-md transition-shadow flex flex-col gap-3 ${
        isCompleted ? "border-gray-200 opacity-75" : "border-brand-card-border"
      }`}
    >
      {/* Row 1: Title + Reward */}
      <div className="flex items-start justify-between gap-2">
        <h3 className="flex-1 text-[14px] font-bold text-gray-text leading-tight line-clamp-2 min-w-0">
          {request.title}
        </h3>
        <span
          className={`text-[12px] font-semibold px-2.5 py-1 rounded-md whitespace-nowrap shrink-0 ${rewardBadgeColor[request.rewardType] || rewardBadgeColor.cash}`}
        >
          {rewardText}
        </span>
      </div>

      {/* Row 2: Address */}
      <div className="flex items-center gap-1 text-[12px] text-gray-muted">
        <MapPin className="w-3.5 h-3.5 shrink-0" />
        <span className="truncate">{request.location?.address || "Nearby"}</span>
      </div>

      {/* Row 3: Date & Time */}
      <div className="flex items-center gap-1 text-[12px] text-gray-muted">
        <Clock className="w-3.5 h-3.5 shrink-0" />
        <span>
          {request.date
            ? new Date(request.date).toLocaleDateString("en-IN", {
                month: "short",
                day: "numeric",
              })
            : "Today"}
          {request.time && `, ${request.time}`}
        </span>
      </div>

      {/* Row 4: Author + Status */}
      <div className="flex items-center justify-between mt-auto">
        <span className="flex items-center gap-1.5 text-[12px] text-gray-muted">
          <User className="w-3.5 h-3.5 shrink-0" />
          {typeof request.requester === "object"
            ? request.requester.name
            : "Unknown"}
        </span>
        {isOwner ? (
          <span className="text-[12px] font-semibold text-gray-400">
            Your Post
          </span>
        ) : isCompleted ? (
          <span className="text-[12px] font-semibold px-2 py-0.5 rounded-full bg-green-100 text-green-700">
            Fulfilled
          </span>
        ) : (
          <span
            className={`text-[12px] font-semibold px-2 py-0.5 rounded-full ${
              alreadyOffered
                ? "bg-gray-100 text-gray-400"
                : "bg-brand-card-bg text-brand-dark"
            }`}
          >
            {alreadyOffered ? "Offered" : "Active"}
          </span>
        )}
      </div>
    </Link>
  );
}
