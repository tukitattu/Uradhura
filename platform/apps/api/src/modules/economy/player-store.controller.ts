// ============================================================
// PLAYER STORE CONTROLLERS
// /packages — coin & diamond store listings (RN-facing shapes)
// /purchases — store purchase that auto-credits coins/diamonds
// (no payment gateway wired yet: the order is credited atomically
// as a simulated instant approval).
// ============================================================

import { Controller, Get, Post, Body, UseGuards, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth } from '@nestjs/swagger';
import { EconomyService } from './economy.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';

@ApiTags('Player Store')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('packages')
export class PlayerStoreController {
  constructor(private readonly economyService: EconomyService) {}

  @Get('coins')
  @ApiOperation({ summary: 'List active coin packages (store)' })
  @ApiResponse({ status: 200, description: 'Coin packages returned' })
  async coinPackages() {
    const packages = await this.economyService.getCoinPackages();
    return {
      data: packages.map((p) => ({
        id: p.id,
        name: p.name,
        coins: p.baseCoins,
        price: Number(p.priceUsd),
        currency: p.currency || 'USD',
        bonus: p.bonusCoins,
        isPopular: p.isPopular,
      })),
    };
  }

  @Get('diamonds')
  @ApiOperation({ summary: 'List active diamond packages (store)' })
  @ApiResponse({ status: 200, description: 'Diamond packages returned' })
  async diamondPackages() {
    const packages = await this.economyService.getDiamondPackages();
    return {
      data: packages.map((p) => ({
        id: p.id,
        name: p.name,
        diamonds: p.baseDiamonds,
        price: Number(p.priceUsd),
        currency: 'USD',
        bonus: p.bonusDiamonds,
        isPopular: p.isPopular,
      })),
    };
  }
}

@ApiTags('Player Store')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('purchases')
export class PlayerPurchaseController {
  constructor(private readonly economyService: EconomyService) {}

  @Post()
  @ApiOperation({ summary: 'Purchase a coin or diamond package (instantly credited)' })
  @ApiResponse({ status: 201, description: 'Purchase completed and credited' })
  @ApiResponse({ status: 404, description: 'Package not found or inactive' })
  async purchase(
    @CurrentPlayer() player: CurrentPlayerData,
    @Body() body: { packageId: string; type: 'coins' | 'diamonds' },
  ) {
    if (body.type !== 'coins' && body.type !== 'diamonds') {
      return { success: false, message: 'type must be coins or diamonds' };
    }
    const order = await this.economyService.initiateStorePurchase(player.sub, body.type, body.packageId);
    const result = await this.economyService.purchaseAndCredit(order.id, player.sub);
    return {
      success: true,
      orderId: result.order.id,
      added: result.added,
      token: body.type === 'coins' ? 'coins' : 'diamonds',
      coins: body.type === 'coins' ? result.added : 0,
      diamonds: body.type === 'diamonds' ? result.added : 0,
    };
  }
}