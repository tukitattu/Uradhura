// ============================================================
// ECONOMY CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Put,
  Body,
  Param,
  Query,
  UseGuards,
  Request,
  ParseUUIDPipe,
} from '@nestjs/common';
import {
  ApiTags,
  ApiOperation,
  ApiResponse,
  ApiBearerAuth,
  ApiQuery,
  ApiParam,
  ApiBody,
} from '@nestjs/swagger';
import { EconomyService } from './economy.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';
import { RolesGuard } from '../auth/guards/roles.guard';
import { Roles } from '../auth/decorators/roles.decorator';

@ApiTags('Economy')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard, RolesGuard)
@Controller('economy')
export class EconomyController {
  constructor(private readonly economyService: EconomyService) {}

  // ============================================================
  // COIN PACKAGES
  // ============================================================

  @Get('coins')
  @ApiOperation({ summary: 'List active coin packages' })
  @ApiResponse({ status: 200, description: 'Coin packages returned' })
  async getCoinPackages() {
    return this.economyService.getCoinPackages();
  }

  @Post('coins')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a coin package (admin)' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'Starter Pack' },
        description: { type: 'string', example: 'Great value for new players' },
        priceUsd: { type: 'number', example: 0.99 },
        baseCoins: { type: 'number', example: 1000 },
        bonusCoins: { type: 'number', example: 100 },
        isSpecialOffer: { type: 'boolean' },
        isPopular: { type: 'boolean' },
        expiryDays: { type: 'number', example: 30 },
        sortOrder: { type: 'number' },
        image: { type: 'string' },
      },
      required: ['name', 'priceUsd', 'baseCoins'],
    },
  })
  @ApiResponse({ status: 201, description: 'Coin package created' })
  async createCoinPackage(@Body() data: any) {
    return this.economyService.createCoinPackage(data);
  }

  @Put('coins/:id')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Update a coin package (admin)' })
  @ApiParam({ name: 'id', description: 'Coin package UUID' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string' },
        description: { type: 'string' },
        priceUsd: { type: 'number' },
        baseCoins: { type: 'number' },
        bonusCoins: { type: 'number' },
        isSpecialOffer: { type: 'boolean' },
        isPopular: { type: 'boolean' },
        expiryDays: { type: 'number' },
        sortOrder: { type: 'number' },
        isActive: { type: 'boolean' },
        image: { type: 'string' },
      },
    },
  })
  @ApiResponse({ status: 200, description: 'Coin package updated' })
  @ApiResponse({ status: 404, description: 'Package not found' })
  async updateCoinPackage(
    @Param('id', ParseUUIDPipe) id: string,
    @Body() data: any,
  ) {
    return this.economyService.updateCoinPackage(id, data);
  }

  @Post('coins/purchase')
  @ApiOperation({ summary: 'Initiate coin package purchase' })
  @ApiBody({
    schema: {
      properties: {
        packageId: { type: 'string', description: 'Coin package UUID' },
        paymentMethod: { type: 'string', example: 'stripe' },
      },
      required: ['packageId', 'paymentMethod'],
    },
  })
  @ApiResponse({ status: 201, description: 'Purchase order created' })
  async purchaseCoinPackage(
    @Request() req: any,
    @Body() body: { packageId: string; paymentMethod: string },
  ) {
    return this.economyService.purchaseCoinPackage(req.user.sub, body.packageId, body.paymentMethod);
  }

  @Post('coins/confirm/:orderId')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Confirm coin package purchase (admin)' })
  @ApiParam({ name: 'orderId', description: 'Payment order UUID' })
  @ApiResponse({ status: 200, description: 'Purchase confirmed, coins credited' })
  @ApiResponse({ status: 400, description: 'Order already processed' })
  @ApiResponse({ status: 404, description: 'Order not found' })
  async confirmCoinPurchase(
    @Param('orderId', ParseUUIDPipe) orderId: string,
    @Request() req: any,
  ) {
    return this.economyService.confirmCoinPurchase(orderId, req.user.sub);
  }

  // ============================================================
  // DIAMOND PACKAGES
  // ============================================================

  @Get('diamonds')
  @ApiOperation({ summary: 'List active diamond packages' })
  @ApiResponse({ status: 200, description: 'Diamond packages returned' })
  async getDiamondPackages() {
    return this.economyService.getDiamondPackages();
  }

  @Post('diamonds')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a diamond package (admin)' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'Diamond Bundle' },
        description: { type: 'string' },
        priceUsd: { type: 'number', example: 4.99 },
        baseDiamonds: { type: 'number', example: 50 },
        bonusDiamonds: { type: 'number', example: 5 },
        isSpecialOffer: { type: 'boolean' },
        isPopular: { type: 'boolean' },
        sortOrder: { type: 'number' },
        image: { type: 'string' },
      },
      required: ['name', 'priceUsd', 'baseDiamonds'],
    },
  })
  @ApiResponse({ status: 201, description: 'Diamond package created' })
  async createDiamondPackage(@Body() data: any) {
    return this.economyService.createDiamondPackage(data);
  }

  // ============================================================
  // GIFTS
  // ============================================================

  @Get('gifts')
  @ApiOperation({ summary: 'List active gifts' })
  @ApiResponse({ status: 200, description: 'Gifts returned' })
  async getGifts() {
    return this.economyService.getGifts();
  }

  @Post('gifts')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Create a gift (admin)' })
  @ApiBody({
    schema: {
      properties: {
        name: { type: 'string', example: 'Rose' },
        icon: { type: 'string', example: '🌹' },
        animation: { type: 'string' },
        coinPrice: { type: 'number', example: 100 },
        category: { type: 'string', example: 'general' },
        sortOrder: { type: 'number' },
      },
      required: ['name', 'icon', 'coinPrice'],
    },
  })
  @ApiResponse({ status: 201, description: 'Gift created' })
  async createGift(@Body() data: any) {
    return this.economyService.createGift(data);
  }

  @Post('gifts/send')
  @ApiOperation({ summary: 'Send a gift to another player' })
  @ApiBody({
    schema: {
      properties: {
        receiverId: { type: 'string', description: 'Receiver player UUID' },
        giftId: { type: 'string', description: 'Gift UUID' },
        quantity: { type: 'number', example: 1 },
        roomId: { type: 'string', description: 'Optional live room UUID' },
        clientTxnId: { type: 'string', description: 'Optional caller-supplied idempotency key (replay-safe)' },
      },
      required: ['receiverId', 'giftId', 'quantity'],
    },
  })
  @ApiResponse({ status: 201, description: 'Gift sent successfully' })
  @ApiResponse({ status: 400, description: 'Insufficient balance' })
  @ApiResponse({ status: 404, description: 'Gift or receiver not found' })
  async sendGift(
    @Request() req: any,
    @Body() body: { receiverId: string; giftId: string; quantity: number; roomId?: string; clientTxnId?: string },
  ) {
    return this.economyService.sendGift(
      req.user.sub,
      body.receiverId,
      body.giftId,
      body.quantity,
      body.roomId,
      body.clientTxnId,
    );
  }

  @Get('gift-transactions')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get gift transaction history (admin)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Gift transactions returned' })
  async getGiftTransactions(
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.economyService.getGiftTransactions(page || 1, limit || 20);
  }

  // ============================================================
  // STATS
  // ============================================================

  @Get('stats')
  @Roles('super_admin', 'admin')
  @ApiOperation({ summary: 'Get economy statistics (admin)' })
  @ApiResponse({ status: 200, description: 'Economy stats returned' })
  async getStats() {
    return this.economyService.getEconomyStats();
  }
}
