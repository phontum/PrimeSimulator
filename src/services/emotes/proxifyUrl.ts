import { emoteConfig } from "../../config/emoteConfig";

export function proxifyUrl(url: string, mode: "api" | "cdn"): string {
  if (!emoteConfig.useProxy || !emoteConfig.proxyPrefix) {
    return url;
  }

  if (mode === "api" && emoteConfig.proxyApiRequests) {
    return `${emoteConfig.proxyPrefix}${url}`;
  }

  if (mode === "cdn" && emoteConfig.proxyEmoteCdn) {
    return `${emoteConfig.proxyPrefix}${url}`;
  }

  return url;
}
