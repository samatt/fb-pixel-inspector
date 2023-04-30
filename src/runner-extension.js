import { createRunner, PuppeteerRunnerExtension } from "@puppeteer/replay";
import puppeteer from "puppeteer";
import PuppeteerHar from "puppeteer-har";
import fs from "fs";
import url from "url";
import path from "path";
import { updateHarEntries } from "./merge.js";

// Returns map of request ID to raw CDP request data. This will be populated as requests are made.
// See: https://itecnote.com/tecnote/missing-request-headers-in-puppeteer/
async function setupLoggingOfAllNetworkData(page) {
  const cdpSession = await page.target().createCDPSession();
  await cdpSession.send("Network.enable");
  const cdpRequestDataRaw = {};
  const addCDPRequestDataListener = (eventName) => {
    cdpSession.on(eventName, (request) => {
      cdpRequestDataRaw[request.requestId] =
        cdpRequestDataRaw[request.requestId] || {};
      Object.assign(cdpRequestDataRaw[request.requestId], {
        [eventName]: request,
      });
    });
  };
  addCDPRequestDataListener("Network.requestWillBeSent");
  addCDPRequestDataListener("Network.requestWillBeSentExtraInfo");
  addCDPRequestDataListener("Network.responseReceived");
  addCDPRequestDataListener("Network.responseReceivedExtraInfo");
  return cdpRequestDataRaw;
}

export async function runChromeRecording(
  recording_path,
  session_folder,
  browser_profile_path,
  urls_for_download = [
    "https://connect.facebook.net/en_US/fbevents.js",
    "https://connect.facebook.net/signals/config",
  ]
) {
  const RAW_DATA_FOLDER = path.join(session_folder, "raw");
  const SCREENSHOT_FOLDER = path.join(session_folder, "screenshots");

  let STEP_COUNT = 0;
  let recordingEventLog = [];
  class Extension extends PuppeteerRunnerExtension {
    async beforeAllSteps(flow) {
      await super.beforeAllSteps(flow);
      console.log("starting");
    }

    async beforeEachStep(step, flow) {
      await super.beforeEachStep(step, flow);
    }

    async afterEachStep(step, flow) {
      await super.afterEachStep(step, flow);
      const screenshot = path.join(
        SCREENSHOT_FOLDER
      )`${STEP_COUNT}-${step.type}.jpg`;
      await this.page.screenshot({
        path: screenshot,
      });

      console.log({
        stepCount: STEP_COUNT,
        url: this.page.url(),
        stepType: step.type,
        // screenshot,
      });
      recordingEventLog.push({
        stepCount: STEP_COUNT,
        url: this.page.url(),
        stepType: step.type,
        screenshot,
      });
      ++STEP_COUNT;
    }

    async afterAllSteps(flow) {
      await super.afterAllSteps(flow);
      console.log("done");
    }
  }

  const recording = JSON.parse(fs.readFileSync(recording_path, "utf-8"));
  const browser = await puppeteer.launch({
    headless: true,
    userDataDir: browser_profile_path,
  });

  const page = await browser.newPage();
  const har = new PuppeteerHar(page);
  const cdpRequestDataRaw = await setupLoggingOfAllNetworkData(page);

  const sourceMap = new Map();
  await page.on("response", async (event) => {
    if (urls_for_download.some((url) => event.url().includes(url))) {
      console.log(event.url());
      // console.log(headers["content-type"]);
      const headers = event.headers();
      const body = (await event.buffer()).toString("utf-8");
      sourceMap.set(event.url(), body);
    }
  });
  const runner = await createRunner(
    recording,
    new Extension(browser, page, 7000)
  );

  await har.start({ path: path.join(RAW_DATA_FOLDER, `requests-raw.har`) });
  await runner.run();
  await har.stop();
  await browser.close();

  // POST PROCESSING
  const harFile = JSON.parse(
    fs.readFileSync(path.join(RAW_DATA_FOLDER, `requests-raw.har`), "utf-8")
  );
  // Merge HAR file with network activity to add cookies
  const mergedHAR = updateHarEntries(harFile, cdpRequestDataRaw);
  fs.writeFileSync(
    path.join(RAW_DATA_FOLDER, `requests-merged.har`),
    JSON.stringify(mergedHAR)
  );

  // Save JS source files to disk
  for (const [key, value] of sourceMap.entries()) {
    const path_parts = url.parse(key).path.split("/");
    const file_name = path_parts.pop();
    const folders = path_parts.join("/");
    const root_folder = url.parse(key).hostname;
    const save_dir = path.join(
      RAW_DATA_FOLDER,
      "page-scripts",
      root_folder,
      folders
    );
    console.log(`saving: ${path.join(save_dir, file_name)}`);
    fs.mkdirSync(save_dir, { recursive: true });
    fs.writeFileSync(path.join(save_dir, file_name), value);
  }

  fs.writeFileSync(
    path.join(RAW_DATA_FOLDER, "runlog.ndjson"),
    recordingEventLog.map((x) => JSON.stringify(x)).join("\n")
  );
}
