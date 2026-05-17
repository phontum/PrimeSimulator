# Prime Simulator

Available live at: https://primesimulator.web.app/
Prime Simulator is a Twitch chat moderation simulator built with React, TypeScript, and Vite. The app connects to a Twitch channel, mixes live chat with replay logs, and turns moderation decisions into a viewer-growth game.

## Features

- Twitch-style chat UI with replay log playback.
- Optional real Twitch moderation through OAuth.
- Rule-based ban scoring and daily progression.
- Whitelist protection for chat and bot moderation targets.
- Third-party emote loading and inline link previews.
- Firebase Hosting configuration.

## Getting Started

Install dependencies:

```bash
npm install
```

Run the local dev server:

```bash
npm run dev
```

Build for production:

```bash
npm run build
```

## Twitch OAuth

Real Twitch moderation is optional. To enable it, create a `.env.local` file and set:

```bash
VITE_TWITCH_CLIENT_ID=your_twitch_client_id
```

The app requests `chat:read`, `chat:edit`, and `moderator:manage:banned_users` scopes.

## Replay Logs

Replay messages are loaded from `public/replay-logs/active-log.txt`. The active replay channel marker is configured in `src/config/replayConfig.ts`.

## Deployment

The project includes `firebase.json` for Firebase Hosting. The configured predeploy step runs:

```bash
npm run build
```
