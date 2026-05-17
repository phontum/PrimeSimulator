import type { ReactNode } from "react";
import { ChatProvider } from "../state/chatStore";
import { GameplayProvider } from "../state/gameplayStore";
import { GameProvider } from "../state/gameStore";

export function AppProviders({ children }: { children: ReactNode }): JSX.Element {
  return (
    <GameProvider>
      <GameplayProvider>
        <ChatProvider>{children}</ChatProvider>
      </GameplayProvider>
    </GameProvider>
  );
}
