import fs from "fs";
import { getPixelEvents, parsePixelEvent } from "../src/fb-analysis.js";
import { harParser } from "../src/harp.js";
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

describe("META Pixel Parser", () => {
  const FB_TRACKING_EVENTS = [
    ...getPixelEvents(harParser(HAR_FILE)),
    ...getPixelEvents(harParser(HAR_FILE_2)),
    ...getPixelEvents(harParser(HAR_FILE_3)),
  ];

  it("can read the HTTP Method and Facebook cookies in Meta Pixel tracking events", () => {
    const DESIRED_METHODS = {
      "req.method": expect.stringMatching(/GET|POST/),
    };

    const POST_EVENT = FB_TRACKING_EVENTS.filter(
      (t) => t["req.method"] === "POST"
    )[0];

    const GET_EVENT = FB_TRACKING_EVENTS.filter(
      (t) => t["req.method"] === "GET"
    )[0];

    expect(POST_EVENT).toMatchObject(DESIRED_METHODS);
    expect(GET_EVENT).toMatchObject(DESIRED_METHODS);

    const DESIRED_COOKIES = {
      domain: ".facebook.com",
    };
    const POST_PIXEL_EVENT = parsePixelEvent(POST_EVENT);
    const GET_PIXEL_EVENT = parsePixelEvent(GET_EVENT);

    expect(POST_PIXEL_EVENT.fbCookies).toEqual(
      expect.arrayContaining([expect.objectContaining(DESIRED_COOKIES)])
    );

    expect(GET_PIXEL_EVENT.fbCookies).toEqual(
      expect.arrayContaining([expect.objectContaining(DESIRED_COOKIES)])
    );
  });

  it("can read can read a har file and extract Meta Pixel tracking event requests", () => {
    const req_urls = new Set(FB_TRACKING_EVENTS.map((x) => x["req.urlClean"]));
    req_urls.forEach((x) => expect(x === "www.facebook.com/tr/").toBe(true));
  });

  it("can parse custom data parameters", () => {
    const EVENTS_WITH_CD = FB_TRACKING_EVENTS.map((x) =>
      parsePixelEvent(x)
    ).filter((x) => x.customData.length > 0);
    const randomEventIndex = Math.floor(Math.random() * EVENTS_WITH_CD.length);

    const randomEvent = EVENTS_WITH_CD[randomEventIndex];
    expect(randomEvent.customData.map((d) => d.name)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^cd[.*]?/)])
    );
  });

  it("can parse advanced matching parameters", () => {
    const EVENTS_WITH_UDFF = FB_TRACKING_EVENTS.map((x) =>
      parsePixelEvent(x)
    ).filter((x) => x.advMatch.length > 0);
    const randomEventIndex = Math.floor(
      Math.random() * EVENTS_WITH_UDFF.length
    );

    const randomEvent = EVENTS_WITH_UDFF[randomEventIndex];
    expect(randomEvent.advMatch.map((d) => d.name)).toEqual(
      expect.arrayContaining([expect.stringMatching(/^udff[.*]?/)])
    );
  });