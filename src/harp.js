import querystring from "node:querystring";
import { logger } from "./logger.js";
import { writeFileSync } from "node:fs";

const parseMultipartFormData = (data) => {
  const parts = data.split(/-{5}[\w\d]+/).filter(Boolean);

  const result = [];

  parts.forEach((part) => {
    const [header, value] = part.split(/\r?\n\r?\n/);
    const keyMatch = header.match(/name="([\w\d\[\]]+)"/);
    if (!keyMatch) return;

    const key = keyMatch[1];
    const val = value.replace(/\r?\n?-$/, "");

    result.push({ name: key, value: val });
  });

  return result;
};

function postDataParser(harEntry) {
  if (harEntry.request.bodySize == 0) {
    logger.debug("Not parsing post body since body size is 0");
    return {};
  }

  if (harEntry.request.postData.mimeType.includes("x-www-form-urlencoded")) {
    return Object.entries(
      querystring.decode(harEntry.request.postData.text)
    ).map((x) => ({ name: x[0], value: x[1] }));
  } else if (
    harEntry.request.postData.mimeType.includes("multipart/form-data")
  ) {
    return parseMultipartFormData(harEntry.request.postData.text);
  } else if (harEntry.request.postData.mimeType.includes("application/json")) {
    return JSON.parse(harEntry.request.postData.text);
  } else {
    logger.warn(
      `No parser found for mimeType ${harEntry.request.postData.mimeType}`
    );
    return {
      error: `No parser found for mimeType ${harEntry.request.postData.mimeType}`,
    };
  }
}

function requestParser(harEntry) {
  const { request } = harEntry;
  const url = new URL(request.url);
  return {
    "req.urlRaw": request.url,
    "req.urlClean": `${url.hostname}${url.pathname}`,
    "req.urlHost": url.hostname,
    "req.urlPath": url.pathname,
    "req.urlParams": request.queryString,
    "req.bodySize": request.bodySize,
    "req.method": request.method,
    "req.cookies": request.cookies,
    "req.headers": request.headers,
    "req.postData": request.method === "POST" ? postDataParser(harEntry) : {},
  };
}

function responseParser(harEntry) {
  const { response } = harEntry;
  return {
    "resp.httpVersion": response.httpVersion,
    "resp.redirectURL": response.redirectURL,
    "resp.status": response.status,
    "resp.statusText": response.statusText,
    "resp.content": response.content,
    // "head.ersSize": -1,
    "resp.bodySize": response.bodySize,
    "resp.cookies": response.cookies,
    "resp.headers": response.headers,
  };
}

export function parseHARObject(harEntry) {
  const requestId = harEntry._requestId;
  return {
    "req.id": requestId,
    ...requestParser(harEntry),
    ...responseParser(harEntry),
  };
}

export function harParser(harFile) {
  const { entries } = harFile.log;
  return entries.map((x) => parseHARObject(x));
}
