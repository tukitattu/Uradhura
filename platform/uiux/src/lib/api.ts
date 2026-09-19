import type { GameConfig, GameRound, PlatformState, WalletSnapshot } from "../types/platform";

/**
 * Real-data adapter.
 * Replace these functions with your API/SDK implementation.
 *
 * This file intentionally contains NO mock/seed/demo records.
 */
export interface PlatformApi {
  getPlatformState(): Promise<PlatformState>;
  getGameConfig(gameId: string): Promise<GameConfig>;
  getCurrentRound(gameId: string): Promise<GameRound | null>;
  placeBet(input: {
    gameId: string;
    roundId: string;
    optionId: string;
    amount: number;
    idempotencyKey: string;
  }): Promise<{ betId: string; wallet: WalletSnapshot }>;
}

export const api: PlatformApi = {
  async getPlatformState() {
    throw new Error("API_NOT_CONFIGURED");
  },
  async getGameConfig() {
    throw new Error("API_NOT_CONFIGURED");
  },
  async getCurrentRound() {
    throw new Error("API_NOT_CONFIGURED");
  },
  async placeBet() {
    throw new Error("API_NOT_CONFIGURED");
  }
};