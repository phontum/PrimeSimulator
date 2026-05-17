**Prime Simulator**
Доступен live по адресу: [https://primesimulator.web.app/](https://primesimulator.web.app/)

Prime Simulator — это Twitch chat moderation simulator, созданный на React, TypeScript и Vite. Приложение подключается к Twitch-каналу, смешивает live chat с replay logs и превращает moderation decisions в игру про рост аудитории.

## Features

* Twitch-style chat UI с воспроизведением replay log.
* Опциональная настоящая Twitch moderation через OAuth.
* Rule-based ban scoring и daily progression.
* Whitelist protection для chat и bot moderation targets.
* Загрузка third-party emotes и inline link previews.
* Конфигурация Firebase Hosting.

## Getting Started

Установить dependencies:

```bash
npm install
```

Запустить local dev server:

```bash
npm run dev
```

Собрать production build:

```bash
npm run build
```

## Twitch OAuth

Настоящая Twitch moderation опциональна. Чтобы включить её, создай файл `.env.local` и укажи:

```env
VITE_TWITCH_CLIENT_ID=your_twitch_client_id
```

Приложение запрашивает scopes: `chat:read`, `chat:edit` и `moderator:manage:banned_users`.

## Replay Logs

Replay messages загружаются из:

```text
public/replay-logs/active-log.txt
```

Маркер активного replay channel настраивается в:

```text
src/config/replayConfig.ts
```

## Deployment

Проект включает `firebase.json` для Firebase Hosting. Настроенный predeploy step запускает:

```bash
npm run build
```
