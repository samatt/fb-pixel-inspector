import { createRunner, PuppeteerRunnerExtension } from "@puppeteer/replay";
import puppeteer from "puppeteer";
import PuppeteerHar from "puppeteer-har";
import fs from "fs";

export async function runChromeRecording(
  recording_path,
  session_folder,
  browser_profile_path
) {
  let STEP_COUNT = 1;
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
      if (step.type === "navigate") {
        await this.page.screenshot({
          path: `${session_folder}/${STEP_COUNT}-${step.type}.jpg`,
        });
      }
      ++STEP_COUNT;
      console.log(`Step count ${STEP_COUNT}`);
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
  const runner = await createRunner(
    recording,
    new Extension(browser, page, 7000)
  );

  await har.start({ path: `${session_folder}/requests.har` });
  await runner.run();
  await har.stop();
  await browser.close();
}
