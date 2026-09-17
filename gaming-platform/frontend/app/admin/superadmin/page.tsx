'use client';
import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { useAuth } from '@/hooks/useAuth';
import {
  superAdminApi,
  adminAuthApi,
  type DesignToken,
  type GameWithBranding,
  type FeatureFlag,
  type PlatformStats,
  type AdminAuthorizationRequest,
} from '@/lib/api';
import { cn, formatTokens } from '@/lib/utils';
import {
  Palette, Gamepad2, Flag, BarChart3, Save, Plus, Trash2,
  RefreshCw, Eye, EyeOff, Sparkles, Crown, Shield, Layers,
  ChevronDown, ChevronRight, Copy, Check, X, Upload,
} from 'lucide-react';

// ─── Token → CSS variable map (mirrors DesignTokenProvider) ──────────────────
const TOKEN_TO_CSS: Record<string, string> = {
  bgPrimary:     '--dl-bg',
  bgSecondary:   '--dl-surface',
  bgCard:        '--dl-card',
  borderColor:   '--dl-border',
  primaryColor:  '--dl-pink',
  accentColor:   '--dl-purple',
  goldColor:     '--dl-gold',
  successColor:  '--dl-green',
  dangerColor:   '--dl-red',
  textPrimary:   '--dl-text',
  textMuted:     '--dl-text-muted',
  bgGradient:    '--dl-bg-gradient',
  cardGradient:  '--dl-card-gradient',
  btnPrimaryGrad:'--dl-btn-primary',
  btnGoldGrad:   '--dl-btn-gold',
  glowPrimary:   '--dl-glow-primary',
  borderRadius:  '--dl-radius',
};

// ─── Design token scope definitions ──────────────────────────────────────────
const SCOPES = [
  { id: 'global',           label: 'Global Theme',       icon: '🌍', desc: 'Applies everywhere' },
  { id: 'page:games',       label: 'Games Lobby',        icon: '🎮', desc: 'Player game selection page' },
  { id: 'page:admin',       label: 'Admin Panel',        icon: '⚙️',  desc: 'All admin pages' },
  { id: 'page:login',       label: 'Login / Register',   icon: '🔐', desc: 'Auth pages' },
  { id: 'page:profile',     label: 'Player Profile',     icon: '👤', desc: 'Profile & history' },
  { id: 'game:greedy',      label: 'Greedy Game',        icon: '🐷', desc: 'Greedy game UI' },
  { id: 'game:animal-wheel',label: 'Animal Wheel',       icon: '🐯', desc: 'Animal wheel game UI' },
  { id: 'game:teen-patti',  label: 'Teen Patti',         icon: '🃏', desc: 'Teen Patti game UI' },
  { id: 'game:food-wheel',  label: 'Food Wheel',         icon: '🍜', desc: 'Food wheel game UI' },
  { id: 'game:three-card',  label: 'Three Card',         icon: '🎴', desc: 'Three card game UI' },
  { id: 'game:slot',        label: 'Slot Machine',       icon: '🎰', desc: 'Slot machine game UI' },
];

const TOKEN_TEMPLATES = [
  { key: 'bgPrimary',       label: 'Background Primary',  type: 'color',    default: '#0a0010' },
  { key: 'bgSecondary',     label: 'Background Secondary',type: 'color',    default: '#1a0028' },
  { key: 'bgCard',          label: 'Card Background',     type: 'color',    default: '#12001e' },
  { key: 'borderColor',     label: 'Border Color',        type: 'color',    default: '#3d1155' },
  { key: 'primaryColor',    label: 'Primary Accent',      type: 'color',    default: '#ff1fa6' },
  { key: 'accentColor',     label: 'Secondary Accent',    type: 'color',    default: '#8b00ff' },
  { key: 'goldColor',       label: 'Gold / Win Color',    type: 'color',    default: '#ffd700' },
  { key: 'successColor',    label: 'Success Color',       type: 'color',    default: '#00e676' },
  { key: 'dangerColor',     label: 'Danger Color',        type: 'color',    default: '#ff3d57' },
  { key: 'textPrimary',     label: 'Text Primary',        type: 'color',    default: '#ffffff' },
  { key: 'textMuted',       label: 'Text Muted',          type: 'color',    default: 'rgba(255,255,255,0.45)' },
  { key: 'bgGradient',      label: 'Page Gradient',       type: 'gradient', default: 'radial-gradient(ellipse at 50% 0%, #3d0060 0%, #0a0010 70%)' },
  { key: 'cardGradient',    label: 'Card Gradient',       type: 'gradient', default: 'linear-gradient(135deg, #1a0028 0%, #0f0018 100%)' },
  { key: 'btnPrimaryGrad',  label: 'Primary Button',      type: 'gradient', default: 'linear-gradient(135deg, #ff1fa6 0%, #e000c0 100%)' },
  { key: 'btnGoldGrad',     label: 'Gold Button',         type: 'gradient', default: 'linear-gradient(135deg, #ffd700 0%, #ff8c00 50%, #ffd700 100%)' },
  { key: 'glowPrimary',     label: 'Primary Glow',        type: 'text',     default: '0 0 20px rgba(255,31,166,0.5)' },
  { key: 'borderRadius',    label: 'Card Radius',         type: 'text',     default: '16px' },
];

const DEFAULT_FEATURE_FLAGS = [
  { key: 'auto_bet',           label: 'Auto Bet',           description: 'Allow players to enable automatic betting', enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'hot_options',        label: 'HOT Labels',         description: 'Show HOT badge on trending options',        enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'big_winner_board',   label: 'Big Winner Board',   description: 'Show big winners on Food Wheel',            enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'demo_topup',         label: 'Demo Top Up',        description: 'Show demo top-up button for players',       enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'player_profile',     label: 'Player Profile Page',description: 'Enable /profile page',                     enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'result_history',     label: 'Result History Strip',description:'Show recent results on wheel games',         enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'today_earnings',     label: 'Today\'s Earnings',  description: 'Show today\'s stats on lobby',              enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'sound_control',      label: 'Sound Controls',     description: 'Show mute/unmute in game header',           enabled: true,  allowedRoles: 'player,admin,super_admin' },
  { key: 'admin_force_result', label: 'Force Result (Admin)',description:'Allow admin to force-set round results',     enabled: true,  allowedRoles: 'admin,super_admin' },
  { key: 'player_override',    label: 'Player Override',    description: 'Allow per-player rule overrides',           enabled: true,  allowedRoles: 'admin,super_admin' },
  { key: 'profit_simulation',  label: 'Profit Simulation',  description: 'Enable profit scenario simulation',         enabled: true,  allowedRoles: 'admin,super_admin' },
  { key: 'csv_export',         label: 'CSV Export',         description: 'Enable bet report CSV download',            enabled: true,  allowedRoles: 'admin,super_admin' },
];

// ─── Live Preview Component ───────────────────────────────────────────────────
function LivePreview({ colors }: {
  colors: {
    bgPrimary: string; bgCard: string; primaryColor: string;
    accentColor: string; goldColor: string; bgGradient: string;
    btnPrimaryGrad: string;
  }
}) {
  return (
    <div className="sticky top-6 space-y-3">
      <h3 className="text-xs font-black text-[rgba(255,255,255,0.5)] uppercase tracking-widest flex items-center gap-2">
        <Eye size={12}/> Live Preview
      </h3>

      {/* Mini game lobby preview */}
      <div className="rounded-2xl overflow-hidden border border-[rgba(61,17,85,0.5)] shadow-2xl" style={{ background: colors.bgGradient }}>
        {/* Header bar */}
        <div className="px-3 py-2 flex items-center justify-between" style={{ background: colors.bgCard + 'dd', borderBottom: `1px solid rgba(61,17,85,0.4)` }}>
          <div className="text-xs font-black text-white">🎮 GameZone</div>
          <div className="px-2 py-0.5 rounded text-[9px] font-black text-[#1a0028]" style={{ background: colors.goldColor }}>🪙 5,000</div>
        </div>

        {/* Mini game cards */}
        <div className="p-2 grid grid-cols-3 gap-1.5">
          {[
            { e:'🐷', n:'Greedy' },
            { e:'🐯', n:'Animal' },
            { e:'🃏', n:'Patti' },
            { e:'🍜', n:'Food' },
            { e:'🎴', n:'3 Card' },
            { e:'🎰', n:'Slots' },
          ].map((g, i) => (
            <div key={i} className="rounded-xl p-2 text-center border transition-all"
              style={{
                background: `linear-gradient(135deg, ${colors.bgCard} 0%, ${colors.bgPrimary} 100%)`,
                borderColor: i === 0 ? colors.primaryColor + '80' : `rgba(61,17,85,0.6)`,
                boxShadow: i === 0 ? `0 0 8px ${colors.primaryColor}40` : undefined
              }}>
              <div className="text-lg">{g.e}</div>
              <div className="text-[8px] font-bold text-white truncate">{g.n}</div>
              <div className="text-[7px] mt-0.5 font-bold px-1 rounded-full" style={{ background: colors.primaryColor + '20', color: colors.primaryColor }}>LIVE</div>
            </div>
          ))}
        </div>
      </div>

      {/* Mini button preview */}
      <div className="rounded-xl p-3 border border-[rgba(61,17,85,0.5)] space-y-2" style={{ background: colors.bgCard }}>
        <div className="text-[9px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide mb-1">Buttons</div>
        <button className="w-full py-1.5 rounded-lg text-xs font-black text-white" style={{ background: colors.btnPrimaryGrad }}>Primary Button</button>
        <button className="w-full py-1.5 rounded-lg text-xs font-black text-[#1a0028]" style={{ background: colors.goldColor }}>Gold Button</button>
      </div>

      {/* Color swatches */}
      <div className="rounded-xl p-3 border border-[rgba(61,17,85,0.5)]" style={{ background: colors.bgCard }}>
        <div className="text-[9px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide mb-2">Palette</div>
        <div className="flex gap-1.5 flex-wrap">
          {(Object.entries(colors) as [string, string][]).filter(([k]) => !k.includes('Grad') && !k.includes('gradient')).map(([key, val]) => (
            <div key={key} className="group relative">
              <div className="w-6 h-6 rounded-lg border border-white/10 cursor-pointer" style={{ backgroundColor: val }} title={key}/>
              <div className="absolute -top-6 left-1/2 -translate-x-1/2 bg-black text-white text-[8px] px-1 rounded opacity-0 group-hover:opacity-100 whitespace-nowrap pointer-events-none">
                {key}
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

// ─── Gradient Builder Component ───────────────────────────────────────────────
function GradientBuilder({ value, onChange }: { value: string; onChange: (v: string) => void }) {
  const [type, setType] = useState<'linear'|'radial'>('linear');
  const [angle, setAngle] = useState(135);
  const [stops, setStops] = useState([
    { color: '#ff1fa6', pos: 0 },
    { color: '#8b00ff', pos: 100 },
  ]);

  const build = useCallback(() => {
    const stopStr = stops.map(s => `${s.color} ${s.pos}%`).join(', ');
    return type === 'linear'
      ? `linear-gradient(${angle}deg, ${stopStr})`
      : `radial-gradient(ellipse at 50% 50%, ${stopStr})`;
  }, [type, angle, stops]);

  useEffect(() => { onChange(build()); }, [build]);

  const addStop = () => setStops(p => [...p, { color: '#ffffff', pos: 50 }]);
  const removeStop = (i: number) => setStops(p => p.filter((_,j)=>j!==i));
  const updateStop = (i: number, field: 'color'|'pos', val: string|number) =>
    setStops(p => p.map((s,j)=>j===i?{...s,[field]:val}:s));

  return (
    <div className="space-y-3">
      {/* Preview */}
      <div className="h-12 rounded-xl border border-[rgba(61,17,85,0.6)] shadow-inner" style={{ background: build() }}/>

      <div className="flex gap-2">
        {(['linear','radial'] as const).map(t=>(
          <button key={t} onClick={()=>setType(t)}
            className={cn('flex-1 py-1.5 rounded-lg text-xs font-bold border transition-all',
              type===t?'bg-[rgba(255,31,166,0.2)] border-[rgba(255,31,166,0.5)] text-[#ff1fa6]':'border-[rgba(61,17,85,0.6)] text-[rgba(255,255,255,0.5)] hover:text-white')}>
            {t.charAt(0).toUpperCase()+t.slice(1)}
          </button>
        ))}
      </div>

      {type==='linear'&&(
        <div className="space-y-1">
          <label className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">Angle: {angle}°</label>
          <input type="range" min="0" max="360" value={angle} onChange={e=>setAngle(Number(e.target.value))}
            className="w-full accent-[#ff1fa6] cursor-pointer"/>
        </div>
      )}

      <div className="space-y-2">
        <div className="flex items-center justify-between">
          <label className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide">Color Stops</label>
          <button onClick={addStop} className="flex items-center gap-1 text-xs text-[#ff1fa6] hover:text-[#ff52bf]">
            <Plus size={11}/> Add Stop
          </button>
        </div>
        {stops.map((s,i)=>(
          <div key={i} className="flex items-center gap-2">
            <input type="color" value={s.color} onChange={e=>updateStop(i,'color',e.target.value)}
              className="w-9 h-9 rounded-lg cursor-pointer border-2 border-[rgba(61,17,85,0.6)] bg-transparent"/>
            <input type="range" min="0" max="100" value={s.pos} onChange={e=>updateStop(i,'pos',Number(e.target.value))}
              className="flex-1 accent-[#ff1fa6] cursor-pointer"/>
            <span className="text-[10px] text-[rgba(255,255,255,0.4)] w-8 text-right">{s.pos}%</span>
            {stops.length>2&&(
              <button onClick={()=>removeStop(i)} className="text-[rgba(255,61,87,0.6)] hover:text-[#ff3d57]"><X size={13}/></button>
            )}
          </div>
        ))}
      </div>

      <div className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.03)] border border-[rgba(61,17,85,0.4)]">
        <span className="text-[9px] text-[rgba(255,255,255,0.3)] font-mono flex-1 truncate">{build()}</span>
        <button onClick={()=>navigator.clipboard.writeText(build())} className="text-[rgba(255,255,255,0.3)] hover:text-white shrink-0">
          <Copy size={11}/>
        </button>
      </div>
    </div>
  );
}

// ─── Color Token Row ──────────────────────────────────────────────────────────
function TokenRow({ tpl, token, scopeId, onSave }: {
  tpl: typeof TOKEN_TEMPLATES[0];
  token?: DesignToken;
  scopeId: string;
  onSave: (scope: string, key: string, value: string, label: string) => void;
}) {
  const [value, setValue] = useState(token?.value || tpl.default);
  const [showGrad, setShowGrad] = useState(false);
  const [saving, setSaving] = useState(false);
  const [saved, setSaved] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await onSave(scopeId, tpl.key, value, tpl.label); setSaved(true); setTimeout(()=>setSaved(false),2000); }
    finally { setSaving(false); }
  }

  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[rgba(255,255,255,0.02)] border border-[rgba(61,17,85,0.3)] hover:border-[rgba(61,17,85,0.6)] transition-all">
      {/* Preview swatch */}
      {tpl.type==='color'
        ? <div className="w-9 h-9 rounded-lg border-2 border-[rgba(61,17,85,0.6)] shrink-0 shadow-inner"
            style={{ background: value }}/>
        : <div className="w-9 h-9 rounded-lg border-2 border-[rgba(61,17,85,0.6)] shrink-0"
            style={{ background: tpl.type==='gradient' ? value : undefined, backgroundColor: tpl.type==='text'?'rgba(255,255,255,0.08)':undefined }}/>
      }

      <div className="flex-1 min-w-0 space-y-2">
        <div className="flex items-center justify-between">
          <span className="text-xs font-bold text-white">{tpl.label}</span>
          <span className="text-[9px] text-[rgba(255,255,255,0.25)] font-mono uppercase">{tpl.key}</span>
        </div>

        {tpl.type==='color' ? (
          <div className="flex items-center gap-2">
            <input type="color" value={value.startsWith('#')?value:'#ff1fa6'} onChange={e=>setValue(e.target.value)}
              className="w-8 h-8 rounded cursor-pointer border border-[rgba(61,17,85,0.6)] bg-transparent"/>
            <input value={value} onChange={e=>setValue(e.target.value)}
              className="flex-1 dl-input text-xs py-1.5 font-mono" placeholder="#000000 or rgba(...)"/>
          </div>
        ) : tpl.type==='gradient' ? (
          <div>
            <div className="flex items-center gap-2 mb-2">
              <input value={value} onChange={e=>setValue(e.target.value)}
                className="flex-1 dl-input text-xs py-1.5 font-mono" placeholder="linear-gradient(...)"/>
              <button onClick={()=>setShowGrad(!showGrad)}
                className={cn('px-2.5 py-1.5 rounded-lg text-xs border transition-all',
                  showGrad?'bg-[rgba(255,31,166,0.15)] border-[rgba(255,31,166,0.4)] text-[#ff1fa6]':'border-[rgba(61,17,85,0.6)] text-[rgba(255,255,255,0.5)] hover:text-white')}>
                Builder
              </button>
            </div>
            {showGrad&&<GradientBuilder value={value} onChange={setValue}/>}
          </div>
        ) : (
          <input value={value} onChange={e=>setValue(e.target.value)}
            className="w-full dl-input text-xs py-1.5 font-mono" placeholder="CSS value"/>
        )}
      </div>

      <button onClick={handleSave} disabled={saving}
        className={cn('shrink-0 w-8 h-8 rounded-lg flex items-center justify-center border transition-all',
          saved?'bg-[rgba(0,230,118,0.2)] border-[rgba(0,230,118,0.4)] text-[#00e676]':
          'bg-[rgba(255,31,166,0.1)] border-[rgba(255,31,166,0.3)] text-[#ff1fa6] hover:bg-[rgba(255,31,166,0.2)]')}>
        {saving?<RefreshCw size={12} className="animate-spin"/>:saved?<Check size={12}/>:<Save size={12}/>}
      </button>
    </div>
  );
}

// ─── Main Page ────────────────────────────────────────────────────────────────
const TABS = [
  { id:'design',   label:'Design System', icon:Palette     },
  { id:'games',    label:'Game Branding', icon:Gamepad2    },
  { id:'flags',    label:'Feature Flags', icon:Flag        },
  { id:'stats',    label:'Platform Stats',icon:BarChart3   },
] as const;

type Tab = typeof TABS[number]['id'];

export default function SuperAdminPage() {
  const { player, loading } = useAuth();
  const router = useRouter();
  const [tab, setTab] = useState<Tab>('design');
  const [tokens, setTokens] = useState<DesignToken[]>([]);
  const [games, setGames] = useState<GameWithBranding[]>([]);
  const [flags, setFlags] = useState<FeatureFlag[]>([]);
  const [stats, setStats] = useState<PlatformStats | null>(null);
  const [adminRequests, setAdminRequests] = useState<AdminAuthorizationRequest[]>([]);
  const [selectedScope, setSelectedScope] = useState('global');
  const [selectedGame, setSelectedGame] = useState<GameWithBranding | null>(null);
  const [toast, setToast] = useState('');
  const [dataLoading, setDataLoading] = useState(true);
  const [newFlagForm, setNewFlagForm] = useState({ key:'', label:'', description:'', allowedRoles:'player,admin,super_admin' });
  const [showNewFlag, setShowNewFlag] = useState(false);

  // Guard — super_admin only
  useEffect(()=>{
    if (!loading && (!player || player.role !== 'super_admin')) router.push('/admin');
  },[player,loading,router]);

  const showToast = (msg: string) => { setToast(msg); setTimeout(()=>setToast(''), 2500); };

  const loadAll = useCallback(async () => {
    setDataLoading(true);
    try {
      const [t, g, f, s, r] = await Promise.all([
        superAdminApi.getTokens(),
        superAdminApi.getGameBrandings(),
        superAdminApi.getFlags(),
        superAdminApi.getStats(),
        adminAuthApi.getRequests(),
      ]);
      setTokens(t); setGames(g); setFlags(f); setStats(s); setAdminRequests(r);
    } catch (err) { showToast('Failed to load — check super_admin role'); }
    finally { setDataLoading(false); }
  }, []);

  // Seed default feature flags if none exist
  const seedFlags = useCallback(async (existing: FeatureFlag[]) => {
    const existingKeys = new Set(existing.map(f=>f.key));
    const toSeed = DEFAULT_FEATURE_FLAGS.filter(f=>!existingKeys.has(f.key));
    if (!toSeed.length) return;
    for (const f of toSeed) { try { await superAdminApi.saveFlag(f); } catch {} }
    const updated = await superAdminApi.getFlags();
    setFlags(updated);
  }, []);

  useEffect(()=>{ if (player?.role==='super_admin') loadAll(); }, [player, loadAll]);
  useEffect(()=>{ if (flags.length===0 && !dataLoading) seedFlags(flags); }, [flags, dataLoading, seedFlags]);
  useEffect(()=>{ if (games.length && !selectedGame) setSelectedGame(games[0]); }, [games]);

  async function handleSaveToken(scope: string, key: string, value: string, label: string) {
    await superAdminApi.saveToken({ scope, key, value, label });
    const updated = await superAdminApi.getTokens();
    setTokens(updated);
    showToast(`✓ ${label} saved`);
  }

  async function handleSaveBranding(slug: string, data: Record<string,unknown>) {
    await superAdminApi.saveGameBranding(slug, data);
    const updated = await superAdminApi.getGameBrandings();
    setGames(updated);
    setSelectedGame(updated.find(g=>g.slug===slug)||null);
    showToast('✓ Game branding saved');
  }

  async function handleToggleFlag(flag: FeatureFlag) {
    await superAdminApi.saveFlag({ ...flag, enabled: !flag.enabled });
    setFlags(p => p.map(f=>f.id===flag.id?{...f,enabled:!f.enabled}:f));
    showToast(`${!flag.enabled?'Enabled':'Disabled'}: ${flag.label}`);
  }

  async function handleSaveNewFlag() {
    if (!newFlagForm.key || !newFlagForm.label) return;
    await superAdminApi.saveFlag(newFlagForm);
    const updated = await superAdminApi.getFlags();
    setFlags(updated);
    setNewFlagForm({ key:'', label:'', description:'', allowedRoles:'player,admin,super_admin' });
    setShowNewFlag(false);
    showToast('✓ Feature flag created');
  }

  async function handleDeleteFlag(id: string) {
    if (!confirm('Delete this feature flag?')) return;
    await superAdminApi.deleteFlag(id);
    setFlags(p=>p.filter(f=>f.id!==id));
    showToast('Flag deleted');
  }

  async function handleAdminRequest(action: 'approve' | 'reject', requestId: string) {
    if (action === 'approve') {
      await adminAuthApi.approve(requestId, 'Approved by super admin');
      showToast('Admin request approved');
    } else {
      await adminAuthApi.reject(requestId, 'Rejected by super admin');
      showToast('Admin request rejected');
    }

    const refreshed = await adminAuthApi.getRequests();
    setAdminRequests(refreshed);
  }

  const scopeTokens = tokens.filter(t=>t.scope===selectedScope);

  if (loading || !player || player.role !== 'super_admin') return null;

  return (
    <div className="space-y-6">
      {/* Toast */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 dl-card-glow rounded-xl px-5 py-3 text-sm font-bold text-white bounce-in shadow-2xl">
          {toast}
        </div>
      )}

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <div className="flex items-center gap-3 mb-1">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[#ffd700] to-[#ff8c00] flex items-center justify-center glow-gold">
              <Crown size={20} className="text-[#1a0028]"/>
            </div>
            <div>
              <h1 className="text-2xl font-black text-white">Super Admin Panel</h1>
              <p className="text-[rgba(255,255,255,0.4)] text-xs">Full platform control · Design system · Game branding · Feature management</p>
            </div>
          </div>
          <div className="flex items-center gap-2 mt-2">
            <Shield size={12} className="text-[#ffd700]"/>
            <span className="text-xs text-[rgba(255,255,255,0.4)]">Restricted to <span className="text-[#ffd700] font-bold">super_admin</span> role only</span>
          </div>
        </div>
        <button onClick={loadAll} disabled={dataLoading}
          className="flex items-center gap-2 text-xs text-[rgba(255,255,255,0.5)] hover:text-white border border-[rgba(61,17,85,0.6)] px-3 py-2 rounded-xl transition-all">
          <RefreshCw size={13} className={dataLoading?'animate-spin':''}/> Refresh
        </button>
      </div>

      <div className="rounded-2xl border border-[rgba(61,17,85,0.45)] bg-[rgba(255,255,255,0.03)] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-[rgba(255,255,255,0.4)]">Admin approvals</p>
            <h2 className="text-lg font-black text-white">Pending admin requests</h2>
          </div>
          <span className="rounded-full border border-[rgba(255,215,0,0.35)] bg-[rgba(255,215,0,0.08)] px-2.5 py-1 text-[10px] font-black uppercase tracking-[0.15em] text-[#ffd700]">
            {adminRequests.filter(r => r.status === 'pending').length} pending
          </span>
        </div>

        <div className="mt-4 space-y-2">
          {adminRequests.length === 0 ? (
            <div className="rounded-xl border border-dashed border-[rgba(61,17,85,0.5)] bg-[rgba(255,255,255,0.02)] p-3 text-sm text-[rgba(255,255,255,0.45)]">
              No admin authorization requests yet.
            </div>
          ) : (
            adminRequests.map((request) => (
              <div key={request.id} className="rounded-xl border border-[rgba(61,17,85,0.45)] bg-[rgba(255,255,255,0.02)] p-3">
                <div className="flex flex-col gap-3 md:flex-row md:items-center md:justify-between">
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-bold text-white">{request.player?.username || 'Unknown user'}</span>
                      <span className="text-[9px] uppercase tracking-[0.12em] text-[rgba(255,255,255,0.4)]">{request.status}</span>
                    </div>
                    <div className="text-xs text-[rgba(255,255,255,0.45)]">{request.player?.email || 'No email'}</div>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="rounded-full border border-[rgba(255,31,166,0.35)] bg-[rgba(255,31,166,0.08)] px-2 py-1 text-[9px] font-bold uppercase tracking-[0.12em] text-[#ff1fa6]">
                      {request.requestedRole}
                    </span>
                    {request.status === 'pending' && (
                      <>
                        <button onClick={() => handleAdminRequest('approve', request.id)} className="rounded-lg bg-[rgba(0,230,118,0.12)] border border-[rgba(0,230,118,0.35)] px-3 py-1.5 text-xs font-bold text-[#00e676]">Approve</button>
                        <button onClick={() => handleAdminRequest('reject', request.id)} className="rounded-lg bg-[rgba(255,61,87,0.12)] border border-[rgba(255,61,87,0.35)] px-3 py-1.5 text-xs font-bold text-[#ff3d57]">Reject</button>
                      </>
                    )}
                  </div>
                </div>

                {request.notes && (
                  <div className="mt-3 rounded-lg bg-[rgba(255,255,255,0.02)] p-2 text-xs text-[rgba(255,255,255,0.65)]">{request.notes}</div>
                )}
              </div>
            ))
          )}
        </div>
      </div>

      {/* Tabs */}
      <div className="flex gap-1 bg-[rgba(255,255,255,0.03)] rounded-2xl p-1 border border-[rgba(61,17,85,0.4)]">
        {TABS.map(t=>(
          <button key={t.id} onClick={()=>setTab(t.id)}
            className={cn('flex-1 flex items-center justify-center gap-2 py-2.5 rounded-xl text-sm font-bold transition-all',
              tab===t.id
                ? 'bg-gradient-to-br from-[#ff1fa6] to-[#8b00ff] text-white shadow-lg'
                : 'text-[rgba(255,255,255,0.4)] hover:text-white hover:bg-[rgba(255,255,255,0.05)]')}>
            <t.icon size={14}/> <span className="hidden sm:inline">{t.label}</span>
          </button>
        ))}
      </div>

      {/* ── Design System Tab ─────────────────────────────────────────────── */}
      {tab==='design' && (
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-6">
          {/* Scope selector */}
          <div className="xl:col-span-1">
            <div className="dl-card rounded-2xl p-4 space-y-1 sticky top-6">
              <h3 className="text-xs font-black text-[rgba(255,255,255,0.5)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Layers size={12}/> Scopes
              </h3>
              {SCOPES.map(s=>(
                <button key={s.id} onClick={()=>setSelectedScope(s.id)}
                  className={cn('w-full flex items-center gap-3 px-3 py-2.5 rounded-xl text-sm transition-all text-left',
                    selectedScope===s.id
                      ? 'bg-[rgba(255,31,166,0.15)] border border-[rgba(255,31,166,0.3)] text-white'
                      : 'text-[rgba(255,255,255,0.5)] hover:bg-[rgba(255,255,255,0.05)] hover:text-white')}>
                  <span className="text-lg leading-none shrink-0">{s.icon}</span>
                  <div className="min-w-0">
                    <div className="font-semibold truncate">{s.label}</div>
                    <div className="text-[10px] text-[rgba(255,255,255,0.3)] truncate">{s.desc}</div>
                  </div>
                  {tokens.filter(t=>t.scope===s.id).length > 0 && (
                    <span className="ml-auto shrink-0 w-5 h-5 rounded-full bg-[rgba(255,31,166,0.2)] text-[#ff1fa6] text-[9px] font-black flex items-center justify-center">
                      {tokens.filter(t=>t.scope===s.id).length}
                    </span>
                  )}
                </button>
              ))}
            </div>
          </div>

          {/* Token editor */}
          <div className="xl:col-span-3 space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="font-black text-white text-lg">
                  {SCOPES.find(s=>s.id===selectedScope)?.icon} {SCOPES.find(s=>s.id===selectedScope)?.label}
                </h2>
                <p className="text-xs text-[rgba(255,255,255,0.4)]">
                  {scopeTokens.length} tokens saved · Changes apply on next page load
                </p>
              </div>
              <button
                onClick={async () => {
                  const all = TOKEN_TEMPLATES.map(t=>({
                    scope: selectedScope, key: t.key, value: scopeTokens.find(s=>s.key===t.key)?.value||t.default, label: t.label
                  }));
                  await superAdminApi.bulkSave(all);
                  const updated = await superAdminApi.getTokens();
                  setTokens(updated);
                  showToast(`✓ All ${all.length} tokens saved for ${selectedScope}`);
                }}
                className="flex items-center gap-2 text-xs font-bold dl-btn-pink px-4 py-2 rounded-xl">
                <Save size={13}/> Save All
              </button>
            </div>

            {/* Color tokens */}
            <div>
              <h3 className="text-xs font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Palette size={12}/> Colors
              </h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {TOKEN_TEMPLATES.filter(t=>t.type==='color').map(tpl => (
                  <TokenRow key={tpl.key} tpl={tpl}
                    token={scopeTokens.find(t=>t.key===tpl.key)}
                    scopeId={selectedScope} onSave={handleSaveToken}/>
                ))}
              </div>
            </div>

            {/* Gradient tokens */}
            <div>
              <h3 className="text-xs font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3 flex items-center gap-2">
                <Sparkles size={12}/> Gradients
              </h3>
              <div className="space-y-2">
                {TOKEN_TEMPLATES.filter(t=>t.type==='gradient').map(tpl => (
                  <TokenRow key={tpl.key} tpl={tpl}
                    token={scopeTokens.find(t=>t.key===tpl.key)}
                    scopeId={selectedScope} onSave={handleSaveToken}/>
                ))}
              </div>
            </div>

            {/* CSS tokens */}
            <div>
              <h3 className="text-xs font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3">CSS Values</h3>
              <div className="space-y-2">
                {TOKEN_TEMPLATES.filter(t=>t.type==='text').map(tpl => (
                  <TokenRow key={tpl.key} tpl={tpl}
                    token={scopeTokens.find(t=>t.key===tpl.key)}
                    scopeId={selectedScope} onSave={handleSaveToken}/>
                ))}
              </div>
            </div>

            {/* Saved tokens preview */}
            {scopeTokens.length>0 && (
              <div className="dl-card rounded-2xl p-4">
                <h3 className="text-xs font-black text-[rgba(255,255,255,0.4)] uppercase tracking-widest mb-3">Saved Tokens</h3>
                <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                  {scopeTokens.map(t=>(
                    <div key={t.id} className="flex items-center gap-2 p-2 rounded-lg bg-[rgba(255,255,255,0.02)] border border-[rgba(61,17,85,0.3)]">
                      {t.value.includes('gradient')
                        ? <div className="w-6 h-6 rounded shrink-0" style={{background:t.value}}/>
                        : t.value.startsWith('#')||t.value.startsWith('rgb')
                        ? <div className="w-6 h-6 rounded shrink-0" style={{backgroundColor:t.value}}/>
                        : <div className="w-6 h-6 rounded shrink-0 bg-[rgba(255,255,255,0.08)] flex items-center justify-center text-[8px] text-[rgba(255,255,255,0.4)]">CSS</div>
                      }
                      <div className="min-w-0">
                        <div className="text-[10px] font-bold text-white truncate">{t.label||t.key}</div>
                        <div className="text-[9px] text-[rgba(255,255,255,0.3)] truncate font-mono">{t.value.slice(0,30)}{t.value.length>30?'…':''}</div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* ── Game Branding Tab ─────────────────────────────────────────────── */}
      {tab==='games' && (
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Game selector */}
          <div className="space-y-2">
            <h3 className="text-xs font-black text-[rgba(255,255,255,0.5)] uppercase tracking-widest mb-3">Select Game</h3>
            {games.map(g=>(
              <button key={g.id} onClick={()=>setSelectedGame(g)}
                className={cn('w-full flex items-center gap-3 p-3 rounded-xl border transition-all text-left',
                  selectedGame?.id===g.id?'border-[rgba(255,31,166,0.5)] bg-[rgba(255,31,166,0.08)]':'border-[rgba(61,17,85,0.6)] dl-card hover:border-[rgba(255,31,166,0.3)]')}>
                <div className="w-12 h-12 rounded-xl border border-[rgba(61,17,85,0.6)] flex items-center justify-center text-2xl bg-[rgba(255,255,255,0.04)] overflow-hidden">
                  {g.branding?.logoUrl
                    ? <img src={g.branding.logoUrl} alt={g.name} className="w-full h-full object-cover"/>
                    : g.branding?.iconEmoji || {greedy:'🐷','animal-wheel':'🐯','teen-patti':'🃏','food-wheel':'🍜','three-card':'🎴',slot:'🎰'}[g.slug] || '🎲'}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-bold text-white truncate">{g.branding?.displayName || g.name}</div>
                  <div className="text-xs text-[rgba(255,255,255,0.4)]">{g.slug}</div>
                  {g.branding?.tagline && <div className="text-[10px] text-[#ff1fa6] mt-0.5 truncate">{g.branding.tagline}</div>}
                </div>
                <div className="flex flex-col items-center gap-1">
                  {g.branding?.primaryColor && (
                    <div className="w-4 h-4 rounded-full" style={{backgroundColor:g.branding.primaryColor}}/>
                  )}
                  {!g.isActive && <span className="text-[9px] text-[#ff3d57] font-bold">OFF</span>}
                </div>
              </button>
            ))}
          </div>

          {/* Branding editor */}
          {selectedGame && (
            <div className="xl:col-span-2 space-y-4">
              <div className="flex items-center justify-between">
                <h2 className="font-black text-white text-lg">
                  Editing: {selectedGame.branding?.displayName || selectedGame.name}
                </h2>
              </div>

              <BrandingEditor game={selectedGame} onSave={handleSaveBranding}/>
            </div>
          )}
        </div>
      )}

      {/* ── Feature Flags Tab ─────────────────────────────────────────────── */}
      {tab==='flags' && (
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="font-black text-white">Feature Flags</h2>
              <p className="text-xs text-[rgba(255,255,255,0.4)]">{flags.filter(f=>f.enabled).length}/{flags.length} enabled</p>
            </div>
            <button onClick={()=>setShowNewFlag(!showNewFlag)}
              className="flex items-center gap-2 text-xs font-bold dl-btn-pink px-4 py-2 rounded-xl">
              <Plus size={13}/> New Flag
            </button>
          </div>

          {showNewFlag && (
            <div className="dl-card-glow rounded-2xl p-5 space-y-3 bounce-in">
              <h3 className="font-black text-sm text-[#ff1fa6]">New Feature Flag</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1 uppercase tracking-wide">Key (unique)</label>
                  <input value={newFlagForm.key} onChange={e=>setNewFlagForm(p=>({...p,key:e.target.value.toLowerCase().replace(/\s/g,'_')}))}
                    className="dl-input text-sm" placeholder="my_feature_key"/>
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1 uppercase tracking-wide">Label</label>
                  <input value={newFlagForm.label} onChange={e=>setNewFlagForm(p=>({...p,label:e.target.value}))}
                    className="dl-input text-sm" placeholder="My Feature Name"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1 uppercase tracking-wide">Description</label>
                  <input value={newFlagForm.description} onChange={e=>setNewFlagForm(p=>({...p,description:e.target.value}))}
                    className="dl-input text-sm" placeholder="What does this flag control?"/>
                </div>
                <div className="sm:col-span-2">
                  <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1 uppercase tracking-wide">Allowed Roles (comma-separated)</label>
                  <input value={newFlagForm.allowedRoles} onChange={e=>setNewFlagForm(p=>({...p,allowedRoles:e.target.value}))}
                    className="dl-input text-sm font-mono" placeholder="player,admin,super_admin"/>
                </div>
              </div>
              <div className="flex gap-2">
                <button onClick={handleSaveNewFlag} className="dl-btn-pink px-5 py-2 rounded-xl text-sm font-bold flex items-center gap-2">
                  <Plus size={13}/> Create Flag
                </button>
                <button onClick={()=>setShowNewFlag(false)} className="dl-btn-ghost px-5 py-2 rounded-xl text-sm font-bold">
                  Cancel
                </button>
              </div>
            </div>
          )}

          {/* Flags list */}
          <div className="space-y-2">
            {flags.map(flag=>(
              <div key={flag.id} className={cn('flex items-start gap-4 p-4 rounded-xl border transition-all',
                flag.enabled?'dl-card border-[rgba(61,17,85,0.6)]':'bg-[rgba(255,255,255,0.02)] border-[rgba(61,17,85,0.3)] opacity-60')}>
                <button onClick={()=>handleToggleFlag(flag)} className={`dl-toggle mt-0.5 ${flag.enabled?'on':'off'}`} title={flag.enabled?'Click to disable':'Click to enable'}/>

                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 flex-wrap mb-1">
                    <span className="font-black text-sm text-white">{flag.label}</span>
                    <span className="text-[9px] font-mono text-[rgba(255,255,255,0.3)] bg-[rgba(255,255,255,0.04)] px-2 py-0.5 rounded">{flag.key}</span>
                    {flag.enabled
                      ? <span className="dl-badge-green">Enabled</span>
                      : <span className="dl-badge-gray">Disabled</span>}
                  </div>
                  {flag.description && <p className="text-xs text-[rgba(255,255,255,0.4)] mb-2">{flag.description}</p>}
                  <div className="flex flex-wrap gap-1">
                    {flag.allowedRoles.split(',').map(r=>(
                      <span key={r} className={cn('text-[9px] font-bold px-2 py-0.5 rounded-full',
                        r.trim()==='super_admin'?'bg-[rgba(255,215,0,0.15)] text-[#ffd700]':
                        r.trim()==='admin'?'dl-badge-purple':'dl-badge-blue')}>
                        {r.trim()}
                      </span>
                    ))}
                  </div>
                </div>

                <div className="flex gap-1 shrink-0">
                  <button onClick={()=>handleDeleteFlag(flag.id)}
                    className="w-7 h-7 rounded-lg flex items-center justify-center text-[rgba(255,61,87,0.4)] hover:text-[#ff3d57] hover:bg-[rgba(255,61,87,0.1)] transition-all">
                    <Trash2 size={13}/>
                  </button>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* ── Platform Stats Tab ────────────────────────────────────────────── */}
      {tab==='stats' && stats && (
        <div className="space-y-6">
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
            {[
              { l:'Total Players',  v:stats.players,           color:'#ff1fa6', icon:'👥' },
              { l:'Active Players', v:stats.activePlayers,     color:'#00e676', icon:'🟢' },
              { l:'Games',          v:stats.games,             color:'#ffd700', icon:'🎮' },
              { l:'Total Rounds',   v:stats.rounds.toLocaleString(), color:'#8b00ff', icon:'🔄' },
              { l:'Total Bets',     v:stats.bets.toLocaleString(),   color:'#00d4ff', icon:'💎' },
              { l:'Design Tokens',  v:stats.designTokens,     color:'#ff8c00', icon:'🎨' },
            ].map(s=>(
              <div key={s.l} className="dl-card rounded-2xl p-4 text-center">
                <div className="text-2xl mb-1">{s.icon}</div>
                <div className="text-2xl font-black" style={{color:s.color}}>{s.v}</div>
                <div className="text-[10px] text-[rgba(255,255,255,0.4)] uppercase tracking-wide mt-0.5">{s.l}</div>
              </div>
            ))}
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <div className="dl-card rounded-2xl p-5 space-y-3">
              <h3 className="font-black text-sm text-white">System Info</h3>
              {[
                { l:'API Version', v:stats.version },
                { l:'Database', v:stats.db },
                { l:'Node Environment', v:process.env.NODE_ENV||'development' },
              ].map(r=>(
                <div key={r.l} className="flex justify-between text-sm border-b border-[rgba(61,17,85,0.3)] pb-2 last:border-0 last:pb-0">
                  <span className="text-[rgba(255,255,255,0.4)]">{r.l}</span>
                  <span className="text-white font-bold font-mono">{r.v}</span>
                </div>
              ))}
            </div>

            <div className="dl-card rounded-2xl p-5 space-y-3">
              <h3 className="font-black text-sm text-white">Design System</h3>
              {SCOPES.map(s=>{
                const count = tokens.filter(t=>t.scope===s.id).length;
                return (
                  <div key={s.id} className="flex items-center justify-between text-sm">
                    <span className="text-[rgba(255,255,255,0.5)] flex items-center gap-1.5">
                      <span>{s.icon}</span> {s.label}
                    </span>
                    <span className={cn('font-bold text-xs px-2 py-0.5 rounded-full',
                      count>0?'dl-badge-pink':'dl-badge-gray')}>
                      {count} tokens
                    </span>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

// ─── Branding Editor (extracted for clarity) ──────────────────────────────────
function BrandingEditor({ game, onSave }: { game: GameWithBranding; onSave: (slug:string,data:Record<string,unknown>)=>void }) {
  const b = game.branding;
  const defaultEmojis: Record<string,string> = {
    greedy:'🐷','animal-wheel':'🐯','teen-patti':'🃏','food-wheel':'🍜','three-card':'🎴',slot:'🎰'
  };

  const [form, setForm] = useState({
    displayName:  b?.displayName  || game.name,
    iconEmoji:    b?.iconEmoji    || defaultEmojis[game.slug] || '🎲',
    primaryColor: b?.primaryColor || '#ff1fa6',
    accentColor:  b?.accentColor  || '#8b00ff',
    tagline:      b?.tagline      || '',
    logoUrl:      b?.logoUrl      || '',
    isVisible:    b?.isVisible    !== false,
  });
  const [showGrad, setShowGrad] = useState(false);
  const [bgGradient, setBgGradient] = useState(b?.bgGradient || 'radial-gradient(ellipse at 50% 0%, #3d0060 0%, #0a0010 70%)');
  const [saving, setSaving] = useState(false);

  async function handleSave() {
    setSaving(true);
    try { await onSave(game.slug, { ...form, bgGradient }); }
    finally { setSaving(false); }
  }

  return (
    <div className="space-y-4">
      {/* Live preview card */}
      <div className="rounded-2xl overflow-hidden border border-[rgba(61,17,85,0.6)] h-32 relative"
        style={{ background: bgGradient }}>
        <div className="absolute inset-0 flex items-center gap-4 p-5">
          <div className="w-16 h-16 rounded-2xl border-2 flex items-center justify-center text-4xl bg-[rgba(0,0,0,0.3)] backdrop-blur-sm"
            style={{ borderColor: form.primaryColor + '80' }}>
            {form.logoUrl
              ? <img src={form.logoUrl} alt="logo" className="w-full h-full object-cover rounded-2xl"/>
              : form.iconEmoji}
          </div>
          <div>
            <div className="text-xl font-black text-white drop-shadow-lg">{form.displayName}</div>
            {form.tagline && <div className="text-sm font-medium drop-shadow" style={{ color: form.primaryColor }}>{form.tagline}</div>}
            <div className="flex gap-2 mt-1">
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: form.primaryColor }}/>
              <div className="w-4 h-4 rounded-full border border-white/20" style={{ backgroundColor: form.accentColor }}/>
            </div>
          </div>
          {!form.isVisible && (
            <div className="absolute top-3 right-3 dl-badge-red">HIDDEN</div>
          )}
        </div>
      </div>

      <div className="dl-card rounded-2xl p-5 space-y-4">
        <h3 className="font-black text-sm text-[rgba(255,255,255,0.7)]">Identity</h3>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
          <div>
            <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wide">Display Name</label>
            <input value={form.displayName} onChange={e=>setForm(p=>({...p,displayName:e.target.value}))}
              className="dl-input text-sm" placeholder="Game Display Name"/>
          </div>
          <div>
            <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wide">Icon Emoji</label>
            <input value={form.iconEmoji} onChange={e=>setForm(p=>({...p,iconEmoji:e.target.value}))}
              className="dl-input text-sm text-2xl text-center" placeholder="🎮" maxLength={2}/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wide">Tagline</label>
            <input value={form.tagline} onChange={e=>setForm(p=>({...p,tagline:e.target.value}))}
              className="dl-input text-sm" placeholder="Short tagline shown on game card"/>
          </div>
          <div className="sm:col-span-2">
            <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wide">Logo URL</label>
            <div className="flex gap-2">
              <input value={form.logoUrl} onChange={e=>setForm(p=>({...p,logoUrl:e.target.value}))}
                className="dl-input text-sm flex-1" placeholder="https://... or /assets/..."/>
              {form.logoUrl && <img src={form.logoUrl} alt="" className="w-9 h-9 rounded-lg object-cover border border-[rgba(61,17,85,0.6)]" onError={e=>{(e.target as HTMLImageElement).style.display='none'}}/>}
            </div>
          </div>
        </div>

        <h3 className="font-black text-sm text-[rgba(255,255,255,0.7)] border-t border-[rgba(61,17,85,0.4)] pt-4">Colors</h3>
        <div className="grid grid-cols-2 gap-3">
          {[
            { key:'primaryColor', label:'Primary Color' },
            { key:'accentColor',  label:'Accent Color' },
          ].map(c=>(
            <div key={c.key}>
              <label className="block text-[10px] font-bold text-[rgba(255,255,255,0.4)] mb-1.5 uppercase tracking-wide">{c.label}</label>
              <div className="flex items-center gap-2">
                <input type="color" value={form[c.key as keyof typeof form] as string}
                  onChange={e=>setForm(p=>({...p,[c.key]:e.target.value}))}
                  className="w-9 h-9 rounded-lg cursor-pointer border-2 border-[rgba(61,17,85,0.6)] bg-transparent"/>
                <input value={form[c.key as keyof typeof form] as string}
                  onChange={e=>setForm(p=>({...p,[c.key]:e.target.value}))}
                  className="flex-1 dl-input text-xs font-mono py-2"/>
              </div>
            </div>
          ))}
        </div>

        <h3 className="font-black text-sm text-[rgba(255,255,255,0.7)] border-t border-[rgba(61,17,85,0.4)] pt-4">Background Gradient</h3>
        <div>
          <div className="flex items-center gap-2 mb-2">
            <input value={bgGradient} onChange={e=>setBgGradient(e.target.value)}
              className="flex-1 dl-input text-xs font-mono py-2"/>
            <button onClick={()=>setShowGrad(!showGrad)}
              className={cn('px-3 py-2 rounded-xl text-xs font-bold border transition-all',
                showGrad?'bg-[rgba(255,31,166,0.15)] border-[rgba(255,31,166,0.4)] text-[#ff1fa6]':'border-[rgba(61,17,85,0.6)] text-[rgba(255,255,255,0.5)] hover:text-white')}>
              Builder
            </button>
          </div>
          {showGrad && <GradientBuilder value={bgGradient} onChange={setBgGradient}/>}
        </div>

        <div className="flex items-center justify-between border-t border-[rgba(61,17,85,0.4)] pt-4">
          <label className="flex items-center gap-3 cursor-pointer" onClick={()=>setForm(p=>({...p,isVisible:!p.isVisible}))}>
            <div className={`dl-toggle ${form.isVisible?'on':'off'}`}/>
            <div>
              <div className="text-sm font-bold text-white">Visible to Players</div>
              <div className="text-xs text-[rgba(255,255,255,0.4)]">{form.isVisible?'Game shown on lobby':'Game hidden from lobby'}</div>
            </div>
          </label>
          {form.isVisible ? <Eye size={16} className="text-[#00e676]"/> : <EyeOff size={16} className="text-[#ff3d57]"/>}
        </div>
      </div>

      <button onClick={handleSave} disabled={saving}
        className="dl-btn-gold w-full py-3 rounded-xl font-black text-[#1a0028] flex items-center justify-center gap-2">
        {saving
          ? <><RefreshCw size={16} className="animate-spin"/> Saving…</>
          : <><Save size={16}/> Save Game Branding</>}
      </button>
    </div>
  );
}
