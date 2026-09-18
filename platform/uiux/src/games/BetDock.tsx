import { Check, Lock } from "lucide-react";
import type { GameConfig, GameOption } from "../types/platform";

export function BetDock({
  config,
  selected,
  amount,
  onSelect,
  onAmount,
  disabled
}: {
  config: GameConfig;
  selected?: GameOption;
  amount: number;
  onSelect: (option: GameOption) => void;
  onAmount: (amount: number) => void;
  disabled?: boolean;
}) {
  return (
    <section className="bet-dock">
      <div className="bet-summary">
        <div><span>Selected</span><strong>{selected?.name ?? "Choose an option"}</strong></div>
        <div><span>My Bet</span><strong>{amount.toLocaleString()}</strong></div>
      </div>

      <div className="denominations">
        {config.denominations.map((value) => (
          <button key={value} disabled={disabled} className={amount === value ? "chip active" : "chip"} onClick={() => onAmount(value)}>
            {value >= 1000 ? `${value / 1000}K` : value}
          </button>
        ))}
      </div>

      <button
        className="primary-bet"
        disabled={disabled || !selected || amount < config.minBet || amount > config.maxBet}
        title={disabled ? "Betting is closed" : undefined}
      >
        {disabled ? <><Lock size={17} /> Betting Closed</> : <><Check size={17} /> Place Bet</>}
      </button>
    </section>
  );
}