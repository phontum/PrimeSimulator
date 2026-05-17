import { useChatStore } from "../../state/chatStore";

export function FloatingScoreLayer(): JSX.Element {
  const { floatingScoreEvents } = useChatStore();

  return (
    <div className="pointer-events-none fixed inset-0 z-50 overflow-hidden">
      {floatingScoreEvents.map((event) => (
        <span
          key={event.id}
          className={[
            "floating-score-number",
            event.correct ? "floating-score-number--good" : "floating-score-number--bad",
          ].join(" ")}
          style={{ left: event.x, top: event.y }}
        >
          {event.value > 0 ? "+" : ""}{event.value}
        </span>
      ))}
    </div>
  );
}
