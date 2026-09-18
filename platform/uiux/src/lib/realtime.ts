import type { GameRound, WalletSnapshot } from "../types/platform";

export type RealtimeEvent =
  | { type: "ROUND_UPDATED"; payload: GameRound }
  | { type: "BALANCE_UPDATED"; payload: WalletSnapshot }
  | { type: "BET_ACCEPTED"; payload: { betId: string; roundId: string } }
  | { type: "BET_REJECTED"; payload: { reason: string } }
  | { type: "RESULT_DECLARED"; payload: { roundId: string; optionId: string } }
  | { type: "SETTLEMENT_COMPLETED"; payload: { roundId: string } };

export class GameRealtimeClient {
  private socket?: WebSocket;

  connect(url: string, onEvent: (event: RealtimeEvent) => void) {
    this.socket = new WebSocket(url);
    this.socket.onmessage = (message) => {
      try {
        onEvent(JSON.parse(message.data) as RealtimeEvent);
      } catch {
        // Ignore malformed events; production app should report telemetry.
      }
    };
    return () => this.socket?.close();
  }
}