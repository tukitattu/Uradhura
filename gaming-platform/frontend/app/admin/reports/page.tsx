'use client';
import { useState, useEffect } from 'react';
import { adminApi, type Bet } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { formatTokens } from '@/lib/utils';
import { FileText, ChevronLeft, ChevronRight, Download } from 'lucide-react';

export default function ReportsPage() {
  const [bets, setBets] = useState<Bet[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ from: '', to: '', status: '', playerId: '' });

  async function fetchBets(p = page) {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: '20' };
      if (filters.from) params.from = filters.from;
      if (filters.to) params.to = filters.to;
      if (filters.status) params.status = filters.status;
      if (filters.playerId) params.playerId = filters.playerId;
      const data = await adminApi.betReport(params);
      setBets(data.bets);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchBets(); }, [page]);

  const pages = Math.ceil(total / 20);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Reports</h1>
          <p className="text-gray-400 text-sm">{total.toLocaleString()} total bets</p>
        </div>
        <Button variant="secondary" size="sm"><Download size={14} /> Export CSV</Button>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
            <Input label="From Date" type="date" value={filters.from} onChange={e => setFilters(p => ({ ...p, from: e.target.value }))} />
            <Input label="To Date" type="date" value={filters.to} onChange={e => setFilters(p => ({ ...p, to: e.target.value }))} />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Status</label>
              <select
                value={filters.status}
                onChange={e => setFilters(p => ({ ...p, status: e.target.value }))}
                className="w-full bg-game-bg border border-game-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
              >
                <option value="">All</option>
                <option value="PENDING">Pending</option>
                <option value="WON">Won</option>
                <option value="LOST">Lost</option>
                <option value="REFUNDED">Refunded</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => { setPage(1); fetchBets(1); }} variant="primary" className="w-full">Apply Filters</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      {/* Bets table */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <FileText size={16} className="text-brand-400" />
            <h2 className="font-bold text-white">Bet Report</h2>
          </div>
        </CardHeader>
        <div className="overflow-x-auto">
          <table className="w-full">
            <thead>
              <tr className="border-b border-game-border">
                {['Bet ID', 'Player', 'Game', 'Option', 'Amount', 'Payout', 'Status', 'Date'].map(h => (
                  <th key={h} className="text-left px-4 py-3 text-xs font-bold text-gray-400 uppercase tracking-wide">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {loading ? (
                Array.from({ length: 5 }).map((_, i) => (
                  <tr key={i} className="border-b border-game-border/50">
                    {Array.from({ length: 8 }).map((_, j) => (
                      <td key={j} className="px-4 py-3"><div className="h-4 bg-game-border rounded animate-pulse" /></td>
                    ))}
                  </tr>
                ))
              ) : bets.map(bet => (
                <tr key={bet.id} className="border-b border-game-border/50 hover:bg-white/5 text-sm">
                  <td className="px-4 py-3 text-gray-400 font-mono text-xs">{bet.id.slice(0, 8)}...</td>
                  <td className="px-4 py-3 text-white">{(bet as unknown as { player?: { username: string } }).player?.username || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{(bet as unknown as { round?: { game?: { name: string } } }).round?.game?.name || '—'}</td>
                  <td className="px-4 py-3 text-gray-300">{bet.option?.label || '—'}</td>
                  <td className="px-4 py-3 font-bold text-white">🪙 {formatTokens(bet.amount)}</td>
                  <td className="px-4 py-3 font-bold text-game-gold">{bet.payout ? `🪙 ${formatTokens(bet.payout)}` : '—'}</td>
                  <td className="px-4 py-3">
                    <Badge variant={bet.status === 'WON' ? 'green' : bet.status === 'LOST' ? 'red' : bet.status === 'PENDING' ? 'blue' : 'gray'}>
                      {bet.status}
                    </Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-400 text-xs">{new Date(bet.createdAt).toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <div className="flex items-center justify-between px-4 py-3 border-t border-game-border">
          <span className="text-xs text-gray-400">{total} total records</span>
          <div className="flex gap-2">
            <Button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={page <= 1} variant="ghost" size="sm"><ChevronLeft size={14} /></Button>
            <span className="text-sm text-gray-400 py-1">{page} / {pages || 1}</span>
            <Button onClick={() => setPage(p => Math.min(pages, p + 1))} disabled={page >= pages} variant="ghost" size="sm"><ChevronRight size={14} /></Button>
          </div>
        </div>
      </Card>
    </div>
  );
}
