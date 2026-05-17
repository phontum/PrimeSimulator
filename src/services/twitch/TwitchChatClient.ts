import type { ChatMessage } from "../../types/chat";
import type { TwitchChatAuth, TwitchConnectionStatus } from "../../types/twitch";
import { ircPrivmsgToChatMessage, parseIrcLine } from "./ircParser";

interface TwitchChatClientOptions {
  onMessage: (message: ChatMessage) => void;
  onStatus: (status: TwitchConnectionStatus) => void;
  onSystemMessage?: (text: string) => void;
}

export class TwitchChatClient {
  private socket: WebSocket | null = null;
  private channel = "";
  private auth: TwitchChatAuth | null = null;

  constructor(private readonly options: TwitchChatClientOptions) {}

  connect(channel: string, auth?: TwitchChatAuth): void {
    this.disconnect();
    this.channel = channel;
    this.auth = auth ?? null;
    this.options.onStatus("connecting");

    try {
      this.socket = new WebSocket("wss://irc-ws.chat.twitch.tv:443");
    } catch (error) {
      this.options.onStatus("error");
      this.options.onSystemMessage?.(`Twitch WebSocket error: ${String(error)}`);
      return;
    }

    this.socket.addEventListener("open", this.handleOpen);
    this.socket.addEventListener("message", this.handleMessage);
    this.socket.addEventListener("close", this.handleClose);
    this.socket.addEventListener("error", this.handleError);
  }

  disconnect(): void {
    if (!this.socket) {
      return;
    }

    this.socket.removeEventListener("open", this.handleOpen);
    this.socket.removeEventListener("message", this.handleMessage);
    this.socket.removeEventListener("close", this.handleClose);
    this.socket.removeEventListener("error", this.handleError);
    this.socket.close();
    this.socket = null;
    this.options.onStatus("disconnected");
  }

  private readonly handleOpen = (): void => {
    const nick = this.auth?.login ?? `justinfan${Math.floor(Math.random() * 100000)}`;
    this.send(this.auth ? `PASS oauth:${this.auth.accessToken}` : "PASS SCHMOOPIIE");
    this.send(`NICK ${nick}`);
    this.send("CAP REQ :twitch.tv/tags twitch.tv/commands");
    this.send(`JOIN #${this.channel}`);
    this.options.onStatus("connected");
    this.options.onSystemMessage?.(`Connected to #${this.channel} as ${nick}`);
  };

  private readonly handleMessage = (event: MessageEvent<string>): void => {
    const lines = event.data.split(/\r?\n/).filter(Boolean);

    for (const line of lines) {
      if (line.startsWith("PING")) {
        this.send(line.replace("PING", "PONG"));
        continue;
      }

      const parsed = parseIrcLine(line);
      const chatMessage = ircPrivmsgToChatMessage(parsed);
      if (chatMessage) {
        this.options.onMessage(chatMessage);
      }
    }
  };

  private readonly handleClose = (): void => {
    this.socket = null;
    this.options.onStatus("disconnected");
  };

  private readonly handleError = (): void => {
    this.options.onStatus("error");
    this.options.onSystemMessage?.("Twitch WebSocket connection failed.");
  };

  private send(command: string): void {
    if (this.socket?.readyState === WebSocket.OPEN) {
      this.socket.send(command);
    }
  }
}
