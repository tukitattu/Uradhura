'use client';
import { useState, useEffect } from 'react';
import { adminApi, type TokenPackage } from '@/lib/api';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Button from '@/components/ui/Button';
import Input from '@/components/ui/Input';
import { Badge } from '@/components/ui/Badge';
import { cn, formatTokens } from '@/lib/utils';
import { Plus, Edit, Trash2, Package } from 'lucide-react';

const EMPTY_PKG: Partial<TokenPackage> = {
  name: '', priceUsd: 9.99, baseTokens: 1000, bonusTokens: 0,
  isSpecialOffer: false, isPopular: false, expiryDays: 30, isActive: true,
};

export default function TokenPackagesPage() {
  const [packages, setPackages] = useState<TokenPackage[]>([]);
  const [editing, setEditing] = useState<Partial<TokenPackage>>(EMPTY_PKG);
  const [loading, setLoading] = useState(true);
  const [saveLoading, setSaveLoading] = useState(false);
  const [saveMsg, setSaveMsg] = useState('');

  async function fetchPkgs() {
    const data = await adminApi.listTokenPackages();
    setPackages(data);
    setLoading(false);
  }

  useEffect(() => { fetchPkgs(); }, []);

  async function handleSave() {
    setSaveLoading(true);
    try {
      await adminApi.saveTokenPackage(editing);
      setSaveMsg('Saved!');
      setEditing(EMPTY_PKG);
      fetchPkgs();
    } finally {
      setSaveLoading(false);
      setTimeout(() => setSaveMsg(''), 2000);
    }
  }

  async function handleDelete(id: string) {
    if (!confirm('Deactivate this package?')) return;
    await adminApi.deleteTokenPackage(id);
    fetchPkgs();
  }

  return (
    <div className="space-y-6">
      {saveMsg && (
        <div className="fixed bottom-6 right-6 bg-game-green text-black font-bold px-4 py-2 rounded-lg z-50">✓ {saveMsg}</div>
      )}

      <div>
        <h1 className="text-2xl font-black text-white">Token Packages</h1>
        <p className="text-gray-400 text-sm">Create and manage token packages shown in the store</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
        {/* Packages list */}
        <div className="xl:col-span-2 space-y-3">
          {loading ? (
            Array.from({ length: 4 }).map((_, i) => (
              <div key={i} className="h-20 bg-game-card rounded-xl animate-pulse border border-game-border" />
            ))
          ) : packages.map(pkg => (
            <Card key={pkg.id} className={cn(!pkg.isActive && 'opacity-50')}>
              <CardBody className="flex items-center gap-4">
                <div className="text-3xl">🪙</div>
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-2 mb-1">
                    <h3 className="font-black text-white">{pkg.name}</h3>
                    {pkg.isPopular && <Badge variant="red">Popular</Badge>}
                    {pkg.isSpecialOffer && <Badge variant="gold">Special</Badge>}
                    {!pkg.isActive && <Badge variant="gray">Inactive</Badge>}
                  </div>
                  <div className="text-sm text-gray-300">
                    {pkg.baseTokens.toLocaleString()} tokens
                    {pkg.bonusTokens > 0 && <span className="text-game-green"> +{pkg.bonusTokens} bonus</span>}
                    · ${pkg.priceUsd.toFixed(2)} · {pkg.expiryDays}d
                  </div>
                </div>
                <div className="flex gap-2 shrink-0">
                  <Button onClick={() => setEditing({ ...pkg })} variant="ghost" size="sm">
                    <Edit size={14} />
                  </Button>
                  <Button onClick={() => handleDelete(pkg.id)} variant="ghost" size="sm" className="text-game-red hover:text-game-red">
                    <Trash2 size={14} />
                  </Button>
                </div>
              </CardBody>
            </Card>
          ))}

          <Button onClick={() => setEditing(EMPTY_PKG)} variant="secondary" className="w-full">
            <Plus size={16} /> Create New Package
          </Button>
        </div>

        {/* Editor */}
        <Card>
          <CardHeader>
            <div className="flex items-center gap-2">
              <Package size={16} className="text-game-gold" />
              <h2 className="font-bold text-white">{editing.id ? 'Edit Package' : 'New Package'}</h2>
            </div>
          </CardHeader>
          <CardBody className="space-y-3">
            <Input label="Package Name" value={editing.name || ''} onChange={e => setEditing(p => ({ ...p, name: e.target.value }))} />
            <Input label="Price (USD)" type="number" value={editing.priceUsd || ''} onChange={e => setEditing(p => ({ ...p, priceUsd: parseFloat(e.target.value) }))} suffix="$" />
            <Input label="Base Tokens" type="number" value={editing.baseTokens || ''} onChange={e => setEditing(p => ({ ...p, baseTokens: parseInt(e.target.value) }))} />
            <Input label="Bonus Tokens" type="number" value={editing.bonusTokens || 0} onChange={e => setEditing(p => ({ ...p, bonusTokens: parseInt(e.target.value) }))} />
            <Input label="Expiry (Days)" type="number" value={editing.expiryDays || 30} onChange={e => setEditing(p => ({ ...p, expiryDays: parseInt(e.target.value) }))} />

            <div className="space-y-2">
              {[
                { key: 'isSpecialOffer', label: 'Special Offer' },
                { key: 'isPopular', label: 'Mark as Popular' },
                { key: 'isActive', label: 'Active (Show in Store)' },
              ].map(({ key, label }) => (
                <label key={key} className="flex items-center gap-3 cursor-pointer">
                  <button
                    onClick={() => setEditing(p => ({ ...p, [key]: !p[key as keyof typeof p] }))}
                    className={cn('w-10 h-5 rounded-full transition-colors relative', editing[key as keyof typeof editing] ? 'bg-game-green' : 'bg-gray-600')}
                  >
                    <div className={cn('absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform', editing[key as keyof typeof editing] ? 'translate-x-5' : 'translate-x-0.5')} />
                  </button>
                  <span className="text-sm text-gray-300">{label}</span>
                </label>
              ))}
            </div>

            {editing.name && editing.priceUsd && (
              <div className="bg-game-bg rounded-xl p-4 text-center border border-game-border">
                <div className="text-3xl mb-1">🪙</div>
                <div className="font-black text-white">{editing.name}</div>
                <div className="text-2xl font-black text-game-gold">{(editing.baseTokens || 0).toLocaleString()}</div>
                {(editing.bonusTokens || 0) > 0 && (
                  <div className="text-game-green">+{editing.bonusTokens} bonus</div>
                )}
                <div className="text-game-gold mt-1">${(editing.priceUsd || 0).toFixed(2)}</div>
              </div>
            )}

            <Button onClick={handleSave} loading={saveLoading} variant="gold" className="w-full">
              💾 Save Package
            </Button>
          </CardBody>
        </Card>
      </div>
    </div>
  );
}
