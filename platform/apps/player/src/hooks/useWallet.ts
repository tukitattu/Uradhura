import { useQuery } from '@tanstack/react-query';
import { api } from '../lib/api';
import { Wallet } from '../lib/types';

export function useWallet() {
  return useQuery<Wallet>({
    queryKey: ['wallet'],
    queryFn: async () => {
      const { data } = await api.get<{ data: Wallet }>('/wallet');
      return data.data;
    },
    staleTime: 30000,
  });
}
