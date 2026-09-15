'use client';
import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import { betsApi, walletApi, type Bet, type WalletTransaction } from '@/lib/api';
import { formatTokens } from '@/lib/utils';
import { Badge } from '@/components/ui/Badge';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import { ArrowLeft, Trophy, TrendingUp, TrendingDown, Coins } from 'lucide-react';

// ─── Helpers ──────────────────────────────────────────────────────────────────

function formatDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function formatShortDate(dateStr: string): string {
  return new Date(dateStr).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });
}

function betStatusVariant(status: string): 'green' | 'red' | 'gray' {
  if (status === 'WON') return 'green';
  if (status === 'LOST') return 'red';
  return 'gray';
}

function txTypeVariant(type: string): 'green' | 'red' | 'blue' {
  if (type === 'credit') return 'green';
  if (type === 'debit') return 'red';
  return 'blue';
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function ProfilePage() {
  const { player, loading } = useAuth();
  const router = useRouter();

  // Bets
  const [bets, setBets] = useState<Bet[]>([]);
  const [betsTotal, setBetsTotal] = useState(0);
  const [betsPage, setBetsPage] = useState(1);
  const [betsLoading, setBetsLoading] = useState(true);

  // Wallet transactions
  const [transactions, setTransactions] = useState<WalletTransaction[]>([]);
  const [walletLoading, setWalletLoading] = useState(true);

  // ─── Auth guard ──────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!loading && !player) router.push('/login');
  }, [player, loading, router]);

  // ─── Fetch bets ──────────────────────────────────────────────────────────────
  const fetchBets = useCallback((page: number) => {
    setBetsLoading(true);
    betsApi
      .myBets(page)
      .then((result) => {
        setBets(result.bets);
        setBetsTotal(result.total);
      })
      .catch(() => {})
      .finally(() => setBetsLoading(false));
  }, []);

  useEffect(() => {
    if (player) fetchBets(betsPage);
  }, [player, betsPage, fetchBets]);

  // ─── Fetch wallet ────────────────────────────────────────────────────────────
  useEffect(() => {
    if (!player) return;
    walletApi
      .get()
      .then((w) => setTransactions(w.transactions))
      .catch(() => {})
      .finally(() => setWalletLoading(false));
  }, [player]);

  if (loading || !player) return null;

  // ─── Derived stats from bets ──────────────────────────────────────────────
  const settledBets = bets.filter((b) => b.status === 'WON' || b.status === 'LOST');
  const wonBets = bets.filter((b) => b.status === 'WON');
  const biggestWin = wonBets.reduce((max, b) => Math.max(max, b.payout ?? 0), 0);
  const winRate = settledBets.length > 0 ? Math.round((wonBets.length / settledBets.length) * 100) : 0;

  const totalPages = Math.ceil(betsTotal / 20);

  // ─── Render ──────────────────────────────────────────────────────────────────
  return (
    <div className="min-h-screen" style={{ background: 'radial-gradient(ellipse at top, #1a1f2e 0%, #0d1117 70%)' }}>
      {/* Header bar */}
      <header className="border-b border-[rgba(61,17,85,0.6)] bg-[#1a0028]/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-4xl mx-auto px-4 py-3 flex items-center gap-3">
          <Link
            href="/games"
            className="flex items-center gap-1.5 text-sm text-gray-400 hover:text-white transition-colors"
          >
            <ArrowLeft size={16} /> Back to Games
          </Link>
          <span className="text-gray-600">|</span>
          <span className="text-sm font-semibold text-white">My Profile</span>
        </div>
      </header>

      <main className="max-w-4xl mx-auto px-4 py-8 space-y-6">
        {/* ─── Profile hero ───────────────────────────────────────────────── */}
        <Card variant="glow">
          <CardBody className="flex flex-col sm:flex-row items-center sm:items-start gap-5 p-6">
            {/* Avatar */}
            <div className="w-20 h-20 rounded-full bg-[rgba(255,31,166,0.15)] border-2 border-brand-500/50 flex items-center justify-center text-3xl font-black text-[#ff1fa6] flex-shrink-0">
              {player.username[0].toUpperCase()}
            </div>

            {/* Info */}
            <div className="flex-1 text-center sm:text-left">
              <div className="flex flex-wrap items-center justify-center sm:justify-start gap-2 mb-1">
                <h1 className="text-2xl font-black text-white">{player.username}</h1>
                <Badge variant={player.role === 'admin' || player.role === 'super_admin' ? 'gold' : 'blue'}>
                  {player.role}
                </Badge>
              </div>
              <p className="text-gray-400 text-sm mb-3">{player.email}</p>
              {/* Balance */}
              <div className="inline-flex items-center gap-2 bg-[#1a0028] border border-[rgba(61,17,85,0.6)] rounded-xl px-4 py-2">
                <span className="text-[#ffd700] text-2xl font-black">
                  🪙 {formatTokens(player.balance)}
                </span>
                <span className="text-gray-500 text-sm">tokens</span>
              </div>
            </div>
          </CardBody>
        </Card>

        {/* ─── Stats grid ─────────────────────────────────────────────────── */}
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
          {/* Total Won */}
          <Card>
            <CardBody className="flex flex-col items-center text-center p-4">
              <Trophy size={20} className="text-[#ffd700] mb-2" />
              <p className="text-xs text-gray-400 mb-1">Total Won</p>
              <p className="text-xl font-black text-[#00e676]">
                🪙 {formatTokens(wonBets.reduce((s, b) => s + (b.payout ?? 0), 0))}
              </p>
            </CardBody>
          </Card>

          {/* Total Bets */}
          <Card>
            <CardBody className="flex flex-col items-center text-center p-4">
              <Coins size={20} className="text-[#ff1fa6] mb-2" />
              <p className="text-xs text-gray-400 mb-1">Total Bets</p>
              <p className="text-xl font-black text-white">{betsTotal}</p>
            </CardBody>
          </Card>

          {/* Biggest Win */}
          <Card>
            <CardBody className="flex flex-col items-center text-center p-4">
              <TrendingUp size={20} className="text-[#00e676] mb-2" />
              <p className="text-xs text-gray-400 mb-1">Biggest Win</p>
              <p className="text-xl font-black text-[#ffd700]">
                {biggestWin > 0 ? `🪙 ${formatTokens(biggestWin)}` : '—'}
              </p>
            </CardBody>
          </Card>

          {/* Win Rate */}
          <Card>
            <CardBody className="flex flex-col items-center text-center p-4">
              <TrendingDown size={20} className="text-[#ff1fa6] mb-2" />
              <p className="text-xs text-gray-400 mb-1">Win Rate</p>
              <p className="text-xl font-black text-white">{winRate}%</p>
            </CardBody>
          </Card>
        </div>

        {/* ─── Bet History ─────────────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-white">Bet History</h2>
          </CardHeader>

          {betsLoading ? (
            <CardBody>
              <div className="space-y-2">
                {Array.from({ length: 5 }).map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            </CardBody>
          ) : bets.length === 0 ? (
            <CardBody>
              <p className="text-gray-500 text-center py-6">No bets yet. Head to a game!</p>
            </CardBody>
          ) : (
            <>
              {/* Table */}
              <div className="overflow-x-auto">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="text-xs text-gray-500 uppercase border-b border-[rgba(61,17,85,0.6)]">
                      <th className="px-4 py-2 text-left">Game</th>
                      <th className="px-4 py-2 text-left">Option</th>
                      <th className="px-4 py-2 text-right">Stake</th>
                      <th className="px-4 py-2 text-right">Payout / Loss</th>
                      <th className="px-4 py-2 text-center">Status</th>
                      <th className="px-4 py-2 text-right">Date</th>
                    </tr>
                  </thead>
                  <tbody>
                    {bets.map((bet) => (
                      <tr
                        key={bet.id}
                        className={
                          bet.status === 'WON'
                            ? 'bg-game-green/5 hover:bg-game-green/10'
                            : bet.status === 'LOST'
                            ? 'bg-game-red/5 hover:bg-game-red/10'
                            : 'hover:bg-white/5'
                        }
                      >
                        <td className="px-4 py-2.5 text-gray-300">
                          {bet.round?.game?.name ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-gray-300">
                          {bet.option?.label ?? '—'}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono text-white">
                          🪙 {formatTokens(bet.amount)}
                        </td>
                        <td className="px-4 py-2.5 text-right font-mono">
                          {bet.status === 'WON' ? (
                            <span className="text-[#00e676]">+{formatTokens(bet.payout ?? 0)}</span>
                          ) : bet.status === 'LOST' ? (
                            <span className="text-[#ff3d57]">-{formatTokens(bet.amount)}</span>
                          ) : (
                            <span className="text-gray-500">—</span>
                          )}
                        </td>
                        <td className="px-4 py-2.5 text-center">
                          <Badge variant={betStatusVariant(bet.status)}>{bet.status}</Badge>
                        </td>
                        <td className="px-4 py-2.5 text-right text-gray-500 whitespace-nowrap text-xs">
                          {formatShortDate(bet.createdAt)}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>

              {/* Pagination */}
              {totalPages > 1 && (
                <CardBody className="border-t border-[rgba(61,17,85,0.6)] flex items-center justify-between">
                  <span className="text-xs text-gray-500">
                    Page {betsPage} of {totalPages} · {betsTotal} bets
                  </span>
                  <div className="flex gap-2">
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={betsPage <= 1}
                      onClick={() => setBetsPage((p) => p - 1)}
                    >
                      ← Prev
                    </Button>
                    <Button
                      variant="secondary"
                      size="sm"
                      disabled={betsPage >= totalPages}
                      onClick={() => setBetsPage((p) => p + 1)}
                    >
                      Next →
                    </Button>
                  </div>
                </CardBody>
              )}
            </>
          )}
        </Card>

        {/* ─── Wallet Transactions ──────────────────────────────────────────── */}
        <Card>
          <CardHeader>
            <h2 className="font-bold text-white">Recent Wallet Activity</h2>
          </CardHeader>

          {walletLoading ? (
            <CardBody>
              <div className="space-y-2">
                {Array.from({ length: 4 }).map((_, i) => (
                  <div key={i} className="h-10 bg-white/5 rounded animate-pulse" />
                ))}
              </div>
            </CardBody>
          ) : transactions.length === 0 ? (
            <CardBody>
              <p className="text-gray-500 text-center py-6">No transactions yet.</p>
            </CardBody>
          ) : (
            <ul className="divide-y divide-game-border">
              {transactions.map((tx) => (
                <li
                  key={tx.id}
                  className="px-4 py-3 flex items-center justify-between hover:bg-white/5"
                >
                  <div className="flex items-center gap-3">
                    <Badge variant={txTypeVariant(tx.type)}>{tx.type}</Badge>
                    <span className="text-sm text-gray-300">
                      {tx.description ?? tx.reference ?? '—'}
                    </span>
                  </div>
                  <div className="text-right flex-shrink-0 ml-4">
                    <p
                      className={`font-mono font-bold text-sm ${
                        tx.type === 'credit' ? 'text-[#00e676]' : tx.type === 'debit' ? 'text-[#ff3d57]' : 'text-gray-400'
                      }`}
                    >
                      {tx.type === 'credit' ? '+' : tx.type === 'debit' ? '-' : ''}
                      {formatTokens(tx.amount)}
                    </p>
                    <p className="text-xs text-gray-600">{formatShortDate(tx.createdAt)}</p>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </main>
    </div>
  );
}
