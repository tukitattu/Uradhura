import { Gamepad2, Home, MessageCircle, Radio, UsersRound, UserRound } from "lucide-react";

const items = [
  ["home", "Home", Home],
  ["live", "Live", Radio],
  ["party", "Party", UsersRound],
  ["games", "Games", Gamepad2],
  ["chat", "Chat", MessageCircle],
  ["profile", "Profile", UserRound],
] as const;

export function BottomNav({ active, onChange }: { active: string; onChange: (id: string) => void }) {
  return (
    <nav className="bottom-nav">
      {items.map(([id, label, Icon]) => (
        <button key={id} className={active === id ? "nav-item active" : "nav-item"} onClick={() => onChange(id)}>
          <Icon size={20} strokeWidth={active === id ? 2.7 : 2} />
          <span>{label}</span>
        </button>
      ))}
    </nav>
  );
}