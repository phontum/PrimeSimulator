import type { TwitchOAuthSession } from "../../types/twitch";

interface TwitchUser {
  id: string;
  login: string;
}

interface TwitchUsersResponse {
  data: TwitchUser[];
}

export interface TwitchBanTarget {
  broadcasterId: string;
  userId: string;
}

export async function banTwitchUser(session: TwitchOAuthSession, broadcasterLogin: string, username: string): Promise<TwitchBanTarget> {
  const [broadcaster, target] = await Promise.all([
    resolveTwitchUser(session, broadcasterLogin),
    resolveTwitchUser(session, username),
  ]);

  const response = await fetch(
    `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${encodeURIComponent(broadcaster.id)}&moderator_id=${encodeURIComponent(session.userId)}`,
    {
      method: "POST",
      headers: twitchApiHeaders(session),
      body: JSON.stringify({ data: { user_id: target.id, reason: "Prime Simulator" } }),
    },
  );

  await assertTwitchResponse(response, `Ban ${username}`);
  return {
    broadcasterId: broadcaster.id,
    userId: target.id,
  };
}

export async function timeoutTwitchUser(session: TwitchOAuthSession, broadcasterLogin: string, username: string, durationSeconds: number): Promise<void> {
  const [broadcaster, target] = await Promise.all([
    resolveTwitchUser(session, broadcasterLogin),
    resolveTwitchUser(session, username),
  ]);

  const response = await fetch(
    `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${encodeURIComponent(broadcaster.id)}&moderator_id=${encodeURIComponent(session.userId)}`,
    {
      method: "POST",
      headers: twitchApiHeaders(session),
      body: JSON.stringify({
        data: {
          user_id: target.id,
          duration: durationSeconds,
          reason: "Prime Simulator",
        },
      }),
    },
  );

  await assertTwitchResponse(response, `Timeout ${username}`);
}

export async function unbanTwitchUser(session: TwitchOAuthSession, broadcasterLogin: string, username: string): Promise<void> {
  const [broadcaster, target] = await Promise.all([
    resolveTwitchUser(session, broadcasterLogin),
    resolveTwitchUser(session, username),
  ]);

  const response = await fetch(
    `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${encodeURIComponent(broadcaster.id)}&moderator_id=${encodeURIComponent(session.userId)}&user_id=${encodeURIComponent(target.id)}`,
    {
      method: "DELETE",
      headers: twitchApiHeaders(session),
    },
  );

  await assertTwitchResponse(response, `Unban ${username}`);
}

export function unbanTwitchUserByIdKeepalive(session: TwitchOAuthSession, broadcasterId: string, userId: string): void {
  void fetch(
    `https://api.twitch.tv/helix/moderation/bans?broadcaster_id=${encodeURIComponent(broadcasterId)}&moderator_id=${encodeURIComponent(session.userId)}&user_id=${encodeURIComponent(userId)}`,
    {
      method: "DELETE",
      headers: twitchApiHeaders(session),
      keepalive: true,
    },
  ).catch(() => undefined);
}

async function resolveTwitchUser(session: TwitchOAuthSession, login: string): Promise<TwitchUser> {
  const response = await fetch(`https://api.twitch.tv/helix/users?login=${encodeURIComponent(login.trim().toLowerCase())}`, {
    headers: twitchApiHeaders(session),
  });
  await assertTwitchResponse(response, `Resolve Twitch user ${login}`);

  const payload = await response.json() as TwitchUsersResponse;
  const user = payload.data[0];
  if (!user) {
    throw new Error(`Twitch user not found: ${login}`);
  }
  return user;
}

function twitchApiHeaders(session: TwitchOAuthSession): HeadersInit {
  return {
    Authorization: `Bearer ${session.accessToken}`,
    "Client-Id": getClientIdFromEnv(),
    "Content-Type": "application/json",
  };
}

function getClientIdFromEnv(): string {
  return String(import.meta.env.VITE_TWITCH_CLIENT_ID ?? "").trim();
}

async function assertTwitchResponse(response: Response, action: string): Promise<void> {
  if (response.ok) {
    return;
  }

  let detail = "";
  try {
    const payload = await response.json() as { message?: string };
    detail = payload.message ? `: ${payload.message}` : "";
  } catch {
    detail = "";
  }
  throw new Error(`${action} failed (${response.status})${detail}`);
}
