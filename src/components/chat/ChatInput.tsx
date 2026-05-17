import { useCallback, useEffect, useRef, useState } from "react";
import { useChatStore } from "../../state/chatStore";
import { useGameplayStore } from "../../state/gameplayStore";

export function ChatInput(): JSX.Element {
  const editorRef = useRef<HTMLDivElement | null>(null);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [shieldHintOpen, setShieldHintOpen] = useState(false);
  const { banUser, unbanUser, banSoundVolume, setBanSoundVolume } = useChatStore();
  const { day } = useGameplayStore();
  const shieldHint = buildShieldHint(day);

  const submitInput = useCallback((): void => {
    const editor = editorRef.current;
    const value = editor?.textContent?.trim() ?? "";
    if (!value) {
      return;
    }

    const handled = handleCommand(value, banUser, unbanUser);
    if (handled && editor) {
      editor.textContent = "";
    }
  }, [banUser, unbanUser]);

  useEffect(() => {
    const editor = editorRef.current;
    if (!editor) {
      return;
    }

    const handleNativeKeyDown = (event: KeyboardEvent): void => {
      if (event.key === "Enter" && !event.shiftKey) {
        event.preventDefault();
        submitInput();
      }
    };

    editor.addEventListener("keydown", handleNativeKeyDown);
    return () => editor.removeEventListener("keydown", handleNativeKeyDown);
  }, [submitInput]);

  return (
    <div className="chat-input relative border-t border-[#2f2f35] bg-[#18181b] px-4 pb-3 pt-2">
      {shieldHintOpen ? (
        <div className="absolute bottom-[4.8rem] left-4 right-4 z-20 rounded-md border border-[#3a3a40] bg-[#18181b] p-4 text-sm leading-6 text-[#efeff1] shadow-2xl">
          <div className="flex items-start justify-between gap-3">
            <div className="space-y-2">
              <p>{shieldHint.dayText}</p>
              <p className="text-[#adadb8]">{shieldHint.commandText}</p>
            </div>
            <button className="tw-icon-button h-7 w-7 shrink-0" aria-label="Закрыть подсказку" type="button" onClick={() => setShieldHintOpen(false)}>
              ×
            </button>
          </div>
        </div>
      ) : null}
      {settingsOpen ? (
        <div className="absolute bottom-[4.8rem] right-4 z-20 w-72 rounded-md border border-[#3a3a40] bg-[#18181b] p-4 shadow-2xl">
          <div className="flex items-center justify-between gap-3">
            <h2 className="text-sm font-bold text-[#efeff1]">Настройки чата</h2>
            <button className="tw-icon-button h-7 w-7" aria-label="Закрыть настройки чата" type="button" onClick={() => setSettingsOpen(false)}>
              ×
            </button>
          </div>
          <label className="mt-4 block text-xs font-semibold uppercase text-[#adadb8]" htmlFor="ban-sound-volume">
            Громкость звука бана
          </label>
          <div className="mt-2 flex items-center gap-3">
            <input
              id="ban-sound-volume"
              type="range"
              min="0"
              max="1"
              step="0.01"
              value={banSoundVolume}
              onChange={(event) => setBanSoundVolume(Number(event.target.value))}
              className="min-w-0 flex-1 accent-[#9147ff]"
            />
            <span className="w-10 text-right text-xs text-[#efeff1]">{Math.round(banSoundVolume * 100)}%</span>
          </div>
        </div>
      ) : null}
      <div className="chat-input__textarea relative min-h-10 rounded border border-[#3a3a40] bg-[#1f1f23] transition focus-within:border-[#9147ff] focus-within:ring-2 focus-within:ring-[#9147ff]/40">
        <button className="tw-input-icon-button absolute left-1 top-1" aria-label="Значки чата" type="button" onClick={() => setShieldHintOpen((current) => !current)}>
          <ShieldIcon />
        </button>
        <div
          ref={editorRef}
          role="textbox"
          aria-multiline="true"
          aria-label="Отправить сообщение"
          contentEditable
          suppressContentEditableWarning
          className="chat-wysiwyg-input__editor min-h-10 max-h-32 overflow-y-auto whitespace-pre-wrap break-words py-2 pl-[38px] pr-[70px] text-[13px] leading-5 text-[#efeff1] outline-none empty:before:pointer-events-none empty:before:text-[#adadb8] empty:before:content-[attr(data-placeholder)]"
          data-placeholder="Отправить сообщение"
          onKeyDown={(event) => {
            if (event.key === "Enter" && !event.shiftKey) {
              event.preventDefault();
              submitInput();
            }
          }}
        />
        <button className="tw-input-icon-button absolute right-9 top-1" aria-label="Поддержать битами" type="button">
          <BitsIcon />
        </button>
        <button className="tw-input-icon-button absolute right-1 top-1" aria-label="Выбор смайлов" type="button">
          <SmileIcon />
        </button>
      </div>
      <div className="mt-2 flex items-center justify-between">
        <button className="tw-points-button" aria-label="Баланс баллов" type="button">
          <PointsIcon />
          <span>&infin;</span>
        </button>
        <div className="flex items-center gap-1">
          <button className="tw-icon-button" aria-label="Включить режим щита" type="button" onClick={() => setShieldHintOpen((current) => !current)}>
            <ShieldIcon />
          </button>
          <button
            className="tw-icon-button"
            aria-label="Настройки чата"
            aria-expanded={settingsOpen}
            type="button"
            onClick={() => setSettingsOpen((current) => !current)}
          >
            <SettingsIcon />
          </button>
          <button className="tw-chat-button" aria-label="Отправить в чат" type="button" onClick={submitInput}>
            Чат
          </button>
        </div>
      </div>
    </div>
  );
}

function handleCommand(value: string, banUser: (username: string) => void, unbanUser: (username: string) => void): boolean {
  const banTarget = readCommandArgument(value, "/ban");
  if (banTarget) {
    banUser(banTarget);
    return true;
  }

  const unbanTarget = readCommandArgument(value, "/unban");
  if (unbanTarget) {
    unbanUser(unbanTarget);
    return true;
  }

  return false;
}

function readCommandArgument(value: string, command: "/ban" | "/unban"): string | null {
  if (!value.toLowerCase().startsWith(command)) {
    return null;
  }

  const rest = value.slice(command.length);
  if (!/^\s/.test(rest)) {
    return null;
  }

  const [username] = rest.trim().split(/\s+/);
  return username?.replace(/^@+/, "") || null;
}

function buildShieldHint(day: number): { dayText: string; commandText: string } {
  const dayText = day <= 1
    ? "Кто-то точно настроил твой собственный чат против тебя. Бань за любое упоминание канала Melharucos"
    : day === 2
      ? "Всё выходит из под контроля. Бань всех нарушителей!"
      : "ЭТО УЖЕ СЛИШКОМ. БАНЬ КАЖДОГО.";

  return {
    dayText,
    commandText: "Ты также можешь банить и разбанивать людей в чате с помощью команд /ban username и /unban username",
  };
}

function SmileIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 19a3 3 0 0 0 3-3H9a3 3 0 0 0 3 3Zm-6-6.5a1.5 1.5 0 1 1 3 0 1.5 1.5 0 0 1-3 0ZM16.5 11a1.5 1.5 0 1 0 0 3 1.5 1.5 0 0 0 0-3Z" />
      <path fill="currentColor" fillRule="evenodd" d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Zm11 9a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" clipRule="evenodd" />
    </svg>
  );
}

function BitsIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M13 9a1 1 0 0 0-1 1l7 7-14 5-3-3L7 5l3.438 3.438A2.998 2.998 0 0 1 13 7h2v2h-2Zm-5.18-.351-.725 2.03 3.762 7.106 2.572-.92-2.934-5.542L7.82 8.649Z" clipRule="evenodd" />
    </svg>
  );
}

function ShieldIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" fillRule="evenodd" d="M19.004 4.867C19.663 4.955 20.329 5 21 5l-.436 4.802a14 14 0 0 1-5.543 9.932L12 22l-3.021-2.266a14 14 0 0 1-5.542-9.932L3 5a15 15 0 0 0 9-3 15 15 0 0 0 7.004 2.867ZM13 10V5a17 17 0 0 0 5.823 1.86l-.251 2.76a12 12 0 0 1-4.751 8.514L13 18.75V10Zm-2 0V5a17.001 17.001 0 0 1-5.823 1.86l.251 2.76a12 12 0 0 0 4.751 8.514l.821.616V10Z" clipRule="evenodd" />
    </svg>
  );
}

function SettingsIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 10a2 2 0 1 0 0 4 2 2 0 0 0 0-4Z" />
      <path fill="currentColor" fillRule="evenodd" d="M10.9 1h2.2v.228a3.362 3.362 0 0 0 5.739 2.378L19 3.444l1.556 1.555-.161.162a3.362 3.362 0 0 0 2.377 5.739H23v2.2h-.228a3.362 3.362 0 0 0-2.377 5.74l.161.16L19 20.557l-.16-.161a3.362 3.362 0 0 0-5.74 2.377V23h-2.2v-.228a3.362 3.362 0 0 0-5.74-2.377l-.16.16L3.444 19l.161-.16a3.362 3.362 0 0 0-2.377-5.74H1v-2.2h.228a3.362 3.362 0 0 0 2.377-5.739L3.445 5 5 3.444l.161.161A3.362 3.362 0 0 0 10.9 1.228V1ZM4.929 12 7 17l5 2.07L17 17l2.071-5L17 7l-5-2.071-5 2.07-2.071 5Z" clipRule="evenodd" />
    </svg>
  );
}

function PointsIcon(): JSX.Element {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" aria-hidden="true">
      <path fill="currentColor" d="M12 5v2a5 5 0 0 1 5 5h2a7 7 0 0 0-7-7Z" />
      <path fill="currentColor" fillRule="evenodd" d="M1 12C1 5.925 5.925 1 12 1s11 4.925 11 11-4.925 11-11 11S1 18.075 1 12Zm11 9a9 9 0 1 1 0-18 9 9 0 0 1 0 18Z" clipRule="evenodd" />
    </svg>
  );
}
