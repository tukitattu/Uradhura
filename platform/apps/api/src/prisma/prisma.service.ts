// ============================================================
// PRISMA SERVICE
// ============================================================

import { Injectable, OnModuleInit, OnModuleDestroy } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  constructor() {
    super({
      log: [
        { emit: 'event', level: 'query' },
        { emit: 'stdout', level: 'error' },
        { emit: 'stdout', level: 'warn' },
      ],
    });
  }

  async onModuleInit() {
    await this.$connect();
  }

  async onModuleDestroy() {
    await this.$disconnect();
  }

  async cleanDatabase() {
    // Only for testing - clean all tables
    if (process.env.NODE_ENV !== 'test') {
      return;
    }

    const models = Reflect.ownKeys(this).filter((key) => key[0] !== '_');

    return Promise.all(
      models.map((modelKey) => this[modelKey].deleteMany()),
    );
  }
}
