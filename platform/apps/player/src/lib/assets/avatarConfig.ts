import { AvatarDress, storage } from '../storage';

/** Installable avatar frame + accessory keys shown in the studio. */
export const AVATAR_FRAME_KEYS = [
  'frame.avatar.top1',
  'frame.avatar.top2',
  'frame.avatar.top3',
  'frame.avatar.default',
  'frame.vip.badge',
  'frame.level.bronze',
  'frame.profile.gilded',
  'frame.ranking.podium',
] as const;

export async function loadDress(): Promise<AvatarDress> {
  const dress = await storage.getAvatarDress();
  return dress ?? { frame: 'frame.avatar.top1', parts: [] };
}

export async function saveDress(frame: string | null, parts: string[]): Promise<void> {
  await storage.setAvatarDress({ frame, parts });
}