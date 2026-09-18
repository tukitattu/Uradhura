'use client';
/**
 * DesignTokenProvider
 * Loads saved design tokens from the public backend endpoint and injects
 * them as CSS custom properties on :root, overriding the Uradhura theme.
 * Also reads page-scoped tokens if pageScope is provided.
 */
import { useEffect } from 'react';
import { apiFetch } from '@/lib/api';

interface DesignToken { id: string; scope: string; key: string; value: string; }

const TOKEN_TO_CSS: Record<string, string> = {
  bgPrimary:      '--dl-bg',
  bgSecondary:    '--dl-surface',
  bgCard:         '--dl-card',
  borderColor:    '--dl-border',
  primaryColor:   '--dl-pink',
  accentColor:    '--dl-purple',
  goldColor:      '--dl-gold',
  successColor:   '--dl-green',
  dangerColor:    '--dl-red',
  textPrimary:    '--dl-text',
  textMuted:      '--dl-text-muted',
  bgGradient:     '--dl-bg-gradient',
  cardGradient:   '--dl-card-gradient',
  btnPrimaryGrad: '--dl-btn-primary',
  btnGoldGrad:    '--dl-btn-gold',
  glowPrimary:    '--dl-glow-primary',
  borderRadius:   '--dl-radius',
};

function applyTokens(tokens: DesignToken[], scope: string) {
  const root = document.documentElement;
  // Apply global first
  tokens.filter(t => t.scope === 'global').forEach(t => {
    const v = TOKEN_TO_CSS[t.key];
    if (v) root.style.setProperty(v, t.value);
  });
  // Then scope-specific override
  if (scope && scope !== 'global') {
    tokens.filter(t => t.scope === scope).forEach(t => {
      const v = TOKEN_TO_CSS[t.key];
      if (v) root.style.setProperty(v, t.value);
    });
  }
  // Also apply localStorage overrides (from superadmin live preview)
  try {
    const preview = localStorage.getItem('dl_preview_tokens');
    if (preview) {
      const overrides = JSON.parse(preview) as Record<string, string>;
      Object.entries(overrides).forEach(([cssVar, value]) => {
        root.style.setProperty(cssVar, value);
      });
    }
  } catch {}
}

export default function DesignTokenProvider({
  children,
  pageScope,
}: {
  children: React.ReactNode;
  pageScope?: string;
}) {
  useEffect(() => {
    const path = window.location.pathname;
    const routeScope = pageScope || (
      path.startsWith('/games/') ? `game:${path.split('/')[2]}` :
      path.startsWith('/games') ? 'page:games' :
      path.startsWith('/admin') ? 'page:admin' :
      path === '/profile' ? 'page:profile' :
      ['/login', '/register'].includes(path) ? 'page:login' : 'global'
    );
    apiFetch<DesignToken[]>(`/games/design-tokens?scope=${encodeURIComponent(routeScope)}`, { skipAuth: true })
      .then(tokens => applyTokens(tokens, routeScope))
      .catch(() => {
        // Backend unavailable — apply localStorage preview tokens only
        try {
          const preview = localStorage.getItem('dl_preview_tokens');
          if (preview) {
            const overrides = JSON.parse(preview) as Record<string, string>;
            Object.entries(overrides).forEach(([cssVar, value]) => {
              document.documentElement.style.setProperty(cssVar, value);
            });
          }
        } catch {}
      });
  }, [pageScope]);

  return <>{children}</>;
}
