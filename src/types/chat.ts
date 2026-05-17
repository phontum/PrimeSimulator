export type ChatMessageSource = "twitch" | "replay" | "system";

export type EmoteProvider = "7tv" | "bttv" | "ffz";

export interface TwitchEmoteRange {
  id: string;
  start: number;
  end: number;
}

export interface ThirdPartyEmote {
  provider: EmoteProvider;
  id: string;
  code: string;
  url: string;
  originalUrl?: string;
  animated?: boolean;
  width?: number;
  height?: number;
  zeroWidth?: boolean;
  scope?: "global" | "channel";
}

export interface ThirdPartyEmoteOccurrence {
  code: string;
  start: number;
  end: number;
  emote: ThirdPartyEmote;
}

export interface ChatMessage {
  id: string;
  source: ChatMessageSource;
  username: string;
  displayName?: string;
  color?: string;
  text: string;
  timestamp: number;
  badges?: Record<string, string>;
  twitchEmoteRanges?: TwitchEmoteRange[];
  thirdPartyEmotes?: ThirdPartyEmoteOccurrence[];
}
