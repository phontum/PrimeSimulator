const palette = [
  "#f97316",
  "#22c55e",
  "#38bdf8",
  "#e879f9",
  "#facc15",
  "#fb7185",
  "#a3e635",
  "#60a5fa",
  "#c084fc",
  "#2dd4bf",
];

export function colorForUsername(username: string): string {
  let hash = 0;
  for (let i = 0; i < username.length; i += 1) {
    hash = (hash * 31 + username.charCodeAt(i)) >>> 0;
  }
  return palette[hash % palette.length];
}
