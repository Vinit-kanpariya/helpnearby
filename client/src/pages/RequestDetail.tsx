import { useState, useEffect } from "react";
import { useParams, Link, useNavigate } from "react-router-dom";
import { ArrowLeft, MapPin, Clock, Star, HandHelping, CheckCircle, XCircle, MessageCircle } from "lucide-react";
import Navbar from "../components/Navbar";
import BottomNav from "../components/BottomNav";
import { getRequest, submitOffer, handleOffer, completeRequest } from "../services/api";
import { useAuth } from "../contexts/AuthContext";
import type { HelpRequest, Offer } from "../types";

export default function RequestDetail() {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [request, setRequest] = useState<HelpRequest | null>(null);
  const [loading, setLoading] = useState(true);
  const [offering, setOffering] = useState(false);
  const [message, setMessage] = useState("");
  const [actioningOffer, setActioningOffer] = useState<string | null>(null);
  const [showReview, setShowReview] = useState(false);
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [completing, setCompleting] = useState(false);

  useEffect(() => {
    if (id) {
      getRequest(id)
        .then((res) => setRequest(res.data.request || res.data))
        .finally(() => setLoading(false));
    }
  }, [id]);

  const refreshRequest = async () => {
    if (!id) return;
    const res = await getRequest(id);
    setRequest(res.data.request || res.data);
  };

  const handleOfferSubmit = async () => {
    if (!id) return;
    setOffering(true);
    try {
      await submitOffer(id, message || "I can help!");
      await refreshRequest();
      setMessage("");
    } catch {
      alert("Failed to submit offer");
    } finally {
      setOffering(false);
    }
  };

  const handleComplete = async () => {
    if (!id) return;
    setCompleting(true);
    try {
      await completeRequest(id, { rating: reviewRating, comment: reviewComment.trim() || undefined });
      await refreshRequest();
      setShowReview(false);
      setReviewComment("");
    } catch {
      alert("Failed to mark as complete");
    } finally {
      setCompleting(false);
    }
  };

  const handleOfferAction = async (offerId: string, status: "accepted" | "rejected") => {
    if (!id) return;
    setActioningOffer(offerId);
    try {
      await handleOffer(id, offerId, status);
      await refreshRequest();
    } catch {
      alert("Failed to update offer");
    } finally {
      setActioningOffer(null);
    }
  };

  if (loading) {
    return (
      <div className="h-full flex items-center justify-center bg-brand-bg">
        <div className="w-8 h-8 border-4 border-brand-card-border border-t-brand-dark rounded-full animate-spin" />
      </div>
    );
  }

  if (!request) {
    return (
      <div className="h-full flex flex-col bg-brand-bg">
        <Navbar />
        <div className="flex-1 flex items-center justify-center">
          <p className="text-gray-muted">Request not found.</p>
        </div>
      </div>
    );
  }

  const isOwner = user?._id === (request.requester?._id || request.requester);
  const myOffer = request.offers?.find(
    (o) => (typeof o.user === "object" ? o.user._id : o.user) === user?._id
  );
  const alreadyOffered = !!myOffer;

  // Helpers who offered can see the offers section too
  const canSeeOffers = isOwner || alreadyOffered;

  return (
    <div className="h-full flex flex-col bg-brand-bg">
      <Navbar />
      <div className="h-px bg-brand-card-border" />

      <main className="flex-1 overflow-y-auto p-8 max-md:p-4 max-md:pb-20">
        <div className="max-w-[900px] mx-auto">
          <Link
            to="/browse"
            className="inline-flex items-center gap-1.5 text-[13px] text-gray-muted hover:text-brand-dark mb-6"
          >
            <ArrowLeft className="w-4 h-4" /> Back to Browse
          </Link>

          <div className="flex gap-8 max-md:flex-col">
            {/* Left column */}
            <div className="flex-1">
              {/* Tags */}
              <div className="flex gap-2 mb-3">
                {request.status === "active" && (
                  <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-orange-100 text-orange-700 border border-orange-200">
                    Urgent
                  </span>
                )}
                <span className="text-[11px] font-semibold px-2.5 py-1 rounded-full bg-brand-card-bg text-brand-dark border border-brand-card-border">
                  {request.category.charAt(0).toUpperCase() +
                    request.category.slice(1)}
                </span>
              </div>

              <h1 className="text-[22px] max-md:text-[18px] font-extrabold text-gray-text mb-4">
                {request.title}
              </h1>

              <div className="flex flex-wrap gap-4 text-[13px] text-gray-muted mb-6">
                <span className="flex items-center gap-1.5">
                  <MapPin className="w-4 h-4" />
                  {request.location?.address || "Nearby"}
                </span>
                <span className="flex items-center gap-1.5">
                  <Clock className="w-4 h-4" />
                  {request.date
                    ? new Date(request.date).toLocaleDateString("en-IN", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Today"}
                  {request.time && `, ${request.time}`}
                </span>
              </div>

              <h3 className="text-[14px] font-bold text-gray-text mb-2">
                About this request
              </h3>
              <p className="text-[14px] text-gray-muted leading-relaxed mb-8">
                {request.description || "No additional details provided."}
              </p>

              {/* Requester */}
              <div className="mb-8">
                <h3 className="text-[13px] text-gray-muted mb-3">Posted by</h3>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 bg-brand-light rounded-full" />
                  <div>
                    <div className="text-[14px] font-bold text-gray-text">
                      {request.requester?.name || "Unknown"}
                    </div>
                    <div className="text-[12px] text-gray-muted flex items-center gap-2">
                      <Star className="w-3 h-3 text-yellow-500" />
                      {request.requester?.rating?.toFixed(1) || "4.8"} ·{" "}
                      {request.requester?.tasksHelped || 0} tasks completed
                    </div>
                  </div>
                </div>
              </div>

              {/* Offers section — visible to owner and to anyone who has offered */}
              {canSeeOffers && request.offers && request.offers.length > 0 && (
                <div>
                  <h3 className="text-[14px] font-bold text-gray-text mb-3">
                    {isOwner
                      ? `Offers (${request.offers.length})`
                      : "Your Offer"}
                  </h3>
                  <div className="flex flex-col gap-3">
                    {(isOwner ? request.offers : request.offers.filter(
                      (o) => (typeof o.user === "object" ? o.user._id : o.user) === user?._id
                    )).map((offer: Offer) => {
                      const offerUser = typeof offer.user === "object" ? offer.user : null;
                      const isActioning = actioningOffer === offer._id;
                      return (
                        <div
                          key={offer._id}
                          className="bg-white border border-brand-card-border rounded-xl p-4 flex items-start gap-3"
                        >
                          <div className="w-9 h-9 bg-brand-light rounded-full shrink-0" />
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-0.5">
                              <span className="text-[13px] font-bold text-gray-text">
                                {offerUser?.name || "Helper"}
                              </span>
                              <span
                                className={`text-[11px] font-semibold px-2 py-0.5 rounded-full ${
                                  offer.status === "accepted"
                                    ? "bg-green-100 text-green-700"
                                    : offer.status === "rejected"
                                      ? "bg-red-100 text-red-600"
                                      : "bg-orange-50 text-orange-600"
                                }`}
                              >
                                {offer.status.charAt(0).toUpperCase() + offer.status.slice(1)}
                              </span>
                            </div>
                            <p className="text-[13px] text-gray-muted">
                              {offer.message}
                            </p>
                          </div>
                          {/* Accept / Reject buttons — only for owner, only if pending */}
                          {isOwner && offer.status === "pending" && (
                            <div className="flex gap-2 shrink-0">
                              <button
                                onClick={() => handleOfferAction(offer._id, "accepted")}
                                disabled={isActioning}
                                className="flex items-center gap-1 text-[12px] font-semibold text-green-700 bg-green-50 border border-green-200 px-3 py-1.5 rounded-lg hover:bg-green-100 transition-colors disabled:opacity-50"
                              >
                                <CheckCircle className="w-3.5 h-3.5" />
                                Accept
                              </button>
                              <button
                                onClick={() => handleOfferAction(offer._id, "rejected")}
                                disabled={isActioning}
                                className="flex items-center gap-1 text-[12px] font-semibold text-red-600 bg-red-50 border border-red-200 px-3 py-1.5 rounded-lg hover:bg-red-100 transition-colors disabled:opacity-50"
                              >
                                <XCircle className="w-3.5 h-3.5" />
                                Reject
                              </button>
                            </div>
                          )}
                        </div>
                      );
                    })}
                  </div>
                </div>
              )}
            </div>

            {/* Right column - Map & CTA */}
            <div className="w-[320px] max-md:w-full shrink-0">
              {/* Map preview */}
              {(() => {
                const [lon, lat] = request.location?.coordinates ?? [0, 0];
                if (lon !== 0 && lat !== 0) {
                  const delta = 0.008;
                  const src = `https://www.openstreetmap.org/export/embed.html?bbox=${lon - delta},${lat - delta},${lon + delta},${lat + delta}&layer=mapnik&marker=${lat},${lon}`;
                  return (
                    <div className="rounded-xl overflow-hidden border border-brand-card-border mb-6 h-[180px]">
                      <iframe
                        src={src}
                        width="100%"
                        height="180"
                        style={{ border: "none", display: "block" }}
                        title="Request location map"
                        loading="lazy"
                      />
                    </div>
                  );
                }
                return (
                  <div className="bg-brand-card-bg border border-brand-card-border rounded-xl h-[180px] flex flex-col items-center justify-center gap-2 mb-6">
                    <MapPin className="w-8 h-8 text-brand-dark" />
                    <span className="text-[13px] font-semibold text-gray-text">Map preview</span>
                    <span className="text-[11px] text-gray-muted">
                      {request.location?.address || "Location not set"}
                    </span>
                  </div>
                );
              })()}

              <div className="mb-4">
                <span className="text-[12px] text-gray-muted">Reward</span>
                <div className="text-[24px] font-extrabold text-gray-text">
                  {request.rewardType === "cash"
                    ? `₹${request.rewardAmount || 0} cash`
                    : request.rewardType === "free"
                      ? "Free / Volunteer"
                      : request.rewardType.charAt(0).toUpperCase() + request.rewardType.slice(1)}
                </div>
                {request.rewardDescription && (
                  <p className="text-[13px] text-gray-muted mt-1">{request.rewardDescription}</p>
                )}
              </div>

              {/* Request already fulfilled — no more offers */}
              {!isOwner && request.status !== "active" && (
                <div className="w-full text-center text-[13px] text-gray-muted bg-gray-50 border border-gray-200 rounded-[10px] py-3 px-4">
                  {request.status === "completed" ? "This request has been fulfilled." : "Someone is already helping with this request."}
                </div>
              )}

              {/* Offer CTA — non-owner, not yet offered, logged in, request still active */}
              {!isOwner && !alreadyOffered && user && request.status === "active" && (
                <>
                  <input
                    value={message}
                    onChange={(e) => setMessage(e.target.value)}
                    placeholder="Add a message (optional)"
                    className="w-full border border-brand-card-border rounded-[10px] px-4 py-2.5 text-[13px] mb-3 outline-none focus:ring-2 focus:ring-brand-dark/20"
                  />
                  <button
                    onClick={handleOfferSubmit}
                    disabled={offering}
                    className="w-full bg-brand-dark text-white text-[15px] font-semibold py-3.5 rounded-[10px] hover:bg-green-800 transition-colors disabled:opacity-60 flex items-center justify-center gap-2"
                  >
                    <HandHelping className="w-5 h-5" />
                    {offering ? "Submitting..." : "I Can Help!"}
                  </button>
                </>
              )}

              {/* Already offered — show disabled button (only while active) */}
              {!isOwner && alreadyOffered && request.status === "active" && (
                <button
                  disabled
                  className="w-full bg-gray-100 text-gray-400 text-[15px] font-semibold py-3.5 rounded-[10px] border border-gray-200 flex items-center justify-center gap-2 cursor-not-allowed"
                >
                  <HandHelping className="w-5 h-5" />
                  {myOffer?.status === "accepted"
                    ? "Offer Accepted!"
                    : myOffer?.status === "rejected"
                      ? "Offer Rejected"
                      : "Already Offered"}
                </button>
              )}

              <p className="text-[12px] text-gray-muted text-center mt-3">
                {request.offers?.length || 0} people already offered help
              </p>

              {/* Mark as Complete — owner only, when in progress */}
              {isOwner && request.status === "in_progress" && !showReview && (
                <button
                  onClick={() => setShowReview(true)}
                  className="mt-3 w-full bg-green-600 text-white text-[14px] font-semibold py-3 rounded-[10px] hover:bg-green-700 transition-colors flex items-center justify-center gap-2"
                >
                  <CheckCircle className="w-4 h-4" />
                  Mark as Complete
                </button>
              )}

              {/* Review form */}
              {isOwner && request.status === "in_progress" && showReview && (
                <div className="mt-3 bg-brand-card-bg border border-brand-card-border rounded-xl p-4">
                  <p className="text-[13px] font-semibold text-gray-text mb-3">
                    Rate your helper
                  </p>
                  <div className="flex gap-1 mb-3">
                    {[1, 2, 3, 4, 5].map((star) => (
                      <button
                        key={star}
                        type="button"
                        onClick={() => setReviewRating(star)}
                        className={`text-[24px] transition-colors ${
                          star <= reviewRating ? "text-yellow-400" : "text-gray-300"
                        }`}
                      >
                        ★
                      </button>
                    ))}
                  </div>
                  <textarea
                    value={reviewComment}
                    onChange={(e) => setReviewComment(e.target.value)}
                    placeholder="Leave a comment (optional)..."
                    rows={3}
                    className="w-full border border-brand-card-border rounded-[10px] px-3 py-2 text-[13px] text-gray-text outline-none focus:ring-2 focus:ring-brand-dark/20 placeholder-gray-placeholder resize-none mb-3"
                  />
                  <div className="flex gap-2">
                    <button
                      onClick={handleComplete}
                      disabled={completing}
                      className="flex-1 bg-green-600 text-white text-[13px] font-semibold py-2.5 rounded-[10px] hover:bg-green-700 transition-colors disabled:opacity-60 flex items-center justify-center gap-1.5"
                    >
                      <CheckCircle className="w-4 h-4" />
                      {completing ? "Completing..." : "Submit & Complete"}
                    </button>
                    <button
                      onClick={() => setShowReview(false)}
                      disabled={completing}
                      className="px-4 py-2.5 text-[13px] text-gray-muted border border-brand-card-border rounded-[10px] hover:bg-white transition-colors"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              )}

              {/* Chat button — visible once any offer is accepted */}
              {(() => {
                const acceptedOffer = request.offers?.find(o => o.status === "accepted");
                if (!acceptedOffer) return null;
                const helperUser = typeof acceptedOffer.user === "object" ? acceptedOffer.user : null;
                // Show to owner: chat with helper. Show to helper: chat with requester.
                const chatWith = isOwner ? helperUser : request.requester;
                if (!chatWith || !user) return null;
                const chatId = typeof chatWith === "object" ? chatWith._id : chatWith;
                const chatName = typeof chatWith === "object" ? chatWith.name : "them";
                return (
                  <button
                    onClick={() => navigate(`/chat?with=${chatId}`)}
                    className="mt-3 w-full bg-brand-card-bg border border-brand-card-border text-brand-dark text-[14px] font-semibold py-3 rounded-[10px] hover:bg-brand-card-border transition-colors flex items-center justify-center gap-2"
                  >
                    <MessageCircle className="w-4 h-4" />
                    Chat with {chatName}
                  </button>
                );
              })()}
            </div>
          </div>
        </div>
      </main>

      <BottomNav />
    </div>
  );
}
