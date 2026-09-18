// Asset manifest types — mirror of the public GET /api/v1/assets/manifest response.

export interface ManifestAsset {
  key: string;
  name: string;
  description?: string | null;
  category: string;
  type?: string | null;
  format?: string | null;
  url: string;
  thumbnailUrl?: string | null;
  version: number;
  sortOrder: number;
  target?: string | null;
  isBundled: boolean;
  startsAt?: string | null;
  endsAt?: string | null;
  visibility: 'public' | 'vip' | 'internal' | 'beta';
  width?: number | null;
  height?: number | null;
  checksum?: string | null;
}

export interface AssetManifest {
  version: string;
  name: string;
  generatedAt: string;
  baseUrl: string;
  assetCount: number;
  assets: ManifestAsset[];
}

export interface ResolvedAsset {
  kind: 'bundled' | 'remoteSvg' | 'remote';
  key: string;
  /** svg markup for bundled / remoteSvg, undefined for remote */
  svg?: string;
  /** absolute URL for remote / remoteSvg */
  url?: string;
  format?: string | null;
  version: number;
  name?: string;
}