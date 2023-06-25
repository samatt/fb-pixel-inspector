import fs from "fs";
// import { getFBTrackingEvents, parseFBPixelEvent } from "../src/fb-analysis.js";
import { parseHARObject } from "../src/harp.js";
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
  it("can parse requests", () => {
    const desiredReq = HAR_FILE.log.entries[0];
    const desiredURL = new URL(desiredReq.request.url);
    const x = parseHARObject(desiredReq);
    expect(x.requestId).toBe(desiredReq._requestId);
    expect(x.reqURLRaw).toBe(desiredReq.request.url);
    expect(x.reqURLClean).toBe(`${desiredURL.hostname}${desiredURL.pathname}`);
    expect(x.reqURLHost).toBe(desiredURL.hostname);
    expect(x.reqURLPath).toBe(desiredURL.pathname);
    expect(x.reqURLParams).toEqual(desiredReq.request.queryString);
    expect(x.reqCookies).toEqual(desiredReq.request.cookies);
    expect(x.reqHeaders).toEqual(desiredReq.request.headers);
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
    expect(parsedObj.reqPostData).toStrictEqual({
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
    expect(parsedObj.reqPostData).toEqual(
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
    console.log(parsedObj);
    expect(parsedObj.reqPostData).toEqual(
      expect.arrayContaining([
        {
          name: "data",
          value:
            '{"event":"__activity__","token":"UsRnv6","properties":{"page":"https://www.mylabbox.com/","browser":"Chrome","os":"Mac","$use_ip":true,"$is_session_activity":true},"customer_properties":{"$email":"test@gmail.com","$referrer":{"ts":1686166911,"value":"","first_page":"https://www.mylabbox.com/"},"$last_referrer":{"ts":1686170369,"value":"","first_page":"https://www.mylabbox.com/"},"$exchange_id":"IDXL0vH3jMssE2B-AEqyLjyYhwK_yXcN4NuQxPBqgNE=.UsRnv6"}}',
        },
      ])
    );
  });

  it("can return an error message if it ", () => {
    const desiredReq = HAR_FILE_2.log.entries
      .filter((x) => x.request.method === "POST")
      .filter(
        (x) =>
          typeof x.request.postData !== "undefined" &&
          x.request.postData.mimeType.includes("application/binary")
      );
    const parsedObj = parseHARObject(desiredReq[0]);
    console.log(parsedObj);
    expect(parsedObj.reqPostData).toEqual({
      error: `No parser found for mimeType application/binary`,
    });
  });
});
