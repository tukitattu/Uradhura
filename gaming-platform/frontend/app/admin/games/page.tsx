'use client';
import { useState, useEffect } from 'react';
import { adminApi, type Game } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatMultiplier } from '@/lib/utils';
import { Play, Square, Settings } from 'lucide-react';

export default function AdminGamesPage() {
  const [games, setGames] = useState<Game[]>([]);
  const [selected, setSelected] = useState<Game | null>(null);
  const [roundStatus, setRoundStatus] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<string | null>(null);
  const [configEdit, setConfigEdit] = useState({ houseEdge: 8, maxPayoutPerRound: 10000, jackpotWeight: 1, maxDailyLoss: 500 });
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    adminApi.listGames().then(data => {
      setGames(data);
      setLoading(false);
    }).catch(() => setLoading(false));
  }, []);

  useEffect(() => {
    if (selected?.configurations?.[0]) {
      const c = selected.configurations[0];
      setConfigEdit({
        houseEdge: c.houseEdge,
        maxPayoutPerRound: c.maxPayoutPerRound,
        jackpotWeight: c.jackpotWeight,
        maxDailyLoss: c.maxDailyLoss,
      });
    }
  }, [selected]);

  async function handleStartRound(gameId: string) {
    setActionLoading(gameId);
    try {
      await adminApi.startRound(gameId, 30);
      setRoundStatus(p => ({ ...p, [gameId]: 'Round started!' }));
      setTimeout(() => setRoundStatus(p => { const n = { ...p }; delete n[gameId]; return n; }), 3000);
    } catch (err: unknown) {
      setRoundStatus(p => ({ ...p, [gameId]: (err as Error).message }));
    } finally {
      setActionLoading(null);
    }
  }

  async function handleSaveConfig() {
    if (!selected) return;
    try {
      await adminApi.updateGameConfig(selected.id, configEdit);
      setSaveMsg('Config saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } catch (err: unknown) {
      setSaveMsg((err as Error).message);
    }
  }

  const GAME_EMOJIS: Record<string, string> = {
    greedy: '🐷', 'animal-wheel': '🐯', 'teen-patti': '🃏',
    'food-wheel': '🍜', 'three-card': '🎴', slot: '🎰',
  };

  if (loading) return <div className="text-gray-400 text-center py-20">Loading games...</div>;

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Games Management</h1>
        <p className="text-gray-400 text-sm">Manage rounds, options, and configurations</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Games list */}
        <div className="xl:col-span-2 grid grid-cols-1 sm:grid-cols-2 gap-4">
          {games.map(game => (
            <Card key={game.id} className={selected?.id === game.id ? 'border-brand-500' : ''}>
              <CardBody>
                <div className="flex items-center justify-between mb-3">
                  <div className="flex items-center gap-3">
                    <span className="text-3xl">{GAME_EMOJIS[game.slug] || '🎲'}</span>
                    <div>
                      <h3 className="font-black text-white">{game.name}</h3>
                      <Badge variant={game.isActive ? 'green' : 'red'}>{game.isActive ? 'Active' : 'Inactive'}</Badge>
                    </div>
                  </div>
                  <Button onClick={() => setSelected(game)} variant="ghost" size="sm">
                    <Settings size={14} />
                  </Button>
                </div>

                <div className="text-xs text-gray-400 mb-3">{game.options.length} betting options</div>

                {/* Options preview */}
                <div className="flex flex-wrap gap-1 mb-3">
                  {game.options.slice(0, 5).map(o => (
                    <span key={o.id} className="text-xs px-1.5 py-0.5 rounded font-bold" style={{ backgroundColor: o.colorHex + '22', color: o.colorHex }}>
                      {o.label} {formatMultiplier(o.multiplier)}
                    </span>
                  ))}
                  {game.options.length > 5 && <span className="text-xs text-gray-400">+{game.options.length - 5} more</span>}
                </div>

                {roundStatus[game.id] && (
                  <p className="text-xs text-game-green mb-2">{roundStatus[game.id]}</p>
                )}

                <Button
                  onClick={() => handleStartRound(game.id)}
                  loading={actionLoading === game.id}
                  variant="primary"
                  size="sm"
                  className="w-full"
                >
                  <Play size={14} /> Start New Round
                </Button>
              </CardBody>
            </Card>
          ))}
        </div>

        {/* Config panel */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-white flex items-center gap-2">
              <Settings size={16} /> {selected ? `${selected.name} Config` : 'Select a Game'}
            </h2>
          </CardHeader>
          <CardBody>
            {selected ? (
              <div className="space-y-4">
                {saveMsg && <div className="text-game-green text-sm">✓ {saveMsg}</div>}
                <Input label="House Edge (%)" type="number" value={configEdit.houseEdge} onChange={e => setConfigEdit(p => ({ ...p, houseEdge: parseFloat(e.target.value) }))} suffix="%" />
                <Input label="Max Payout Per Round" type="number" value={configEdit.maxPayoutPerRound} onChange={e => setConfigEdit(p => ({ ...p, maxPayoutPerRound: parseFloat(e.target.value) }))} />
                <Input label="Jackpot/RNG Weight" type="number" value={configEdit.jackpotWeight} step="0.1" onChange={e => setConfigEdit(p => ({ ...p, jackpotWeight: parseFloat(e.target.value) }))} />
                <Input label="Max Daily Loss" type="number" value={configEdit.maxDailyLoss} onChange={e => setConfigEdit(p => ({ ...p, maxDailyLoss: parseFloat(e.target.value) }))} />
                <Button onClick={handleSaveConfig} variant="gold" className="w-full">Save Config</Button>

                <div className="border-t border-game-border pt-4">
                  <h3 className="text-sm font-bold mb-2">Betting Options</h3>
                  <div className="space-y-2 max-h-48 overflow-y-auto">
                    {selected.options.map(o => (
                      <div key={o.id} className="flex items-center justify-between text-sm p-2 rounded-lg" style={{ backgroundColor: o.colorHex + '11' }}>
                        <div className="flex items-center gap-2">
                          <div className="w-3 h-3 rounded-full" style={{ backgroundColor: o.colorHex }} />
                          <span className="text-white">{o.label}</span>
                          {o.isHot && <span className="text-orange-400 text-xs">🔥</span>}
                        </div>
                        <span className="font-bold" style={{ color: o.colorHex }}>{formatMultiplier(o.multiplier)}</span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <Settings size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click a game to configure it</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
