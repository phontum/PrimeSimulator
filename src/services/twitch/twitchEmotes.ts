import { proxifyUrl } from "../emotes/proxifyUrl";

export function getTwitchEmoteUrl(id: string): string {
  return proxifyUrl(`https://static-cdn.jtvnw.net/emoticons/v2/${id}/default/dark/3.0`, "cdn");
}
