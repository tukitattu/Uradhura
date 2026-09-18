import { useEffect, useState } from "react";
import { Gamepad2, Radio, Sparkles } from "lucide-react";
import { TopBar } from "./components/TopBar";
import { BottomNav } from "./components/BottomNav";
import { EmptyState } from "./components/EmptyState";
import { api } from "./lib/api";
import type { GameConfig, GameRound, PlatformState } from "./types/platform";
import { GreedyMonkey } from "./games/GreedyMonkey";
import { TeenPatti } from "./games/TeenPatti";
import { GenericGame } from "./games/GenericGame";

function App() {
  const [state, setState] = useState<PlatformState | null>(null);
  const [error, setError] = useState<string>();
  const [tab, setTab] = useState("home");
  const [selectedGame, setSelectedGame] = useState<GameConfig | null>(null);
  const [round, setRound] = useState<GameRound | null>(null);

  useEffect(() => {
    api.getPlatformState().then(setState).catch((e) => setError(e?.message ?? "Unable to connect"));
  }, []);

  const openGame = async (game: GameConfig) => {
    setSelectedGame(game);
    try {
      setRound(await api.getCurrentRound(game.id));
    } catch {
      setRound(null);
    }
  };

  if (selectedGame) {
    const props = { config: selectedGame, round, wallet: state?.wallet, onBack: () => setSelectedGame(null) };
    if (selectedGame.id === "greedy-monkey") return <GreedyMonkey {...props} />;
    if (selectedGame.id === "teen-patti") return <TeenPatti {...props} />;
    return <GenericGame {...props} />;
  }

  return (
    <div className="app">
      <TopBar player={state?.player} />
      <main className="page">
        <section className="hero">
          <div>
            <span className="eyebrow">uradhura / LIVE PLATFORM</span>
            <h1>Play. Connect.<br /><span>Stay in the moment.</span></h1>
            <p>Realtime rooms, social experiences and configurable games — all from one platform.</p>
            <div className="hero-actions">
              <button className="primary"><Radio size={18} /> Explore Live</button>
              <button className="secondary"><Gamepad2 size={18} /> Open Games</button>
            </div>
          </div>
          <div className="hero-art">
            <div className="orb orb-a" /><div className="orb orb-b" />
            <div className="hero-symbol"><Sparkles size={52} /></div>
          </div>
        </section>

        {error ? (
          <EmptyState title="Connect your platform services" message="The UI is ready, but no backend data source is configured. Connect the real API/realtime services; no demo records are generated." />
        ) : (
          <>
            <section className="section-head">
              <div><span className="eyebrow">DISCOVER</span><h2>{tab === "games" ? "Games" : "Live now"}</h2></div>
              <div className="segmented">
                {["popular", "live", "party", "follow", "games"].map((x) => <button className={tab === x ? "active" : ""} key={x} onClick={() => setTab(x)}>{x}</button>)}
              </div>
            </section>

            {tab === "games" ? (
              state?.games?.length ? (
                <div className="game-grid">
                  {state.games.filter(g => g.enabled).map(g => (
                    <button className="catalog-card" key={g.id} onClick={() => openGame(g)}>
                      <div className="catalog-art" style={{ backgroundImage: `url(${g.backgroundUrl ?? "/assets/games/game-bg.svg"})` }}>
                        {g.characterUrl ? <img src={g.characterUrl} alt="" /> : <Gamepad2 size={42} />}
                      </div>
                      <div><strong>{g.name}</strong><span>{g.characterName ?? "Live game"}</span></div>
                    </button>
                  ))}
                </div>
              ) : <EmptyState title="No games available" message="Games will appear when enabled and returned by the platform." />
            ) : (
              state?.liveRooms?.length ? (
                <div className="room-grid">
                  {state.liveRooms.map(room => (
                    <article className="room-card" key={room.id}>
                      <div className="room-cover" style={{ backgroundImage: `url(${room.coverUrl ?? "/assets/games/room-bg.svg"})` }}>
                        <span className="live-badge">LIVE</span>
                        <span className="viewer-count">{room.viewerCount.toLocaleString()} watching</span>
                      </div>
                      <div className="room-info"><div className="avatar small">{room.host.avatarUrl ? <img src={room.host.avatarUrl} alt="" /> : "U"}</div><div><strong>{room.title}</strong><span>{room.host.displayName}</span></div></div>
                    </article>
                  ))}
                </div>
              ) : <EmptyState title="No live rooms yet" message="Live rooms will appear here when the realtime service reports active rooms." />
            )}
          </>
        )}
      </main>
      <BottomNav active={tab} onChange={setTab} />
    </div>
  );
}

export default App;