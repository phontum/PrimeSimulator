import type { ChatMessage } from "../../types/chat";
import { colorForUsername } from "../../utils/color";
import { createId } from "../../utils/id";
import { randomDelayMs } from "../../utils/random";
import { shuffle } from "../../utils/shuffle";
import { parseReplayLog } from "./replayLogParser";

interface ReplayChatPlayerOptions {
  logUrl?: string;
  replayChannelMarker?: string;
  minDelayMs?: number;
  maxDelayMs?: number;
  loop?: boolean;
  randomOrder?: boolean;
  onMessage: (message: ChatMessage) => void;
  onSystemMessage?: (text: string) => void;
}

export class ReplayChatPlayer {
  private messages: ChatMessage[] = [];
  private queue: ChatMessage[] = [];
  private timer: number | null = null;
  private running = false;

  constructor(private readonly options: ReplayChatPlayerOptions) {}

  async start(): Promise<void> {
    this.stop();
    this.running = true;

    try {
      const response = await fetch(this.options.logUrl ?? "/logs/sample-chat.txt");
      if (!response.ok) {
        throw new Error(`HTTP ${response.status}`);
      }

      this.messages = parseReplayLog(await response.text(), {
        channelMarker: this.options.replayChannelMarker,
      });
      this.queue = this.nextQueue();

      if (this.messages.length === 0) {
        this.options.onSystemMessage?.("Replay log is empty or invalid.");
        return;
      }

      this.options.onSystemMessage?.(`Replay log loaded: ${this.messages.length} messages.`);
      this.scheduleNext();
    } catch (error) {
      this.options.onSystemMessage?.(`Replay log failed to load: ${String(error)}`);
    }
  }

  stop(): void {
    this.running = false;
    if (this.timer !== null) {
      window.clearTimeout(this.timer);
      this.timer = null;
    }
    this.queue = [];
  }

  setDelayRange(minDelayMs: number, maxDelayMs: number): void {
    this.options.minDelayMs = minDelayMs;
    this.options.maxDelayMs = maxDelayMs;
  }

  private scheduleNext(): void {
    if (!this.running) {
      return;
    }

    const delay = randomDelayMs(this.options.minDelayMs ?? 100, this.options.maxDelayMs ?? 6000);
    this.timer = window.setTimeout(() => {
      const next = this.queue.shift();
      if (!next) {
        if (this.options.loop ?? true) {
          this.queue = this.nextQueue();
          this.scheduleNext();
        }
        return;
      }

      this.options.onMessage({
        ...next,
        id: createId("replay"),
        timestamp: Date.now(),
        color: next.color ?? colorForUsername(next.username),
      });
      this.scheduleNext();
    }, delay);
  }

  private nextQueue(): ChatMessage[] {
    return this.options.randomOrder ?? true ? shuffle(this.messages) : [...this.messages];
  }
}
