import { useGameplayStore } from "../../state/gameplayStore";
import { useChatStore } from "../../state/chatStore";

export function GameManagerPanel(): JSX.Element {
  const {
    viewers,
    targetViewers,
    dailyEarned,
    dailyLimit,
    dailyComplete,
    remainingMs,
    day,
    lastEvaluation,
    nextDay,
    finishPrimeGame,
    availableUpgrades,
    ownedUpgrades,
    canBuyUpgrade,
    buyUpgrade,
    addViewersBonus,
  } = useGameplayStore();
  const { finishStreamDay } = useChatStore();
  const progress = Math.min(100, Math.round((viewers / targetViewers) * 100));
  const dailyProgress = dailyLimit > 0 ? Math.min(100, Math.round((dailyEarned / dailyLimit) * 100)) : 0;
  const finishDay = (): void => {
    if (day >= 3) {
      finishStreamDay();
      finishPrimeGame();
      return;
    }
    if (day === 1) {
      addViewersBonus(100);
    }
    finishStreamDay();
    nextDay();
  };

  return (
    <aside className="game-manager-panel h-full w-[17rem] shrink-0 border-r border-[#2f2f35] bg-[#18181b] p-4">
      <h2 className="text-lg font-bold text-[#efeff1]">Менеджер игры</h2>
      <div className="mt-5 rounded-md border border-[#2f2f35] bg-[#1f1f23] p-3">
        <p className="text-xs uppercase text-[#adadb8]">Зрители</p>
        <p className="mt-1 text-3xl font-black text-white">{viewers.toLocaleString()}</p>
        <p className="mt-1 text-xs text-[#adadb8]">Цель: {targetViewers.toLocaleString()}</p>
        <div className="mt-3 h-2 rounded-full bg-[#0e0e10]">
          <div className="h-full rounded-full bg-[#9147ff]" style={{ width: `${progress}%` }} />
        </div>
      </div>

      <div className="mt-3 rounded-md border border-[#2f2f35] bg-[#1f1f23] p-3">
        <p className="text-xs uppercase text-[#adadb8]">День {day}</p>
        <p className="mt-1 text-xl font-bold text-white">Рост за день</p>
        <p className="mt-1 text-xs text-[#adadb8]">Осталось: {formatTime(remainingMs)}</p>
        <div className="mt-3 h-2 rounded-full bg-[#0e0e10]">
          <div className="h-full rounded-full bg-emerald-400" style={{ width: `${dailyProgress}%` }} />
        </div>
      </div>

      <div className="mt-3 min-h-20 rounded-md border border-[#2f2f35] bg-[#1f1f23] p-3">
        <p className="text-xs uppercase text-[#adadb8]">Последний бан</p>
        {lastEvaluation ? (
          <>
            <p
              key={lastEvaluation.evaluatedAt}
              className={[
                "mt-2 text-sm font-bold",
                lastEvaluation.correct ? "ban-result-pop text-emerald-300" : "ban-result-shake text-red-300",
              ].join(" ")}
            >
              {lastEvaluation.viewerDelta > 0 ? "+" : ""}{lastEvaluation.viewerDelta} зрителей
            </p>
            <p className="mt-1 text-xs text-[#adadb8]">{evaluationLabel(lastEvaluation.source)}</p>
          </>
        ) : (
          <p className="mt-2 text-sm text-[#adadb8]">Банов пока нет.</p>
        )}
      </div>

      {availableUpgrades.length > 0 ? (
        <div className="mt-3 rounded-md border border-[#2f2f35] bg-[#1f1f23] p-3">
          <p className="text-xs uppercase text-[#adadb8]">Апгрейды</p>
          <div className="mt-2 space-y-2">
            {availableUpgrades.map((upgrade) => {
              const owned = ownedUpgrades.has(upgrade.id);
              return (
                <button
                  key={upgrade.id}
                  className={[
                    "w-full rounded border px-3 py-2 text-left text-xs transition",
                    owned ? "border-emerald-400/30 bg-emerald-500/15 text-emerald-200" : "border-[#2f2f35] bg-[#18181b] text-[#efeff1] hover:border-[#9147ff]",
                    !owned && !canBuyUpgrade(upgrade.id) ? "opacity-60" : "",
                  ].join(" ")}
                  type="button"
                  disabled={owned || !canBuyUpgrade(upgrade.id)}
                  onClick={() => buyUpgrade(upgrade.id)}
                >
                  <span className="block font-bold">{owned ? "Куплено: " : ""}{upgrade.title}</span>
                  <span className="mt-1 block text-[#adadb8]">{upgrade.description}</span>
                  <span className="mt-1 block font-semibold text-[#bf94ff]">{upgrade.cost.toLocaleString()} зрителей</span>
                </button>
              );
            })}
          </div>
        </div>
      ) : null}

      {dailyComplete ? (
        <button className="tw-chat-button mt-4 w-full" type="button" onClick={finishDay}>
          {day >= 3 ? "Поздравляем, вы в прайме." : "Завершить стрим"}
        </button>
      ) : null}
    </aside>
  );
}

function formatTime(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${minutes}:${seconds.toString().padStart(2, "0")}`;
}

function evaluationLabel(source: "chat-rule" | "activity-feed" | "wrong-ban" | "missed-rule" | undefined): string {
  if (source === "activity-feed") {
    return "Цель из ленты активности";
  }
  if (source === "chat-rule") {
    return "Сработало правило чата";
  }
  if (source === "missed-rule") {
    return "Нарушение улетело из чата";
  }
  return "Ошибочный бан";
}
