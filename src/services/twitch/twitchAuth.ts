import type { TwitchOAuthSession } from "../../types/twitch";

const storageKey = "prime-simulator:twitch-oauth-session";
const requiredScopes = ["chat:read", "chat:edit", "moderator:manage:banned_users"];

interface TwitchValidateResponse {
  client_id: string;
  login: string;
  scopes: string[];
  user_id: string;
  expires_in: number;
}

export function getTwitchClientId(): string {
  return String(import.meta.env.VITE_TWITCH_CLIENT_ID ?? "").trim();
}

export function getTwitchRedirectUri(): string {
  return String(import.meta.env.VITE_TWITCH_REDIRECT_URI ?? "").trim() || window.location.origin + window.location.pathname;
}

export function getRequiredTwitchScopes(): string[] {
  return requiredScopes;
}

export function beginTwitchOAuth(channel: string): void {
  const clientId = getTwitchClientId();
  if (!clientId) {
    throw new Error("VITE_TWITCH_CLIENT_ID is not configured.");
  }

  const params = new URLSearchParams({
    client_id: clientId,
    redirect_uri: getTwitchRedirectUri(),
    response_type: "token",
    scope: requiredScopes.join(" "),
    state: JSON.stringify({ channel }),
  });

  window.location.assign(`https://id.twitch.tv/oauth2/authorize?${params.toString()}`);
}

export function readStoredTwitchSession(): TwitchOAuthSession | null {
  const raw = window.localStorage.getItem(storageKey);
  if (!raw) {
    return null;
  }

  try {
    const session = JSON.parse(raw) as TwitchOAuthSession;
    if (!session.accessToken || !session.login || !session.userId || Date.now() >= session.expiresAt) {
      clearStoredTwitchSession();
      return null;
    }
    return session;
  } catch {
    clearStoredTwitchSession();
    return null;
  }
}

export function clearStoredTwitchSession(): void {
  window.localStorage.removeItem(storageKey);
}

export async function consumeOAuthRedirect(): Promise<{ session: TwitchOAuthSession; channel: string } | null> {
  const searchParams = new URLSearchParams(window.location.search);
  const oauthError = searchParams.get("error");
  if (oauthError) {
    const errorDescription = searchParams.get("error_description");
    window.history.replaceState(null, document.title, window.location.pathname);
    throw new Error(errorDescription ? `${oauthError}: ${errorDescription}` : oauthError);
  }

  const hash = window.location.hash.startsWith("#") ? window.location.hash.slice(1) : "";
  if (!hash) {
    return null;
  }

  const params = new URLSearchParams(hash);
  const accessToken = params.get("access_token");
  if (!accessToken) {
    return null;
  }

  const validateResponse = await fetch("https://id.twitch.tv/oauth2/validate", {
    headers: { Authorization: `OAuth ${accessToken}` },
  });
  if (!validateResponse.ok) {
    throw new Error(`Twitch OAuth validation failed: ${validateResponse.status}`);
  }

  const validated = await validateResponse.json() as TwitchValidateResponse;
  const missingScopes = requiredScopes.filter((scope) => !validated.scopes.includes(scope));
  if (missingScopes.length > 0) {
    throw new Error(`Missing Twitch OAuth scopes: ${missingScopes.join(", ")}`);
  }

  const session: TwitchOAuthSession = {
    accessToken,
    login: validated.login,
    userId: validated.user_id,
    scopes: validated.scopes,
    expiresAt: Date.now() + validated.expires_in * 1000,
  };
  window.localStorage.setItem(storageKey, JSON.stringify(session));
  window.history.replaceState(null, document.title, window.location.pathname + window.location.search);

  return { session, channel: readStateChannel(params.get("state")) };
}

function readStateChannel(state: string | null): string {
  if (!state) {
    return "";
  }

  try {
    const parsed = JSON.parse(state) as { channel?: unknown };
    return typeof parsed.channel === "string" ? parsed.channel : "";
  } catch {
    return "";
  }
}
