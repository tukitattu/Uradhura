'use client';
import { useState, useEffect, useCallback } from 'react';
import { adminApi, type Game, type GameOption, type ActiveRound } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn, formatTokens, formatMultiplier, timeLeft, formatTime } from '@/lib/utils';
import {
  Settings, Play, Flame, ToggleLeft, ToggleRight,
  Plus, Edit2, Trash2, Save, X, RefreshCw, Zap,
  Clock, ChevronDown,
} from 'lucide-react';

// ─── Constants ────────────────────────────────────────────────────────────────

const GAME_EMOJIS: Record<string, string> = {
  greedy: '🐷', 'animal-wheel': '🐯', 'teen-patti': '🃏',
  'food-wheel': '🍜', 'three-card': '🎴', slot: '🎰',
};

const STATUS_CONFIG: Record<string, { label: string; variant: 'green' | 'gold' | 'blue' | 'gray' | 'red' }> = {
  BETTING_OPEN:       { label: 'Betting Open',  variant: 'green' },
  BETTING_CLOSED:     { label: 'Closed',        variant: 'gold'  },
  RESULT_PROCESSING:  { label: 'Processing',    variant: 'blue'  },
  SETTLED:            { label: 'Settled',       variant: 'gray'  },
  UPCOMING:           { label: 'Upcoming',      variant: 'gray'  },
};

// ─── Live Round Card ──────────────────────────────────────────────────────────

function LiveRoundCard({
  round, options, onForceClose, onForceResult, onForceSettle, loading,
}: {
  round: ActiveRound;
  options: GameOption[];
  onForceClose: (id: string) => void;
  onForceResult: (id: string, optionId: string) => void;
  onForceSettle: (id: string) => void;
  loading: string | null;
}) {
  const [showOptions, setShowOptions] = useState(false);
  const secs = round.bettingEndsAt ? timeLeft(round.bettingEndsAt) : 0;
  const cfg = STATUS_CONFIG[round.status] || STATUS_CONFIG.UPCOMING;
  const busy = loading === round.id;

  return (
    <Card className="border-l-4 border-l-brand-500">
      <CardBody className="space-y-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <span className="text-2xl">{GAME_EMOJIS[round.game?.slug] || '🎲'}</span>
            <div>
              <div className="font-black text-white text-sm">{round.game?.name}</div>
              <div className="text-xs text-gray-400">Round #{round.roundNumber}</div>
            </div>
          </div>
          <Badge variant={cfg.variant}>{cfg.label}</Badge>
        </div>

        <div className="grid grid-cols-3 gap-2 text-center">
          <div className="bg-game-bg rounded-lg p-2">
            <p className="text-[10px] text-gray-400">Timer</p>
            <p className={cn('text-sm font-black', secs <= 5 && round.status === 'BETTING_OPEN' ? 'text-game-red' : 'text-white')}>
              {round.status === 'BETTING_OPEN' ? formatTime(secs) : '—'}
            </p>
          </div>
          <div className="bg-game-bg rounded-lg p-2">
            <p className="text-[10px] text-gray-400">Pool</p>
            <p className="text-sm font-black text-game-gold">🪙{formatTokens(round.totalBetAmount)}</p>
          </div>
          <div className="bg-game-bg rounded-lg p-2">
            <p className="text-[10px] text-gray-400">Bets</p>
            <p className="text-sm font-black text-white">{round.betCount}</p>
          </div>
        </div>

        <div className="flex gap-1.5 flex-wrap">
          {(round.status === 'BETTING_OPEN') && (
            <Button size="sm" variant="secondary" loading={busy}
              onClick={() => onForceClose(round.id)}>
              <X size={12} /> Close
            </Button>
          )}
          {(round.status === 'BETTING_OPEN' || round.status === 'BETTING_CLOSED') && (
            <div className="relative">
              <Button size="sm" variant="primary" onClick={() => setShowOptions(!showOptions)}>
                <Zap size={12} /> Set Winner <ChevronDown size={10} />
              </Button>
              {showOptions && (
                <div className="absolute top-full left-0 mt-1 z-30 bg-game-card border border-game-border rounded-xl shadow-2xl p-2 min-w-[160px]">
                  {options.map(o => (
                    <button key={o.id}
                      onClick={() => { onForceResult(round.id, o.id); setShowOptions(false); }}
                      className="w-full text-left px-3 py-2 rounded-lg hover:bg-white/10 text-sm flex items-center gap-2">
                      <div className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: o.colorHex }} />
                      <span className="text-white">{o.label}</span>
                      <span className="text-gray-400 ml-auto">{formatMultiplier(o.multiplier)}</span>
                    </button>
                  ))}
                </div>
              )}
            </div>
          )}
          {round.status === 'RESULT_PROCESSING' && (
            <Button size="sm" variant="gold" loading={busy}
              onClick={() => onForceSettle(round.id)}>
              <Save size={12} /> Settle
            </Button>
          )}
        </div>
      </CardBody>
    </Card>
  );
}

// ─── Option Row ───────────────────────────────────────────────────────────────

function OptionRow({
  option, gameId, onUpdate, onDelete,
}: {
  option: GameOption; gameId: string;
  onUpdate: (o: GameOption) => void;
  onDelete: (id: string) => void;
}) {
  const [editing, setEditing] = useState(false);
  const [form, setForm] = useState({ ...option });
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try {
      const updated = await adminApi.upsertGameOption(gameId, form) as GameOption;
      onUpdate(updated);
      setEditing(false);
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  if (editing) {
    return (
      <div className="p-3 bg-game-bg rounded-xl border border-brand-500/40 space-y-2">
        <div className="grid grid-cols-2 gap-2">
          <Input label="Label" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} />
          <Input label="Multiplier" type="number" step="0.01" value={form.multiplier} onChange={e => setForm(p => ({ ...p, multiplier: parseFloat(e.target.value) }))} />
        </div>
        <div className="flex items-center gap-3">
          <div>
            <label className="text-xs text-gray-400 block mb-1">Color</label>
            <input type="color" value={form.colorHex} onChange={e => setForm(p => ({ ...p, colorHex: e.target.value }))}
              className="w-10 h-8 rounded cursor-pointer border border-game-border bg-transparent" />
          </div>
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <button onClick={() => setForm(p => ({ ...p, isHot: !p.isHot }))}
              className={cn('w-9 h-5 rounded-full relative transition-colors', form.isHot ? 'bg-orange-500' : 'bg-gray-600')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', form.isHot ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
            <span className="text-xs text-gray-300">HOT 🔥</span>
          </label>
          <label className="flex items-center gap-2 cursor-pointer mt-3">
            <button onClick={() => setForm(p => ({ ...p, isActive: !p.isActive }))}
              className={cn('w-9 h-5 rounded-full relative transition-colors', form.isActive ? 'bg-game-green' : 'bg-gray-600')}>
              <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', form.isActive ? 'translate-x-4' : 'translate-x-0.5')} />
            </button>
            <span className="text-xs text-gray-300">Active</span>
          </label>
        </div>
        <div className="flex gap-2">
          <Button size="sm" variant="gold" loading={saving} onClick={handleSave}><Save size={12} /> Save</Button>
          <Button size="sm" variant="ghost" onClick={() => setEditing(false)}><X size={12} /> Cancel</Button>
        </div>
      </div>
    );
  }

  return (
    <div className={cn('flex items-center gap-3 p-2.5 rounded-lg border transition-all',
      option.isActive ? 'border-game-border' : 'border-game-border/30 opacity-50')}>
      <div className="w-4 h-4 rounded-full shrink-0" style={{ backgroundColor: option.colorHex }} />
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5">
          <span className="text-sm font-bold text-white">{option.label}</span>
          {option.isHot && <span className="text-orange-400 text-xs">🔥</span>}
          {!option.isActive && <Badge variant="gray">Off</Badge>}
        </div>
        <span className="text-xs font-bold" style={{ color: option.colorHex }}>{formatMultiplier(option.multiplier)}</span>
      </div>
      <div className="flex gap-1 shrink-0">
        <button onClick={() => setEditing(true)} className="p-1.5 rounded hover:bg-white/10 text-gray-400 hover:text-white transition-colors">
          <Edit2 size={13} />
        </button>
        <button onClick={() => { if (confirm(`Deactivate "${option.label}"?`)) onDelete(option.id); }}
          className="p-1.5 rounded hover:bg-game-red/20 text-gray-400 hover:text-game-red transition-colors">
          <Trash2 size={13} />
        </button>
      </div>
    </div>
  );
}

// ─── Add Option Form ──────────────────────────────────────────────────────────

function AddOptionForm({ gameId, onAdded }: { gameId: string; onAdded: (o: GameOption) => void }) {
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ label: '', multiplier: 2, colorHex: '#3498db', isHot: false });
  const [saving, setSaving] = useState(false);

  async function handleAdd() {
    if (!form.label || form.multiplier <= 0) return;
    setSaving(true);
    try {
      const opt = await adminApi.upsertGameOption(gameId, form) as GameOption;
      onAdded(opt);
      setForm({ label: '', multiplier: 2, colorHex: '#3498db', isHot: false });
      setOpen(false);
    } catch (err) { alert((err as Error).message); }
    finally { setSaving(false); }
  }

  if (!open) return (
    <Button size="sm" variant="secondary" className="w-full" onClick={() => setOpen(true)}>
      <Plus size={14} /> Add Option
    </Button>
  );

  return (
    <div className="p-3 bg-game-bg rounded-xl border border-game-green/30 space-y-2">
      <p className="text-xs font-bold text-game-green mb-1">New Betting Option</p>
      <div className="grid grid-cols-2 gap-2">
        <Input label="Label" value={form.label} onChange={e => setForm(p => ({ ...p, label: e.target.value }))} placeholder="e.g. Dragon" />
        <Input label="Multiplier" type="number" step="0.01" value={form.multiplier} onChange={e => setForm(p => ({ ...p, multiplier: parseFloat(e.target.value) }))} />
      </div>
      <div className="flex items-center gap-3">
        <div>
          <label className="text-xs text-gray-400 block mb-1">Color</label>
          <input type="color" value={form.colorHex} onChange={e => setForm(p => ({ ...p, colorHex: e.target.value }))}
            className="w-10 h-8 rounded cursor-pointer border border-game-border bg-transparent" />
        </div>
        <label className="flex items-center gap-2 cursor-pointer mt-3">
          <button onClick={() => setForm(p => ({ ...p, isHot: !p.isHot }))}
            className={cn('w-9 h-5 rounded-full relative transition-colors', form.isHot ? 'bg-orange-500' : 'bg-gray-600')}>
            <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', form.isHot ? 'translate-x-4' : 'translate-x-0.5')} />
          </button>
          <span className="text-xs text-gray-300">HOT 🔥</span>
        </label>
      </div>
      <div className="flex gap-2">
        <Button size="sm" variant="gold" loading={saving} onClick={handleAdd}><Plus size={12} /> Add</Button>
        <Button size="sm" variant="ghost" onClick={() => setOpen(false)}><X size={12} /> Cancel</Button>
      </div>
    </div>
  );
}

// ─── Config Panel ─────────────────────────────────────────────────────────────

function ConfigPanel({ game, onRefresh }: { game: Game; onRefresh: () => void }) {
  const [tab, setTab] = useState<'ruleset' | 'options' | 'rounds'>('ruleset');
  const [config, setConfig] = useState({
    houseEdge: game.configurations[0]?.houseEdge ?? 8,
    maxPayoutPerRound: game.configurations[0]?.maxPayoutPerRound ?? 10000,
    jackpotWeight: game.configurations[0]?.jackpotWeight ?? 1,
    maxDailyLoss: game.configurations[0]?.maxDailyLoss ?? 100000,
    bettingDurationSeconds: 30,
    roundDurationSeconds: 40,
  });
  const [options, setOptions] = useState<GameOption[]>(game.options);
  const [saving, setSaving] = useState(false);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  async function handleSaveRuleset() {
    setSaving(true);
    try {
      await Promise.all([
        adminApi.updateGameConfig(game.id, {
          houseEdge: config.houseEdge,
          maxPayoutPerRound: config.maxPayoutPerRound,
          jackpotWeight: config.jackpotWeight,
          maxDailyLoss: config.maxDailyLoss,
        }),
        adminApi.updateGameDurations(game.id, config.bettingDurationSeconds, config.roundDurationSeconds),
      ]);
      showToast('Ruleset saved!');
      onRefresh();
    } catch (err) { showToast((err as Error).message); }
    finally { setSaving(false); }
  }

  async function handleDeleteOption(optionId: string) {
    try {
      await adminApi.deleteGameOption(game.id, optionId);
      setOptions(p => p.map(o => o.id === optionId ? { ...o, isActive: false } : o));
      showToast('Option deactivated');
    } catch (err) { showToast((err as Error).message); }
  }

  async function handleStartRound() {
    try {
      await adminApi.startRound(game.id, config.bettingDurationSeconds);
      showToast('Round started!');
    } catch (err) { showToast((err as Error).message); }
  }

  const TABS = [
    { id: 'ruleset', label: '⚙️ Ruleset' },
    { id: 'options', label: '🎯 Options' },
    { id: 'rounds',  label: '🔄 Rounds' },
  ] as const;

  return (
    <div className="space-y-4">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-game-green text-black font-bold px-4 py-2 rounded-lg shadow-lg">
          ✓ {toast}
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b border-game-border">
        {TABS.map(t => (
          <button key={t.id} onClick={() => setTab(t.id)}
            className={cn('px-4 py-2 text-sm font-medium transition-all border-b-2 -mb-px',
              tab === t.id
                ? 'border-brand-400 text-brand-400 bg-brand-500/10'
                : 'border-transparent text-gray-400 hover:text-white')}>
            {t.label}
          </button>
        ))}
      </div>

      {/* ── Ruleset Tab ── */}
      {tab === 'ruleset' && (
        <div className="space-y-3">
          <div className="grid grid-cols-2 gap-3">
            <Input label="House Edge (%)" type="number" step="0.1" value={config.houseEdge}
              onChange={e => setConfig(p => ({ ...p, houseEdge: parseFloat(e.target.value) }))} suffix="%" />
            <Input label="Max Payout / Round" type="number" value={config.maxPayoutPerRound}
              onChange={e => setConfig(p => ({ ...p, maxPayoutPerRound: parseFloat(e.target.value) }))} />
            <Input label="Jackpot / RNG Weight" type="number" step="0.1" value={config.jackpotWeight}
              onChange={e => setConfig(p => ({ ...p, jackpotWeight: parseFloat(e.target.value) }))} />
            <Input label="Max Daily Loss" type="number" value={config.maxDailyLoss}
              onChange={e => setConfig(p => ({ ...p, maxDailyLoss: parseFloat(e.target.value) }))} />
          </div>

          <div className="border-t border-game-border pt-3">
            <p className="text-xs font-bold text-gray-400 mb-2 uppercase tracking-wide">Timing</p>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <Input label="Betting Duration (s)" type="number" value={config.bettingDurationSeconds}
                  onChange={e => setConfig(p => ({ ...p, bettingDurationSeconds: parseInt(e.target.value) }))} />
                <p className="text-xs text-gray-500 mt-1">How long players can bet</p>
              </div>
              <div>
                <Input label="Round Duration (s)" type="number" value={config.roundDurationSeconds}
                  onChange={e => setConfig(p => ({ ...p, roundDurationSeconds: parseInt(e.target.value) }))} />
                <p className="text-xs text-gray-500 mt-1">Total round time</p>
              </div>
            </div>
          </div>

          <Button onClick={handleSaveRuleset} loading={saving} variant="gold" className="w-full">
            <Save size={14} /> Save Ruleset
          </Button>
        </div>
      )}

      {/* ── Options Tab ── */}
      {tab === 'options' && (
        <div className="space-y-2">
          <div className="flex items-center justify-between mb-1">
            <span className="text-xs text-gray-400">{options.filter(o => o.isActive).length} active options</span>
            <span className="text-xs text-gray-500">Click ✏️ to edit inline</span>
          </div>
          <div className="space-y-1.5 max-h-72 overflow-y-auto pr-1">
            {options.map(o => (
              <OptionRow key={o.id} option={o} gameId={game.id}
                onUpdate={updated => setOptions(p => p.map(x => x.id === updated.id ? updated : x))}
                onDelete={handleDeleteOption} />
            ))}
          </div>
          <AddOptionForm gameId={game.id}
            onAdded={opt => setOptions(p => [...p, opt])} />
        </div>
      )}

      {/* ── Rounds Tab ── */}
      {tab === 'rounds' && (
        <div className="space-y-3">
          <div className="bg-game-bg rounded-xl p-4 border border-game-border space-y-3">
            <p className="text-sm font-bold text-white">Start New Round</p>
            <div className="flex items-end gap-2">
              <div className="flex-1">
                <Input label="Betting Duration (s)" type="number" value={config.bettingDurationSeconds}
                  onChange={e => setConfig(p => ({ ...p, bettingDurationSeconds: parseInt(e.target.value) }))} />
              </div>
              <Button onClick={handleStartRound} variant="primary">
                <Play size={14} /> Start
              </Button>
            </div>
          </div>

          <div className="bg-game-bg/50 rounded-xl p-3 border border-game-border/50">
            <p className="text-xs text-gray-400 flex items-center gap-1.5">
              <Clock size={12} /> Auto-scheduler runs rounds every {config.bettingDurationSeconds}s automatically.
              Use force controls in the Live Monitor above to override.
            </p>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [activeRounds, setActiveRounds] = useState<ActiveRound[]>([]);
  const [selectedGame, setSelectedGame] = useState<Game | null>(null);
  const [loading, setLoading] = useState(true);
  const [roundActionLoading, setRoundActionLoading] = useState<string | null>(null);
  const [toast, setToast] = useState('');

  function showToast(msg: string) { setToast(msg); setTimeout(() => setToast(''), 2500); }

  const fetchGames = useCallback(async () => {
    const data = await adminApi.listGames();
    setGames(data);
    setLoading(false);
  }, []);

  const fetchRounds = useCallback(async () => {
    try {
      const data = await adminApi.getActiveRoundsAll();
      setActiveRounds(data);
    } catch { /* ignore */ }
  }, []);

  useEffect(() => {
    fetchGames();
    fetchRounds();
    const interval = setInterval(fetchRounds, 5000);
    return () => clearInterval(interval);
  }, [fetchGames, fetchRounds]);

  async function handleToggleGame(gameId: string, current: boolean) {
    try {
      await adminApi.toggleGame(gameId, !current);
      setGames(p => p.map(g => g.id === gameId ? { ...g, isActive: !current } : g));
      if (selectedGame?.id === gameId) setSelectedGame(p => p ? { ...p, isActive: !current } : p);
      showToast(`Game ${!current ? 'enabled' : 'disabled'}`);
    } catch (err) { showToast((err as Error).message); }
  }

  async function handleForceClose(roundId: string) {
    setRoundActionLoading(roundId);
    try {
      await adminApi.forceCloseRound(roundId);
      showToast('Betting closed');
      fetchRounds();
    } catch (err) { showToast((err as Error).message); }
    finally { setRoundActionLoading(null); }
  }

  async function handleForceResult(roundId: string, winningOptionId: string) {
    setRoundActionLoading(roundId);
    try {
      await adminApi.forceSetResult(roundId, winningOptionId);
      showToast('Result set — now settle to pay out');
      fetchRounds();
    } catch (err) { showToast((err as Error).message); }
    finally { setRoundActionLoading(null); }
  }

  async function handleForceSettle(roundId: string) {
    setRoundActionLoading(roundId);
    try {
      await adminApi.forceSettle(roundId);
      showToast('Round settled!');
      fetchRounds();
    } catch (err) { showToast((err as Error).message); }
    finally { setRoundActionLoading(null); }
  }

  function getOptionsForRound(round: ActiveRound): GameOption[] {
    return games.find(g => g.id === round.gameId)?.options ?? [];
  }

  if (loading) return (
    <div className="space-y-4">
      <div className="h-8 w-48 bg-game-border rounded animate-pulse" />
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-40 bg-game-card border border-game-border rounded-2xl animate-pulse" />
        ))}
      </div>
    </div>
  );

  return (
    <div className="space-y-6">
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 bg-game-green text-black font-bold px-4 py-2 rounded-lg shadow-lg animate-bounce-in">
          ✓ {toast}
        </div>
      )}

      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Games Management</h1>
          <p className="text-gray-400 text-sm">{games.filter(g => g.isActive).length}/{games.length} games active</p>
        </div>
        <Button onClick={() => { fetchGames(); fetchRounds(); }} variant="ghost" size="sm">
          <RefreshCw size={14} /> Refresh
        </Button>
      </div>

      {/* Live Rounds Monitor */}
      {activeRounds.length > 0 && (
        <div>
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-game-green animate-pulse" />
            <h2 className="font-bold text-white text-sm">Live Round Monitor</h2>
            <span className="text-xs text-gray-400">({activeRounds.length} active · auto-refresh 5s)</span>
          </div>
          <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-3">
            {activeRounds.map(r => (
              <LiveRoundCard
                key={r.id}
                round={r}
                options={getOptionsForRound(r)}
                onForceClose={handleForceClose}
                onForceResult={handleForceResult}
                onForceSettle={handleForceSettle}
                loading={roundActionLoading}
              />
            ))}
          </div>
        </div>
      )}

      {/* Games grid + config panel */}
      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Games list */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {games.map(game => (
            <button
              key={game.id}
              onClick={() => setSelectedGame(game)}
              className={cn(
                'w-full text-left rounded-2xl border-2 p-4 transition-all hover:border-brand-500/60',
                selectedGame?.id === game.id ? 'border-brand-500 bg-brand-500/5' : 'border-game-border bg-game-card'
              )}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-3">
                  <span className="text-3xl">{GAME_EMOJIS[game.slug] || '🎲'}</span>
                  <div>
                    <h3 className="font-black text-white">{game.name}</h3>
                    <p className="text-xs text-gray-400">{game.options.filter(o => o.isActive).length} active options</p>
                  </div>
                </div>

                {/* Enable/Disable toggle */}
                <div className="flex flex-col items-end gap-1">
                  <button
                    onClick={e => { e.stopPropagation(); handleToggleGame(game.id, game.isActive); }}
                    className="flex items-center gap-1.5"
                    title={game.isActive ? 'Click to disable' : 'Click to enable'}
                  >
                    {game.isActive
                      ? <ToggleRight size={24} className="text-game-green" />
                      : <ToggleLeft size={24} className="text-gray-500" />
                    }
                    <span className={cn('text-xs font-bold', game.isActive ? 'text-game-green' : 'text-gray-500')}>
                      {game.isActive ? 'ON' : 'OFF'}
                    </span>
                  </button>
                  {activeRounds.some(r => r.gameId === game.id) && (
                    <span className="text-[10px] text-game-green flex items-center gap-1">
                      <div className="w-1.5 h-1.5 rounded-full bg-game-green animate-pulse" /> Live
                    </span>
                  )}
                </div>
              </div>

              {/* Option pills */}
              <div className="flex flex-wrap gap-1">
                {game.options.filter(o => o.isActive).slice(0, 6).map(o => (
                  <span key={o.id}
                    className="text-[10px] px-1.5 py-0.5 rounded font-bold flex items-center gap-1"
                    style={{ backgroundColor: o.colorHex + '22', color: o.colorHex }}>
                    {o.isHot && <Flame size={9} />}
                    {o.label} {formatMultiplier(o.multiplier)}
                  </span>
                ))}
                {game.options.filter(o => o.isActive).length > 6 && (
                  <span className="text-[10px] text-gray-500">+{game.options.filter(o => o.isActive).length - 6}</span>
                )}
              </div>

              {selectedGame?.id === game.id && (
                <div className="mt-2 text-xs text-brand-400 flex items-center gap-1">
                  <Settings size={11} /> Editing below →
                </div>
              )}
            </button>
          ))}
        </div>

        {/* Config panel */}
        <Card className={cn('xl:sticky xl:top-6 self-start transition-all', selectedGame ? 'border-brand-500/40' : '')}>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Settings size={16} className="text-brand-400" />
              <h2 className="font-bold text-white">
                {selectedGame
                  ? `${GAME_EMOJIS[selectedGame.slug] || '🎲'} ${selectedGame.name}`
                  : 'Select a Game'}
              </h2>
            </div>
          </CardHeader>
          <CardBody>
            {selectedGame ? (
              <ConfigPanel
                key={selectedGame.id}
                game={selectedGame}
                onRefresh={() => {
                  fetchGames();
                  fetchRounds();
                }}
              />
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Settings size={36} className="mx-auto mb-3 opacity-20" />
                <p className="text-sm">Click any game card to<br />configure its rules, options<br />and timing</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
