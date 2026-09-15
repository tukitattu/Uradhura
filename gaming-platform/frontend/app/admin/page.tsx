'use client';
import { useState, useEffect } from 'react';
import { adminApi, type DashboardData, type ProfitRiskConfig, type SimulationResult } from '@/lib/api';
import { formatTokens, formatCurrency } from '@/lib/utils';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { cn } from '@/lib/utils';
import {
  Gamepad2, Activity, DollarSign, TrendingUp, Shield, Package,
  Play, Save, ChevronRight, Search,
} from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

// ─── KPI Cards ────────────────────────────────────────────────────────────────

function KpiCard({ title, value, sub, icon: Icon, color, onChange }: {
  title: string; value: string; sub: string;
  icon: React.ElementType; color: string; onChange?: string;
}) {
  return (
    <Card className={cn('border-l-4 cursor-pointer hover:shadow-lg transition-shadow', `border-l-[${color}]`)}>
      <CardBody className="flex items-center gap-4">
        <div className="w-12 h-12 rounded-xl flex items-center justify-center" style={{ backgroundColor: color + '22' }}>
          <Icon size={22} style={{ color }} />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-xs text-gray-400">{title}</p>
          <p className="text-2xl font-black text-white truncate">{value}</p>
          <p className="text-xs text-gray-400">{sub}</p>
        </div>
        <ChevronRight size={16} className="text-gray-500 flex-shrink-0" />
      </CardBody>
    </Card>
  );
}

export default function AdminDashboard() {
  const [dashboard, setDashboard] = useState<DashboardData | null>(null);
  const [config, setConfig] = useState<ProfitRiskConfig>({
    id: '', baseHouseEdge: 8.0, vipAdjustment: 1.5,
    maxPayoutPerRound: 10000, jackpotWeight: 1.0, maxDailyLossPerPlayer: 500,
  });
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [playerSearch, setPlayerSearch] = useState('');
  const [searchedPlayer, setSearchedPlayer] = useState<{
    id: string; username: string; email: string; balance: number;
    totalWon: number; totalLost: number; totalBets: number;
  } | null>(null);
  const [overrideHouseEdge, setOverrideHouseEdge] = useState('8.0');
  const [tokenAdjust, setTokenAdjust] = useState('0');
  const [adjustType, setAdjustType] = useState<'Add' | 'Remove'>('Add');
  const [customLossLimit, setCustomLossLimit] = useState('500');
  const [overrideLoading, setOverrideLoading] = useState(false);
  const [pkgData, setPkgData] = useState({ name: '', priceUsd: 4.99, baseTokens: 500, bonusTokens: 50, isSpecialOffer: false, isPopular: false, expiryDays: 30, isActive: true });
  const [pkgSaveLoading, setPkgSaveLoading] = useState(false);
  const [savedPackages, setSavedPackages] = useState<import('@/lib/api').TokenPackage[]>([]);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    adminApi.dashboard().then(setDashboard).catch(() => {});
    adminApi.getProfitRisk().then((c) => { if (c) setConfig(c); }).catch(() => {});
    // Auto-run simulation on load
    adminApi.simulate().then(setSimulation).catch(() => {});
    adminApi.listTokenPackages().then(setSavedPackages).catch(() => {});
  }, []);

  async function handleSimulate() {
    setSimLoading(true);
    try {
      const result = await adminApi.simulate();
      setSimulation(result);
    } finally {
      setSimLoading(false);
    }
  }

  async function handleSaveConfig() {
    setSaveLoading(true);
    try {
      await adminApi.saveProfitRisk(config);
      setSaveMsg('Saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setSaveLoading(false);
    }
  }

  async function handleSearchPlayer() {
    if (!playerSearch.trim()) return;
    try {
      const data = await adminApi.listPlayers(1, playerSearch);
      if (data.players.length > 0) setSearchedPlayer(data.players[0]);
      else setSearchedPlayer(null);
    } catch { setSearchedPlayer(null); }
  }

  async function handleApplyOverride() {
    if (!searchedPlayer) return;
    setOverrideLoading(true);
    try {
      await adminApi.applyOverride(searchedPlayer.id, {
        houseEdge: parseFloat(overrideHouseEdge),
        customLossLimit: parseFloat(customLossLimit),
        tokenAdjustment: parseFloat(tokenAdjust),
        adjustmentType: adjustType,
        notes: 'Admin override via dashboard',
      });
      setSaveMsg('Override applied!');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setOverrideLoading(false);
    }
  }

  async function handleSavePkg() {
    setPkgSaveLoading(true);
    try {
      await adminApi.saveTokenPackage(pkgData);
      // Refresh packages list and reset form to blank new package
      const updated = await adminApi.listTokenPackages().catch(() => savedPackages);
      setSavedPackages(updated);
      setPkgData({ name: '', priceUsd: 4.99, baseTokens: 500, bonusTokens: 50, isSpecialOffer: false, isPopular: false, expiryDays: 30, isActive: true });
      setSaveMsg('Package saved!');
      setTimeout(() => setSaveMsg(''), 2000);
    } finally {
      setPkgSaveLoading(false);
    }
  }

  const riskColor = simulation?.riskLevel === 'High' ? '#f85149' : simulation?.riskLevel === 'Low' ? '#3fb950' : '#e3b341';

  return (
    <div className="space-y-6">
      {/* KPI Cards */}
      {!dashboard ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          {Array.from({ length: 4 }).map((_, i) => (
            <Card key={i}>
              <CardBody className="flex items-center gap-4">
                <div className="w-12 h-12 rounded-xl bg-game-border animate-pulse" />
                <div className="flex-1 space-y-2">
                  <div className="h-3 bg-game-border rounded animate-pulse w-2/3" />
                  <div className="h-7 bg-game-border rounded animate-pulse w-full" />
                  <div className="h-3 bg-game-border rounded animate-pulse w-1/2" />
                </div>
              </CardBody>
            </Card>
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-4">
          <KpiCard title="Active Games" value={`${dashboard.activeGames}/${dashboard.totalGames}`} sub="● All Online" icon={Gamepad2} color="#0ea5e9" />
          <KpiCard title="Live Rounds" value={String(dashboard.liveRounds)} sub="Active rounds" icon={Activity} color="#3fb950" />
          <KpiCard title="Total Bets (Today)" value={`$ ${formatTokens(dashboard.todayBets.total)}`} sub={`+${dashboard.todayBets.changeVsYesterday}% vs yesterday`} icon={DollarSign} color="#e3b341" />
          <KpiCard title="Net Profit (Today)" value={`$ ${formatTokens(dashboard.netProfit.total)}`} sub={`+${dashboard.netProfit.changeVsYesterday}% vs yesterday`} icon={TrendingUp} color="#8b5cf6" />
        </div>
      )}

      {/* Save message */}
      {saveMsg && (
        <div className="fixed bottom-6 right-6 bg-game-green text-black font-bold px-4 py-2 rounded-lg shadow-lg z-50 animate-bounce-in">
          ✓ {saveMsg}
        </div>
      )}

      {/* Profit & Risk Engine + Scenario */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Profit & Risk Engine */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-brand-400" />
                <div>
                  <h2 className="font-black text-white">Profit &amp; Risk Engine</h2>
                  <p className="text-xs text-gray-400">Configure global risk and profit parameters for all games</p>
                </div>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-game-green font-bold bg-game-green/10 border border-game-green/20 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-game-green" /> Engine Active
              </span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Input label="Base House Edge (%)" type="number" value={config.baseHouseEdge} onChange={e => setConfig({ ...config, baseHouseEdge: parseFloat(e.target.value) })} suffix="%" />
              <Input label="VIP Profit Adjustment (%)" type="number" value={config.vipAdjustment} onChange={e => setConfig({ ...config, vipAdjustment: parseFloat(e.target.value) })} suffix="%" />
              <Input label="Max Payout Per Round" type="number" value={config.maxPayoutPerRound} onChange={e => setConfig({ ...config, maxPayoutPerRound: parseFloat(e.target.value) })} />
              <div>
                <Input label="Jackpot / RNG Weight Control" type="number" value={config.jackpotWeight} step="0.1" onChange={e => setConfig({ ...config, jackpotWeight: parseFloat(e.target.value) })} />
                <p className="text-xs text-gray-500 mt-1">1.0 = Normal (Adjusts jackpot frequency)</p>
              </div>
            </div>
            <Input label="Max Daily Loss Per Player" type="number" value={config.maxDailyLossPerPlayer} onChange={e => setConfig({ ...config, maxDailyLossPerPlayer: parseFloat(e.target.value) })} />
            <div className="flex gap-3">
              <Button onClick={handleSimulate} loading={simLoading} variant="primary" className="flex-1">
                <Play size={16} /> Simulate Profit Scenario
              </Button>
              <Button onClick={handleSaveConfig} loading={saveLoading} variant="gold">
                <Save size={16} /> Save Configuration
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Scenario Result */}
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={20} className="text-game-green" />
                <div>
                  <h2 className="font-black text-white">Scenario Result <span className="text-gray-400 font-normal">(Simulation)</span></h2>
                  {simulation && <p className="text-xs text-gray-400">Last run: {new Date(simulation.simulatedAt ?? Date.now()).toLocaleString()}</p>}
                </div>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {simulation ? (
              <>
                <div className="bg-game-green/10 border border-game-green/20 rounded-lg p-3 flex items-center gap-3">
                  <div className="w-8 h-8 rounded-full bg-game-green/20 flex items-center justify-center">✓</div>
                  <div>
                    <div className="text-sm font-bold text-game-green">Simulation Completed</div>
                    <div className="text-xs text-gray-400">Based on current configuration and {simulation.simulatedRounds.toLocaleString()} simulated rounds</div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Expected Profit', value: `$ ${formatTokens(simulation.expectedProfit)}`, color: 'text-white' },
                    { label: 'ROI', value: `${simulation.roi.toFixed(1)}%`, color: 'text-brand-400' },
                    { label: 'Max Exposure', value: `$ ${formatTokens(simulation.maxExposure)}`, color: 'text-game-red' },
                    { label: 'Risk Level', value: simulation.riskLevel, color: `text-[${riskColor}]` },
                  ].map(({ label, value, color }) => (
                    <div key={label} className="bg-game-bg rounded-lg p-3">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className={cn('text-xl font-black', color)} style={{ color: label === 'Risk Level' ? riskColor : undefined }}>{value}</p>
                    </div>
                  ))}
                </div>

                <div className="h-36">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={simulation.hourlyData}>
                      <CartesianGrid strokeDasharray="3 3" stroke="#30363d" />
                      <XAxis dataKey="hour" tick={{ fill: '#8b949e', fontSize: 10 }} interval={3} />
                      <YAxis tick={{ fill: '#8b949e', fontSize: 10 }} />
                      <Tooltip contentStyle={{ background: '#161b22', border: '1px solid #30363d', borderRadius: 8 }} />
                      <Legend />
                      <Line type="monotone" dataKey="totalBets" stroke="#0ea5e9" strokeWidth={2} dot={false} name="Total Bets" />
                      <Line type="monotone" dataKey="netProfit" stroke="#3fb950" strokeWidth={2} dot={false} name="Net Profit" />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              </>
            ) : (
              <div className="text-center py-12 text-gray-400">
                <TrendingUp size={40} className="mx-auto mb-3 opacity-30" />
                <p>Run a simulation to see results</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>

      {/* Player Override + Admin Control Room */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Player-Specific Override */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 rounded-full bg-brand-500/20 flex items-center justify-center">👤</div>
              <div>
                <h2 className="font-black text-white">Player-Specific Override</h2>
                <p className="text-xs text-gray-400">Apply custom settings for individual players</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            {/* Search */}
            <div className="flex gap-2">
              <Input
                label="Search Player"
                value={playerSearch}
                onChange={e => setPlayerSearch(e.target.value)}
                placeholder="Enter player ID, username or email..."
                onKeyDown={e => e.key === 'Enter' && handleSearchPlayer()}
              />
              <Button onClick={handleSearchPlayer} variant="secondary" className="mt-5 shrink-0">
                <Search size={16} />
              </Button>
            </div>

            {/* Player info or placeholder */}
            <div className="border border-game-border rounded-xl p-4">
              {searchedPlayer ? (
                <div>
                  <div className="flex items-center gap-3 mb-3">
                    <div className="w-10 h-10 rounded-full bg-brand-500/20 flex items-center justify-center text-brand-400 font-bold">
                      {searchedPlayer.username[0]}
                    </div>
                    <div>
                      <div className="font-bold text-white">{searchedPlayer.username}</div>
                      <div className="text-xs text-gray-400">{searchedPlayer.email}</div>
                    </div>
                  </div>
                  <div className="grid grid-cols-4 gap-2 text-center">
                    {[
                      { label: 'Total Bets', value: searchedPlayer.totalBets },
                      { label: 'Total Loss', value: `$${formatTokens(searchedPlayer.totalLost)}` },
                      { label: 'Total Win', value: `$${formatTokens(searchedPlayer.totalWon)}` },
                      { label: 'Balance', value: `$${formatTokens(searchedPlayer.balance)}` },
                    ].map(({ label, value }) => (
                      <div key={label}>
                        <p className="text-[10px] text-gray-400">{label}</p>
                        <p className="text-sm font-bold text-white">{value}</p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-3 text-gray-400">
                  <div className="w-10 h-10 rounded-full bg-game-border flex items-center justify-center">👤</div>
                  <div>
                    <div className="text-sm font-medium">Player Not Selected</div>
                    <div className="text-xs">Search for a player to view details</div>
                  </div>
                </div>
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <Input label="Adjust House Edge (%)" value={overrideHouseEdge} onChange={e => setOverrideHouseEdge(e.target.value)} suffix="%" type="number" />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Add / Remove Tokens</label>
                <div className="flex gap-2">
                  <select value={adjustType} onChange={e => setAdjustType(e.target.value as 'Add' | 'Remove')}
                    className="bg-game-bg border border-game-border rounded-lg px-2 py-2 text-sm text-white focus:outline-none">
                    <option>Add</option>
                    <option>Remove</option>
                  </select>
                  <Input value={tokenAdjust} onChange={e => setTokenAdjust(e.target.value)} type="number" />
                </div>
              </div>
            </div>
            <Input label="Custom Loss Limit" value={customLossLimit} onChange={e => setCustomLossLimit(e.target.value)} type="number" />

            <Button
              onClick={handleApplyOverride}
              disabled={!searchedPlayer}
              loading={overrideLoading}
              variant="danger"
              className="w-full"
            >
              🔒 Apply Player Override
              <span className="text-xs font-normal opacity-70">This action will be locked and audited</span>
            </Button>
          </CardBody>
        </Card>

        {/* Admin Control Room */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="w-8 h-8 bg-brand-500/20 rounded-lg flex items-center justify-center">⚙️</div>
              <div>
                <h2 className="font-black text-white">Admin Control Room</h2>
                <p className="text-xs text-gray-400">Manage core configuration areas</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="grid grid-cols-2 gap-3">
            {[
              { icon: <Shield size={24} className="text-brand-400" />, title: 'Manage Profit & Risk Rules', desc: 'Configure global and game-specific profit & risk parameters', href: '/admin/profit-risk' },
              { icon: <Package size={24} className="text-game-gold" />, title: 'Manage Token Packages', desc: 'Create, edit and manage token packages for store', href: '/admin/token-packages' },
            ].map(({ icon, title, desc, href }) => (
              <a key={href} href={href} className="flex flex-col p-4 bg-game-bg rounded-xl border border-game-border hover:border-brand-500/50 transition-all group">
                <div className="mb-3">{icon}</div>
                <div className="font-bold text-sm text-white mb-1">{title}</div>
                <div className="text-xs text-gray-400 flex-1">{desc}</div>
                <div className="mt-3 text-brand-400 text-xs flex items-center gap-1 group-hover:gap-2 transition-all">
                  Manage <ChevronRight size={12} />
                </div>
              </a>
            ))}
          </CardBody>
        </Card>
      </div>

      {/* Token Package Builder */}
      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <div className="text-2xl">🪙</div>
              <div>
                <h2 className="font-black text-white">Token Package Builder {savedPackages.length > 0 && <span className="text-sm font-normal text-gray-400">({savedPackages.length} package{savedPackages.length !== 1 ? 's' : ''})</span>}</h2>
                <p className="text-xs text-gray-400">Create and manage token packages</p>
              </div>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <div className="col-span-2">
                <Input label="Package Name" value={pkgData.name} onChange={e => setPkgData({ ...pkgData, name: e.target.value })} />
              </div>
              <Input label="Price (USD)" type="number" value={pkgData.priceUsd} onChange={e => setPkgData({ ...pkgData, priceUsd: parseFloat(e.target.value) })} suffix="$" />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Special Offer</label>
                <div className="flex items-center gap-3">
                  <button onClick={() => setPkgData({ ...pkgData, isSpecialOffer: !pkgData.isSpecialOffer })}
                    className={cn('w-12 h-6 rounded-full transition-colors relative', pkgData.isSpecialOffer ? 'bg-game-green' : 'bg-gray-600')}>
                    <div className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform', pkgData.isSpecialOffer ? 'translate-x-6' : 'translate-x-0.5')} />
                  </button>
                  {pkgData.isPopular && <span className="bg-game-red text-white text-xs font-bold px-2 py-0.5 rounded">Popular</span>}
                </div>
              </div>
              <Input label="Base Tokens" type="number" value={pkgData.baseTokens} onChange={e => setPkgData({ ...pkgData, baseTokens: parseInt(e.target.value) })} />
              <Input label="Bonus Tokens" type="number" value={pkgData.bonusTokens} onChange={e => setPkgData({ ...pkgData, bonusTokens: parseInt(e.target.value) })} />
              <Input label="Expiry (Days)" type="number" value={pkgData.expiryDays} onChange={e => setPkgData({ ...pkgData, expiryDays: parseInt(e.target.value) })} />
              <div>
                <label className="block text-xs text-gray-400 mb-1">Status</label>
                <div className="flex items-center gap-2">
                  <button onClick={() => setPkgData({ ...pkgData, isActive: !pkgData.isActive })}
                    className={cn('w-12 h-6 rounded-full transition-colors relative', pkgData.isActive ? 'bg-game-green' : 'bg-gray-600')}>
                    <div className={cn('absolute top-0.5 w-5 h-5 bg-white rounded-full transition-transform', pkgData.isActive ? 'translate-x-6' : 'translate-x-0.5')} />
                  </button>
                  <span className="text-sm text-gray-300">{pkgData.isActive ? 'Active (Show in Store)' : 'Inactive'}</span>
                </div>
              </div>
            </div>
            <div className="flex gap-3">
              <Button onClick={handleSavePkg} loading={pkgSaveLoading} variant="primary" className="flex-1">
                💾 Save &amp; Show in Store
              </Button>
              <Button onClick={() => {}} variant="secondary">
                👁 Preview Package
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Package Preview */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-3">
              <span className="text-lg">👁</span>
              <h2 className="font-black text-white">Package Preview</h2>
            </div>
          </CardHeader>
          <CardBody className="flex flex-col items-center gap-4">
            {/* Store card preview */}
            <div className="relative w-56 rounded-2xl overflow-hidden border-2 border-game-border"
              style={{ background: 'linear-gradient(135deg, #1a1f3e 0%, #2d1b69 100%)' }}>
              {pkgData.isPopular && (
                <div className="absolute top-3 left-3 bg-game-red text-white text-xs font-black px-2 py-0.5 rounded">POPULAR</div>
              )}
              <div className="p-5 text-center">
                <div className="text-5xl mb-3">🪙</div>
                <div className="text-xl font-black text-white mb-2">{pkgData.name}</div>
                <div className="flex items-end justify-center gap-2 mb-1">
                  <span className="text-4xl font-black text-game-gold">{pkgData.baseTokens.toLocaleString()}</span>
                  <span className="text-sm text-gray-400 mb-1">Tokens</span>
                  {pkgData.bonusTokens > 0 && (
                    <>
                      <span className="text-2xl text-gray-400">+</span>
                      <span className="text-3xl font-black text-game-green">{pkgData.bonusTokens}</span>
                      <span className="text-sm text-gray-400 mb-1">Tokens</span>
                    </>
                  )}
                </div>
                <button className="w-full bg-brand-500 text-white font-bold py-2 rounded-xl mt-2">
                  $ {pkgData.priceUsd.toFixed(2)}
                </button>
                <div className="text-xs text-gray-500 mt-2">⏱ Valid for {pkgData.expiryDays} days</div>
              </div>
            </div>

            {/* Benefits list */}
            <div className="w-full">
              <h3 className="text-sm font-bold mb-2">Package Benefits</h3>
              <ul className="space-y-1">
                {[
                  `${pkgData.baseTokens} Base Tokens`,
                  pkgData.bonusTokens > 0 && `+${pkgData.bonusTokens} Bonus Tokens`,
                  pkgData.isSpecialOffer && 'Special Offer',
                  `Valid for ${pkgData.expiryDays} days`,
                  pkgData.isActive && 'Visible in Store',
                ].filter(Boolean).map((b, i) => (
                  <li key={i} className="flex items-center gap-2 text-sm text-gray-300">
                    <span className="text-game-green">✓</span> {b}
                  </li>
                ))}
              </ul>
            </div>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
