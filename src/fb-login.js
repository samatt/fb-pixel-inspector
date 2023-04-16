// Use this script to save a browser profile with a logged in fb session
import puppeteer from "puppeteer";

export async function fbLogin(browser_profile_path) {
  const browser = await puppeteer.launch({
    headless: false,
    userDataDir: browser_profile_path,
    handleSIGINT: true,
  });

  const page = await browser.newPage();
  await page.goto("http://facebook.com");
}
