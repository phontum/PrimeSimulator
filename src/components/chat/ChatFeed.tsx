import { useEffect, useRef } from "react";
import type { ChatMessage } from "../../types/chat";
import { ChatMessageRow } from "./ChatMessageRow";
import { useGameplayStore } from "../../state/gameplayStore";

export function ChatFeed({ messages }: { messages: ChatMessage[] }): JSX.Element {
  const containerRef = useRef<HTMLDivElement | null>(null);
  const escapedMessageIdsRef = useRef<Set<string>>(new Set());
  const { penalizeEscapedMessage } = useGameplayStore();

  useEffect(() => {
    const node = containerRef.current;
    if (node) {
      node.scrollTop = node.scrollHeight;
    }
  }, [messages]);

  useEffect(() => {
    const frameId = window.requestAnimationFrame(() => {
      const node = containerRef.current;
      if (!node) {
        return;
      }

      const containerTop = node.getBoundingClientRect().top;
      for (const message of messages) {
        if (message.source === "system" || escapedMessageIdsRef.current.has(message.id)) {
          continue;
        }

        const row = node.querySelector<HTMLElement>(`[data-message-id="${CSS.escape(message.id)}"]`);
        if (row && row.getBoundingClientRect().bottom < containerTop) {
          escapedMessageIdsRef.current.add(message.id);
          penalizeEscapedMessage(message);
        }
      }
    });

    return () => window.cancelAnimationFrame(frameId);
  }, [messages, penalizeEscapedMessage]);

  return (
    <div
      ref={containerRef}
      className="chat-list--other h-full overflow-y-auto bg-[#18181b] py-1"
    >
      {messages.length === 0 ? (
        <div className="flex h-full items-center justify-center px-6 text-center text-[13px] text-[#adadb8]">
          Ждём чат. Сообщения должны появиться через несколько секунд.
        </div>
      ) : (
        messages.map((message) => <ChatMessageRow key={message.id} message={message} />)
      )}
    </div>
  );
}
