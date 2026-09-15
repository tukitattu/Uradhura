import { Request, Response } from 'express';
import prisma from '../config/database';
import { sendSuccess } from '../utils/response';

export async function getSocialHome(_req: Request, res: Response): Promise<void> {
  const [games, players] = await Promise.all([
    prisma.game.findMany({
      where: { isActive: true },
      orderBy: { sortOrder: 'asc' },
      select: { id: true, name: true, slug: true, description: true },
      take: 6,
    }),
    prisma.player.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      select: { id: true, username: true },
      take: 8,
    }),
  ]);

  sendSuccess(res, {
    rooms: games.map((game, index) => ({
      id: game.id,
      title: `${game.name} lounge`,
      host: players[index % Math.max(players.length, 1)]?.username || 'Dear Live host',
      category: index % 2 === 0 ? 'Live game' : 'Party room',
      viewers: 120 + index * 47,
      cover: index % 2 === 0 ? '/assets/bg/room_bg.png' : '/assets/bg/reward_bg.png',
    })),
    moments: players.slice(0, 4).map((player, index) => ({
      id: player.id,
      username: player.username,
      caption: ['Good vibes only', 'Tonight is a lucky night', 'Come join the room', 'New friends, new moments'][index],
      image: '/assets/logo/dearlive-poster.png',
    })),
    ranking: players.slice(0, 3).map((player, index) => ({
      id: player.id,
      username: player.username,
      score: 9800 - index * 1200,
      frame: `/assets/frame/top${index + 1}_avater_frame.png`,
    })),
  });
}