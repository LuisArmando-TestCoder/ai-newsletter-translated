import { CronJob } from "npm:cron";

/**
 * Schedules a given callback to run at the specified cron expression.
 *
 * @param callback - An async function that performs the scheduled task
 * @param cronTime - A string representing the cron schedule (e.g. "0 0 * * *" for midnight daily)
 *
 * Usage example:
 *   scheduleTasks(myFunction, "0 8 * * *"); // Runs daily at 08:00 UTC
 */
export function scheduleTasks(
  callback: () => Promise<void> | void,
  cronTime: string
): void {
  console.log(
    `Scheduling newsletter process with cron expression: "${cronTime}"`
  );

  // Create a new CronJob
  const job = new CronJob(
    cronTime,
    callback,
    null,
    false, // Don't start immediately
    "UTC"
  );

  // Start the CronJob
  job.start();
  console.log("Cron job started.");
}
