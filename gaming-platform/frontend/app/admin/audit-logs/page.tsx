'use client';
import { useState, useEffect } from 'react';
import { adminApi, type AuditLog } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { Shield, ChevronLeft, ChevronRight, ChevronDown } from 'lucide-react';

const ACTION_COLORS: Record<string, 'green' | 'red' | 'blue' | 'gold' | 'gray'> = {
  BET_PLACED: 'blue',
  ROUND_SETTLED: 'green',
  ADMIN_OVERRIDE: 'red',
  PROFIT_RISK_CONFIG_UPDATED: 'gold',
  TOKEN_PACKAGE_CREATED: 'green',
  TOKEN_PACKAGE_UPDATED: 'blue',
  PLAYER_REGISTERED: 'green',
  LOGIN: 'gray',
  WALLET_DEBIT: 'red',
  WALLET_CREDIT: 'green',
  ROUND_CREATED: 'blue',
  ROUND_RESULT_SET: 'gold',
};

export default function AuditLogsPage() {
  const [logs, setLogs] = useState<AuditLog[]>([]);
  const [total, setTotal] = useState(0);
  const [page, setPage] = useState(1);
  const [loading, setLoading] = useState(true);
  const [filters, setFilters] = useState({ action: '', entityType: '' });
  const [expanded, setExpanded] = useState<string | null>(null);

  async function fetchLogs(p = page) {
    setLoading(true);
    try {
      const params: Record<string, string> = { page: String(p), limit: '30' };
      if (filters.action) params.action = filters.action;
      if (filters.entityType) params.entityType = filters.entityType;
      const data = await adminApi.auditLogs(params);
      setLogs(data.logs);
      setTotal(data.total);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { fetchLogs(); }, [page]);

  const pages = Math.ceil(total / 30);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Audit Logs</h1>
        <p className="text-gray-400 text-sm">Complete audit trail — {total.toLocaleString()} entries</p>
      </div>

      {/* Filters */}
      <Card>
        <CardBody>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <Input label="Filter by Action" value={filters.action} onChange={e => setFilters(p => ({ ...p, action: e.target.value }))} placeholder="e.g. BET_PLACED" />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Entity Type</label>
              <select value={filters.entityType} onChange={e => setFilters(p => ({ ...p, entityType: e.target.value }))}
                className="w-full bg-game-bg border border-game-border rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option value="">All</option>
                {['bet', 'round', 'player', 'wallet', 'config', 'token_package'].map(t => (
                  <option key={t} value={t}>{t}</option>
                ))}
              </select>
            </div>
            <div className="flex items-end">
              <Button onClick={() => { setPage(1); fetchLogs(1); }} variant="primary" className="w-full">Apply</Button>
            </div>
          </div>
        </CardBody>
      </Card>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Shield size={16} className="text-brand-400" />
            <h2 className="font-bold text-white">Audit Trail</h2>
          </div>
        </CardHeader>
        <CardBody className="p-0">
          {loading ? (
            <div className="space-y-2 p-4">
              {Array.from({ length: 8 }).map((_, i) => (
                <div key={i} className="h-12 bg-game-border/30 rounded animate-pulse" />
              ))}
            </div>
          ) : (
            <div className="divide-y divide-game-border/50">
              {logs.map(log => (
                <div key={log.id}>
                  <button
                    onClick={() => setExpanded(expanded === log.id ? null : log.id)}
                    className="w-full text-left px-4 py-3 hover:bg-white/5 transition-colors flex items-center gap-3"
                  >
                    <div className="w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold shrink-0"
                      style={{ backgroundColor: '#0ea5e922', color: '#0ea5e9' }}>
                      {log.actorType[0].toUpperCase()}
                    </div>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 flex-wrap">
                        <Badge variant={ACTION_COLORS[log.action] || 'gray'}>
                          {log.action.replace(/_/g, ' ')}
                        </Badge>
                        <span className="text-xs text-gray-400">{log.entityType}</span>
                        {log.entityId && <span className="text-xs text-gray-500 font-mono">{log.entityId.slice(0, 8)}...</span>}
                      </div>
                      <div className="text-xs text-gray-500 mt-0.5">
                        Actor: {log.actorType} {log.actorId ? `(${log.actorId.slice(0, 8)}...)` : ''} · {new Date(log.createdAt).toLocaleString()}
                      </div>
                    </div>
                    <ChevronDown size={14} className={`text-gray-400 transition-transform ${expanded === log.id ? 'rotate-180' : ''}`} />
                  </button>
                  {expanded === log.id && (log.before || log.after) && (
                    <div className="px-4 pb-3 grid grid-cols-2 gap-3">
                      {log.before && (
                        <div className="bg-game-red/5 border border-game-red/20 rounded-lg p-3">
                          <div className="text-xs font-bold text-game-red mb-1">Before</div>
                          <pre className="text-xs text-gray-300 overflow-auto max-h-32">{JSON.stringify(JSON.parse(log.before), null, 2)}</pre>
                        </div>
                      )}
                      {log.after && (
                        <div className="bg-game-green/5 border border-game-green/20 rounded-lg p-3">
                          <div className="text-xs font-bold text-game-green mb-1">After</div>
                          <pre className="text-xs text-gray-300 overflow-auto max-h-32">{JSON.stringify(JSON.parse(log.after), null, 2)}</pre>
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardBody>
        <div className="flex items-center justify-between px-4 py-3 border-t border-game-border">
          <span className="text-xs text-gray-400">{total} total entries</span>
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
