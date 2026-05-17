import { useEffect, useRef, useState } from "react";
import { ChatFeed } from "../../components/chat/ChatFeed";
import { ChatInput } from "../../components/chat/ChatInput";
import { FloatingScoreLayer } from "../../components/gameplay/FloatingScoreLayer";
import { GameManagerPanel } from "../../components/gameplay/GameManagerPanel";
import { StreamManagerPanel } from "../../components/gameplay/StreamManagerPanel";
import { StatusBadge } from "../../components/ui/StatusBadge";
import { GameOverScreen } from "../GameOver/GameOverScreen";
import { useChatStore } from "../../state/chatStore";
import { useGameStore } from "../../state/gameStore";
import { useGameplayStore } from "../../state/gameplayStore";
import type { ChatRule } from "../../types/gameplay";

export function ChatGameScreen(): JSX.Element {
  const { channel, goToMenu } = useGameStore();
  const { messages, connectionStatus, startGame, stopGame } = useChatStore();
  const { day, gameOver, primeGameComplete, ruleSet } = useGameplayStore();
  const [dayScene, setDayScene] = useState<"title" | "story" | "rules" | null>("title");
  const [dayRules, setDayRules] = useState<ChatRule[]>([]);
  const startGameRef = useRef(startGame);
  const stopGameRef = useRef(stopGame);

  useEffect(() => {
    startGameRef.current = startGame;
    stopGameRef.current = stopGame;
  }, [startGame, stopGame]);

  useEffect(() => {
    startGameRef.current(channel);
    return () => stopGameRef.current();
  }, [channel]);

  const handleBack = (): void => {
    stopGame();
    goToMenu();
  };

  useEffect(() => {
    setDayScene("title");
    const rules = day > 1 && ruleSet ? dayRules : [];
    const storyTimer = day === 1 ? window.setTimeout(() => setDayScene("story"), 1700) : null;
    const rulesTimer = rules.length > 0 ? window.setTimeout(() => setDayScene("rules"), 1700) : null;
    const hideTimer = window.setTimeout(() => setDayScene(null), day === 1 ? 6200 : rules.length > 0 ? 5400 : 2200);

    return () => {
      if (storyTimer !== null) {
        window.clearTimeout(storyTimer);
      }
      if (rulesTimer !== null) {
        window.clearTimeout(rulesTimer);
      }
      window.clearTimeout(hideTimer);
    };
  }, [day, dayRules, ruleSet]);

  useEffect(() => {
    if (!ruleSet || day <= 1) {
      setDayRules([]);
      return;
    }

    setDayRules(ruleSet.rules);
  }, [day, ruleSet]);

  if (gameOver) {
    return (
      <>
        <GameOverScreen />
        <FloatingScoreLayer />
      </>
    );
  }

  if (primeGameComplete) {
    return <PrimeCompleteScreen />;
  }

  return (
    <main className="flex h-screen bg-[#0e0e10] text-[#efeff1]">
      {dayScene ? <DayScene day={day} scene={dayScene} rules={dayRules} /> : null}
      <FloatingScoreLayer />
      <GameManagerPanel />
      <StreamManagerPanel />
      <aside className="stream-chat flex h-screen w-full max-w-[34rem] flex-col border-l border-[#2f2f35] bg-[#18181b] font-sans shadow-2xl">
        <header className="stream-chat-header flex h-12 shrink-0 items-center justify-between border-b border-[#2f2f35] px-4">
          <h1 className="text-[13px] font-semibold uppercase tracking-normal text-[#efeff1]">Чат стрима</h1>
          <div className="flex shrink-0 items-center gap-2">
          <StatusBadge status={connectionStatus} />
          <button className="tw-icon-button" aria-label="Сообщество" type="button">
            <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
              <path fill="currentColor" fillRule="evenodd" d="M8 2a5 5 0 0 0-1 9.9v.1a1 1 0 0 1-1 1H5a3 3 0 0 0-3 3v6h2v-6a1 1 0 0 1 1-1h1a2.99 2.99 0 0 0 2-.764A2.99 2.99 0 0 0 10 15h1a1 1 0 0 1 1 1v6h2v-6a3 3 0 0 0-3-3h-1a1 1 0 0 1-1-1v-.1A5.002 5.002 0 0 0 8 2ZM5 7a3 3 0 1 0 6 0 3 3 0 0 0-6 0Z" clipRule="evenodd" />
              <path fill="currentColor" d="M22 11a4.002 4.002 0 0 1-2.956 3.862A1.5 1.5 0 0 0 20.5 16a1.5 1.5 0 0 1 1.5 1.5V22h-5v-7.126A4.002 4.002 0 0 1 18 7a4 4 0 0 1 4 4Z" />
            </svg>
          </button>
          <button className="tw-icon-button" aria-label="Назад" onClick={handleBack} type="button">×</button>
        </div>
      </header>
      <section className="min-h-0 flex-1">
        <ChatFeed messages={messages} />
      </section>
      <ChatInput />
    </aside>
  </main>
  );
}

function PrimeCompleteScreen(): JSX.Element {
  const closeTab = (): void => {
    window.close();
  };

  return (
    <main className="flex h-screen flex-col items-center justify-center bg-black text-center text-white">
      <h1 className="text-4xl font-black tracking-normal">Игра окончена.</h1>
      <button
        className="mt-8 flex h-7 w-7 items-center justify-center rounded-full text-sm font-bold text-zinc-500 transition hover:bg-zinc-900 hover:text-zinc-300"
        type="button"
        aria-label="Закрыть вкладку"
        onClick={closeTab}
      >
        ×
      </button>
    </main>
  );
}

function DayScene({ day, scene, rules }: { day: number; scene: "title" | "story" | "rules"; rules: ChatRule[] }): JSX.Element {
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black px-8 text-center text-white">
      {scene === "story" ? (
        <p className="max-w-3xl text-2xl font-bold leading-9">
          Люди, окружавшие тебя последние годы, вдруг стали чужими. Они не правы. Они сошли с ума. Пришло время их банить. Начни с главного.
        </p>
      ) : scene === "rules" ? (
        <div className="max-w-4xl text-left">
          <p className="text-center text-sm font-bold uppercase tracking-[0.25em] text-[#adadb8]">Правила дня</p>
          <div className="mt-6 space-y-3">
            {rules.map((rule, index) => (
              <div key={rule.id} className="day-rule-fade grid grid-cols-[2rem_minmax(0,1fr)] gap-3" style={{ animationDelay: `${index * 360}ms` }}>
                <span className="text-right text-lg font-black text-[#adadb8]">{index + 1}.</span>
                <div>
                  <h2 className="text-lg font-black tracking-normal">{rule.title}</h2>
                  <p className="mt-1 text-sm font-semibold leading-6 text-[#adadb8]">{rule.description}</p>
                </div>
              </div>
            ))}
          </div>
        </div>
      ) : (
        <h2 className="text-5xl font-black tracking-normal">День {day}</h2>
      )}
    </div>
  );
}
