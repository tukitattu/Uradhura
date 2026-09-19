import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Game } from '../lib/types';

export function useGames() {
  return useQuery<Game[]>({
    queryKey: ['games'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Game[] }>('/games/catalog');
      return data.data;
    },
    staleTime: 60000,
  });
}

export function useGame(gameId: string) {
  return useQuery<Game>({
    queryKey: ['game', gameId],
    queryFn: async () => {
      const { data } = await api.get<{ data: Game }>(`/games/catalog/${gameId}`);
      return data.data;
    },
    enabled: !!gameId,
  });
}
