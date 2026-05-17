export const dayDurationsMs: Record<number, number> = {
  1: 5 * 60 * 1000,
  2: 10 * 60 * 1000,
  3: 15 * 60 * 1000,
};

export function getDayDurationMs(day: number): number {
  return dayDurationsMs[day] ?? dayDurationsMs[3];
}
