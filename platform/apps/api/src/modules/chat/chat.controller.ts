// ============================================================
// CHAT CONTROLLER
// ============================================================

import {
  Controller,
  Get,
  Post,
  Delete,
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
import { ChatService } from './chat.service';
import { JwtAuthGuard } from '../auth/guards/jwt-auth.guard';

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(JwtAuthGuard)
@Controller('chat')
export class ChatController {
  constructor(private readonly chatService: ChatService) {}

  // ============================================================
  // MESSAGES
  // ============================================================

  @Post('messages')
  @ApiOperation({ summary: 'Send a message (room or DM)' })
  @ApiBody({
    schema: {
      properties: {
        roomId: { type: 'string', description: 'Live room UUID (for room messages)' },
        receiverId: { type: 'string', description: 'Receiver player UUID (for DMs)' },
        content: { type: 'string', example: 'Hello everyone!', maxLength: 2000 },
        type: { type: 'string', enum: ['chat', 'system'], default: 'chat' },
        metadata: { type: 'object', description: 'Optional message metadata' },
      },
      required: ['content'],
    },
  })
  @ApiResponse({ status: 201, description: 'Message sent' })
  @ApiResponse({ status: 400, description: 'Invalid message or missing target' })
  @ApiResponse({ status: 403, description: 'Banned player or muted in room' })
  @ApiResponse({ status: 404, description: 'Room or receiver not found' })
  async sendMessage(
    @Request() req: any,
    @Body() body: {
      roomId?: string;
      receiverId?: string;
      content: string;
      type?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.chatService.sendMessage(req.user.sub, body);
  }

  @Get('rooms/:roomId/messages')
  @ApiOperation({ summary: 'Get paginated room messages' })
  @ApiParam({ name: 'roomId', description: 'Live room UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Messages per page (default 50)' })
  @ApiResponse({ status: 200, description: 'Room messages returned' })
  @ApiResponse({ status: 404, description: 'Room not found' })
  async getRoomMessages(
    @Param('roomId', ParseUUIDPipe) roomId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getRoomMessages(roomId, page || 1, limit || 50);
  }

  @Get('dm/:playerId')
  @ApiOperation({ summary: 'Get direct messages with another player' })
  @ApiParam({ name: 'playerId', description: 'Other player UUID' })
  @ApiQuery({ name: 'page', required: false, type: Number, description: 'Page number (default 1)' })
  @ApiQuery({ name: 'limit', required: false, type: Number, description: 'Messages per page (default 50)' })
  @ApiResponse({ status: 200, description: 'Direct messages returned' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getDirectMessages(
    @Request() req: any,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getDirectMessages(req.user.sub, playerId, page || 1, limit || 50);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message (own or mod)' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(
    @Request() req: any,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.chatService.deleteMessage(messageId, req.user.sub);
  }

  // ============================================================
  // CONVERSATIONS & SEARCH
  // ============================================================

  @Get('conversations')
  @ApiOperation({ summary: 'List DM conversations with last message and unread count' })
  @ApiResponse({ status: 200, description: 'Conversations returned sorted by last message' })
  async getConversations(@Request() req: any) {
    return this.chatService.getConversations(req.user.sub);
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages across rooms and DMs' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Matching messages returned' })
  @ApiResponse({ status: 400, description: 'Empty search query' })
  async searchMessages(
    @Request() req: any,
    @Query('q') query: string,
  ) {
    return this.chatService.searchMessages(req.user.sub, query);
  }
}
