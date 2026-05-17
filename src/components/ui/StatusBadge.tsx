import type { TwitchConnectionStatus } from "../../types/twitch";

export function StatusBadge({ status }: { status: TwitchConnectionStatus }): JSX.Element {
  const styles: Record<TwitchConnectionStatus, string> = {
    connecting: "bg-amber-500/15 text-amber-200 ring-amber-400/30",
    connected: "bg-emerald-500/15 text-emerald-200 ring-emerald-400/30",
    disconnected: "bg-zinc-500/15 text-zinc-300 ring-zinc-400/20",
    error: "bg-red-500/15 text-red-200 ring-red-400/30",
  };

  const labels: Record<TwitchConnectionStatus, string> = {
    connecting: "подключение",
    connected: "подключено",
    disconnected: "отключено",
    error: "ошибка",
  };

  return (
    <span className={`rounded-full px-3 py-1 text-xs font-semibold uppercase tracking-wide ring-1 ${styles[status]}`}>
      {labels[status]}
    </span>
  );
}
