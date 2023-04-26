// Puppeteer by default doesn't include cookie headers in network requests. (unclear why)
// This function adds cookie header data to the HAR file network requests as described here:
// https://itecnote.com/tecnote/missing-request-headers-in-puppeteer/

export const updateHarEntries = (
  harFile,
  cdpRequestDataRaw,
  SKIP_BLOCKED_COOKIES = true
) => {
  const updatedEntries = harFile.log.entries.map((e) => {
    // If this _requestId look up errors it might be because of amismatch
    // between the network requests captured by the har file and those captured by cdpRequestDataRaw
    // This would be sketchy and should be inspected further.

    const { _requestId } = e;
    if (!_requestId) {
      console.error("couldnt find id");
      console.error(e);
      return e;
    }
    try {
      const cookies = cdpRequestDataRaw[_requestId][
        "Network.requestWillBeSentExtraInfo"
      ]["associatedCookies"]
        .filter((d) =>
          SKIP_BLOCKED_COOKIES
            ? d.blockedReasons.length == 0
            : d.blockedReasons.length >= 0
        )
        .map((c) => c.cookie);
      e.request.cookies = cookies;
    } catch (error) {
      console.log("Couldnt update network entries in HAR file");
      console.error(error);
    }

    return e;
  });
  // Return the HAR file with the updated entries
  return {
    log: {
      ...harFile.log,
      entries: updatedEntries,
    },
  };
};
