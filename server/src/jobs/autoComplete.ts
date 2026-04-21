import cron from "node-cron";
import HelpRequest from "../models/HelpRequest";

async function markExpiredRequestsCompleted() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`; // HH:MM

  // Find requests that have a date set and are not yet completed/cancelled
  const pending = await HelpRequest.find({
    status: { $in: ["active", "in_progress"] },
    date: { $exists: true, $ne: "" },
  });

  const expiredIds = pending
    .filter((r) => {
      if (!r.date) return false;
      if (r.date < today) return true;
      if (r.date === today) {
        // If no time set, treat end-of-day (i.e., already expired once today passes)
        if (!r.time) return true;
        return r.time < currentTime;
      }
      return false;
    })
    .map((r) => r._id);

  if (expiredIds.length === 0) return;

  await HelpRequest.updateMany(
    { _id: { $in: expiredIds } },
    { $set: { status: "completed" } }
  );

  console.log(`[autoComplete] Marked ${expiredIds.length} expired request(s) as completed.`);
}

export function startAutoCompleteJob() {
  // Run every hour at :00
  cron.schedule("0 * * * *", () => {
    markExpiredRequestsCompleted().catch((err) =>
      console.error("[autoComplete] Error:", err)
    );
  });

  // Also run once immediately on startup to catch anything missed while server was down
  markExpiredRequestsCompleted().catch((err) =>
    console.error("[autoComplete] Error on startup:", err)
  );

  console.log("[autoComplete] Auto-complete job scheduled (runs every hour).");
}
