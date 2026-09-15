import { apiFetch } from '@/lib/api';

export interface SocialRoom {
  id: string;
  title: string;
  host: string;
  category: string;
  viewers: number;
  cover: string;
}

export interface SocialMoment {
  id: string;
  username: string;
  caption: string;
  image: string;
}

export interface SocialRank {
  id: string;
  username: string;
  score: number;
  frame: string;
}

export interface SocialHomeData {
  rooms: SocialRoom[];
  moments: SocialMoment[];
  ranking: SocialRank[];
}

export const socialApi = {
  home: () => apiFetch<SocialHomeData>('/social/home', { skipAuth: true }),
};
