'use client';
import { useState, useEffect, useCallback } from 'react';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { settingsApi, type SettingsEntry, type SettingsGroup } from '@/lib/api';
import { Settings, Globe, Lock, Bell, Palette, RotateCcw, Save } from 'lucide-react';

const CATEGORY_ICONS: Record<string, typeof Globe> = {
  general: Globe,
  security: Lock,
  notifications: Bell,
  appearance: Palette,
  game_defaults: Settings,
};

const CATEGORY_LABELS: Record<string, string> = {
  general: 'Platform Settings',
  security: 'Security Settings',
  notifications: 'Notification Settings',
  appearance: 'Appearance',
  game_defaults: 'Game Defaults',
};

export default function SettingsPage() {
  const [settings, setSettings] = useState<Record<string, SettingsGroup>>({});
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirtyKeys, setDirtyKeys] = useState<Set<string>>(new Set());
  const [localValues, setLocalValues] = useState<Record<string, unknown>>({});
  const [saveMsg, setSaveMsg] = useState<string | null>(null);

  const loadSettings = useCallback(async () => {
    try {
      const data = await settingsApi.getAll();
      setSettings(data);
      // Initialize local values from loaded settings
      const values: Record<string, unknown> = {};
      for (const group of Object.values(data)) {
        for (const entry of group) {
          values[entry.key] = entry.value;
        }
      }
      setLocalValues(values);
    } catch (err) {
      console.error('Failed to load settings:', err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => { loadSettings(); }, [loadSettings]);

  function handleChange(key: string, value: unknown) {
    setLocalValues(prev => ({ ...prev, [key]: value }));
    setDirtyKeys(prev => new Set(prev).add(key));
  }

  async function handleSave() {
    setSaving(true);
    setSaveMsg(null);
    try {
      const toUpdate: Record<string, unknown> = {};
      for (const key of dirtyKeys) {
        toUpdate[key] = localValues[key];
      }
      await settingsApi.update(toUpdate);
      setDirtyKeys(new Set());
      setSaveMsg('Settings saved successfully');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      setSaveMsg('Failed to save settings');
    } finally {
      setSaving(false);
    }
  }

  async function handleReset(category?: string) {
    if (!confirm(`Reset ${category || 'all'} settings to defaults?`)) return;
    try {
      await settingsApi.reset(category);
      await loadSettings();
      setSaveMsg('Settings reset to defaults');
      setTimeout(() => setSaveMsg(null), 3000);
    } catch (err) {
      console.error('Failed to reset:', err);
    }
  }

  function renderInput(entry: SettingsEntry) {
    const value = localValues[entry.key] ?? entry.value;

    if (typeof entry.value === 'boolean') {
      return (
        <div key={entry.key} className="flex items-center justify-between py-2">
          <span className="text-sm text-gray-300">{entry.description || entry.key}</span>
          <button
            onClick={() => handleChange(entry.key, !value)}
            className={`w-10 h-5 rounded-full relative cursor-pointer transition-colors ${
              value ? 'bg-game-green' : 'bg-gray-600'
            }`}
          >
            <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${
              value ? 'translate-x-5' : 'translate-x-0.5'
            }`} />
          </button>
        </div>
      );
    }

    if (typeof entry.value === 'number') {
      return (
        <Input
          key={entry.key}
          label={entry.description || entry.key}
          type="number"
          value={String(value ?? '')}
          onChange={(e) => handleChange(entry.key, parseFloat(e.target.value) || 0)}
        />
      );
    }

    if (entry.key.includes('color')) {
      return (
        <div key={entry.key} className="space-y-1">
          <label className="block text-xs text-gray-400">{entry.description || entry.key}</label>
          <div className="flex gap-2 items-center">
            <input
              type="color"
              value={String(value ?? '#ffffff')}
              onChange={(e) => handleChange(entry.key, e.target.value)}
              className="w-10 h-10 rounded cursor-pointer bg-transparent border-0"
            />
            <Input
              value={String(value ?? '')}
              onChange={(e) => handleChange(entry.key, e.target.value)}
            />
          </div>
        </div>
      );
    }

    if (entry.key.includes('language')) {
      return (
        <div key={entry.key} className="space-y-1">
          <label className="block text-xs text-gray-400">{entry.description || entry.key}</label>
          <select
            value={String(value ?? '')}
            onChange={(e) => handleChange(entry.key, e.target.value)}
            className="w-full bg-[#0a0010] border border-[rgba(61,17,85,0.6)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none"
          >
            <option>English</option>
            <option>Spanish</option>
            <option>Chinese</option>
            <option>Hindi</option>
            <option>Arabic</option>
            <option>Portuguese</option>
          </select>
        </div>
      );
    }

    return (
      <Input
        key={entry.key}
        label={entry.description || entry.key}
        value={String(value ?? '')}
        onChange={(e) => handleChange(entry.key, e.target.value)}
      />
    );
  }

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-[rgba(255,255,255,0.4)]">Loading settings...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-black text-white">Settings</h1>
          <p className="text-gray-400 text-sm">Platform configuration and preferences</p>
        </div>
        <div className="flex gap-2">
          {dirtyKeys.size > 0 && (
            <span className="text-xs text-[#ffd700] flex items-center gap-1">
              {dirtyKeys.size} unsaved change{dirtyKeys.size > 1 ? 's' : ''}
            </span>
          )}
          <Button onClick={() => handleReset()} variant="ghost" size="sm">
            <RotateCcw size={14} /> Reset All
          </Button>
          <Button onClick={handleSave} disabled={dirtyKeys.size === 0 || saving} loading={saving} variant="gold" size="sm">
            <Save size={14} /> Save Changes
          </Button>
        </div>
      </div>

      {saveMsg && (
        <div className={`rounded-lg p-3 text-sm ${
          saveMsg.includes('success') ? 'bg-game-green/10 border border-game-green/20 text-game-green' : 'bg-game-red/10 border border-game-red/20 text-game-red'
        }`}>
          {saveMsg}
        </div>
      )}

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {Object.entries(settings).map(([category, entries]) => {
          const Icon = CATEGORY_ICONS[category] || Settings;
          const label = CATEGORY_LABELS[category] || category;
          return (
            <Card key={category}>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2">
                    <Icon size={16} className="text-[#ff1fa6]" />
                    <h2 className="font-bold text-white">{label}</h2>
                  </div>
                  <button
                    onClick={() => handleReset(category)}
                    className="text-xs text-gray-500 hover:text-white transition-colors"
                  >
                    Reset
                  </button>
                </div>
              </CardHeader>
              <CardBody className="space-y-3">
                {entries.map(entry => renderInput(entry))}
              </CardBody>
            </Card>
          );
        })}
      </div>

      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Settings size={16} className="text-purple-400" />
            <h2 className="font-bold text-white">System Info</h2>
          </div>
        </CardHeader>
        <CardBody className="space-y-3">
          {[
            { label: 'API Version', value: 'v1.0.0' },
            { label: 'Database', value: 'SQLite (dev) / PostgreSQL (prod)' },
            { label: 'Auth', value: 'JWT (24h expiry)' },
            { label: 'Rate Limiting', value: '500 req / 15 min' },
            { label: 'WebSocket', value: 'Socket.IO (real-time)' },
            { label: 'Idempotency', value: 'Per-bet unique key' },
            { label: 'Settlement', value: 'Server-authoritative' },
          ].map(({ label, value }) => (
            <div key={label} className="flex justify-between text-sm">
              <span className="text-gray-400">{label}</span>
              <span className="text-white font-medium">{value}</span>
            </div>
          ))}
        </CardBody>
      </Card>
    </div>
  );
}
