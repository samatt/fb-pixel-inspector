export function getGACollectEvents(harpData) {
  return harpData.filter(
    (x) =>
      (x["req.urlClean"].includes("google-analytics.com") ||
        x["req.urlClean"].includes("analytics.google.com")) &&
      x["req.urlPath"].includes("collect")
  );
}

export function getDCevents(harpData) {
  return harpData.filter((x) =>
    x["req.urlClean"].includes("stats.g.doubleclick.com")
  );
}

// Ref: https://developers.google.com/analytics/devguides/collection/protocol/v1/parameters
// TODO: Add additional parameters that are currently commented out at the end of the file
export function parseGAEvent(harpObj) {
  // Keeping this for GA since its far more variable than the PIXEL.
  const rawUrlParams = harpObj["req.urlParams"];

  const version = harpObj["req.urlParams"].filter((x) => x.name === "v");
  const hitType = harpObj["req.urlParams"].filter((x) => x.name === "t");
  const dcJoinId = harpObj["req.urlParams"].filter((x) => x.name === "jid");

  const DOC_PARAMS = ["dl", "dh", "dp", "dt"];
  const docParams = harpObj["req.urlParams"].filter((x) =>
    DOC_PARAMS.includes(x.name)
  );

  const EVENT_PARAMS = ["ec", "ea", "el", "ev", "en", "epn"];
  const eventParams = harpObj["req.urlParams"].filter((x) =>
    EVENT_PARAMS.includes(x.name)
  );

  const customDimensions = harpObj["req.urlParams"].filter((x) =>
    x.name.includes("cd")
  );

  const productParams = harpObj["req.urlParams"].filter(
    (x) => x.name === "pa" || x.name.startsWith("pr")
  );

  return {
    version,
    hitType,
    dcJoinId,
    docParams,
    eventParams,
    productParams,
    customDimensions,
    rawUrlParams,
  };
}

// OLD
// const PARAM_EXPLANATION = {
//   t: `The “t” field equals a value that describes a particular type of event. The
//     “t” field and value can therefore identify a specific action being taken by a user.
//     For example, t=pageview, t=screenview, t=event, t=transaction, t=item.14`,
//   ec: `Event Category. The “ec” field is equal to a value that provides further specificity as to the
//   “event” (e.g. action) being taken by a user. According to Google, this field
//   “specifies the event category. Must not be empty.”15 The “ec” field and value can
//   therefore identify a specific action being taken by a user.
//   For example, ec=user_action`,
//   ea: `Event Action (probably). The “ea” field is equal to a value that provides further specificity as to the
//   “event” (e.g.. action) being taken by a user. According to Google, this field
//   “[s]pecifies the event action. Must not be empty.”16 The “ea” field and value can
//   therefore identify a specific action being taken by a user.`,
//   el: `Event Label. The “el” field equals a value that provides further specificity as to the
//   “event” (e.g. action) being taken by a user. According to Google, this field
//   “[s]pecifies the event label.” 17 The “el” field and value can therefore identify a specific
//   action being taken by a user.
//   For example, el=user_action.alter_view.request_appointment`,
//   dl: `Explanation: The “dl” (document location) field is equal to a value that identifies the
//   full URL of the webpage that a user is viewing. Google acknowledges that the “dl”
//   field and value is “content information.”18 The “dl” field and value therefore identifies
//   and transmits the content of the user’s current communication.`,
//   gjid: `The “gjid” field equals a numeric value that is an identifier and Join ID.
//   This value enables Google to match user information that Google Analytics has
//   obtained with information obtained through the domains Doubleclick.net (Google
//   Display Ads)`,
//   cid: `this field … identifies a particular user, device,
//   or browser instance. For the web, this is generally stored as a first-party cookie with a
//   two-year expiration. For mobile apps, this is randomly generated for each particular
//   instance of an application install. The value of this field should be a random UUID
//   (version 4) as described in http://www.ietf.org/rfc/rfc4122.txt.”22 The corresponding
//   value is a unique alphanumeric identifier and it contains the _ga cookie value that is
//   disguised as a “first-party” cookie by Google.`,
//   tid: `Google explains that the “tid” equals an alphanumeric value that is a
//   “tracking ID/web property ID. The format [of the value] is UA-XXXX-Y. All collected
//   data is associated by this ID.”23`,
//   gtm: `This field equals an alphanumeric value that corresponds to the
//   advertiser’s Google Tag Manager account.25 It can therefore potentially identify the
//   user’s Health Care Provider (e.g. where the proposed targeted advertisement may
//   appear).`,
// };

// export function getGATrackingEvents(harData) {
//   return harData.log.entries
//     .filter(
//       (x) =>
//         x.request.url.includes("google-analytics.com") &&
//         x.request.url.includes("collect")
//     )
//     .map((x) => parseGATrackingEvents(x));
// }

// function parseGATrackingEvents(harObject) {
//   const rawEventData = harObject.request.queryString.reduce((acc, cur) => {
//     if (cur["name"] in PARAM_EXPLANATION) {
//       acc.push({ ...cur, description: PARAM_EXPLANATION[cur["name"]] });
//     } else {
//       acc.push({ ...cur, description: "" });
//     }
//     return acc;
//   }, []);

//   //NOTE: This is a heuristic I found on one website that seems to be what I think it is.
//   //see https://support.google.com/analytics/answer/10075209?hl=en
//   const customDimensions = Object.entries(rawEventData)
//     .filter((x) => x[0].startsWith("cd"))
//     .map((x) => ({ name: x[0], value: x[1] }));

//   const dlPath = rawEventData
//     .filter((x) => x.name === "dl")
//     .map((x) => {
//       const dl = new URL(x.value);
//       return `${dl.hostname}${dl.pathname}`;
//     });

//   return {
//     dlPath: dlPath.length === 1 ? dlPath[0] : "unexpected dl value",
//     method: harObject.request.method,
//     cookies: harObject.request.cookies,
//     rawEventData,
//     customDimensions,
//   };
// }
