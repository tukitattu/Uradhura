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
import { PlayerAuthGuard } from '../auth/guards/player-auth.guard';
import { CurrentPlayer, CurrentPlayerData } from '../auth/decorators/current-player.decorator';
import { toPlayerLite } from '../players/player.mapper';

function toMessageDto(message: any) {
  const metadata = (() => {
    try {
      return message.metadata ? JSON.parse(message.metadata) : null;
    } catch {
      return null;
    }
  })();
  const type =
    message.type === 'dm' || message.type === 'chat'
      ? 'text'
      : message.type === 'gift'
        ? 'gift'
        : message.type === 'image'
          ? 'image'
          : 'system';
  return {
    id: message.id,
    conversationId: message.receiverId || message.roomId,
    senderId: message.senderId,
    sender: message.sender ? toPlayerLite({ id: message.sender.id, username: message.sender.username, displayName: message.sender.displayName, avatar: message.sender.avatar }) : undefined,
    content: message.content ?? '',
    type,
    metadata,
    isRead: !!(metadata && metadata.read === true),
    createdAt: message.createdAt.toISOString(),
  };
}

@ApiTags('Chat')
@ApiBearerAuth()
@UseGuards(PlayerAuthGuard)
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
    @CurrentPlayer() player: CurrentPlayerData,
    @Body() body: {
      roomId?: string;
      receiverId?: string;
      content: string;
      type?: string;
      metadata?: Record<string, unknown>;
    },
  ) {
    return this.chatService.sendMessage(player.sub, body);
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
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('playerId', ParseUUIDPipe) playerId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    return this.chatService.getDirectMessages(player.sub, playerId, page || 1, limit || 50);
  }

  @Delete('messages/:messageId')
  @ApiOperation({ summary: 'Delete a message (own or mod)' })
  @ApiParam({ name: 'messageId', description: 'Message UUID' })
  @ApiResponse({ status: 200, description: 'Message deleted' })
  @ApiResponse({ status: 403, description: 'Not authorized to delete' })
  @ApiResponse({ status: 404, description: 'Message not found' })
  async deleteMessage(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('messageId', ParseUUIDPipe) messageId: string,
  ) {
    return this.chatService.deleteMessage(messageId, player.sub);
  }

  // ============================================================
  // CONVERSATIONS & SEARCH
  // ============================================================

  @Get('conversations')
  @ApiOperation({ summary: 'List DM conversations with last message and unread count' })
  @ApiResponse({ status: 200, description: 'Conversations returned sorted by last message' })
  async getConversations(@CurrentPlayer() player: CurrentPlayerData) {
    const conversations = await this.chatService.getConversations(player.sub);
    return {
      data: conversations.map((c) => ({
        id: c.otherPlayer.id,
        participants: [toPlayerLite({ id: c.otherPlayer.id, username: c.otherPlayer.username, displayName: c.otherPlayer.displayName, avatar: c.otherPlayer.avatar }), toPlayerLite({ id: player.sub, username: player.username })],
        lastMessage: {
          id: '',
          conversationId: c.otherPlayer.id,
          senderId: c.otherPlayer.id,
          sender: toPlayerLite({ id: c.otherPlayer.id, username: c.otherPlayer.username, displayName: c.otherPlayer.displayName, avatar: c.otherPlayer.avatar }),
          content: c.lastMessage.content,
          type: 'text',
          metadata: null,
          isRead: true,
          createdAt: c.lastMessage.createdAt.toISOString(),
        },
        unreadCount: c.unreadCount,
        updatedAt: c.lastMessage.createdAt.toISOString(),
      })),
    };
  }

  @Get('conversations/:conversationId/messages')
  @ApiOperation({ summary: 'Get DM messages for a conversation' })
  @ApiParam({ name: 'conversationId', description: 'Other player UUID (conversation id)' })
  @ApiQuery({ name: 'page', required: false, type: Number })
  @ApiQuery({ name: 'limit', required: false, type: Number })
  @ApiResponse({ status: 200, description: 'Direct messages returned' })
  @ApiResponse({ status: 404, description: 'Player not found' })
  async getConversationMessages(
    @CurrentPlayer() player: CurrentPlayerData,
    @Param('conversationId', ParseUUIDPipe) conversationId: string,
    @Query('page') page?: number,
    @Query('limit') limit?: number,
  ) {
    const result = await this.chatService.getDirectMessages(player.sub, conversationId, page || 1, limit || 50);
    return {
      data: result.data.map((m) => ({
        ...toMessageDto(m),
        conversationId,
      })),
      meta: result.meta,
    };
  }

  @Get('search')
  @ApiOperation({ summary: 'Search messages across rooms and DMs' })
  @ApiQuery({ name: 'q', required: true, type: String, description: 'Search query' })
  @ApiResponse({ status: 200, description: 'Matching messages returned' })
  @ApiResponse({ status: 400, description: 'Empty search query' })
  async searchMessages(
    @CurrentPlayer() player: CurrentPlayerData,
    @Query('q') query: string,
  ) {
    return this.chatService.searchMessages(player.sub, query);
  }
}
