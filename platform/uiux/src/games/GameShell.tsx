import { ChevronLeft, HelpCircle, History, Volume2, Wifi } from "lucide-react";
import type { GameConfig, GameRound, WalletSnapshot } from "../types/platform";

export function GameShell({
  config,
  round,
  wallet,
  children,
  onBack
}: {
  config: GameConfig;
  round: GameRound | null;
  wallet?: WalletSnapshot;
  children: React.ReactNode;
  onBack: () => void;
}) {
  const remaining = round?.bettingClosesAtMs
    ? Math.max(0, Math.ceil((round.bettingClosesAtMs - round.serverNowMs) / 1000))
    : null;

  return (
    <div className="game-screen" style={{ backgroundImage: `url(${config.backgroundUrl ?? "/assets/games/game-bg.svg"})` }}>
      <div className="game-vignette" />
      <header className="game-top">
        <button className="round-icon" onClick={onBack}><ChevronLeft /></button>
        <div>
          <span className="game-kicker">LIVE GAME</span>
          <h1>{config.name}</h1>
        </div>
        <div className="game-actions">
          <span className="live-connection"><Wifi size={15} /> Live</span>
          <button className="round-icon"><History size={18} /></button>
          <button className="round-icon"><HelpCircle size={18} /></button>
          <button className="round-icon"><Volume2 size={18} /></button>
        </div>
      </header>

      <div className="game-status">
        <span>Round {round?.roundId ?? "—"}</span>
        <strong>{round?.state?.replaceAll("_", " ") ?? "WAITING"}</strong>
        <b>{remaining != null ? `${remaining}s` : "—"}</b>
      </div>

      <main className="game-stage">{children}</main>

      <div className="game-wallet">
        <span>Coin</span><strong>{wallet ? wallet.coinBalance.toLocaleString() : "—"}</strong>
        <i />
        <span>Diamond</span><strong>{wallet ? wallet.diamondBalance.toLocaleString() : "—"}</strong>
      </div>
    </div>
  );
}