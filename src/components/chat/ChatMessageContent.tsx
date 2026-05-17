import type { ChatMessage, ThirdPartyEmoteOccurrence, TwitchEmoteRange } from "../../types/chat";
import { getTwitchEmoteUrl } from "../../services/twitch/twitchEmotes";
import { EmoteImage } from "./EmoteImage";

interface Segment {
  start: number;
  end: number;
  type: "text" | "twitch" | "third-party" | "hidden";
  id?: string;
  code?: string;
  url?: string;
  fallbackUrl?: string;
  effects?: EmoteEffect[];
  rawText?: string;
}

type EmoteEffect = "wide" | "flip-x" | "flip-y" | "zero-width" | "shake" | "party" | "rotate-right" | "rotate-left";

const modifierEffects: Record<string, EmoteEffect> = {
  "w!": "wide",
  "h!": "flip-x",
  "v!": "flip-y",
  "z!": "zero-width",
  "s!": "shake",
  "p!": "party",
  "r!": "rotate-right",
  "l!": "rotate-left",
};

export function ChatMessageContent({ message, muted = false }: { message: ChatMessage; muted?: boolean }): JSX.Element {
  const segments = buildSegments(message);

  return (
    <span className={`break-words text-[13px] leading-5 ${muted ? "text-[#adadb8]" : "text-[#efeff1]"}`}>
      {segments.map((segment, index) => {
        const key = `${message.id}_${segment.start}_${segment.end}_${index}`;
        if (segment.type === "twitch" && segment.id) {
          return <EmoteImage key={key} src={getTwitchEmoteUrl(segment.id)} alt={segment.code ?? "Twitch emote"} className={effectClassName(segment.effects)} />;
        }

        if (segment.type === "third-party" && segment.url) {
          return <EmoteImage key={key} src={segment.url} fallbackSrc={segment.fallbackUrl} alt={segment.code ?? "emote"} className={effectClassName(segment.effects)} />;
        }

        if (segment.type === "hidden") {
          return null;
        }

        return <span key={key}>{message.text.slice(segment.start, segment.end + 1)}</span>;
      })}
    </span>
  );
}

function buildSegments(message: ChatMessage): Segment[] {
  const text = message.text;
  const emoteSegments: Segment[] = [
    ...(message.twitchEmoteRanges ?? []).map(twitchToSegment(text)),
  ];

  for (const occurrence of message.thirdPartyEmotes ?? []) {
    if (!overlapsAny(occurrence, message.twitchEmoteRanges ?? [])) {
      emoteSegments.push(thirdPartyToSegment(occurrence));
    }
  }

  emoteSegments.sort((a, b) => a.start - b.start || a.end - b.end);

  const segments: Segment[] = [];
  let cursor = 0;

  for (const segment of emoteSegments) {
    if (segment.start > cursor) {
      segments.push({ type: "text", start: cursor, end: segment.start - 1, rawText: text.slice(cursor, segment.start) });
    }
    segments.push(segment);
    cursor = segment.end + 1;
  }

  if (cursor < text.length) {
    segments.push({ type: "text", start: cursor, end: text.length - 1, rawText: text.slice(cursor) });
  }

  return applyModifierSegments(segments);
}

function twitchToSegment(text: string): (range: TwitchEmoteRange) => Segment {
  return (range) => ({
    type: "twitch",
    start: range.start,
    end: Math.min(range.end, text.length - 1),
    id: range.id,
    code: text.slice(range.start, range.end + 1),
  });
}

function thirdPartyToSegment(occurrence: ThirdPartyEmoteOccurrence): Segment {
  return {
    type: "third-party",
    start: occurrence.start,
    end: occurrence.end,
    code: occurrence.code,
    url: occurrence.emote.url,
    fallbackUrl: occurrence.emote.originalUrl,
    effects: occurrence.emote.zeroWidth ? ["zero-width"] : [],
  };
}

function overlapsAny(occurrence: ThirdPartyEmoteOccurrence, ranges: TwitchEmoteRange[]): boolean {
  return ranges.some((range) => occurrence.start <= range.end && occurrence.end >= range.start);
}

function applyModifierSegments(segments: Segment[]): Segment[] {
  const next = segments.map((segment) => ({ ...segment, effects: [...(segment.effects ?? [])] }));

  for (let index = 0; index < next.length; index += 1) {
    const segment = next[index];
    if (segment.type !== "text") {
      continue;
    }

    const value = segmentTextOnly(segment);
    const modifiers = value.trim().split(/\s+/).filter(Boolean);
    if (modifiers.length === 0 || !modifiers.every((modifier) => modifier in modifierEffects)) {
      continue;
    }

    const target = findNextEmote(next, index + 1) ?? findPreviousEmote(next, index - 1);
    if (!target) {
      continue;
    }

    target.effects = [...(target.effects ?? []), ...modifiers.map((modifier) => modifierEffects[modifier])];
    segment.type = "hidden";
  }

  return next;
}

function segmentTextOnly(segment: Segment): string {
  return segment.rawText ?? "";
}

function findNextEmote(segments: Segment[], startIndex: number): Segment | null {
  for (let index = startIndex; index < segments.length; index += 1) {
    if (segments[index].type === "twitch" || segments[index].type === "third-party") {
      return segments[index];
    }
    if (segments[index].type === "text" && !/^\s*$/.test(segments[index].rawText ?? "")) {
      return null;
    }
  }
  return null;
}

function findPreviousEmote(segments: Segment[], startIndex: number): Segment | null {
  for (let index = startIndex; index >= 0; index -= 1) {
    if (segments[index].type === "twitch" || segments[index].type === "third-party") {
      return segments[index];
    }
    if (segments[index].type === "text" && !/^\s*$/.test(segments[index].rawText ?? "")) {
      return null;
    }
  }
  return null;
}

function effectClassName(effects: EmoteEffect[] = []): string {
  return effects.map((effect) => `tm-bttv-${effect}`).join(" ");
}
