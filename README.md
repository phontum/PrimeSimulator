# Prime Simulator
Доступен live по адресу: [https://primesimulator.web.app/](https://primesimulator.web.app/)

Prime Simulator — это симулятор модерации Twitch чата, созданный на React, TypeScript и Vite. Приложение подключается к Twitch-каналу, смешивает активный чат игрока с логами прошедшего чата и превращает решения модерации в игру про рост аудитории.

## Фишки

* Интерфейс в стиле Twitch с воспроизведением логов существовавшего (Smokerge) чата.
* Опциональная настоящая Twitch модерация через OAuth.
* Очки и прогрессия.
* Загрузка third-party emotes и inline link previews.
* Конфигурация Firebase Hosting.

## Getting Started

Установить зависимости:

```bash
npm install
```

Запустить local dev server:

```bash
npm run dev
```

Собрать production билд:

```bash
npm run build
```

## Twitch OAuth

Настоящая Twitch модерация опциональна. Чтобы включить её, создай файл `.env.local` и укажи:

```env
VITE_TWITCH_CLIENT_ID=your_twitch_client_id
```

Приложение запрашивает следующие разрешения: `chat:read`, `chat:edit` и `moderator:manage:banned_users`.

## Replay Logs

Сообщения из логов загружаются из:

```text
public/replay-logs/active-log.txt
```

Маркер активного чата канала настраивается в:

```text
src/config/replayConfig.ts
```

## Deployment

Проект включает `firebase.json` для Firebase Hosting. Настроенный predeploy step запускает:

```bash
npm run build
```
