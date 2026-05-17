import type { ChatMessage } from "../../types/chat";
import type { BanEvaluation, ChatRuleSet } from "../../types/gameplay";
import { followNamePool, raidChannelNames } from "../../config/activityFeedConfig";

const panicQuestionWords = ["что делать", "почему", "как так", "это конец", "мы умерли", "panic", "help"];
const dissatisfactionWords = ["скучно", "говно", "плохо", "неинтересно", "выключай", "уйди", "надоело", "cringe"];
const laughWords = ["ахах", "хах", "ahah", "haha", ":d", "xd", "lol", "lmao", "rofl", "arolf", "kekw", "omegalul", "lul", "sdd", "смех"];
const otherStreamerWords = ["стримит", "онлайн", "рейд", "raid", "смотрит", "streaming"];
const sadEmotes = [":(", ":'(", "sadge", "pepehands", "despair"];

export function evaluateBan(message: ChatMessage, ruleSet: ChatRuleSet): BanEvaluation {
  const text = message.text;
  const lower = text.toLowerCase();
  const tokens = text.split(/\s+/).filter(Boolean);
  const matchedRuleIds: string[] = [];

  matchConfig("mention-forbidden-user", hasConfiguredValues(ruleSet.config.forbiddenUsernameMention), () => Boolean(ruleSet.config.forbiddenUsernameMention && (
    lower.includes(`@${ruleSet.config.forbiddenUsernameMention.toLowerCase()}`) ||
    lower.includes(ruleSet.config.forbiddenUsernameMention.toLowerCase())
  )));
  match("ascii-art", () => /[⣿⣶⣤⡀⠿⠛⢀⠙⠟]{6,}/.test(text) || text.length > 180 && /[^\u0000-\u024F]/.test(text));
  match("repeated-pasta", () => hasRepeatedToken(tokens, 3));
  match("caps-lock", () => hasCapsLock(text));
  matchConfig("forbidden-emote-prefix", hasConfiguredValues(ruleSet.config.forbiddenEmotePrefixes), () => tokens.some((token) => readConfigWords(ruleSet.config.forbiddenEmotePrefixes).some((prefix) => token.toLowerCase().startsWith(prefix))));
  match("content-dissatisfaction", () => dissatisfactionWords.some((word) => lower.includes(word)));
  match("short-streamer-tag", () => /@\w+/.test(text) && text.length < 42);
  match("panic-question", () => text.includes("?") && panicQuestionWords.some((word) => lower.includes(word)));
  match("sad-tag-format", () => /@\w+/.test(text) && sadEmotes.some((emote) => lower.includes(emote)));
  matchConfig("twitch-names", hasConfiguredValues(ruleSet.config.forbiddenNames), () => readConfigWords(ruleSet.config.forbiddenNames).includes(message.username.toLowerCase()) || readConfigWords(ruleSet.config.forbiddenNames).some((name) => lower.includes(name)));
  match("emote-only", () => isEmoteOnly(tokens, ruleSet));
  match("other-streamer-activity", () => otherStreamerWords.some((word) => lower.includes(word)));
  matchConfig("forbidden-words", hasConfiguredValues(ruleSet.config.forbiddenWords), () => readConfigWords(ruleSet.config.forbiddenWords).some((word) => lower.includes(word)));
  match("laughter", () => laughWords.some((word) => lower.includes(word)) || isMostlyLaughLetters(lower));
  match("post-ban-complaint", () => /за что.*бан|почему.*бан|unban|разбан|1984|беспредел/i.test(text));
  match("links", () => /https?:\/\/|www\.|\.com|\.ru|\.tv/i.test(text));
  match("numbers", () => /\d/.test(text));
  match("english", () => /[a-z]{4,}/i.test(text));
  match("question-marks", () => (text.match(/\?/g) ?? []).length >= 2);

  const correct = matchedRuleIds.length > 0;
  const activityFeedTarget = isActivityFeedTarget(message.username);
  return {
    correct: correct || activityFeedTarget,
    matchedRuleIds: activityFeedTarget && !correct ? ["activity-feed-user"] : matchedRuleIds,
    viewerDelta: correct ? ruleSet.correctBanReward * matchedRuleIds.length : activityFeedTarget ? activityFeedBanReward(ruleSet) : -ruleSet.wrongBanPenalty,
    source: correct ? "chat-rule" : activityFeedTarget ? "activity-feed" : "wrong-ban",
  };

  function match(ruleId: string, predicate: () => boolean): void {
    if (isRuleEnabled(ruleSet, ruleId) && predicate()) {
      matchedRuleIds.push(ruleId);
    }
  }

  function matchConfig(ruleId: string, configured: boolean, predicate: () => boolean): void {
    if ((configured || isRuleEnabled(ruleSet, ruleId)) && predicate()) {
      matchedRuleIds.push(ruleId);
    }
  }
}

export function evaluateActivityFeedBan(username: string, ruleSet: ChatRuleSet): BanEvaluation | null {
  if (!isActivityFeedTarget(username)) {
    return null;
  }

  return {
    correct: true,
    matchedRuleIds: ["activity-feed-user"],
    viewerDelta: activityFeedBanReward(ruleSet),
    source: "activity-feed",
  };
}

function activityFeedBanReward(ruleSet: ChatRuleSet): number {
  return Math.max(1, Math.round(ruleSet.correctBanReward * 0.5));
}

function isActivityFeedTarget(username: string): boolean {
  const normalized = normalizeUsername(username);
  return getActivityFeedTargets().has(normalized);
}

function getActivityFeedTargets(): Set<string> {
  return new Set([...followNamePool, ...raidChannelNames].map(normalizeUsername));
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function hasConfiguredValues(value: string | string[] | undefined): boolean {
  return readConfigWords(value).length > 0;
}

function readConfigWords(value: string | string[] | undefined): string[] {
  const values = Array.isArray(value) ? value : value ? [value] : [];
  return values.flatMap((item) => item.split(","))
    .map((item) => item.trim().toLowerCase())
    .filter(Boolean);
}

function isRuleEnabled(ruleSet: ChatRuleSet, ruleId: string): boolean {
  return ruleSet.rules.some((rule) => rule.id === ruleId && rule.enabled);
}

function hasRepeatedToken(tokens: string[], threshold: number): boolean {
  const counts = new Map<string, number>();
  for (const token of tokens) {
    const normalized = token.toLowerCase();
    const next = (counts.get(normalized) ?? 0) + 1;
    if (next > threshold) {
      return true;
    }
    counts.set(normalized, next);
  }
  return false;
}

function hasCapsLock(text: string): boolean {
  const letters = text.replace(/[^a-zа-яё]/gi, "");
  if (letters.length < 8) {
    return false;
  }
  const upper = letters.replace(/[^A-ZА-ЯЁ]/g, "").length;
  return upper / letters.length > 0.75;
}

function isMostlyLaughLetters(text: string): boolean {
  const letters = text.replace(/[^a-zа-яё]/gi, "");
  if (letters.length < 3) {
    return false;
  }

  const laughLetters = letters.replace(/[^ахahx]/gi, "").length;
  return laughLetters / letters.length > 0.6 && /[ах]/i.test(letters);
}

function isEmoteOnly(tokens: string[], ruleSet: ChatRuleSet): boolean {
  if (tokens.length === 0) {
    return false;
  }
  const positive = new Set((ruleSet.config.positiveEmotes ?? []).map((emote) => emote.toLowerCase()));
  return tokens.every((token) => /^[A-Za-z0-9_!]+$/.test(token)) && !tokens.every((token) => positive.has(token.toLowerCase()));
}
