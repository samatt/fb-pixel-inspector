export function getPixelEvents(harpData) {
  return harpData.filter((x) => x["req.urlRaw"].includes("facebook.com/tr"));
}
export function parsePixelEvent(harpObj) {
  const fbCookies = harpObj["req.cookies"].filter((x) =>
    x.domain.includes("facebook")
  );

  const hasC_UserCookie = harpObj["req.cookies"].some(
    (x) => x["name"] === "c_user"
  );

  const customData = harpObj["req.urlParams"].filter((x) =>
    x.name.includes("cd[")
  );

  const advMatch = harpObj["req.urlParams"].filter(
    (x) => x.name.includes("ud[") || x.name.includes("udff[")
  );

  return {
    fbCookies,
    hasC_UserCookie,
    advMatch,
    customData,
  };
}
