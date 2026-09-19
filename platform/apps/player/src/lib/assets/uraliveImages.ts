import { ImageSourcePropType } from 'react-native';

/**
 * Real artwork extracted from the Uralive install (Liveapp/Uralive) plus the
 * official Uradhura logo. These take priority over the generated SVG catalogue
 * wherever an equivalent exists, so the player app matches the reference UI.
 * Keys intentionally mirror the semantic keys used across the rest of the app.
 */
const IMAGE_ASSETS: Record<string, ImageSourcePropType> = {
  // full-screen backgrounds (portrait, ~390x850)
  'bg.home.default': require('../../../assets/uralive/bg-home.png'),
  'bg.home.reward': require('../../../assets/uralive/bg-reward.png'),
  'bg.ranking.default': require('../../../assets/uralive/bg-ranking.png'),
  'bg.ranking.agency': require('../../../assets/uralive/rank-agency.png'),
  'bg.ranking.host': require('../../../assets/uralive/rank-host.png'),
  'bg.ranking.host-23': require('../../../assets/uralive/rank-host23.png'),
  'bg.room.default': require('../../../assets/uralive/bg-room.png'),
  'bg.room.theme': require('../../../assets/uralive/bg-room-theme.webp'),
  'bg.live.go': require('../../../assets/uralive/bg-go-live.webp'),

  // avatar podium frames
  'frame.avatar.top1': require('../../../assets/uralive/frame-avatar-top1.png'),
  'frame.avatar.top2': require('../../../assets/uralive/frame-avatar-top2.png'),
  'frame.avatar.top3': require('../../../assets/uralive/frame-avatar-top3.png'),

  // tab bar (3D nav icons)
  'icons.nav.live': require('../../../assets/uralive/nav-live.png'),
  'icons.nav.messages': require('../../../assets/uralive/nav-message.png'),
  'icons.nav.moment': require('../../../assets/uralive/nav-moment.png'),
  'icons.nav.party': require('../../../assets/uralive/nav-party.png'),
  'icons.nav.profile': require('../../../assets/uralive/nav-profile.png'),

  // audio room seats
  'icons.audio-seat.host': require('../../../assets/uralive/seat-host.webp'),
  'icons.audio-seat.co-host': require('../../../assets/uralive/seat-cohost.webp'),
  'icons.audio-seat.user': require('../../../assets/uralive/seat-user.webp'),

  // home
  'icons.home.ranking-badge': require('../../../assets/uralive/ranking-icon.png'),

  // party room menu
  'icons.party.menu-games': require('../../../assets/uralive/party-games.png'),
  'icons.party.menu-luck': require('../../../assets/uralive/party-luckbag.png'),

  // invite
  'invite.background': require('../../../assets/uralive/invite-bg.png'),
  'invite.banner': require('../../../assets/uralive/invite-banner.png'),
  'invite.code': require('../../../assets/uralive/invite-code.png'),
  'invite.text': require('../../../assets/uralive/invite-text.png'),
  'invite.menu': require('../../../assets/uralive/invite-menu.png'),
  'invite.link': require('../../../assets/uralive/invite-link.png'),
  'invite.fb': require('../../../assets/uralive/invite-fb.png'),
  'invite.insta': require('../../../assets/uralive/invite-insta.png'),
  'invite.wp': require('../../../assets/uralive/invite-wp.png'),
  'invite.x': require('../../../assets/uralive/invite-x.png'),

  // brand logo (official Uradhura mark)
  'logo.uradhura': require('../../../assets/uralive/ura-logo.png'),
  'logo.uradhura-logo': require('../../../assets/uralive/ura-logo.png'),
  'logo.uradhura-emblem': require('../../../assets/uralive/ura-logo.png'),
  'logo.uradhura-splash': require('../../../assets/uralive/ura-logo.png'),
  'logo.app-icon': require('../../../assets/uralive/ura-logo.png'),
};

export type ResolvedAsset =
  | { kind: 'image'; source: ImageSourcePropType }
  | { kind: 'svg'; xml: string };

/** Resolve a semantic asset key to bundled artwork (image), else undefined. */
export function imageFor(assetKey: string): ImageSourcePropType | undefined {
  return IMAGE_ASSETS[assetKey] ?? undefined;
}

/** True when the key maps to a bundled raster asset. */
export function hasImage(assetKey: string): boolean {
  return assetKey in IMAGE_ASSETS;
}

/** All image-backed keys (for debugging/coverage). */
export const imageAssetKeys = Object.keys(IMAGE_ASSETS);