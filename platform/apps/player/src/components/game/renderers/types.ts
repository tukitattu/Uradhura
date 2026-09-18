import { Game, GameRound, GameOption, GameConfig, SeedState, BetTotals, RoundResultEvent } from '../../../lib/types';

export interface GameRendererProps {
  game: Game | null;
  round: GameRound | null;
  options: GameOption[];
  config: GameConfig | null;
  seed: SeedState | null;
  betTotals: BetTotals;
  lastResult: RoundResultEvent | null;
  serverTimeOffset: number;
  isConnected: boolean;
}