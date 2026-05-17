import { Button } from "../../components/ui/Button";
import { useChatStore } from "../../state/chatStore";
import { useGameStore } from "../../state/gameStore";
import { useGameplayStore } from "../../state/gameplayStore";

export function GameOverScreen(): JSX.Element {
  const { goToMenu } = useGameStore();
  const { stopGame } = useChatStore();
  const { gameOverReason, resetGameplay } = useGameplayStore();

  return (
    <main className="flex min-h-screen items-center justify-center bg-[#0e0e10] px-4 text-[#efeff1]">
      <section className="w-full max-w-md rounded-md border border-[#2f2f35] bg-[#18181b] p-6 shadow-2xl">
        <p className="text-xs font-semibold uppercase tracking-[0.25em] text-red-300">Стрим завершён</p>
        <h1 className="mt-2 text-3xl font-black text-white">Игра окончена</h1>
        <p className="mt-3 text-sm leading-6 text-[#adadb8]">{gameOverReason ?? "Забег завершён."}</p>
        <Button
          className="mt-6 w-full"
          type="button"
          onClick={() => {
            stopGame();
            resetGameplay();
            goToMenu();
          }}
        >
          Вернуться в меню
        </Button>
      </section>
    </main>
  );
}
