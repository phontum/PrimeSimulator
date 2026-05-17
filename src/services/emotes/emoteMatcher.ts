import type { ThirdPartyEmote, ThirdPartyEmoteOccurrence } from "../../types/chat";

export function findTokenEmotes(text: string, emotes: Map<string, ThirdPartyEmote>): ThirdPartyEmoteOccurrence[] {
  const result: ThirdPartyEmoteOccurrence[] = [];
  const tokenPattern = /[^\s]+/g;
  let match: RegExpExecArray | null;

  while ((match = tokenPattern.exec(text)) !== null) {
    const code = match[0];
    const emote = emotes.get(code);
    if (emote) {
      result.push({
        code,
        start: match.index,
        end: match.index + code.length - 1,
        emote,
      });
    }
  }

  return result;
}
