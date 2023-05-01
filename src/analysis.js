import fs from "fs";
import querystring from "node:querystring";
import Handlebars from "handlebars";
import path from "path";
import { logger } from "./logger.js";

const parseMultipartFormData = (data) => {
  const parts = data.split(/-{5}[\w\d]+/).filter(Boolean);

  const result = {};

  parts.forEach((part) => {
    const [header, value] = part.split(/\r?\n\r?\n/);
    const keyMatch = header.match(/name="([\w\d\[\]]+)"/);
    if (!keyMatch) return;

    const key = keyMatch[1];
    const val = value.replace(/\r?\n?-$/, "");
    result[key] = val;
  });

  return result;
};
const template = Handlebars.compile(
  fs.readFileSync("templates/report.hbs", "utf8")
);

function parseFBPixelEvent(harObject) {
  const method = harObject.request.method;
  const cookies = harObject.request.cookies.filter((x) =>
    x.domain.includes("facebook")
  );
  let rawEventData = {};
  if (method === "GET") {
    rawEventData = harObject.request.queryString.reduce((acc, cur) => {
      acc[cur["name"]] = cur["value"];
      return acc;
    }, {});
  } else {
    if (harObject.request.postData.mimeType.includes("x-www-form-urlencoded")) {
      rawEventData = querystring.decode(harObject.request.postData.text);
    } else if (
      harObject.request.postData.mimeType.includes("multipart/form-data")
    ) {
      rawEventData = parseMultipartFormData(harObject.request.postData.text);
    } else {
      logger.warn("No parser found for mimeType", {
        mimeTyoe: harObject.request.postData.mimeType,
      });
    }
  }
  const customData = Object.entries(rawEventData)
    .filter((x) => x[0].includes("cd["))
    .map((x) => ({ name: x[0], value: x[1] }));
  const advMatch = Object.entries(rawEventData)
    .filter((x) => x[0].includes("ud["))
    .map((x) => ({ name: x[0], value: x[1] }));

  return {
    method,
    cookies,
    rawEventData,
    customData,
    advMatch,
  };
}
function getFBTrackingEvents(harData) {
  return harData.log.entries
    .filter((x) => x.request.url.includes("facebook.com/tr"))
    .map((x) => parseFBPixelEvent(x));
}
export function generateReport(sesson_path, reportData) {
  const REPORTS_FOLDER = path.join(sesson_path, "reports");
  const reports = reportData.map((x) => template(x));
  logger.info("WRITE REPORTS", {
    numPages: reports.length,
    reportsPath: REPORTS_FOLDER,
  });
  reports.forEach((element, index) => {
    fs.writeFileSync(path.join(REPORTS_FOLDER, `${index}.html`), element);
  });
}
export function runAnalysis(session_path) {
  const SESSION_PATH = session_path;
  const harData = JSON.parse(
    fs.readFileSync(
      path.join(SESSION_PATH, "raw", "requests-merged.har"),
      "utf-8"
    )
  );

  const runLog = fs
    .readFileSync(path.join(SESSION_PATH, "raw", "runlog.ndjson"), "utf-8")
    .split("\n")
    .map((x) => JSON.parse(x));

  const urlsVisited = [
    ...new Set(runLog.map((x) => x.url).filter((x) => x !== "about:blank")),
  ];

  const fbTrackingEvents = getFBTrackingEvents(harData);
  logger.info("RUN ANALYSIS", {
    totalEvents: fbTrackingEvents.length,
    totalUrls: urlsVisited.length,
  });

  fs.writeFileSync("test-fb.json", JSON.stringify(fbTrackingEvents, null, 2));

  const reportData = urlsVisited.reduce((acc, url) => {
    const fbEvents = fbTrackingEvents.filter((x) => x.rawEventData.dl === url);
    const screenshots = runLog
      .filter((x) => x.url == url)
      .map((x) => x.screenshot);
    acc.push({
      url,
      fbEvents,
      screenshots,
    });
    return acc;
  }, []);
  return reportData;
}
// FIXME: Using runner-log log instead of recording.json to
// function generateReportOld(recordingData, harData) {
//   const fbTrackingEvents = harData.log.entries
//     .filter((x) => x.request.url.includes("facebook.com/tr"))
//     .map((x) => parseFBPixelEvent(x));
//   // return fbTrackingEvents;

//   const steps = recordingData.steps.reduce((acc, curr, stepIndex) => {
//     if ("assertedEvents" in curr) {
//       const navEvents = curr["assertedEvents"].filter(
//         (x) => x["type"] === "navigation"
//       );

//       //TODO: Confirm there is only one nav assertedEvent per step.
//       // The code below makes that assumption
//       const curUrl = navEvents[0]["url"];
//       const prevUrl = acc.length > 0 ? acc.at(-1)["curUrl"] : "";
//       // This makes the following assumptions:
//       // - dl stands for direct link i.e the url the event was sent from.
//       // - rl stands for redirect link i.e the previous url
//       // This has always been accurate in practice but dont have explicit documentation.
//       // console.log(
//       //   fbTrackingEvents.map((x) => ({
//       //     dl: x.rawEventData.dl,
//       //     rl: x.rawEventData.rl,
//       //   }))
//       // );

//       const fbEvents = fbTrackingEvents.filter(
//         (x) =>
//           // (x.rawEventData.dl === curUrl && x.rawEventData.rl === prevUrl) ||
//           x.rawEventData.dl === curUrl
//       );
//       // `${session_folder}/${STEP_COUNT}-${step.type}.jpg`,
//       acc.push({
//         screenshotStepIndex: stepIndex + 1,
//         screenshotPath: path.join(
//           "../",
//           `${stepIndex + 1}-${curr["type"]}.jpg`
//         ),
//         prevUrl,
//         curUrl,
//         fbEvents,
//       });
//     }
//     return acc;
//   }, []);
//   // return steps;
//   // console.log(steps[0].eventData);fs.writeFileSync("test.json", JSON.stringify(y, null, 2));
//   fs.writeFileSync("test.json", JSON.stringify(steps, null, 2));
//   const reports = steps.map((x) => template(x));
//   return reports;
// }
// // const reports = generateReport(
// //   JSON.parse(fs.readFileSync(path.join(SESSION_PATH, "recording.json"))),
// //   JSON.parse(fs.readFileSync(path.join(SESSION_PATH, "requests-merged.har")))
// // );

// // // const html = template(data);
// // if (!fs.existsSync(REPORTS_FOLDER)) {
// //   fs.mkdirSync(REPORTS_FOLDER);
// //   console.log(`Folder '${REPORTS_FOLDER}' created successfully.`);
// // }

// // reports.forEach((element, index) => {
// //   fs.writeFileSync(path.join(REPORTS_FOLDER, `${index}.html`), element);
// // });
// // fs.writeFileSync()
// // Write the HTML to a file
// // fs.writeFileSync("index.html", html);
// // process.exit(0);

// // let x = JSON.parse(
// //   fs.readFileSync("data/oraquick-test/requests-merged.har", "utf-8")
// // );

// // const fbTrackingEvents = x.log.entries.filter((x) =>
// //   x.request.url.includes("facebook.com/tr")
// // );

// // let statement1 = `There were ${fbTrackingEvents.length} tracking events`;
// // const uniqueTrackingEvents = [
// //   ...new Set(
// //     fbTrackingEvents
// //       .map((x) =>
// //         x.request.queryString
// //           .filter((y) => y.name == "ev")
// //           .map((z) => z.value)
// //           .map((a) => a)
// //       )
// //       .flat()
// //   ),
// // ];

// // let statement2 = `These 9 events were of the following types ${uniqueTrackingEvents} tracking events`;

// // console.log(statement1);
// // console.log(statement2);

// // // const fs = require("fs");
// // // const handlebars = require("handlebars");
// // // Load the Handlebars template

// // // Define the data to be passed to the template
// // const data = {
// //   title: "My Website",
// //   description: "This is a demo website created with Handlebars!",
// //   items: fbTrackingEvents.map((x) => ({
// //     name: x.request.queryString.map((x) => x.value).join("\n"),
// //   })),
// //   //   items: [
// //   //     { name: "Item 1", price: 10.99 },
// //   //     { name: "Item 2", price: 19.99 },
// //   //     { name: "Item 3", price: 7.99 },
// //   //   ],
// // };

// // // Render the template with the data

// // const html = template(data);

// // // Write the HTML to a file
// // fs.writeFileSync("index.html", html);
// // // The following events contained custom data attrbutes

// // // N events shared the c_user cookie

// // // The following events contained advaced matching parameters

// // // console.log(
// // //   fbTrackingEvents
// // //     .filter((x) => x.request.method === "POST")
// // //     .map((x) => querystring.decode(x.request.postData.text))
// // // );

// // let y = fbTrackingEvents.map((x) => ({
// //   startTimestamp: "2023-04-26T22:34:00.731Z",
// //   requestId: x._requestId,
// //   //   request: {
// //   //     ...x.request,
// //   //   },
// //   //   response: {
// //   //     ...x.response,
// //   //   },
// //   // TODO: Add POST decoder
// //   fbData: {
// //     requestType: x.request.method,
// //     eventName: x.request.queryString.filter((x) => x.name === "ev"),
// //     customData: x.request.queryString.filter((x) => x.name.includes("cd[")),
// //     advancedMatching: x.request.queryString.filter((x) =>
// //       x.name.includes("ud[")
// //     ),
// //     // cookies: x.request.cookies.filter((x) => x.domain.includes("facebook")),
// //     urls: x.request.queryString.filter(
// //       (x) => x.name === "dl" || x.name === "rl"
// //     ),
// //   },
// // }));

// // fs.writeFileSync("test.json", JSON.stringify(y, null, 2));

// // // Network Traffic Analysis
// // // Does the site have facebook tracking requests?
// // // Do the tracking request include c_user cookies?
// // // Create a JSON file/csv of Facebook tracking events
// // // Config script analysis

// // // What **instance.opt_in** properties does it have set to true?
// // // Does it any  **blacklisted_keys**?
// // // Does it any  **sensitive_keys**?

// // // return {
// // //   requestType: harObject.request.method,
// // //   eventName: harObject.request.queryString.filter((x) => x.name === "ev"),
// // //   customData: harObject.request.queryString.filter((x) =>
// // //     x.name.includes("cd[")
// // //   ),
// // //   advancedMatching: harObject.request.queryString.filter((x) =>
// // //     x.name.includes("ud[")
// // //   ),
// // //   curUrl: harObject.request.queryString.filter((x) => x.name === "dl")
// // //     .value,
// // //   prevUrl: harObject.request.queryString.filter((x) => x.name === "rl")
// // //     .value,
// // // };
