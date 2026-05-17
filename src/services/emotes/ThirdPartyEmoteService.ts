import type { ThirdPartyEmote, ThirdPartyEmoteOccurrence } from "../../types/chat";
import { findTokenEmotes } from "./emoteMatcher";
import {
  loadBttvChannel,
  loadBttvGlobal,
  loadFfzChannel,
  loadFfzGlobal,
  resolveTwitchUserId,
  loadSevenTvChannel,
  loadSevenTvGlobal,
} from "./emoteApi";

const providerPriority: Record<ThirdPartyEmote["provider"], number> = {
  "7tv": 3,
  bttv: 2,
  ffz: 1,
};

export class ThirdPartyEmoteService {
  private readonly emotes = new Map<string, ThirdPartyEmote>();

  get count(): number {
    return this.emotes.size;
  }

  async loadGlobalEmotes(): Promise<void> {
    const results = await Promise.allSettled([
      loadFfzGlobal(),
      loadBttvGlobal(),
      loadSevenTvGlobal(),
    ]);

    for (const result of results) {
      if (result.status === "fulfilled") {
        result.value.forEach((emote) => this.storeEmote(emote));
      }
    }
  }

  async loadChannelEmotes(twitchUserId: string): Promise<void> {
    const results = await Promise.allSettled([
      loadFfzChannel(twitchUserId),
      loadBttvChannel(twitchUserId),
      loadSevenTvChannel(twitchUserId),
    ]);

    for (const result of results) {
      if (result.status === "fulfilled") {
        result.value.forEach((emote) => this.storeEmote(emote));
      }
    }
  }

  async loadChannelEmotesByChannelName(channelName: string): Promise<boolean> {
    // TODO: Move channel resolving behind our own backend/Twitch API before production.
    const twitchUserId = await resolveTwitchUserId(channelName);
    if (!twitchUserId) {
      return false;
    }
    await this.loadChannelEmotes(twitchUserId);
    return true;
  }

  findEmotesInMessage(text: string): ThirdPartyEmoteOccurrence[] {
    return findTokenEmotes(text, this.emotes);
  }

  private storeEmote(emote: ThirdPartyEmote): void {
    const existing = this.emotes.get(emote.code);
    if (!existing) {
      this.emotes.set(emote.code, emote);
      return;
    }

    const emoteIsChannel = emote.scope === "channel";
    const existingIsGlobal = existing.scope !== "channel";
    const sameScopeHigherProvider = emote.scope === existing.scope && providerPriority[emote.provider] > providerPriority[existing.provider];

    if ((emoteIsChannel && existingIsGlobal) || sameScopeHigherProvider) {
      this.emotes.set(emote.code, emote);
    }
  }
}
