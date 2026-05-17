import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode, type Dispatch, type SetStateAction } from "react";
import { ReplayChatPlayer } from "../services/replay/ReplayChatPlayer";
import { ThirdPartyEmoteService } from "../services/emotes/ThirdPartyEmoteService";
import { TwitchChatClient } from "../services/twitch/TwitchChatClient";
import { banTwitchUser, timeoutTwitchUser, unbanTwitchUser, unbanTwitchUserByIdKeepalive } from "../services/twitch/twitchModeration";
import { replayConfig } from "../config/replayConfig";
import { evaluateBan } from "../services/gameplay/ruleEvaluator";
import { useGameplayStore } from "./gameplayStore";
import { useGameStore } from "./gameStore";
import { activityFeedConfig } from "../config/activityFeedConfig";
import { botWhitelistedUsernames, whitelistedUsernames } from "../config/whitelistConfig";
import type { ActivityFeedEvent } from "../types/activity";
import type { ChatMessage } from "../types/chat";
import type { FloatingScoreEvent } from "../types/score";
import type { TwitchConnectionStatus } from "../types/twitch";
import { createId } from "../utils/id";

const maxMessages = 150;

interface ChatStore {
  messages: ChatMessage[];
  connectionStatus: TwitchConnectionStatus;
  channel: string;
  bannedUsers: Set<string>;
  deletedMessageIds: Set<string>;
  revealedDeletedMessageIds: Set<string>;
  activityEvents: ActivityFeedEvent[];
  floatingScoreEvents: FloatingScoreEvent[];
  banSoundVolume: number;
  emoteService: ThirdPartyEmoteService;
  addMessage: (message: ChatMessage) => void;
  addActivityEvent: (event: ActivityFeedEvent) => void;
  setBanSoundVolume: (volume: number) => void;
  clearMessages: () => void;
  finishStreamDay: () => void;
  banUser: (username: string, message?: ChatMessage) => void;
  deleteMessage: (message: ChatMessage) => void;
  unbanUser: (username: string) => void;
  toggleDeletedMessage: (messageId: string) => void;
  startGame: (channel: string) => void;
  stopGame: () => void;
}

const ChatContext = createContext<ChatStore | null>(null);

export function ChatProvider({ children }: { children: ReactNode }): JSX.Element {
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [connectionStatus, setConnectionStatus] = useState<TwitchConnectionStatus>("disconnected");
  const [channel, setChannel] = useState("");
  const [bannedUsers, setBannedUsers] = useState<Set<string>>(() => new Set());
  const [deletedMessageIds, setDeletedMessageIds] = useState<Set<string>>(() => new Set());
  const [revealedDeletedMessageIds, setRevealedDeletedMessageIds] = useState<Set<string>>(() => new Set());
  const [activityEvents, setActivityEvents] = useState<ActivityFeedEvent[]>([]);
  const [floatingScoreEvents, setFloatingScoreEvents] = useState<FloatingScoreEvent[]>([]);
  const [banSoundVolume, setBanSoundVolumeState] = useState(() => readStoredVolume());
  const pointerPositionRef = useRef({ x: window.innerWidth / 2, y: window.innerHeight / 2 });
  const bannedUsersRef = useRef<Set<string>>(new Set());
  const clientRef = useRef<TwitchChatClient | null>(null);
  const replayRef = useRef<ReplayChatPlayer | null>(null);
  const emoteServiceRef = useRef(new ThirdPartyEmoteService());
  const messagesRef = useRef<ChatMessage[]>([]);
  const gameSessionRef = useRef(0);
  const rewardedRuleUsersRef = useRef<Set<string>>(new Set());
  const complaintBatchRef = useRef(0);
  const { day, dailyComplete, ownedUpgrades, ruleSet, evaluateBannedMessage, evaluateBannedUsername, penalizeMissedMessage, resetGameplay, triggerGameOver, applyUpgradeIncome } = useGameplayStore();
  const { realTwitchModeration, twitchSession } = useGameStore();
  const dayRef = useRef(day);
  const primeChatOnly = day >= 3 && dailyComplete;
  const primeChatOnlyRef = useRef(primeChatOnly);
  const dailyTwitchBansRef = useRef<Set<string>>(new Set());
  const twitchBanIdsRef = useRef<Map<string, { broadcasterId: string; userId: string }>>(new Map());

  useEffect(() => {
    const updatePointerPosition = (event: PointerEvent): void => {
      pointerPositionRef.current = { x: event.clientX, y: event.clientY };
    };

    window.addEventListener("pointermove", updatePointerPosition);
    window.addEventListener("pointerdown", updatePointerPosition);
    return () => {
      window.removeEventListener("pointermove", updatePointerPosition);
      window.removeEventListener("pointerdown", updatePointerPosition);
    };
  }, []);

  useEffect(() => {
    dayRef.current = day;
    replayRef.current?.setDelayRange(...getReplayDelayRange(day));
  }, [day]);

  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  useEffect(() => {
    primeChatOnlyRef.current = primeChatOnly;
  }, [primeChatOnly]);

  const addMessage = useCallback((message: ChatMessage) => {
    if (primeChatOnlyRef.current && normalizeUsername(message.username) !== "streamelements") {
      return;
    }

    if (message.source !== "system" && bannedUsersRef.current.has(normalizeUsername(message.username))) {
      return;
    }

    const nextMessage = dayRef.current === 1 && message.source === "replay" ? maybeInjectMelMention(message) : message;
    const thirdPartyEmotes = nextMessage.thirdPartyEmotes ?? emoteServiceRef.current.findEmotesInMessage(nextMessage.text);
    const preparedMessage = { ...nextMessage, thirdPartyEmotes };
    setMessages((current) => [...current, preparedMessage].slice(-maxMessages));
  }, [resetGameplay]);

  const addSystemMessage = useCallback((text: string) => {
    const systemMessage: ChatMessage = {
      id: createId("system"),
      source: "system",
      username: "system",
      displayName: "system",
      text,
      timestamp: Date.now(),
    };
    setMessages((current) => [...current, systemMessage].slice(-maxMessages));
  }, []);

  useEffect(() => {
    if (!primeChatOnly) {
      return;
    }

    clientRef.current?.disconnect();
    replayRef.current?.stop();
    clientRef.current = null;
    replayRef.current = null;
    setConnectionStatus("disconnected");

    const pushPrimeMessage = (): void => {
      addMessage(createStreamElementsMessage());
    };
    pushPrimeMessage();
    const intervalId = window.setInterval(pushPrimeMessage, 1400);

    return () => window.clearInterval(intervalId);
  }, [addMessage, primeChatOnly]);

  const addActivityEvent = useCallback((event: ActivityFeedEvent) => {
    setActivityEvents((current) => [event, ...current].slice(0, activityFeedConfig.maxEvents));
  }, []);

  const setBanSoundVolume = useCallback((volume: number) => {
    const clamped = Math.max(0, Math.min(1, volume));
    setBanSoundVolumeState(clamped);
    window.localStorage.setItem("prime-simulator:ban-sound-volume", String(clamped));
  }, []);

  const clearMessages = useCallback(() => {
    setMessages([]);
  }, []);

  const finishStreamDay = useCallback(() => {
    setMessages([]);
    setDeletedMessageIds(new Set());
    setRevealedDeletedMessageIds(new Set());

    const bansToUnban = dailyTwitchBansRef.current;
    dailyTwitchBansRef.current = new Set();
    twitchBanIdsRef.current = new Map();
    bannedUsersRef.current = new Set();
    rewardedRuleUsersRef.current = new Set();
    setBannedUsers(new Set());

    if (realTwitchModeration && twitchSession && channel) {
      for (const username of bansToUnban) {
        void unbanTwitchUser(twitchSession, channel, username).catch(() => undefined);
      }
    }
  }, [channel, realTwitchModeration, twitchSession]);

  const evaluateBannedMessageOnce = useCallback((message: ChatMessage) => {
    if (ruleSet) {
      const preview = evaluateBan(message, ruleSet);
      if (preview.correct) {
        const normalized = normalizeUsername(message.username);
        if (rewardedRuleUsersRef.current.has(normalized)) {
          return null;
        }
        rewardedRuleUsersRef.current.add(normalized);
      }
    }

    return evaluateBannedMessage(message);
  }, [evaluateBannedMessage, ruleSet]);

  const banUser = useCallback((username: string, message?: ChatMessage) => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return;
    }

    if (bannedUsersRef.current.has(normalized)) {
      return;
    }

    if (isWhitelistedUser(normalized)) {
      triggerGameOver(`${username} защищён белым списком.`);
      return;
    }

    setBannedUsers((current) => {
      const next = new Set(current);
      next.add(normalized);
      bannedUsersRef.current = next;
      return next;
    });
    setDeletedMessageIds((current) => {
      const next = new Set(current);
      for (const existingMessage of messages) {
        if (normalizeUsername(existingMessage.username) === normalized) {
          next.add(existingMessage.id);
        }
      }
      if (message) {
        next.add(message.id);
      }
      return next;
    });
    let evaluation = null;
    if (message) {
      evaluation = evaluateBannedMessageOnce(message);
    } else {
      evaluation = evaluateBannedUsername(normalized);
    }
    playBanSound(banSoundVolume, evaluation?.correct ?? false);
    if (evaluation) {
      addFloatingScoreEvent(evaluation.viewerDelta, evaluation.correct, pointerPositionRef.current, setFloatingScoreEvents);
      if (!evaluation.correct && dayRef.current >= 2) {
        complaintBatchRef.current += 1;
        addComplaintMessages(normalized, complaintBatchRef.current, setMessages, emoteServiceRef.current);
      }
    }
    addActivityEvent({
      id: createId("activity"),
      type: "ban",
      username,
      timestamp: Date.now(),
    });
    if (realTwitchModeration && twitchSession && channel) {
      if (message && isProtectedTwitchRole(message)) {
        return;
      }

      dailyTwitchBansRef.current.add(normalized);
      void banTwitchUser(twitchSession, channel, normalized).then((target) => {
        dailyTwitchBansRef.current.add(normalized);
        twitchBanIdsRef.current.set(normalized, target);
      }).catch((error) => {
        addSystemMessage(`Не удалось забанить ${username} на Twitch: ${String(error)}`);
      });
    } else {
      addSystemMessage(`${username} забанен навсегда`);
    }
  }, [addActivityEvent, addSystemMessage, banSoundVolume, channel, evaluateBannedMessageOnce, evaluateBannedUsername, messages, realTwitchModeration, triggerGameOver, twitchSession]);

  const deleteMessage = useCallback((message: ChatMessage) => {
    setDeletedMessageIds((current) => {
      const next = new Set(current);
      next.add(message.id);
      return next;
    });

    const evaluation = evaluateBannedMessageOnce(message);
    playBanSound(banSoundVolume, evaluation?.correct ?? false);
    if (evaluation) {
      addFloatingScoreEvent(evaluation.viewerDelta, evaluation.correct, pointerPositionRef.current, setFloatingScoreEvents);
    }
    if (realTwitchModeration && twitchSession && channel && !isProtectedTwitchRole(message)) {
      void timeoutTwitchUser(twitchSession, channel, message.username, 1).catch((error) => {
        addSystemMessage(`Не удалось выдать таймаут ${message.username} на Twitch: ${String(error)}`);
      });
    }
  }, [addSystemMessage, banSoundVolume, channel, evaluateBannedMessageOnce, realTwitchModeration, twitchSession]);

  const unbanUser = useCallback((username: string) => {
    const normalized = normalizeUsername(username);
    if (!normalized) {
      return;
    }

    setBannedUsers((current) => {
      if (!current.has(normalized)) {
        return current;
      }
      const next = new Set(current);
      next.delete(normalized);
      bannedUsersRef.current = next;
      return next;
    });
    addActivityEvent({
      id: createId("activity"),
      type: "unban",
      username,
      timestamp: Date.now(),
    });
    if (realTwitchModeration && twitchSession && channel) {
      const existingMessage = messages.find((message) => normalizeUsername(message.username) === normalized);
      if (existingMessage && isProtectedTwitchRole(existingMessage)) {
        return;
      }

      addSystemMessage(`Разбаниваем ${username} на Twitch...`);
      void unbanTwitchUser(twitchSession, channel, normalized).then(() => {
        addSystemMessage(`${username} разбанен на Twitch`);
      }).catch((error) => {
        addSystemMessage(`Не удалось разбанить ${username} на Twitch: ${String(error)}`);
      });
    } else {
      addSystemMessage(`${username} разбанен`);
    }
  }, [addActivityEvent, addSystemMessage, channel, messages, realTwitchModeration, twitchSession]);

  const toggleDeletedMessage = useCallback((messageId: string) => {
    setRevealedDeletedMessageIds((current) => {
      const next = new Set(current);
      if (next.has(messageId)) {
        next.delete(messageId);
      } else {
        next.add(messageId);
      }
      return next;
    });
  }, []);

  const stopGame = useCallback(() => {
    gameSessionRef.current += 1;
    clientRef.current?.disconnect();
    replayRef.current?.stop();
    clientRef.current = null;
    replayRef.current = null;
    setChannel("");
    setConnectionStatus("disconnected");
    setMessages([]);
    const emptyBans = new Set<string>();
    bannedUsersRef.current = emptyBans;
    rewardedRuleUsersRef.current = new Set();
    complaintBatchRef.current = 0;
    setBannedUsers(emptyBans);
    setDeletedMessageIds(new Set());
    setRevealedDeletedMessageIds(new Set());
    setActivityEvents([]);
    setFloatingScoreEvents([]);
    resetGameplay();
  }, []);

  const startGame = useCallback((nextChannel: string) => {
    stopGame();
    const sessionId = gameSessionRef.current;
    setChannel(nextChannel);
    addSystemMessage("Загружаем глобальные сторонние смайлы...");
    void emoteServiceRef.current.loadGlobalEmotes().then(() => {
      if (gameSessionRef.current !== sessionId) {
        return false;
      }
      addSystemMessage(`Глобальные сторонние смайлы загружены: ${emoteServiceRef.current.count}.`);
      return emoteServiceRef.current.loadChannelEmotesByChannelName(nextChannel);
    }).then((loadedChannelEmotes) => {
      if (gameSessionRef.current !== sessionId) {
        return;
      }
      if (loadedChannelEmotes) {
        addSystemMessage(`Сторонние смайлы канала загружены. Всего в кэше: ${emoteServiceRef.current.count}.`);
      } else {
        addSystemMessage("Смайлы канала пропущены: не удалось получить Twitch user id без серверного fallback.");
      }
    }).catch((error) => {
      addSystemMessage(`Не удалось загрузить сторонние смайлы: ${String(error)}`);
    });

    const client = new TwitchChatClient({
      onMessage: addMessage,
      onStatus: setConnectionStatus,
      onSystemMessage: addSystemMessage,
    });
    clientRef.current = client;
    client.connect(nextChannel, realTwitchModeration && twitchSession ? {
      accessToken: twitchSession.accessToken,
      login: twitchSession.login,
    } : undefined);

    const replay = new ReplayChatPlayer({
      logUrl: replayConfig.logUrl,
      replayChannelMarker: replayConfig.channelMarker,
      minDelayMs: getReplayDelayRange(dayRef.current)[0],
      maxDelayMs: getReplayDelayRange(dayRef.current)[1],
      onMessage: addMessage,
      onSystemMessage: addSystemMessage,
      loop: true,
      randomOrder: true,
    });
    replayRef.current = replay;
    void replay.start();
  }, [addMessage, addSystemMessage, realTwitchModeration, stopGame, twitchSession]);

  useEffect(() => {
    if (!ownedUpgrades.has("stream-banner") && !ownedUpgrades.has("ad-bot")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      if (ownedUpgrades.has("stream-banner")) {
        applyUpgradeIncome("stream-banner");
      }
      if (ownedUpgrades.has("ad-bot")) {
        applyUpgradeIncome("ad-bot");
        addMessage({
          id: createId("ad"),
          source: "replay",
          username: "StreamElements",
          displayName: "StreamElements",
          color: "#9147ff",
          text: '🟪 PIONER уже в релизе! "https://metacorp.gg/"',
          timestamp: Date.now(),
        });
      }
    }, 5000);

    return () => window.clearInterval(intervalId);
  }, [addMessage, applyUpgradeIncome, ownedUpgrades]);

  useEffect(() => {
    if (!ownedUpgrades.has("auto-moderator")) {
      return;
    }

    const intervalId = window.setInterval(() => {
      const target = ruleSet ? messages.find((message) => (
        message.source !== "system" &&
        !bannedUsersRef.current.has(normalizeUsername(message.username)) &&
        !isBotWhitelistedUser(message.username) &&
        evaluateBan(message, ruleSet).correct
      )) : null;
      if (target) {
        banUser(target.username, target);
      }
    }, 4000);

    return () => window.clearInterval(intervalId);
  }, [banUser, messages, ownedUpgrades, ruleSet]);

  useEffect(() => {
    const closeLiveConnections = (): void => {
      if (realTwitchModeration && twitchSession) {
        for (const target of twitchBanIdsRef.current.values()) {
          unbanTwitchUserByIdKeepalive(twitchSession, target.broadcasterId, target.userId);
        }
        twitchBanIdsRef.current = new Map();
      }
      clientRef.current?.disconnect();
      replayRef.current?.stop();
      clientRef.current = null;
      replayRef.current = null;
    };

    window.addEventListener("pagehide", closeLiveConnections);
    window.addEventListener("beforeunload", closeLiveConnections);
    return () => {
      window.removeEventListener("pagehide", closeLiveConnections);
      window.removeEventListener("beforeunload", closeLiveConnections);
    };
  }, [realTwitchModeration, twitchSession]);

  const value = useMemo<ChatStore>(() => ({
    messages,
    connectionStatus,
    channel,
    bannedUsers,
    deletedMessageIds,
    revealedDeletedMessageIds,
    activityEvents,
    floatingScoreEvents,
    banSoundVolume,
    emoteService: emoteServiceRef.current,
    addMessage,
    addActivityEvent,
    setBanSoundVolume,
    clearMessages,
    finishStreamDay,
    banUser,
    deleteMessage,
    unbanUser,
    toggleDeletedMessage,
    startGame,
    stopGame,
  }), [messages, connectionStatus, channel, bannedUsers, deletedMessageIds, revealedDeletedMessageIds, activityEvents, floatingScoreEvents, banSoundVolume, addMessage, addActivityEvent, setBanSoundVolume, clearMessages, finishStreamDay, banUser, deleteMessage, unbanUser, toggleDeletedMessage, startGame, stopGame]);

  return <ChatContext.Provider value={value}>{children}</ChatContext.Provider>;
}

function normalizeUsername(username: string): string {
  return username.trim().toLowerCase();
}

function isWhitelistedUser(username: string): boolean {
  const normalized = normalizeUsername(username);
  return whitelistedUsernames.some((name) => normalizeUsername(name) === normalized);
}

function isBotWhitelistedUser(username: string): boolean {
  const normalized = normalizeUsername(username);
  return botWhitelistedUsernames.some((name) => normalizeUsername(name) === normalized);
}

function isProtectedTwitchRole(message: ChatMessage): boolean {
  const badges = message.badges ?? {};
  return Boolean(
    badges.moderator ||
    badges.vip ||
    badges.artist ||
    badges["artist-badge"] ||
    badges["channel-artist"],
  );
}

function addFloatingScoreEvent(
  value: number,
  correct: boolean,
  position: { x: number; y: number },
  setEvents: Dispatch<SetStateAction<FloatingScoreEvent[]>>,
): void {
  const event: FloatingScoreEvent = {
    id: createId("score"),
    value,
    correct,
    x: position.x,
    y: position.y,
  };
  setEvents((current) => [...current, event]);
  window.setTimeout(() => {
    setEvents((current) => current.filter((currentEvent) => currentEvent.id !== event.id));
  }, 1100);
}

function addComplaintMessages(
  bannedUsername: string,
  batch: number,
  setMessages: Dispatch<SetStateAction<ChatMessage[]>>,
  emoteService: ThirdPartyEmoteService,
): void {
  const complaintTexts = ["за что бан?", "беспредел полный", "1984"];
  const messages = complaintTexts.map((text, index): ChatMessage => {
    const username = `complaint_${batch}_${index + 1}_${createId("user").replace(/[^a-z0-9_]/gi, "")}`;
    return {
      id: createId("complaint"),
      source: "replay",
      username,
      displayName: username,
      color: colorForComplaint(index),
      text: index === 0 ? `${text} @${bannedUsername}` : text,
      timestamp: Date.now() + index,
    };
  }).map((message) => ({
    ...message,
    thirdPartyEmotes: emoteService.findEmotesInMessage(message.text),
  }));

  window.setTimeout(() => {
    setMessages((current) => [...current, ...messages].slice(-maxMessages));
  }, 350);
}

function colorForComplaint(index: number): string {
  return ["#ff7f50", "#facc15", "#93c5fd", "#f472b6"][index % 4] ?? "#adadb8";
}

function createStreamElementsMessage(): ChatMessage {
  return {
    id: createId("prime"),
    source: "replay",
    username: "StreamElements",
    displayName: "StreamElements",
    color: "#9147ff",
    text: '🟪 PIONER уже в релизе! "https://metacorp.gg/"',
    timestamp: Date.now(),
  };
}

function readStoredVolume(): number {
  const stored = window.localStorage.getItem("prime-simulator:ban-sound-volume");
  if (stored === null) {
    return 0.5;
  }

  const parsed = Number(stored);
  return Number.isFinite(parsed) ? Math.max(0, Math.min(1, parsed)) : 0.55;
}

function playBanSound(volume: number, correct: boolean): void {
  if (volume <= 0) {
    return;
  }

  const AudioContextCtor = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextCtor) {
    return;
  }

  const context = new AudioContextCtor();
  const now = context.currentTime;
  const duration = correct ? 0.16 : 0.11;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  const filter = context.createBiquadFilter();

  oscillator.type = "square";
  oscillator.frequency.setValueAtTime(correct ? 132 : 92, now);
  oscillator.frequency.exponentialRampToValueAtTime(correct ? 58 : 42, now + duration);
  filter.type = "lowpass";
  filter.frequency.setValueAtTime(900, now);
  filter.frequency.exponentialRampToValueAtTime(160, now + duration);
  gain.gain.setValueAtTime(0.0001, now);
  gain.gain.exponentialRampToValueAtTime(volume * 0.38, now + 0.012);
  gain.gain.exponentialRampToValueAtTime(0.0001, now + duration);

  oscillator.connect(filter);
  filter.connect(gain);
  gain.connect(context.destination);
  oscillator.start(now);
  oscillator.stop(now + duration);
  window.setTimeout(() => void context.close(), Math.ceil((duration + 0.05) * 1000));
}

function getReplayDelayRange(day: number): [number, number] {
  const speedMultiplier = 1.5;
  if (day <= 1) {
    return scaleDelayRange([5000, 10000], speedMultiplier);
  }
  if (day === 2) {
    return scaleDelayRange([2000, 7000], speedMultiplier);
  }
  return scaleDelayRange([200, 1000], speedMultiplier);
}

function scaleDelayRange([minDelayMs, maxDelayMs]: [number, number], speedMultiplier: number): [number, number] {
  return [
    Math.max(1, Math.round(minDelayMs / speedMultiplier)),
    Math.max(1, Math.round(maxDelayMs / speedMultiplier)),
  ];
}

function maybeInjectMelMention(message: ChatMessage): ChatMessage {
  if (Math.random() > 0.35) {
    return message;
  }

  const variants = ["mel", "melharucos", "мэлхарукос", "мэл", "мел"];
  const injected = variants[Math.floor(Math.random() * variants.length)];
  return {
    ...message,
    text: Math.random() > 0.5 ? injected : `${message.text} ${injected}`,
    twitchEmoteRanges: undefined,
    thirdPartyEmotes: undefined,
  };
}

export function useChatStore(): ChatStore {
  const context = useContext(ChatContext);
  if (!context) {
    throw new Error("useChatStore must be used inside ChatProvider");
  }
  return context;
}
