import { createContext, useCallback, useContext, useMemo, useState, type ReactNode } from "react";
import type { TwitchOAuthSession } from "../types/twitch";

type GameScreen = "menu" | "chat";

interface GameStore {
  screen: GameScreen;
  channel: string;
  realTwitchModeration: boolean;
  twitchSession: TwitchOAuthSession | null;
  setChannel: (channel: string) => void;
  setRealTwitchModeration: (enabled: boolean) => void;
  setTwitchSession: (session: TwitchOAuthSession | null) => void;
  goToChat: (channel: string, realTwitchModeration?: boolean) => void;
  goToMenu: () => void;
}

const GameContext = createContext<GameStore | null>(null);

export function normalizeChannelName(channel: string): string {
  return channel.trim().toLowerCase().replace(/^#+/, "");
}

export function GameProvider({ children }: { children: ReactNode }): JSX.Element {
  const [screen, setScreen] = useState<GameScreen>("menu");
  const [channel, setChannelState] = useState("");
  const [realTwitchModeration, setRealTwitchModeration] = useState(false);
  const [twitchSession, setTwitchSession] = useState<TwitchOAuthSession | null>(null);

  const setChannel = useCallback((value: string) => {
    setChannelState(normalizeChannelName(value));
  }, []);

  const goToChat = useCallback((value: string, nextRealTwitchModeration = realTwitchModeration) => {
    const normalized = normalizeChannelName(value);
    if (!normalized) {
      return;
    }
    setChannelState(normalized);
    setRealTwitchModeration(nextRealTwitchModeration);
    setScreen("chat");
  }, [realTwitchModeration]);

  const goToMenu = useCallback(() => {
    setScreen("menu");
  }, []);

  const value = useMemo(() => ({
    screen,
    channel,
    realTwitchModeration,
    twitchSession,
    setChannel,
    setRealTwitchModeration,
    setTwitchSession,
    goToChat,
    goToMenu,
  }), [screen, channel, realTwitchModeration, twitchSession, setChannel, goToChat, goToMenu]);
  return <GameContext.Provider value={value}>{children}</GameContext.Provider>;
}

export function useGameStore(): GameStore {
  const context = useContext(GameContext);
  if (!context) {
    throw new Error("useGameStore must be used inside GameProvider");
  }
  return context;
}
