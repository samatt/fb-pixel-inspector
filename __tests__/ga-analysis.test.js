import fs from "fs";
import { harParser } from "../src/harp.js";
import { getGACollectEvents, parseGAEvent } from "../src/ga-analysis.js";

const HAR_FILE = JSON.parse(
  fs.readFileSync("__tests__/test-data/mylabbox/requests-merged.har", "utf-8")
);

const HAR_FILE_2 = JSON.parse(
  fs.readFileSync("__tests__/test-data/oraquick/requests-merged.har", "utf-8")
);

const HAR_FILE_3 = JSON.parse(
  fs.readFileSync(
    "__tests__/test-data/personalabs/requests-merged.har",
    "utf-8"
  )
);

describe("Google Analytics Parser", () => {
  const GA_COLLECT_EVENTS = [
    ...getGACollectEvents(harParser(HAR_FILE)),
    ...getGACollectEvents(harParser(HAR_FILE_2)),
    ...getGACollectEvents(harParser(HAR_FILE_3)),
  ];

  it("can read can read a HAR file and extract  GA `/collect` requests ", () => {
    const req_urls = new Set(GA_COLLECT_EVENTS.map((x) => x["req.urlClean"]));
    req_urls.forEach((x) =>
      expect(
        x.includes("google-analytics.com") || x.includes("analytics.google.com")
      ).toBe(true)
    );
  });

  it("can parse GA collect requests", () => {
    const EVENTS_WITH_CD = GA_COLLECT_EVENTS.map((x) => parseGAEvent(x));
    console.log(EVENTS_WITH_CD);
    fs.writeFileSync(
      "__tests__/ga.json",
      JSON.stringify(EVENTS_WITH_CD, null, 2)
    );
  });
});
