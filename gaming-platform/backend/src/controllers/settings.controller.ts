import { Request, Response } from 'express';
import { v4 as uuidv4 } from 'uuid';
import prisma from '../config/database';
import { sendSuccess, sendError } from '../utils/response';
import { createAuditLog } from '../services/audit.service';

// Default platform settings
const DEFAULT_SETTINGS: Record<string, { value: unknown; category: string; description: string }> = {
  'platform.name': { value: 'GameZone', category: 'general', description: 'Platform display name' },
  'platform.currency_symbol': { value: '🪙', category: 'general', description: 'Default currency symbol' },
  'platform.default_language': { value: 'English', category: 'general', description: 'Default language' },
  'platform.round_duration': { value: 30, category: 'game_defaults', description: 'Default round duration in seconds' },
  'platform.betting_duration': { value: 30, category: 'game_defaults', description: 'Default betting window in seconds' },
  'security.session_timeout_hours': { value: 24, category: 'security', description: 'Session timeout in hours' },
  'security.max_login_attempts': { value: 5, category: 'security', description: 'Max failed login attempts before lockout' },
  'security.two_factor_enabled': { value: false, category: 'security', description: 'Require 2FA for admin accounts' },
  'notifications.high_value_bet_alerts': { value: true, category: 'notifications', description: 'Alert on high-value bets' },
  'notifications.settlement_failures': { value: true, category: 'notifications', description: 'Alert on settlement failures' },
  'notifications.daily_loss_limit_alerts': { value: true, category: 'notifications', description: 'Alert when daily loss limit exceeded' },
  'notifications.new_registrations': { value: false, category: 'notifications', description: 'Notify on new player registrations' },
  'notifications.system_health_alerts': { value: true, category: 'notifications', description: 'Alert on system health issues' },
  'appearance.primary_color': { value: '#ff1fa6', category: 'appearance', description: 'Platform primary color' },
  'appearance.accent_color': { value: '#ffd700', category: 'appearance', description: 'Platform accent color' },
  'appearance.dark_mode': { value: true, category: 'appearance', description: 'Enable dark mode by default' },
};

// Get all settings (grouped by category)
export async function getAllSettings(_req: Request, res: Response): Promise<void> {
  const dbSettings = await prisma.platformSetting.findMany({
    orderBy: [{ category: 'asc' }, { key: 'asc' }],
  });

  // Merge DB settings with defaults
  const merged = new Map<string, any>();

  // Start with defaults
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    merged.set(key, { key, value: def.value, category: def.category, description: def.description, source: 'default' });
  }

  // Override with DB values
  for (const s of dbSettings) {
    let parsed: unknown;
    try { parsed = JSON.parse(s.value); } catch { parsed = s.value; }
    merged.set(s.key, {
      key: s.key,
      value: parsed,
      category: s.category,
      description: s.description || DEFAULT_SETTINGS[s.key]?.description || '',
      source: 'database',
      updatedBy: s.updatedBy,
      updatedAt: s.updatedAt,
    });
  }

  // Group by category
  const grouped: Record<string, unknown[]> = {};
  for (const item of merged.values()) {
    if (!grouped[item.category]) grouped[item.category] = [];
    grouped[item.category].push(item);
  }

  sendSuccess(res, grouped);
}

// Get settings by category
export async function getSettingsByCategory(req: Request, res: Response): Promise<void> {
  const { category } = req.params;

  const dbSettings = await prisma.platformSetting.findMany({
    where: { category },
    orderBy: { key: 'asc' },
  });

  const settings = dbSettings.map(s => ({
    key: s.key,
    value: (() => { try { return JSON.parse(s.value); } catch { return s.value; } })(),
    category: s.category,
    description: s.description,
    updatedAt: s.updatedAt,
  }));

  // Add defaults for missing keys
  for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
    if (def.category === category && !settings.find(s => s.key === key)) {
      settings.push({ key, value: def.value, category: def.category, description: def.description, updatedAt: new Date() });
    }
  }

  sendSuccess(res, settings);
}

// Update settings (bulk)
export async function updateSettings(req: Request, res: Response): Promise<void> {
  const { settings } = req.body;
  const adminId = req.player!.playerId;

  if (!settings || typeof settings !== 'object') {
    sendError(res, 'settings object is required', 'VALIDATION_ERROR');
    return;
  }

  const results = [];
  for (const [key, value] of Object.entries(settings)) {
    const def = DEFAULT_SETTINGS[key];
    const category = def?.category || 'general';
    const description = def?.description || '';

    const setting = await prisma.platformSetting.upsert({
      where: { key },
      update: {
        value: JSON.stringify(value),
        category,
        description,
        updatedBy: adminId,
      },
      create: {
        id: uuidv4(),
        key,
        value: JSON.stringify(value),
        category,
        description,
        updatedBy: adminId,
      },
    });

    results.push({ key, value, category });
  }

  await createAuditLog({
    actorId: adminId, actorType: 'admin',
    action: 'PLATFORM_SETTINGS_UPDATED', entityType: 'platform_setting',
    after: { updatedKeys: Object.keys(settings) },
  });

  sendSuccess(res, { updated: results.length, settings: results }, 'Settings updated');
}

// Reset settings to defaults
export async function resetSettings(_req: Request, res: Response): Promise<void> {
  const { category } = _req.body;
  const adminId = _req.player!.playerId;

  if (category) {
    // Reset specific category
    const keys = Object.entries(DEFAULT_SETTINGS)
      .filter(([_, def]) => def.category === category)
      .map(([key]) => key);
    
    for (const key of keys) {
      const def = DEFAULT_SETTINGS[key];
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(def.value) },
        create: { id: uuidv4(), key, value: JSON.stringify(def.value), category: def.category, description: def.description, updatedBy: adminId },
      });
    }
  } else {
    // Reset all
    for (const [key, def] of Object.entries(DEFAULT_SETTINGS)) {
      await prisma.platformSetting.upsert({
        where: { key },
        update: { value: JSON.stringify(def.value) },
        create: { id: uuidv4(), key, value: JSON.stringify(def.value), category: def.category, description: def.description, updatedBy: adminId },
      });
    }
  }

  await createAuditLog({
    actorId: adminId, actorType: 'admin',
    action: 'PLATFORM_SETTINGS_RESET', entityType: 'platform_setting',
    after: { category: category || 'all' },
  });

  sendSuccess(res, null, 'Settings reset to defaults');
}
