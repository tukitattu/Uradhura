import { useState } from "react";
import { BetDock } from "./BetDock";
import { GameShell } from "./GameShell";
import type { GameConfig, GameRound, WalletSnapshot } from "../types/platform";

export function GreedyMonkey({ config, round, wallet, onBack }: { config: GameConfig; round: GameRound | null; wallet?: WalletSnapshot; onBack: () => void }) {
  const [selected, setSelected] = useState(config.options[0]);
  const [amount, setAmount] = useState(config.denominations[0] ?? config.minBet);
  const closed = round?.state !== "BETTING_OPEN";

  return (
    <GameShell config={config} round={round} wallet={wallet} onBack={onBack}>
      <div className="character-halo">
        {config.characterUrl ? <img src={config.characterUrl} alt={config.characterName ?? config.name} /> : <div className="asset-placeholder">CHARACTER</div>}
      </div>
      <div className="character-name">{config.characterName ?? "Game Character"}</div>

      <div className="radial-board">
        {config.options.map((option, index) => {
          const angle = (index / Math.max(config.options.length, 1)) * Math.PI * 2 - Math.PI / 2;
          const x = 50 + Math.cos(angle) * 37;
          const y = 50 + Math.sin(angle) * 37;
          return (
            <button
              key={option.id}
              className={`option-orb ${selected?.id === option.id ? "selected" : ""}`}
              style={{ left: `${x}%`, top: `${y}%` }}
              onClick={() => !closed && setSelected(option)}
              disabled={closed}
            >
              <span className="option-art">
                <img src={option.imageUrl} alt="" />
              </span>
              <strong>{option.name}</strong>
              {option.multiplier != null && <small>x{option.multiplier}</small>}
              {option.hot && <em>HOT</em>}
            </button>
          );
        })}
        <div className="center-core">
          <span>GREEDY</span>
          <strong>{round?.state === "RESULT_PROCESSING" ? "RESULT" : "BET"}</strong>
        </div>
      </div>

      <BetDock config={config} selected={selected} amount={amount} onSelect={setSelected} onAmount={setAmount} disabled={closed} />
    </GameShell>
  );
}