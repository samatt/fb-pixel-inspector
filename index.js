import yargs from "yargs/yargs";
import { hideBin } from "yargs/helpers";
import { runChromeRecording } from "./src/runner-extension.js";
import { fbLogin } from "./src/fb-login.js";
import path from "path";
import fs from "fs";
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
          default: "data/session",
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
  .help()
  .alias("help", "h").argv;

async function runHandler(argv) {
  const recording_path = path.resolve(argv.recording_path);
  const session_path = path.resolve(argv.session_folder);
  const browser_profile_path = path.resolve(argv.browser_profile_path);
  fs.copyFileSync(recording_path, `${session_path}/recording.json`);
  console.log(`Run recording: ${argv.recording_path}`);
  if (!fs.existsSync(session_path)) {
    fs.mkdirSync(session_path);
    console.log(`Folder '${session_path}' created successfully.`);
  } else {
    console.log(`Folder '${session_path}' already exists.`);
  }

  await runChromeRecording(recording_path, session_path, browser_profile_path);

  return Promise.resolve();
}

async function loginHandler(argv) {
  const profile_path = path.resolve(argv.profile_path);
  await fbLogin(profile_path);
}
