import querystring from "node:querystring";
import { logger } from "./logger.js";

const parseMultipartFormData = (data) => {
  const parts = data.split(/-{5}[\w\d]+/).filter(Boolean);

  const result = [];

  parts.forEach((part) => {
    const [header, value] = part.split(/\r?\n\r?\n/);
    const keyMatch = header.match(/name="([\w\d\[\]]+)"/);
    if (!keyMatch) return;

    const key = keyMatch[1];
    const val = value.replace(/\r?\n?-$/, "");
    // result[key] = val;
    result.push({ name: key, value: val });
  });

  return result;
};

function postDataParser(harObject) {
  if (harObject.request.bodySize == 0) {
    logger.debug("Not parsing post body since body size is 0");
    return {};
  }

  if (harObject.request.postData.mimeType.includes("x-www-form-urlencoded")) {
    return Object.entries(
      querystring.decode(harObject.request.postData.text)
    ).map((x) => ({ name: x[0], value: x[1] }));
  } else if (
    harObject.request.postData.mimeType.includes("multipart/form-data")
  ) {
    return parseMultipartFormData(harObject.request.postData.text);
  } else if (harObject.request.postData.mimeType.includes("application/json")) {
    return JSON.parse(harObject.request.postData.text);
  } else {
    logger.warn(
      `No parser found for mimeType ${harObject.request.postData.mimeType}`
    );
    return {
      error: `No parser found for mimeType ${harObject.request.postData.mimeType}`,
    };
  }
}

function requestParser(harObject) {
  const { request } = harObject;
  const url = new URL(request.url);
  return {
    reqURLRaw: request.url,
    reqURLClean: `${url.hostname}${url.pathname}`,
    reqURLHost: url.hostname,
    reqURLPath: url.pathname,
    reqURLParams: request.queryString,
    reqBodySize: request.bodySize,
    reqMethod: request.method,
    reqCookies: request.cookies,
    reqHeaders: request.headers,
    reqPostData: request.method === "POST" ? postDataParser(harObject) : {},
  };
}

export function parseHARObject(harObject) {
  const requestId = harObject._requestId;
  const req = requestParser(harObject);
  // _requestId: '23575.3046',
  //   _initiator
  //   _requestTime

  // if (harObject.request.postData.mimeType.includes("x-www-form-urlencoded")) {
  //   rawEventData = querystring.decode(harObject.request.postData.text);
  // } else if (
  //   harObject.request.postData.mimeType.includes("multipart/form-data")
  // ) {
  //   rawEventData = parseMultipartFormData(harObject.request.postData.text);
  // } else {
  //   logger.warn("No parser found for mimeType", {
  //     mimeTyoe: harObject.request.postData.mimeType,
  //   });
  // }
  //   }
  //   const customData = Object.entries(rawEventData)
  //     .filter((x) => x[0].includes("cd["))
  //     .map((x) => ({ name: x[0], value: x[1] }));
  //   const advMatch = Object.entries(rawEventData)
  //     .filter((x) => x[0].includes("ud[") || x[0].includes("udff["))
  //     .map((x) => ({ name: x[0], value: x[1] }));
  //   const hasC_UserCookie = cookies.some((x) => x["name"] === "c_user");
  return {
    requestId,
    ...req,
  };
}
