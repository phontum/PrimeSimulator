import { createContext, useCallback, useContext, useEffect, useMemo, useState, type ReactNode } from "react";
import { evaluateActivityFeedBan, evaluateBan } from "../services/gameplay/ruleEvaluator";
import { loadRuleSet } from "../services/gameplay/ruleLoader";
import { getDayDurationMs } from "../config/dayConfig";
import { randomInt } from "../utils/random";
import type { ChatMessage } from "../types/chat";
import type { BanEvaluation, ChatRuleSet, StreamUpgrade, UpgradeId } from "../types/gameplay";

interface GameplayStore {
  day: number;
  viewers: number;
  targetViewers: number;
  dailyLimit: number;
  dailyEarned: number;
  dailyComplete: boolean;
  remainingMs: number;
  gameOver: boolean;
  gameOverReason: string | null;
  primeGameComplete: boolean;
  lastEvaluation: BanEvaluation | null;
  ruleSet: ChatRuleSet | null;
  availableUpgrades: StreamUpgrade[];
  ownedUpgrades: Set<UpgradeId>;
  evaluateBannedMessage: (message: ChatMessage) => BanEvaluation | null;
  evaluateBannedUsername: (username: string) => BanEvaluation | null;
  penalizeMissedMessage: (message: ChatMessage) => BanEvaluation | null;
  penalizeEscapedMessage: (message: ChatMessage) => BanEvaluation | null;
  canBuyUpgrade: (upgradeId: UpgradeId) => boolean;
  buyUpgrade: (upgradeId: UpgradeId) => void;
  applyUpgradeIncome: (upgradeId: UpgradeId) => BanEvaluation | null;
  addViewersBonus: (amount: number) => void;
  triggerGameOver: (reason: string) => void;
  finishPrimeGame: () => void;
  nextDay: () => void;
  resetGameplay: () => void;
}

const GameplayContext = createContext<GameplayStore | null>(null);
const defaultTargetViewers = 10000;
const streamUpgrades: StreamUpgrade[] = [
  {
    id: "stream-banner",
    title: "Баннер под стрим",
    description: "Пассивно приносит прибыль прямо во время стрима.",
    cost: 180,
  },
  {
    id: "auto-moderator",
    title: "Бот-модератор",
    description: "Автоматически банит нарушителей правил и фармит очки.",
    cost: 320,
  },
  {
    id: "ad-bot",
    title: "Бот-рассыльщик рекламы",
    description: "Разгоняет актив в чате рекламными вбросами.",
    cost: 260,
  },
];
const upgradeIncome: Record<UpgradeId, number> = {
  "stream-banner": 18,
  "auto-moderator": 0,
  "ad-bot": 24,
};

export function GameplayProvider({ children }: { children: ReactNode }): JSX.Element {
  const [day, setDay] = useState(1);
  const [score, setScore] = useState(0);
  const [dailyLimit, setDailyLimit] = useState(() => rollDailyLimit(100));
  const [dailyEarned, setDailyEarned] = useState(0);
  const [remainingMs, setRemainingMs] = useState(() => getDayDurationMs(1));
  const [gameOverReason, setGameOverReason] = useState<string | null>(null);
  const [primeGameComplete, setPrimeGameComplete] = useState(false);
  const [ruleSet, setRuleSet] = useState<ChatRuleSet | null>(null);
  const [lastEvaluation, setLastEvaluation] = useState<BanEvaluation | null>(null);
  const [ownedUpgrades, setOwnedUpgrades] = useState<Set<UpgradeId>>(() => new Set());
  const gameOver = gameOverReason !== null;

  useEffect(() => {
    let cancelled = false;
    void loadRuleSet(day).then((loaded) => {
      if (!cancelled) {
        setRuleSet(loaded);
        setDailyLimit(rollDailyLimit(loaded.baseDailyLimit));
      }
    }).catch(() => {
      if (!cancelled) {
        setRuleSet(null);
      }
    });
    return () => {
      cancelled = true;
    };
  }, [day]);

  useEffect(() => {
    if (gameOver) {
      return;
    }

    const intervalId = window.setInterval(() => {
      setRemainingMs((current) => {
        const next = Math.max(0, current - 1000);
        if (next === 0) {
          setGameOverReason("Время вышло.");
        }
        return next;
      });
    }, 1000);

    return () => window.clearInterval(intervalId);
  }, [gameOver, day]);

  const triggerGameOver = useCallback((reason: string) => {
    setGameOverReason(reason);
  }, []);

  const finishPrimeGame = useCallback(() => {
    setPrimeGameComplete(true);
  }, []);

  const applyEvaluation = useCallback((evaluation: BanEvaluation): BanEvaluation => {
    const comboAdjustedDelta = evaluation.viewerDelta > 0 && evaluation.source === "chat-rule" && day >= 2 && evaluation.matchedRuleIds.length > 1
      ? Math.max(1, Math.round(evaluation.viewerDelta * 0.5))
      : evaluation.viewerDelta;
    const dynamicPenalty = evaluation.source === "wrong-ban" || evaluation.source === "missed-rule"
      ? -dailyProgressPenalty(day, dailyEarned)
      : comboAdjustedDelta;
    const randomizedDelta = dynamicPenalty > 0 ? randomizeReward(dynamicPenalty) : dynamicPenalty;
    const cappedDelta = randomizedDelta > 0
      ? Math.min(randomizedDelta, Math.max(0, dailyLimit - dailyEarned))
      : randomizedDelta;
    const finalEvaluation = { ...evaluation, viewerDelta: cappedDelta, evaluatedAt: Date.now() };

    setDailyEarned((current) => cappedDelta > 0 ? current + cappedDelta : Math.max(0, current + cappedDelta));
    setScore((current) => {
      if (cappedDelta < 0) {
        return current;
      }
      const next = Math.min(ruleSet?.targetViewers ?? defaultTargetViewers, current + cappedDelta);
      if (next <= -dailyLimit) {
        setGameOverReason("Канал слишком сильно ушёл в отрицательный рост.");
      }
      return next;
    });
    setLastEvaluation(finalEvaluation);
    return finalEvaluation;
  }, [dailyEarned, dailyLimit, day, ruleSet?.targetViewers]);

  const evaluateBannedMessage = useCallback((message: ChatMessage): BanEvaluation | null => {
    if (!ruleSet) {
      return null;
    }

    return applyEvaluation(evaluateBan(message, ruleSet));
  }, [applyEvaluation, ruleSet]);

  const evaluateBannedUsername = useCallback((username: string): BanEvaluation | null => {
    if (!ruleSet) {
      return null;
    }

    const evaluation = evaluateActivityFeedBan(username, ruleSet);
    return evaluation ? applyEvaluation(evaluation) : null;
  }, [applyEvaluation, ruleSet]);

  const penalizeMissedMessage = useCallback((message: ChatMessage): BanEvaluation | null => {
    if (!ruleSet) {
      return null;
    }

    const evaluation = evaluateBan(message, ruleSet);
    if (!evaluation.correct) {
      return null;
    }

    return applyEvaluation({
      ...evaluation,
      correct: false,
      source: "missed-rule",
    });
  }, [applyEvaluation, day, ruleSet]);

  const penalizeEscapedMessage = useCallback((message: ChatMessage): BanEvaluation | null => {
    if (message.source === "system") {
      return null;
    }

    return applyEvaluation({
      correct: false,
      matchedRuleIds: ["escaped-message"],
      viewerDelta: -dailyProgressPenalty(day, dailyEarned),
      source: "missed-rule",
    });
  }, [applyEvaluation, dailyEarned, day]);

  const canBuyUpgrade = useCallback((upgradeId: UpgradeId): boolean => {
    const upgrade = streamUpgrades.find((item) => item.id === upgradeId);
    return Boolean(day >= 2 && upgrade && !ownedUpgrades.has(upgradeId) && score >= upgrade.cost);
  }, [day, ownedUpgrades, score]);

  const buyUpgrade = useCallback((upgradeId: UpgradeId) => {
    const upgrade = streamUpgrades.find((item) => item.id === upgradeId);
    if (!upgrade || day < 2 || ownedUpgrades.has(upgradeId) || score < upgrade.cost) {
      return;
    }

    setScore((current) => Math.max(0, current - upgrade.cost));
    setOwnedUpgrades((current) => {
      const next = new Set(current);
      next.add(upgradeId);
      return next;
    });
  }, [day, ownedUpgrades, score]);

  const applyUpgradeIncome = useCallback((upgradeId: UpgradeId): BanEvaluation | null => {
    if (!ownedUpgrades.has(upgradeId)) {
      return null;
    }

    const viewerDelta = upgradeIncome[upgradeId];
    if (viewerDelta <= 0) {
      return null;
    }

    return applyEvaluation({
      correct: true,
      matchedRuleIds: [upgradeId],
      viewerDelta,
      source: "chat-rule",
    });
  }, [applyEvaluation, ownedUpgrades]);

  const addViewersBonus = useCallback((amount: number) => {
    setScore((current) => current + amount);
  }, []);

  const nextDay = useCallback(() => {
    setDay((current) => current + 1);
    setDailyEarned(0);
    setRemainingMs(getDayDurationMs(day + 1));
    setLastEvaluation(null);
  }, [day]);

  const resetGameplay = useCallback(() => {
    setDay(1);
    setScore(0);
    setDailyEarned(0);
    setDailyLimit(rollDailyLimit(ruleSet?.baseDailyLimit ?? 100));
    setRemainingMs(getDayDurationMs(1));
    setGameOverReason(null);
    setPrimeGameComplete(false);
    setLastEvaluation(null);
    setOwnedUpgrades(new Set());
  }, []);

  const value = useMemo<GameplayStore>(() => ({
    day,
    viewers: Math.max(0, score),
    targetViewers: ruleSet?.targetViewers ?? defaultTargetViewers,
    dailyLimit,
    dailyEarned,
    dailyComplete: dailyEarned >= dailyLimit,
    remainingMs,
    gameOver,
    gameOverReason,
    primeGameComplete,
    lastEvaluation,
    ruleSet,
    availableUpgrades: day >= 2 ? streamUpgrades : [],
    ownedUpgrades,
    evaluateBannedMessage,
    evaluateBannedUsername,
    penalizeMissedMessage,
    penalizeEscapedMessage,
    canBuyUpgrade,
    buyUpgrade,
    applyUpgradeIncome,
    addViewersBonus,
    triggerGameOver,
    finishPrimeGame,
    nextDay,
    resetGameplay,
  }), [day, score, ruleSet, dailyLimit, dailyEarned, remainingMs, gameOver, gameOverReason, primeGameComplete, lastEvaluation, ownedUpgrades, evaluateBannedMessage, evaluateBannedUsername, penalizeMissedMessage, penalizeEscapedMessage, canBuyUpgrade, buyUpgrade, applyUpgradeIncome, addViewersBonus, triggerGameOver, finishPrimeGame, nextDay, resetGameplay]);

  return <GameplayContext.Provider value={value}>{children}</GameplayContext.Provider>;
}

export function useGameplayStore(): GameplayStore {
  const context = useContext(GameplayContext);
  if (!context) {
    throw new Error("useGameplayStore must be used inside GameplayProvider");
  }
  return context;
}

function rollDailyLimit(baseLimit: number): number {
  const modifier = 0.91 + Math.random() * 0.07;
  return Math.round(baseLimit * modifier);
}

function randomizeReward(baseReward: number): number {
  const modifier = 0.5 + Math.random();
  return Math.max(1, Math.round(baseReward * modifier));
}

function dailyProgressPenalty(day: number, dailyEarned: number): number {
  if (day <= 1) {
    return Math.round(Math.max(0, dailyEarned) * 0.01) + randomInt(1, 5);
  }
  if (day === 2) {
    return Math.round(Math.max(0, dailyEarned) * 0.05) + randomInt(5, 10);
  }
  return Math.round(Math.max(0, dailyEarned) * 0.1) + randomInt(10, 50);
}
