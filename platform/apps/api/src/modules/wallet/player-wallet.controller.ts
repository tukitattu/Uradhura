// ============================================================
// PLAYER WALLET CONTROLLER — /wallet (player token)
// Returns the RN-facing { data: Wallet } envelope with mapped
// transactions. Coexists with the admin WalletController which
// serves /wallet/balance etc. under the same path prefix.
// ============================================================

import { Controller, Get, UseGuards } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { WalletService } from './wallet.service';
import { PrismaService } from '../../prisma/prisma.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';

const TX_TYPE_MAP: Record<string, string> = {
  coin_purchase: 'purchase',
  diamond_purchase: 'purchase',
  bet_debit: 'bet',
  bet_credit: 'win',
  gift_send: 'gift',
  gift_receive: 'gift',
  withdrawal_hold: 'withdrawal',
  withdrawal_refund: 'withdrawal',
  reward: 'reward',
  level_up_bonus: 'reward',
  task_reward: 'reward',
  admin_adjustment: 'reward',
  agency_commission: 'reward',
};

function mapType(dtoType: string): string {
  return TX_TYPE_MAP[dtoType] ?? 'purchase';
}

@ApiTags('Player Wallet')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('wallet')
export class PlayerWalletController {
  constructor(
    private readonly walletService: WalletService,
    private readonly prisma: PrismaService,
  ) {}

  @Get()
  @ApiOperation({ summary: 'Get current player wallet with transaction history' })
  @ApiResponse({ status: 200, description: 'Wallet returned' })
  async wallet(@CurrentPlayer() player: CurrentPlayerData) {
    const [def] = await Promise.all([
      this.prisma.walletAccount.findUnique({ where: { playerId: player.sub } }),
      this.walletService.getTransactionHistory(player.sub, 1, 50),
    ]);

    const wallet =
      def ??
      (await this.prisma.walletAccount.create({
        data: { playerId: player.sub },
      }));

    const txPage = await this.walletService.getTransactionHistory(player.sub, 1, 50);

    return {
      data: {
        id: wallet.id,
        playerId: wallet.playerId,
        coins: wallet.coinBalance,
        diamonds: wallet.diamondBalance,
        totalDeposited: Number(wallet.totalCoinsEarned) + Number(wallet.totalDiamondsEarned),
        totalWithdrawn: Number(wallet.totalCoinsSpent) + Number(wallet.totalDiamondsSpent),
        transactions: txPage.data.map((t) => ({
          id: t.id,
          type: mapType(t.type),
          amount: Number(t.amount),
          currency: t.currency,
          description: t.description ?? '',
          reference: t.type.startsWith('bet') ? t.referenceId ?? '' : (t.referenceId ?? ''),
          status: 'completed',
          createdAt: t.createdAt.toISOString(),
        })),
      },
    };
  }
}