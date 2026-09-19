import { useState } from "react";
import { BetDock } from "./BetDock";
import { GameShell } from "./GameShell";
import type { GameConfig, GameRound, WalletSnapshot } from "../types/platform";

export function GenericGame({ config, round, wallet, onBack }: { config: GameConfig; round: GameRound | null; wallet?: WalletSnapshot; onBack: () => void }) {
  const [selected, setSelected] = useState(config.options[0]);
  const [amount, setAmount] = useState(config.denominations[0] ?? config.minBet);
  const closed = round?.state !== "BETTING_OPEN";

  return (
    <GameShell config={config} round={round} wallet={wallet} onBack={onBack}>
      <div className="generic-game-art">
        {config.characterUrl ? <img src={config.characterUrl} alt="" /> : <div className="asset-placeholder">GAME ART</div>}
      </div>
      <div className="option-strip">
        {config.options.map((o) => (
          <button key={o.id} className={selected?.id === o.id ? "game-option active" : "game-option"} disabled={closed} onClick={() => setSelected(o)}>
            <img src={o.imageUrl} alt="" />
            <strong>{o.name}</strong>
            {o.multiplier != null && <small>x{o.multiplier}</small>}
          </button>
        ))}
      </div>
      <BetDock config={config} selected={selected} amount={amount} onSelect={setSelected} onAmount={setAmount} disabled={closed} />
    </GameShell>
  );
}