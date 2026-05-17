import { useEffect } from "react";
import { activityFeedConfig, followNamePool, raidChannelNames } from "../../config/activityFeedConfig";
import { useChatStore } from "../../state/chatStore";
import type { ActivityFeedEvent, ActivityFeedEventType } from "../../types/activity";
import { createId } from "../../utils/id";
import { randomDelayMs, randomInt } from "../../utils/random";

export function ActivityFeedPanel(): JSX.Element {
  const { activityEvents, addActivityEvent } = useChatStore();
  const visibleEvents = uniqueActivityEvents(activityEvents);

  useEffect(() => {
    let stopped = false;
    let timeoutId: number | undefined;

    const scheduleNext = (): void => {
      timeoutId = window.setTimeout(() => {
        if (stopped) {
          return;
        }
        addActivityEvent(createSyntheticActivityEvent());
        scheduleNext();
      }, randomDelayMs(activityFeedConfig.minEventDelayMs, activityFeedConfig.maxEventDelayMs));
    };

    scheduleNext();
    return () => {
      stopped = true;
      if (timeoutId) {
        window.clearTimeout(timeoutId);
      }
    };
  }, [addActivityEvent]);

  return (
    <div className="self-start overflow-hidden rounded-md border border-[#2f2f35] bg-[#18181b]">
      <div className="flex h-11 items-center justify-between border-b border-[#2f2f35] px-4">
        <h3 className="text-sm font-bold text-[#efeff1]">Лента активности</h3>
        <span className="text-xs text-[#adadb8]">Недавние события</span>
      </div>
      <div className="activity-feed-list h-[18rem] overflow-y-auto py-1">
        {visibleEvents.length > 0 ? visibleEvents.map((event) => (
          <ActivityFeedRow key={event.id} event={event} />
        )) : (
          <p className="px-4 py-3 text-sm text-[#adadb8]">Недавней активности пока нет.</p>
        )}
      </div>
    </div>
  );
}

function uniqueActivityEvents(events: ActivityFeedEvent[]): ActivityFeedEvent[] {
  const seen = new Set<string>();
  const unique: ActivityFeedEvent[] = [];
  for (const event of events) {
    const key = event.username.trim().toLowerCase();
    if (seen.has(key)) {
      continue;
    }
    seen.add(key);
    unique.push(event);
  }
  return unique;
}

function ActivityFeedRow({ event }: { event: ActivityFeedEvent }): JSX.Element {
  return (
    <div className="flex items-start gap-3 px-4 py-2 text-sm hover:bg-white/[0.04]">
      <ActivityIcon type={event.type} />
      <div className="min-w-0 flex-1">
        <p className="leading-5 text-[#efeff1]">
          <span className="font-semibold">{event.username}</span>
          {" "}
          <span className="text-[#adadb8]">{activityText(event)}</span>
        </p>
        <p className="text-xs text-[#adadb8]">{formatActivityTime(event.timestamp)}</p>
      </div>
    </div>
  );
}

function ActivityIcon({ type }: { type: ActivityFeedEventType }): JSX.Element {
  const label = type === "follow" ? "F" : type === "raid" ? "R" : type === "ban" ? "B" : "U";
  const tone = type === "follow"
    ? "bg-[#00ad96] text-black"
    : type === "raid"
      ? "bg-[#9147ff] text-white"
      : type === "ban"
        ? "bg-[#eb0400] text-white"
        : "bg-[#53535f] text-white";

  return (
    <span className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded text-xs font-black ${tone}`}>
      {label}
    </span>
  );
}

function activityText(event: ActivityFeedEvent): string {
  if (event.type === "follow") {
    return "подписался на канал";
  }
  if (event.type === "raid") {
    return `устроил рейд на ${event.viewerCount ?? 1} зрителей`;
  }
  if (event.type === "unban") {
    return "был разбанен";
  }
  return "был забанен";
}

function createSyntheticActivityEvent(): ActivityFeedEvent {
  const isRaid = Math.random() < activityFeedConfig.raidChance;
  if (isRaid) {
    return {
      id: createId("activity"),
      type: "raid",
      username: pickRandom(raidChannelNames),
      timestamp: Date.now(),
      viewerCount: randomInt(activityFeedConfig.minRaidViewers, activityFeedConfig.maxRaidViewers),
    };
  }

  return {
    id: createId("activity"),
    type: "follow",
    username: pickRandom(followNamePool),
    timestamp: Date.now(),
  };
}

function pickRandom(values: string[]): string {
  return values[randomInt(0, values.length - 1)] ?? "неизвестно";
}

function formatActivityTime(timestamp: number): string {
  const secondsAgo = Math.max(0, Math.floor((Date.now() - timestamp) / 1000));
  if (secondsAgo < 5) {
    return "только что";
  }
  if (secondsAgo < 60) {
    return `${secondsAgo} с назад`;
  }
  return `${Math.floor(secondsAgo / 60)} мин назад`;
}
