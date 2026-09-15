'use client';
import { useState, useEffect } from 'react';
import { adminApi, type ProfitRiskConfig, type SimulationResult } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { formatTokens } from '@/lib/utils';
import { TrendingUp, Play, Save, AlertTriangle } from 'lucide-react';
import { LineChart, Line, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend } from 'recharts';

export default function ProfitRiskPage() {
  const [config, setConfig] = useState<ProfitRiskConfig>({
    id: '', baseHouseEdge: 8.0, vipAdjustment: 1.5,
    maxPayoutPerRound: 10000, jackpotWeight: 1.0, maxDailyLossPerPlayer: 500,
  });
  const [simulation, setSimulation] = useState<SimulationResult | null>(null);
  const [simLoading, setSimLoading] = useState(false);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  useEffect(() => {
    adminApi.getProfitRisk().then(c => { if (c) setConfig(c); }).catch(() => {});
    adminApi.simulate().then(setSimulation).catch(() => {});
  }, []);

  async function handleSimulate() {
    setSimLoading(true);
    try { setSimulation(await adminApi.simulate()); } finally { setSimLoading(false); }
  }

  async function handleSave() {
    setSaveLoading(true);
    try {
      await adminApi.saveProfitRisk(config);
      setSaveMsg('Configuration saved!');
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }

  const riskColor = simulation?.riskLevel === 'High' ? '#f85149' : simulation?.riskLevel === 'Low' ? '#3fb950' : '#e3b341';

  return (
    <div className="space-y-6">
      {saveMsg && <div className="fixed bottom-6 right-6 bg-game-green text-black font-bold px-4 py-2 rounded-lg z-50">✓ {saveMsg}</div>}

      <div>
        <h1 className="text-2xl font-black text-white">Profit &amp; Risk Engine</h1>
        <p className="text-gray-400 text-sm">Configure global risk and profit parameters for all games</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader>
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <TrendingUp size={18} className="text-brand-400" />
                <h2 className="font-black text-white">Global Configuration</h2>
              </div>
              <span className="flex items-center gap-1.5 text-xs text-game-green font-bold bg-game-green/10 border border-game-green/20 px-2 py-1 rounded-full">
                <span className="w-1.5 h-1.5 rounded-full bg-game-green" /> Active
              </span>
            </div>
          </CardHeader>
          <CardBody className="space-y-4">
            <div className="grid grid-cols-2 gap-4">
              <Input label="Base House Edge (%)" type="number" step="0.1" value={config.baseHouseEdge}
                onChange={e => setConfig(p => ({ ...p, baseHouseEdge: parseFloat(e.target.value) }))} suffix="%" />
              <Input label="VIP Profit Adjustment (%)" type="number" step="0.1" value={config.vipAdjustment}
                onChange={e => setConfig(p => ({ ...p, vipAdjustment: parseFloat(e.target.value) }))} suffix="%" />
              <Input label="Max Payout Per Round" type="number" value={config.maxPayoutPerRound}
                onChange={e => setConfig(p => ({ ...p, maxPayoutPerRound: parseFloat(e.target.value) }))} />
              <div>
                <Input label="Jackpot / RNG Weight" type="number" step="0.1" value={config.jackpotWeight}
                  onChange={e => setConfig(p => ({ ...p, jackpotWeight: parseFloat(e.target.value) }))} />
                <p className="text-xs text-gray-500 mt-1">1.0 = Normal</p>
              </div>
            </div>
            <Input label="Max Daily Loss Per Player" type="number" value={config.maxDailyLossPerPlayer}
              onChange={e => setConfig(p => ({ ...p, maxDailyLossPerPlayer: parseFloat(e.target.value) }))} />

            {config.baseHouseEdge < 3 && (
              <div className="flex items-start gap-2 p-3 bg-game-red/10 border border-game-red/20 rounded-lg text-sm text-game-red">
                <AlertTriangle size={16} className="shrink-0 mt-0.5" />
                Warning: House edge below 3% may result in platform losses at scale.
              </div>
            )}

            <div className="flex gap-3">
              <Button onClick={handleSimulate} loading={simLoading} variant="primary" className="flex-1">
                <Play size={16} /> Simulate Scenario
              </Button>
              <Button onClick={handleSave} loading={saveLoading} variant="gold">
                <Save size={16} /> Save
              </Button>
            </div>
          </CardBody>
        </Card>

        {/* Simulation results */}
        <Card>
          <CardHeader>
            <h2 className="font-black text-white">Scenario Result</h2>
          </CardHeader>
          <CardBody className="space-y-4">
            {simulation ? (
              <>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { label: 'Expected Profit', value: `$${formatTokens(simulation.expectedProfit)}` },
                    { label: 'ROI', value: `${simulation.roi.toFixed(1)}%` },
                    { label: 'Max Exposure', value: `$${formatTokens(simulation.maxExposure)}` },
                    { label: 'Risk Level', value: simulation.riskLevel },
                  ].map(({ label, value }) => (
                    <div key={label} className="bg-game-bg rounded-xl p-3">
                      <p className="text-xs text-gray-400">{label}</p>
                      <p className="text-xl font-black text-white" style={label === 'Risk Level' ? { color: riskColor } : {}}>{value}</p>
                    </div>
                  ))}
                </div>
                <div className="h-48">
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
                {simulation.simulatedAt && (
                  <p className="text-xs text-gray-500 text-right">
                    Last simulation: {new Date(simulation.simulatedAt).toLocaleString()}
                  </p>
                )}
              </>
            ) : (
              <div className="text-center py-16 text-gray-400">
                <Play size={40} className="mx-auto mb-3 opacity-30" />
                <p>Click &quot;Simulate Scenario&quot; to run analysis</p>
              </div>
            )}
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
