import cron from "node-cron";
import HelpRequest from "../models/HelpRequest";

async function markExpiredRequests() {
  const now = new Date();
  const today = now.toISOString().slice(0, 10); // YYYY-MM-DD
  const currentTime = `${String(now.getHours()).padStart(2, "0")}:${String(now.getMinutes()).padStart(2, "0")}`; // HH:MM

  const pending = await HelpRequest.find({
    status: { $in: ["active", "in_progress"] },
    date: { $exists: true, $ne: "" },
  });

  // Active requests with no helper expire (they were never picked up).
  // In-progress requests are auto-completed (helper engaged but never marked).
  const expiredActiveIds: string[] = [];
  const completedInProgressIds: string[] = [];

  for (const r of pending) {
    if (!r.date) continue;
    let isPast = false;
    if (r.date < today) isPast = true;
    else if (r.date === today) {
      if (!r.time) isPast = true;
      else if (r.time < currentTime) isPast = true;
    }
    if (!isPast) continue;

    if (r.status === "in_progress") {
      completedInProgressIds.push(r._id.toString());
    } else {
      expiredActiveIds.push(r._id.toString());
    }
  }

  if (expiredActiveIds.length > 0) {
    await HelpRequest.updateMany(
      { _id: { $in: expiredActiveIds } },
      { $set: { status: "expired" } }
    );
  }
  if (completedInProgressIds.length > 0) {
    await HelpRequest.updateMany(
      { _id: { $in: completedInProgressIds } },
      { $set: { status: "completed" } }
    );
  }

  if (expiredActiveIds.length + completedInProgressIds.length > 0) {
    console.log(
      `[autoComplete] Marked ${expiredActiveIds.length} expired and ${completedInProgressIds.length} auto-completed.`
    );
  }
}

export function startAutoCompleteJob() {
  // Run every hour at :00
  cron.schedule("0 * * * *", () => {
    markExpiredRequests().catch((err) =>
      console.error("[autoComplete] Error:", err)
    );
  });

  // Also run once immediately on startup to catch anything missed while server was down
  markExpiredRequests().catch((err) =>
    console.error("[autoComplete] Error on startup:", err)
  );

  console.log("[autoComplete] Auto-complete job scheduled (runs every hour).");
}
