import { useState } from "react";
import { BetDock } from "./BetDock";
import { GameShell } from "./GameShell";
import type { GameConfig, GameRound, WalletSnapshot } from "../types/platform";

export function TeenPatti({ config, round, wallet, onBack }: { config: GameConfig; round: GameRound | null; wallet?: WalletSnapshot; onBack: () => void }) {
  const [selected, setSelected] = useState(config.options[0]);
  const [amount, setAmount] = useState(config.denominations[0] ?? config.minBet);
  const closed = round?.state !== "BETTING_OPEN";

  return (
    <GameShell config={config} round={round} wallet={wallet} onBack={onBack}>
      <div className="patti-table">
        <div className="table-glow" />
        {["A", "B", "C"].map((seat, index) => (
          <div key={seat} className={`player-seat seat-${index + 1}`}>
            <div className="player-avatar">{seat}</div>
            <strong>Player {seat}</strong>
            <span>Pot —</span>
          </div>
        ))}

        <div className="cards-center">
          {[0, 1, 2].map((n) => (
            <div className={`playing-card ${round?.state === "RESULT_PROCESSING" ? "revealed" : ""}`} key={n}>
              <span>{round?.state === "RESULT_PROCESSING" ? "?" : "◆"}</span>
            </div>
          ))}
        </div>

        <div className="guessing">
          <span>GUESSING</span>
          <strong>{round?.state === "BETTING_OPEN" ? "YOUR TURN" : round?.state?.replaceAll("_", " ") ?? "—"}</strong>
        </div>
      </div>

      <BetDock config={config} selected={selected} amount={amount} onSelect={setSelected} onAmount={setAmount} disabled={closed} />
    </GameShell>
  );
}