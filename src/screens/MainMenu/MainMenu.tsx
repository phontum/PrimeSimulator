import { useEffect, useState } from "react";
import { Button } from "../../components/ui/Button";
import { TextInput } from "../../components/ui/TextInput";
import { normalizeChannelName, useGameStore } from "../../state/gameStore";
import {
  beginTwitchOAuth,
  clearStoredTwitchSession,
  consumeOAuthRedirect,
  getRequiredTwitchScopes,
  getTwitchClientId,
  getTwitchRedirectUri,
  readStoredTwitchSession,
} from "../../services/twitch/twitchAuth";

export function MainMenu(): JSX.Element {
  const { goToChat, realTwitchModeration, setRealTwitchModeration, twitchSession, setTwitchSession } = useGameStore();
  const [value, setValue] = useState("");
  const [authError, setAuthError] = useState("");
  const normalized = normalizeChannelName(value);
  const twitchClientId = getTwitchClientId();
  const twitchRedirectUri = getTwitchRedirectUri();
  const canUseRealModeration = Boolean(twitchClientId && twitchSession);

  useEffect(() => {
    const storedSession = readStoredTwitchSession();
    if (storedSession) {
      setTwitchSession(storedSession);
    }

    void consumeOAuthRedirect().then((result) => {
      if (!result) {
        return;
      }
      setTwitchSession(result.session);
      setRealTwitchModeration(true);
      if (result.channel) {
        setValue(result.channel);
      }
    }).catch((error) => {
      setAuthError(String(error));
    });
  }, [setRealTwitchModeration, setTwitchSession]);

  return (
    <main className="flex min-h-screen items-center justify-center px-4">
      <form
        className="w-full max-w-md rounded-lg border border-zinc-800 bg-zinc-950/80 p-6 shadow-2xl backdrop-blur"
        onSubmit={(event) => {
          event.preventDefault();
          goToChat(value, realTwitchModeration && canUseRealModeration);
        }}
      >
        <div className="mb-6">
          <p className="mb-2 text-xs font-semibold uppercase tracking-[0.25em] text-violet-300">Симулятор Прайма</p>
          <h1 className="text-3xl font-black tracking-normal text-white">Smokerge</h1>
        </div>

        <label className="mb-2 block text-sm font-semibold text-zinc-200" htmlFor="channel">
          Введите Twitch канал для подключения:
        </label>
        <TextInput
          id="channel"
          value={value}
          onChange={(event) => setValue(event.target.value)}
          placeholder="forsen или #channel"
          autoComplete="off"
          className="w-full"
        />
        <div className="mt-2 min-h-5 text-xs text-zinc-500">
          {normalized ? `Подключимся к #${normalized}` : "Анонимный вход в IRC. Для реальных банов Twitch нужен OAuth."}
        </div>
        <div className="mt-4 rounded-md border border-zinc-800 bg-zinc-900/60 p-3">
          <label className="flex items-start gap-3 text-sm text-zinc-200">
            <input
              type="checkbox"
              className="mt-1 h-4 w-4 accent-violet-500"
              checked={realTwitchModeration}
              onChange={(event) => setRealTwitchModeration(event.target.checked)}
            />
            <span>
              <span className="block font-semibold">Реальная модерация Twitch</span>
              <span className="mt-1 block text-xs leading-5 text-zinc-400">
                Использует Twitch OAuth и отправляет реальные баны/разбаны в выбранный канал.
              </span>
            </span>
          </label>
          {realTwitchModeration ? (
            <div className="mt-3 space-y-2 text-xs text-zinc-400">
              {twitchClientId ? null : (
                <p className="text-red-300">Укажи VITE_TWITCH_CLIENT_ID перед авторизацией.</p>
              )}
              {twitchSession ? (
                <div className="flex items-center justify-between gap-3">
                  <span className="min-w-0 truncate text-emerald-300">Авторизован как {twitchSession.login}</span>
                  <button
                    type="button"
                    className="shrink-0 text-zinc-300 underline hover:text-white"
                    onClick={() => {
                      clearStoredTwitchSession();
                      setTwitchSession(null);
                    }}
                  >
                    Выйти
                  </button>
                </div>
              ) : (
                <Button
                  type="button"
                  className="w-full"
                  disabled={!twitchClientId || !normalized}
                  onClick={() => {
                    try {
                      beginTwitchOAuth(normalized);
                    } catch (error) {
                      setAuthError(String(error));
                    }
                  }}
                >
                  Авторизоваться через Twitch
                </Button>
              )}
              <p>Права доступа: {getRequiredTwitchScopes().join(", ")}</p>
              <p>URI перенаправления: {twitchRedirectUri}</p>
              {authError ? <p className="text-red-300">{authError}</p> : null}
            </div>
          ) : null}
        </div>
        <Button className="mt-5 w-full" disabled={!normalized}>
          Начать
        </Button>
      </form>
    </main>
  );
}
