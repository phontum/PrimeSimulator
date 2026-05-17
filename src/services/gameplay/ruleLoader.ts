import type { ChatRuleSet } from "../../types/gameplay";

export async function loadRuleSet(day: number): Promise<ChatRuleSet> {
  const response = await fetch(`/game-rules/day-${day}.json`);
  if (!response.ok) {
    throw new Error(`Rules for day ${day} failed with HTTP ${response.status}`);
  }
  return response.json() as Promise<ChatRuleSet>;
}
