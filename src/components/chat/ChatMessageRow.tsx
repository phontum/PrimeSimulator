import { colorForUsername } from "../../utils/color";
import type { ChatMessage } from "../../types/chat";
import { ChatMessageContent } from "./ChatMessageContent";
import { findLinkPreviews } from "../../services/chat/linkPreviews";
import { LinkPreviews } from "./LinkPreviews";
import { useChatStore } from "../../state/chatStore";
import { useGameplayStore } from "../../state/gameplayStore";

export function ChatMessageRow({ message }: { message: ChatMessage }): JSX.Element {
  const { bannedUsers, deletedMessageIds, revealedDeletedMessageIds, banUser, deleteMessage, unbanUser, toggleDeletedMessage } = useChatStore();
  const { day } = useGameplayStore();

  if (message.source === "system") {
    return (
      <div className="chat-line__status px-4 py-1 text-[13px] italic text-[#adadb8]">
        {message.text}
      </div>
    );
  }

  const usernameColor = message.color || colorForUsername(message.username);
  const previews = findLinkPreviews(message.text);
  const isBanned = bannedUsers.has(message.username.trim().toLowerCase());
  const isDeleted = deletedMessageIds.has(message.id);
  const isRevealed = revealedDeletedMessageIds.has(message.id);
  const deletesOnly = day === 1;

  return (
    <div className={`chat-line__message group px-4 py-[0.3rem] hover:bg-white/[0.04] ${isDeleted ? "chat-line__message--deleted" : ""}`} data-message-id={message.id} data-room={message.source}>
      <div className="chat-line__message-container relative">
        <button
          className="mod-icon ffz-mod-icon ban-button mr-1 align-middle text-[#adadb8] transition hover:text-[#efeff1]"
          data-tooltip-type="action"
          data-action={deletesOnly ? "delete" : isBanned ? "unban" : "ban"}
          data-options="{}"
          aria-label={`${deletesOnly ? "Удалить сообщение от" : isBanned ? "Разбанить" : "Забанить"} ${message.displayName || message.username}`}
          type="button"
          onClick={() => {
            if (deletesOnly) {
              deleteMessage(message);
            } else if (isBanned) {
              unbanUser(message.username);
            } else {
              banUser(message.username, message);
            }
          }}
        >
          <span aria-hidden="true" className="ffz-i-block">{deletesOnly ? <TrashIcon /> : isBanned ? "✓" : "⊘"}</span>
        </button>
        <span className="chat-line__username notranslate mr-1 cursor-pointer text-[13px] font-bold leading-5" style={{ color: usernameColor }}>
          <span className="chat-author__display-name">{message.displayName || message.username}</span>
        </span>
        <span aria-hidden="true" className="mr-1 text-[13px] text-[#efeff1]">: </span>
        <span className="message">
          {isDeleted && !isRevealed ? (
            <button
              className="deleted-message-link text-[13px] leading-5 text-[#bf94ff] hover:underline"
              type="button"
              onClick={() => toggleDeletedMessage(message.id)}
            >
              &lt;сообщение удалено&gt;
            </button>
          ) : (
            <span className={isDeleted ? "text-[#adadb8]" : ""}>
              <ChatMessageContent message={message} muted={isDeleted} />
            </span>
          )}
        </span>
        {!isDeleted || isRevealed ? <LinkPreviews previews={previews} /> : null}
      </div>
    </div>
  );
}

function TrashIcon(): JSX.Element {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M8 3h8l1 2h5v2H2V5h5l1-2Zm1 6h2v10H9V9Zm4 0h2v10h-2V9Z" />
      <path fill="currentColor" d="M5 9h2l1 12h8l1-12h2l-1.167 14H6.167L5 9Z" />
    </svg>
  );
}
