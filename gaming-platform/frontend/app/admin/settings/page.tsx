'use client';
import { Card, CardHeader, CardBody } from '@/components/ui/Card';
import Input from '@/components/ui/Input';
import Button from '@/components/ui/Button';
import { Settings, Globe, Lock, Bell, Database } from 'lucide-react';

export default function SettingsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-black text-white">Settings</h1>
        <p className="text-gray-400 text-sm">Platform configuration and preferences</p>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        <Card>
          <CardHeader><div className="flex items-center gap-2"><Globe size={16} className="text-[#ff1fa6]" /><h2 className="font-bold text-white">Platform Settings</h2></div></CardHeader>
          <CardBody className="space-y-4">
            <Input label="Platform Name" defaultValue="GameZone" />
            <Input label="Default Currency Symbol" defaultValue="🪙" />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Default Language</label>
              <select className="w-full bg-[#0a0010] border border-[rgba(61,17,85,0.6)] rounded-lg px-3 py-2 text-sm text-white focus:outline-none">
                <option>English</option>
                <option>Spanish</option>
                <option>Chinese</option>
                <option>Hindi</option>
              </select>
            </div>
            <Input label="Round Duration (seconds)" type="number" defaultValue="30" />
            <Button variant="gold" className="w-full">Save Platform Settings</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Lock size={16} className="text-[#ff3d57]" /><h2 className="font-bold text-white">Security Settings</h2></div></CardHeader>
          <CardBody className="space-y-4">
            <Input label="Session Timeout (hours)" type="number" defaultValue="24" />
            <Input label="Max Login Attempts" type="number" defaultValue="5" />
            <div>
              <label className="block text-xs text-gray-400 mb-1">Two-Factor Auth</label>
              <div className="flex items-center gap-3">
                <div className="w-10 h-5 rounded-full bg-game-green relative cursor-pointer">
                  <div className="absolute top-0.5 right-0.5 w-4 h-4 bg-white rounded-full" />
                </div>
                <span className="text-sm text-gray-300">Enabled for admin accounts</span>
              </div>
            </div>
            <div className="bg-game-red/10 border border-game-red/20 rounded-lg p-3 text-sm text-[#ff3d57]">
              <strong>Important:</strong> Always use HTTPS in production. Never expose admin credentials.
            </div>
            <Button variant="danger" className="w-full">Update Security Settings</Button>
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Bell size={16} className="text-[#ffd700]" /><h2 className="font-bold text-white">Notification Settings</h2></div></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'High-value bet alerts (> $1000)', enabled: true },
              { label: 'Settlement failures', enabled: true },
              { label: 'Player daily loss limit exceeded', enabled: true },
              { label: 'New player registrations', enabled: false },
              { label: 'System health alerts', enabled: true },
            ].map(({ label, enabled }) => (
              <div key={label} className="flex items-center justify-between">
                <span className="text-sm text-gray-300">{label}</span>
                <div className={`w-10 h-5 rounded-full relative cursor-pointer ${enabled ? 'bg-game-green' : 'bg-gray-600'}`}>
                  <div className={`absolute top-0.5 w-4 h-4 bg-white rounded-full transition-transform ${enabled ? 'translate-x-5' : 'translate-x-0.5'}`} />
                </div>
              </div>
            ))}
          </CardBody>
        </Card>

        <Card>
          <CardHeader><div className="flex items-center gap-2"><Database size={16} className="text-purple-400" /><h2 className="font-bold text-white">System Info</h2></div></CardHeader>
          <CardBody className="space-y-3">
            {[
              { label: 'API Version', value: 'v1.0.0' },
              { label: 'Database', value: 'SQLite (dev) / PostgreSQL (prod)' },
              { label: 'Auth', value: 'JWT (24h expiry)' },
              { label: 'Rate Limiting', value: '500 req / 15 min' },
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
    </div>
  );
}
