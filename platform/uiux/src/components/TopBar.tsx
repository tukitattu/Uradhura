import { Bell, Search, Sparkles } from "lucide-react";
import type { PlayerProfile } from "../types/platform";

export function TopBar({ player }: { player?: PlayerProfile }) {
  return (
    <header className="topbar">
      <div className="brand-mark">
        <div className="brand-orb"><Sparkles size={18} /></div>
        <div><strong>uradhura</strong><span>live gaming</span></div>
      </div>

      <label className="search-pill">
        <Search size={17} />
        <input placeholder="Search rooms, players or games" />
      </label>

      <button className="icon-btn" aria-label="Notifications"><Bell size={20} /></button>

      <button className="profile-mini">
        <div className="avatar">
          {player?.avatarUrl ? <img src={player.avatarUrl} alt="" /> : <span>U</span>}
        </div>
        <span>{player?.displayName ?? "Account"}</span>
      </button>
    </header>
  );
}