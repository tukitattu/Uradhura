// ============================================================
// TEEN PATTI CONTROLLER
// ============================================================

import { Controller, Get, Post, Body, Param, UseGuards, Request, ParseUUIDPipe } from '@nestjs/common';
import { ApiTags, ApiOperation, ApiResponse, ApiBearerAuth, ApiBody, ApiParam } from '@nestjs/swagger';
import { TeenPattiService } from './teen-patti.service';
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { TPActionKind } from './engine/teen-patti-game';

@ApiTags('Teen Patti')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
@Controller('teen-patti')
export class TeenPattiController {
  constructor(private readonly teenPattiService: TeenPattiService) {}

  @Get('tables')
  @ApiOperation({ summary: 'List open Teen Patti tables' })
  @ApiResponse({ status: 200, description: 'Table list returned' })
  async listTables() {
    return this.teenPattiService.listTables();
  }

  @Get('tables/:id')
  @ApiOperation({ summary: 'Get table state (public view)' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  async getTable(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.teenPattiService.getTable(id, req?.user?.sub);
  }

  @Get('tables/:id/privates')
  @ApiOperation({ summary: 'Get your own hand (cards + chip stack)' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 200, description: 'Private seat state returned' })
  async getPrivates(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.teenPattiService.getPrivates(id, req.user.sub);
  }

  @Post('tables/:id/sit')
  @ApiOperation({ summary: 'Buy in and take a seat' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiBody({ schema: { type: 'object', properties: { buyIn: { type: 'number' } } } })
  @ApiResponse({ status: 201, description: 'Seated' })
  async sit(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @Body() body: { buyIn: number }) {
    await this.teenPattiService.sit(id, req.user.sub, body?.buyIn);
    return this.teenPattiService.getTable(id, req.user.sub);
  }

  @Post('tables/:id/buy-more')
  @ApiOperation({ summary: 'Top up chips between hands' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiBody({ schema: { type: 'object', properties: { amount: { type: 'number' } } } })
  @ApiResponse({ status: 201, description: 'Chips added' })
  async buyMore(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @Body() body: { amount: number }) {
    await this.teenPattiService.buyMore(id, req.user.sub, body?.amount);
    return this.teenPattiService.getTable(id, req.user.sub);
  }

  @Post('tables/:id/stand')
  @ApiOperation({ summary: 'Cash out and leave the table' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiResponse({ status: 201, description: 'Left the table' })
  async stand(@Param('id', ParseUUIDPipe) id: string, @Request() req: any) {
    return this.teenPattiService.stand(id, req.user.sub);
  }

  @Post('tables/:id/rotate-seed')
  @ApiOperation({ summary: 'Set your own client seed for future hands (provable fairness)' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiBody({ schema: { type: 'object', properties: { clientSeed: { type: 'string', minLength: 8 } } } })
  @ApiResponse({ status: 201, description: 'Client seed stored for the next dealt hand' })
  async rotateSeed(@Param('id', ParseUUIDPipe) id: string, @Request() req: any, @Body() body: { clientSeed: string }) {
    await this.teenPattiService.rotateSeed(id, req.user.sub, body?.clientSeed);
    return { ok: true };
  }

  @Post('tables/:id/action')
  @ApiOperation({ summary: 'Submit a table action (fold/see/blind/chaal/raise/allin/show)' })
  @ApiParam({ name: 'id', description: 'Table UUID' })
  @ApiBody({ schema: { type: 'object', properties: { kind: { type: 'string', example: 'chaal' } } } })
  @ApiResponse({ status: 201, description: 'Action accepted' })
  async action(
    @Param('id', ParseUUIDPipe) id: string,
    @Request() req: any,
    @Body() body: { kind: TPActionKind },
  ) {
    const result = await this.teenPattiService.performAction(id, req.user.sub, body?.kind);
    if (!result.ok) return result;
    return { ok: true, ...result, privates: await this.teenPattiService.getPrivates(id, req.user.sub) };
  }
}