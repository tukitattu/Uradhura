import { Sparkles } from "lucide-react";

export function EmptyState({ title, message }: { title: string; message: string }) {
  return (
    <div className="empty-state">
      <div className="empty-icon"><Sparkles size={28} /></div>
      <h3>{title}</h3>
      <p>{message}</p>
    </div>
  );
}