import type { ThirdPartyEmote } from "../../types/chat";
import { proxifyUrl } from "./proxifyUrl";

const api = {
  sevenTv: "https://7tv.io/v3",
  bttv: "https://api.betterttv.net/3",
  ffz: "https://api.betterttv.net/3/cached/frankerfacez",
  ivr: "https://api.ivr.fi/v2/twitch/user",
};

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(proxifyUrl(url, "api"));
  if (!response.ok) {
    throw new Error(`${url} failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<T>;
}

interface SevenTvEmoteSet {
  emotes?: Array<{ id: string; name: string; flags?: number; data?: { animated?: boolean; host?: { files?: Array<{ width?: number; height?: number }> } } }>;
}

interface BttvEmote {
  id: string;
  code: string;
  animated?: boolean;
}

interface BttvChannelResponse {
  channelEmotes?: BttvEmote[];
  sharedEmotes?: BttvEmote[];
}

interface FfzEmote {
  id: string;
  code: string;
  images?: Record<string, string>;
  animated?: boolean;
}

const bttvZeroWidthIds = new Set([
  "567b5b520e984428652809b6",
  "5849c9a4f52be01a7ee5f79d",
  "5849c9c8f52be01a7ee5f79e",
  "5849ca1ff52be01a7ee5f7a0",
  "5849ca3df52be01a7ee5f7a1",
  "5849ca7bf52be01a7ee5f7a2",
  "5849cad2f52be01a7ee5f7a4",
  "5849cb2df52be01a7ee5f7a5",
  "5849cb61f52be01a7ee5f7a6",
  "5849cb8ff52be01a7ee5f7a7",
]);

export async function loadSevenTvGlobal(): Promise<ThirdPartyEmote[]> {
  const set = await fetchJson<SevenTvEmoteSet>(`${api.sevenTv}/emote-sets/global`);
  return parseSevenTvSet(set, "global");
}

export async function resolveTwitchUserId(channelName: string): Promise<string | null> {
  const users = await fetchJson<Array<{ id?: string; login?: string }>>(`${api.ivr}?login=${encodeURIComponent(channelName)}`);
  return users.find((user) => user.login?.toLowerCase() === channelName.toLowerCase())?.id ?? users[0]?.id ?? null;
}

export async function loadSevenTvChannel(twitchUserId: string): Promise<ThirdPartyEmote[]> {
  const user = await fetchJson<{ emote_set?: SevenTvEmoteSet | null }>(`${api.sevenTv}/users/twitch/${encodeURIComponent(twitchUserId)}`);
  return user.emote_set ? parseSevenTvSet(user.emote_set, "channel") : [];
}

export async function loadBttvGlobal(): Promise<ThirdPartyEmote[]> {
  const emotes = await fetchJson<BttvEmote[]>(`${api.bttv}/cached/emotes/global`);
  return emotes.map((emote) => parseBttvEmote(emote, "global"));
}

export async function loadBttvChannel(twitchUserId: string): Promise<ThirdPartyEmote[]> {
  const response = await fetchJson<BttvChannelResponse>(`${api.bttv}/cached/users/twitch/${encodeURIComponent(twitchUserId)}`);
  return [...(response.channelEmotes ?? []), ...(response.sharedEmotes ?? [])].map((emote) => parseBttvEmote(emote, "channel"));
}

export async function loadFfzGlobal(): Promise<ThirdPartyEmote[]> {
  const emotes = await fetchJson<FfzEmote[]>(`${api.ffz}/emotes/global`);
  return emotes.map((emote) => parseFfzEmote(emote, "global"));
}

export async function loadFfzChannel(twitchUserId: string): Promise<ThirdPartyEmote[]> {
  const emotes = await fetchJson<FfzEmote[]>(`${api.ffz}/users/twitch/${encodeURIComponent(twitchUserId)}`);
  return emotes.map((emote) => parseFfzEmote(emote, "channel"));
}

function parseSevenTvSet(set: SevenTvEmoteSet, scope: "global" | "channel"): ThirdPartyEmote[] {
  return (set.emotes ?? []).map((emote) => {
    const files = emote.data?.host?.files ?? [];
    const file = files.length > 0 ? files[files.length - 1] : undefined;
    const originalUrl = `https://cdn.7tv.app/emote/${emote.id}/4x.webp`;
    return {
      provider: "7tv",
      id: emote.id,
      code: emote.name,
      url: proxifyUrl(originalUrl, "cdn"),
      originalUrl,
      animated: emote.data?.animated,
      width: file?.width,
      height: file?.height,
      zeroWidth: ((emote.flags ?? 0) & 1) === 1,
      scope,
    };
  });
}

function parseBttvEmote(emote: BttvEmote, scope: "global" | "channel"): ThirdPartyEmote {
  const originalUrl = `https://cdn.betterttv.net/emote/${emote.id}/3x.webp`;
  return {
    provider: "bttv",
    id: emote.id,
    code: emote.code,
    url: proxifyUrl(originalUrl, "cdn"),
    originalUrl,
    animated: emote.animated,
    zeroWidth: bttvZeroWidthIds.has(emote.id),
    scope,
  };
}

function parseFfzEmote(emote: FfzEmote, scope: "global" | "channel"): ThirdPartyEmote {
  const bestUrl = emote.images?.["4x"] ?? emote.images?.["2x"] ?? emote.images?.["1x"] ?? `https://cdn.frankerfacez.com/emote/${emote.id}/4`;
  const originalUrl = bestUrl.startsWith("//") ? `https:${bestUrl}` : bestUrl;
  return {
    provider: "ffz",
    id: emote.id,
    code: emote.code,
    url: proxifyUrl(originalUrl, "cdn"),
    originalUrl,
    animated: emote.animated,
    scope,
  };
}
