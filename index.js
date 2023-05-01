import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { runChromeRecording } from "./src/runner-extension.js";
import { fbLogin } from "./src/fb-login.js";
import path from "path";
import fs from "fs";
import { runAnalysis, generateReport } from "./src/analysis.js";
const argv = yargs(hideBin(process.argv))
  .command({
    command: "run [recording_path] [session_folder] [browser_profile_path]",
    describe: "Run a captured user flow in puppeteer",
    builder: (yargs) => {
      return yargs
        .positional("recording_path", {
          describe: "path to recording.json ",
          type: "string",
          default: "",
        })
        .positional("session_folder", {
          describe: "path you want to save capture artifacts tos ",
          type: "string",
          default: "",
        })
        .positional("browser_profile_path", {
          describe: "path to the browser profile",
          type: "string",
          default: "browser-profile",
        });
    },
    handler: runHandler,
  })
  .command({
    command: "login [profile_path]",
    describe: "Login to FB and save the browser profile",
    builder: (yargs) => {
      return yargs.positional("profile_path", {
        describe: "path to browser profile ",
        type: "string",
        default: "browser-profile",
      });
    },
    handler: loginHandler,
  })
  .command({
    command: "analysis [session_folder]",
    describe: "Analyse recorded session",
    builder: (yargs) => {
      return yargs.positional("session_folder", {
        describe: "path to recorded session ",
        type: "string",
        default: "",
      });
    },
    handler: analysisHandler,
  })
  .help()
  .alias("help", "h").argv;

async function runHandler(argv) {
  const recording_path = path.resolve(argv.recording_path);

  let session_path = "";
  if (argv.session_folder === "") {
    const session_name = path.parse(recording_path).name;
    session_path = path.resolve(`data/${session_name}`);
  } else {
    session_path = path.resolve("data/session");
  }

  const browser_profile_path = path.resolve(argv.browser_profile_path);
  console.log(`Run recording: ${argv.recording_path}`);
  if (!fs.existsSync(session_path)) {
    fs.mkdirSync(session_path);
    fs.mkdirSync(path.join(session_path, "screenshots"), { recursive: true });
    fs.mkdirSync(path.join(session_path, "raw"), { recursive: true });
    fs.mkdirSync(path.join(session_path, "reports"), { recursive: true });
    console.log(`Folder '${session_path}' created successfully.`);
  } else {
    console.log(`Folder '${session_path}' already exists.`);
  }

  fs.copyFileSync(recording_path, `${session_path}/recording.json`);
  await runChromeRecording(recording_path, session_path, browser_profile_path);
  await analysisHandler({ session_path });
  return Promise.resolve();
}

async function loginHandler(argv) {
  const profile_path = path.resolve(argv.profile_path);
  await fbLogin(profile_path);
}
async function analysisHandler(argv) {
  const { session_folder } = argv;
  console.log("Analyze data");
  const reportData = runAnalysis(session_folder);
  console.log("Generate reports");
  generateReport(session_folder, reportData);
}
