export type TwitchConnectionStatus = "connecting" | "connected" | "disconnected" | "error";

export interface TwitchOAuthSession {
  accessToken: string;
  login: string;
  userId: string;
  scopes: string[];
  expiresAt: number;
}

export interface TwitchChatAuth {
  accessToken: string;
  login: string;
}

export interface ParsedIrcMessage {
  raw: string;
  tags: Record<string, string>;
  prefix?: string;
  command: string;
  params: string[];
  trailing?: string;
}
