import type { ChatMessage, TwitchEmoteRange } from "../../types/chat";
import type { ParsedIrcMessage } from "../../types/twitch";
import { createId } from "../../utils/id";

function unescapeTagValue(value: string): string {
  return value
    .replace(/\\s/g, " ")
    .replace(/\\:/g, ";")
    .replace(/\\\\/g, "\\")
    .replace(/\\r/g, "\r")
    .replace(/\\n/g, "\n");
}

export function parseIrcLine(raw: string): ParsedIrcMessage {
  let rest = raw.trim();
  const tags: Record<string, string> = {};
  let prefix: string | undefined;
  let trailing: string | undefined;

  if (rest.startsWith("@")) {
    const spaceIndex = rest.indexOf(" ");
    const tagString = rest.slice(1, spaceIndex);
    rest = rest.slice(spaceIndex + 1);
    for (const pair of tagString.split(";")) {
      const [key, value = ""] = pair.split("=");
      tags[key] = unescapeTagValue(value);
    }
  }

  if (rest.startsWith(":")) {
    const spaceIndex = rest.indexOf(" ");
    prefix = rest.slice(1, spaceIndex);
    rest = rest.slice(spaceIndex + 1);
  }

  const trailingIndex = rest.indexOf(" :");
  if (trailingIndex >= 0) {
    trailing = rest.slice(trailingIndex + 2);
    rest = rest.slice(0, trailingIndex);
  }

  const [command = "", ...params] = rest.split(" ").filter(Boolean);
  return { raw, tags, prefix, command, params, trailing };
}

export function parseTwitchEmoteRanges(emotesTag?: string): TwitchEmoteRange[] {
  if (!emotesTag) {
    return [];
  }

  return emotesTag.split("/").flatMap((group) => {
    const [id, ranges = ""] = group.split(":");
    return ranges.split(",").flatMap((range) => {
      const [startRaw, endRaw] = range.split("-");
      const start = Number(startRaw);
      const end = Number(endRaw);
      return Number.isFinite(start) && Number.isFinite(end) ? [{ id, start, end }] : [];
    });
  }).sort((a, b) => a.start - b.start);
}

export function parseBadges(badgesTag?: string): Record<string, string> {
  if (!badgesTag) {
    return {};
  }

  return Object.fromEntries(
    badgesTag.split(",").flatMap((badge) => {
      const [name, version = ""] = badge.split("/");
      return name ? [[name, version]] : [];
    }),
  );
}

export function ircPrivmsgToChatMessage(message: ParsedIrcMessage): ChatMessage | null {
  if (message.command !== "PRIVMSG" || !message.trailing) {
    return null;
  }

  const username = message.tags["login"] || message.prefix?.split("!")[0] || "unknown";
  const displayName = message.tags["display-name"] || username;

  return {
    id: message.tags.id || createId("tw"),
    source: "twitch",
    username,
    displayName,
    color: message.tags.color || undefined,
    badges: parseBadges(message.tags.badges),
    text: message.trailing,
    twitchEmoteRanges: parseTwitchEmoteRanges(message.tags.emotes),
    timestamp: Date.now(),
  };
}
