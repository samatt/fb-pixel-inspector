import fs from "fs";
import { writeCSV } from "../src/utils.js";
// import { getFBTrackingEvents, parseFBPixelEvent } from "../src/fb-analysis.js";
import {
  parseHARObject,
  harParser,
  HAR_ENTRIES_HEADER,
  stringifyEntry,
} from "../src/harp.js";
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

describe("HAR Parser", () => {
  it("can parse a HAR file entries into our desired format", async () => {
    const desiredEntry = {
      // "req.id": expect.stringMatching(/\d*\.\d*|\w/),
      "req.method": expect.stringMatching(/GET|POST/),
      // "resp.status": expect.stringMatching(/\d{3}/),
    };
    const parsedEntries = harParser(HAR_FILE);
    expect(
      parsedEntries[Math.floor(Math.random() * parsedEntries.length)]
    ).toMatchObject(desiredEntry);

    // FIXME: MOVE THESE OUT OF HERE
    // fs.writeFileSync("__tests__/test.json", JSON.stringify(parsedEntries));
    await writeCSV(
      "__tests__/test.csv",
      parsedEntries.map((x) => stringifyEntry(x)),
      HAR_ENTRIES_HEADER
    );
  });
  it("can serialize parsed HAR files", () => {});
  it("can parse requests", () => {
    const desiredReq = HAR_FILE.log.entries[0];
    const desiredURL = new URL(desiredReq.request.url);
    const x = parseHARObject(desiredReq);
    expect(x["req.id"]).toBe(desiredReq._requestId);
    expect(x["req.urlRaw"]).toBe(desiredReq.request.url);
    expect(x["req.urlClean"]).toBe(
      `${desiredURL.hostname}${desiredURL.pathname}`
    );
    expect(x["req.urlHost"]).toBe(desiredURL.hostname);
    expect(x["req.urlPath"]).toBe(desiredURL.pathname);
    expect(x["req.urlParams"]).toEqual(desiredReq.request.queryString);
    expect(x["req.cookies"]).toEqual(desiredReq.request.cookies);
    expect(x["req.headers"]).toEqual(desiredReq.request.headers);
  });

  it("can parse responses", () => {
    //
    const desiredReq = HAR_FILE.log.entries[1];
    const x = parseHARObject(desiredReq);
    expect(x["resp.httpVersion"]).toBe(desiredReq.response.httpVersion);
    expect(x["resp.redirectURL"]).toBe(desiredReq.response.redirectURL);
    expect(x["resp.status"]).toBe(desiredReq.response.status);
    expect(x["resp.statusText"]).toBe(desiredReq.response.statusText);
    expect(x["resp.content"]).toBe(desiredReq.response.content);
    expect(x["resp.bodySize"]).toEqual(desiredReq.response.bodySize);
    expect(x["resp.cookies"]).toEqual(desiredReq.response.cookies);
    expect(x["resp.headers"]).toEqual(desiredReq.response.headers);
  });

  it("can parse application/json POST data", () => {
    const desiredReq = HAR_FILE_2.log.entries
      .filter((x) => x.request.method === "POST")
      .filter(
        (x) =>
          typeof x.request.postData !== "undefined" &&
          x.request.postData.mimeType === "application/json"
      );
    const parsedObj = parseHARObject(desiredReq[1]);
    expect(parsedObj["req.postData"]).toStrictEqual({
      customerEmail: "test@test.com",
    });
  });

  it("can parse x-www-form-urlencoded POST data", () => {
    const desiredReq = HAR_FILE.log.entries
      .filter((x) => x.request.method === "POST")
      .filter(
        (x) =>
          typeof x.request.postData !== "undefined" &&
          x.request.postData.mimeType.includes("x-www-form-urlencoded")
      );
    const parsedObj = parseHARObject(desiredReq[0]);
    expect(parsedObj["req.postData"]).toEqual(
      expect.arrayContaining([{ name: "ev", value: "Microdata" }])
    );
  });

  it("can parse multipart/form-data POST data", () => {
    const desiredReq = HAR_FILE.log.entries
      .filter((x) => x.request.method === "POST")
      .filter(
        (x) =>
          typeof x.request.postData !== "undefined" &&
          x.request.postData.mimeType.includes("multipart/form-data")
      );
    const parsedObj = parseHARObject(desiredReq[0]);

    expect(parsedObj["req.postData"]).toEqual(
      expect.arrayContaining([
        {
          name: "data",
          value:
            '{"event":"__activity__","token":"UsRnv6","properties":{"page":"https://www.mylabbox.com/","browser":"Chrome","os":"Mac","$use_ip":true,"$is_session_activity":true},"customer_properties":{"$email":"test@gmail.com","$referrer":{"ts":1686166911,"value":"","first_page":"https://www.mylabbox.com/"},"$last_referrer":{"ts":1686170369,"value":"","first_page":"https://www.mylabbox.com/"},"$exchange_id":"IDXL0vH3jMssE2B-AEqyLjyYhwK_yXcN4NuQxPBqgNE=.UsRnv6"}}',
        },
      ])
    );
  });

  it("can return an error message if it for POST bodies it cant parse ", () => {
    const desiredReq = HAR_FILE_2.log.entries
      .filter((x) => x.request.method === "POST")
      .filter(
        (x) =>
          typeof x.request.postData !== "undefined" &&
          x.request.postData.mimeType.includes("application/binary")
      );
    const parsedObj = parseHARObject(desiredReq[0]);

    expect(parsedObj["req.postData"]).toEqual({
      error: `No parser found for mimeType application/binary`,
    });
  });
});
