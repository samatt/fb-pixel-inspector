import fs from "fs";
import path from "path";
import { logger } from "./logger.js";

const SESSION = "data/sessions/some-session";

const reportData = JSON.parse(
  fs.readFileSync(path.join(SESSION, "raw", "report.json"))
);

const urlsVisited = [...new Set(reportData.map((x) => x.url))];
const totalEvents = reportData
  .map((x) => x.fbEvents.length)
  .reduce((a, b) => a + b, 0);

const uniqueTimeStamps = new Set(
  reportData.map((x) => x.fbEvents.map((y) => y.rawEventData.ts)).flat()
);
const uniqueEvents = [
  ...new Set(
    reportData.map((x) => x.fbEvents.map((y) => y.rawEventData.ev)).flat()
  ),
];
const eventsPerUrl = reportData.reduce((acc, curr) => {
  // console.log(acc);
  acc[curr.url] = [...new Set(curr.fbEvents.map((e) => e.rawEventData.ev))];
  return acc;
}, {});

// console.log();
if (uniqueTimeStamps.size !== totalEvents) {
  logger.warn("Difference in unique ts and totalEvents");
}

console.log({ urlsVisited, uniqueEvents, totalEvents, uniqueTimeStamps });
