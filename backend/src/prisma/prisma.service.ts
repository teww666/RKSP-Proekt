import { Injectable, Logger, OnModuleDestroy, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';

const sleep = (ms: number) => new Promise((resolve) => setTimeout(resolve, ms));

@Injectable()
export class PrismaService extends PrismaClient implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(PrismaService.name);

  async onModuleInit(): Promise<void> {
    const maxAttempts = 20;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        await this.$connect();
        this.logger.log('Подключение к PostgreSQL установлено');
        return;
      } catch (error) {
        this.logger.warn(
          `Попытка ${attempt}/${maxAttempts} подключения к БД не удалась: ${error instanceof Error ? error.message : error}`,
        );
        await sleep(3000);
      }
    }
    this.logger.error(
      'Не удалось подключиться к БД после повторов. /health ответит, но API-запросы к БД могут падать.',
    );
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }
}
