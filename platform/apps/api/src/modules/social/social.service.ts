// ============================================================
// SOCIAL SERVICE
// ============================================================

import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';

@Injectable()
export class SocialService {
  constructor(private prisma: PrismaService) {}

  // ============================================================
  // POSTS / MOMENTS
  // ============================================================

  async createPost(authorId: string, data: { content?: string; imageUrl?: string; videoUrl?: string; type?: string }) {
    return this.prisma.post.create({
      data: {
        authorId,
        content: data.content,
        imageUrl: data.imageUrl,
        videoUrl: data.videoUrl,
        type: data.type || 'moment',
      },
    });
  }

  async getPosts(page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [posts, total] = await Promise.all([
      this.prisma.post.findMany({
        where: { isDeleted: false },
        skip,
        take: limit,
        orderBy: { createdAt: 'desc' },
        include: {
          author: { select: { id: true, username: true, displayName: true, avatar: true } },
          _count: { select: { likes: true, comments: true } },
        },
      }),
      this.prisma.post.count({ where: { isDeleted: false } }),
    ]);

    return { data: posts, total, page, limit };
  }

  async likePost(playerId: string, postId: string) {
    const existing = await this.prisma.postLike.findUnique({
      where: { postId_playerId: { postId, playerId } },
    });

    if (existing) {
      // Unlike
      await this.prisma.postLike.delete({ where: { id: existing.id } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { decrement: 1 } },
      });
      return { liked: false };
    } else {
      // Like
      await this.prisma.postLike.create({ data: { postId, playerId } });
      await this.prisma.post.update({
        where: { id: postId },
        data: { likesCount: { increment: 1 } },
      });
      return { liked: true };
    }
  }

  async commentOnPost(playerId: string, postId: string, content: string) {
    const comment = await this.prisma.postComment.create({
      data: { postId, playerId, content },
    });

    await this.prisma.post.update({
      where: { id: postId },
      data: { commentsCount: { increment: 1 } },
    });

    return comment;
  }

  // ============================================================
  // FOLLOW / UNFOLLOW
  // ============================================================

  async follow(followerId: string, followingId: string) {
    if (followerId === followingId) {
      throw new Error('Cannot follow yourself');
    }

    const existing = await this.prisma.followRelation.findUnique({
      where: { followerId_followingId: { followerId, followingId } },
    });

    if (existing) {
      return { following: false };
    }

    await this.prisma.followRelation.create({
      data: { followerId, followingId },
    });

    return { following: true };
  }

  async unfollow(followerId: string, followingId: string) {
    await this.prisma.followRelation.deleteMany({
      where: { followerId, followingId },
    });

    return { following: false };
  }

  async getFollowers(playerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [followers, total] = await Promise.all([
      this.prisma.followRelation.findMany({
        where: { followingId: playerId },
        skip,
        take: limit,
        include: {
          follower: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
      this.prisma.followRelation.count({ where: { followingId: playerId } }),
    ]);

    return {
      data: followers.map((f) => f.follower),
      total,
      page,
      limit,
    };
  }

  async getFollowing(playerId: string, page = 1, limit = 20) {
    const skip = (page - 1) * limit;
    const [following, total] = await Promise.all([
      this.prisma.followRelation.findMany({
        where: { followerId: playerId },
        skip,
        take: limit,
        include: {
          following: { select: { id: true, username: true, displayName: true, avatar: true } },
        },
      }),
      this.prisma.followRelation.count({ where: { followerId: playerId } }),
    ]);

    return {
      data: following.map((f) => f.following),
      total,
      page,
      limit,
    };
  }

  // ============================================================
  // BLOCK
  // ============================================================

  async block(blockerId: string, blockedId: string) {
    if (blockerId === blockedId) {
      throw new Error('Cannot block yourself');
    }

    await this.prisma.blockRelation.upsert({
      where: { blockerId_blockedId: { blockerId, blockedId } },
      update: {},
      create: { blockerId, blockedId },
    });

    // Remove follow relations
    await this.prisma.followRelation.deleteMany({
      where: {
        OR: [
          { followerId: blockerId, followingId: blockedId },
          { followerId: blockedId, followingId: blockerId },
        ],
      },
    });

    return { blocked: true };
  }

  async unblock(blockerId: string, blockedId: string) {
    await this.prisma.blockRelation.deleteMany({
      where: { blockerId, blockedId },
    });

    return { blocked: false };
  }
}
