'use client';
import { useState, useEffect } from 'react';
import { adminApi, type AdminPlayer } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Badge } from '@/components/ui/Badge';
import { formatTokens } from '@/lib/utils';
import { Search, User, ChevronLeft, ChevronRight } from 'lucide-react';

export default function PlayersPage() {
  const [players, setPlayers] = useState<AdminPlayer[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [selected, setSelected] = useState<AdminPlayer | null>(null);
  const [detailLoading, setDetailLoading] = useState(false);

  const limit = 15;

  async function fetchPlayers(p = page, s = search) {
    setLoading(true);
    try {
      const data = await adminApi.listPlayers(p, s || undefined);
      setPlayers(data.players);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchPlayers(); }, [page]);

  async function handleSearch() {
    setPage(1);
    fetchPlayers(1, search);
  }

  async function handleSelectPlayer(player: AdminPlayer) {
    setDetailLoading(true);
    try {
      const detail = await adminApi.getPlayer(player.id);
      setSelected(detail);
    } catch {
      setSelected(player);
    } finally {
      setDetailLoading(false);
    }
  }

  const pages = Math.ceil(total / limit);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Players</h1>
        <p className="text-gray-400 text-sm">{total.toLocaleString()} total players</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Players list */}
        <div className="xl:col-span-2 space-y-4">
          <div className="flex gap-2">
            <Input value={search} onChange={e => setSearch(e.target.value)} placeholder="Search by username, email, or ID..." onKeyDown={e => e.key === 'Enter' && handleSearch()} />
            <Button onClick={handleSearch} variant="secondary" className="shrink-0"><Search size={16} /></Button>
          </div>

          <Card>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead>
                  <tr className="border-b border-game-border">
                    {['Player', 'Balance', 'Total Won', 'Total Lost', 'Role', 'Status'].map(h => (
                      <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading ? (
                    Array.from({ length: 5 }).map((_, i) => (
                      <tr key={i} className="border-b border-game-border/50">
                        {Array.from({ length: 6 }).map((_, j) => (
                          <td key={j} className="px-4 py-3"><div className="h-4 bg-game-border rounded animate-pulse" /></td>
                        ))}
                      </tr>
                    ))
                  ) : players.map(p => (
                    <tr key={p.id} onClick={() => handleSelectPlayer(p)}
                      className="border-b border-game-border/50 hover:bg-white/5 cursor-pointer transition-colors">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <div className="w-7 h-7 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xs font-bold">{p.username[0]}</div>
                          <div>
                            <div className="text-sm font-medium text-white">{p.username}</div>
                            <div className="text-xs text-gray-400 truncate max-w-[120px]">{p.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-sm font-bold text-game-gold">🪙 {formatTokens(p.balance)}</td>
                      <td className="px-4 py-3 text-sm text-game-green">+{formatTokens(p.totalWon)}</td>
                      <td className="px-4 py-3 text-sm text-game-red">-{formatTokens(p.totalLost)}</td>
                      <td className="px-4 py-3">
                        <Badge variant={p.role === 'super_admin' ? 'red' : p.role === 'admin' ? 'blue' : 'gray'}>
                          {p.role}
                        </Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Badge variant={p.isActive ? 'green' : 'red'}>{p.isActive ? 'Active' : 'Inactive'}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            {/* Pagination */}
            <div className="flex items-center justify-between px-4 py-3 border-t border-game-border">
              <span className="text-xs text-gray-400">
                {((page - 1) * limit) + 1}–{Math.min(page * limit, total)} of {total}
              </span>
              <div className="flex gap-2">
                <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="ghost" size="sm">
                  <ChevronLeft size={14} />
                </Button>
                <span className="text-sm text-gray-400 py-1">{page} / {pages || 1}</span>
                <Button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} variant="ghost" size="sm">
                  <ChevronRight size={14} />
                </Button>
              </div>
            </div>
          </Card>
        </div>

        {/* Player detail */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <User size={16} className="text-brand-400" />
              <h2 className="font-bold text-white">Player Detail</h2>
            </div>
          </CardHeader>
          <CardBody>
            {detailLoading ? (
              <div className="space-y-3">
                {Array.from({ length: 6 }).map((_, i) => (
                  <div key={i} className="h-4 bg-game-border rounded animate-pulse" />
                ))}
              </div>
            ) : selected ? (
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-12 h-12 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 text-xl font-black">
                    {selected.username[0]}
                  </div>
                  <div>
                    <div className="font-black text-white">{selected.username}</div>
                    <div className="text-xs text-gray-400">{selected.email}</div>
                    <Badge variant={selected.isActive ? 'green' : 'red'} className="mt-1">{selected.isActive ? 'Active' : 'Inactive'}</Badge>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Balance', value: `🪙 ${formatTokens(selected.balance)}`, color: 'text-game-gold' },
                    { label: 'Total Won', value: `+${formatTokens(selected.totalWon)}`, color: 'text-game-green' },
                    { label: 'Total Lost', value: `-${formatTokens(selected.totalLost)}`, color: 'text-game-red' },
                    { label: 'Total Bets', value: String(selected.totalBets || 0), color: 'text-white' },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-game-bg rounded-lg p-2">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={`text-sm font-bold ${color}`}>{value}</p>
                    </div>
                  ))}
                </div>

                <div>
                  <p className="text-xs text-gray-400 mb-2">Member since</p>
                  <p className="text-sm text-white">{new Date(selected.createdAt).toLocaleDateString()}</p>
                </div>
              </div>
            ) : (
              <div className="text-center py-8 text-gray-400">
                <User size={32} className="mx-auto mb-2 opacity-30" />
                <p className="text-sm">Click a player to view details</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
