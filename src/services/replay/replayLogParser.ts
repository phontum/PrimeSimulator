import type { ChatMessage } from "../../types/chat";
import { createId } from "../../utils/id";

interface ReplayParseOptions {
  channelMarker?: string;
}

const timestampPattern = String.raw`(?:\[[^\]]+\]\s*)?`;
const channelPattern = String.raw`#(?<channel>[A-Za-z0-9_]+)`;
const usernamePattern = String.raw`\s+(?<username>[A-Za-z0-9_][A-Za-z0-9_.-]{0,40})\s*:\s*`;

export function parseReplayLog(content: string, options: ReplayParseOptions = {}): ChatMessage[] {
  const marker = normalizeMarker(options.channelMarker);
  const headerPattern = new RegExp(`${timestampPattern}${channelPattern}${usernamePattern}`, "gi");
  const headers = [...content.matchAll(headerPattern)];

  return headers.flatMap((header, index) => {
    const groups = header.groups;
    if (!groups || header.index === undefined) {
      return [];
    }

    if (marker && groups.channel.toLowerCase() !== marker) {
      return [];
    }

    const textStart = header.index + header[0].length;
    const textEnd = headers[index + 1]?.index ?? content.length;
    const text = cleanReplayText(content.slice(textStart, textEnd));

    if (!text) {
      return [];
    }

    return [{
      id: createId("replay"),
      source: "replay" as const,
      username: groups.username.trim(),
      displayName: groups.username.trim(),
      text,
      timestamp: Date.now(),
    }];
  });
}

function normalizeMarker(marker?: string): string | undefined {
  const normalized = marker?.trim().toLowerCase().replace(/^#+/, "");
  return normalized || undefined;
}

function cleanReplayText(text: string): string {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .join(" ")
    .replace(/\s+/g, " ")
    .trim();
}
