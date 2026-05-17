export interface ChatRuleSet {
  day: number;
  title: string;
  targetViewers: number;
  baseDailyLimit: number;
  correctBanReward: number;
  wrongBanPenalty: number;
  rules: ChatRule[];
  config: {
    forbiddenUsernameMention?: string;
    forbiddenEmotePrefixes?: string[];
    forbiddenNames?: string[];
    forbiddenWords?: string[];
    positiveEmotes?: string[];
  };
}

export interface ChatRule {
  id: string;
  title: string;
  description: string;
  enabled: boolean;
}

export interface BanEvaluation {
  correct: boolean;
  matchedRuleIds: string[];
  viewerDelta: number;
  source?: "chat-rule" | "activity-feed" | "wrong-ban" | "missed-rule";
  evaluatedAt?: number;
}

export type UpgradeId = "stream-banner" | "auto-moderator" | "ad-bot";

export interface StreamUpgrade {
  id: UpgradeId;
  title: string;
  description: string;
  cost: number;
}
