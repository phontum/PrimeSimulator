import { AppProviders } from "./AppProviders";
import { ChatGameScreen } from "../screens/ChatGame/ChatGameScreen";
import { MainMenu } from "../screens/MainMenu/MainMenu";
import { useGameStore } from "../state/gameStore";

function AppContent(): JSX.Element {
  const { screen } = useGameStore();
  return screen === "chat" ? <ChatGameScreen /> : <MainMenu />;
}

export function App(): JSX.Element {
  return (
    <AppProviders>
      <AppContent />
    </AppProviders>
  );
}
