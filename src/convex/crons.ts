import { cronJobs } from "convex/server";
import { internal } from "./_generated/api";

// Refresh editor video statistics once an hour. The sync is a no-op until a
// YOUTUBE_API_KEY environment variable is configured on the deployment.
const crons = cronJobs();

crons.interval(
  "sync youtube editor stats",
  { hours: 1 },
  internal.youtube.syncAll,
  {},
);

export default crons;
