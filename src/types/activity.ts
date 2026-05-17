export type ActivityFeedEventType = "follow" | "ban" | "unban" | "raid";

export interface ActivityFeedEvent {
  id: string;
  type: ActivityFeedEventType;
  username: string;
  timestamp: number;
  viewerCount?: number;
}
