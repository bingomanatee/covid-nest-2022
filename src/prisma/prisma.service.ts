import { INestApplication, Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaClient } from '@prisma/client';
import { DataBuffer } from '../lib/DataBuffer';
import { job } from '../types';

let prisma: PrismaClient;
let globalWithPrisma;

if (process.env.NODE_ENV === 'production') {
  prisma = new PrismaClient();
} else {
  globalWithPrisma = global as typeof globalThis & {
    prisma: PrismaClient;
  };
  if (!globalWithPrisma.prisma) {
    globalWithPrisma.prisma = new PrismaClient();
  }
  prisma = globalWithPrisma.prisma;
}

let connected = false;

// eslint-disable-next-line @typescript-eslint/no-empty-function
const NOOP = () => {};

@Injectable()
export class PrismaService implements OnModuleInit {
  public prisma: PrismaClient;

  constructor() {
    this.prisma = prisma;
  }

  async onModuleInit() {
    if (!connected) {
      connected = true;
      await this.prisma.$connect();
    }
  }

  async enableShutdownHooks(app: INestApplication) {
    this.prisma.$on('beforeExit', async () => {
      await app.close();
    });
  }

  buffers: Map<string, DataBuffer> = new Map();

  initBuffer(name, config) {
    if (!this.buffers.has(name)) {
      this.buffers.set(name, new DataBuffer(name, this, config));
    }
  }

  jobs: job[] = [];

  addJob(job) {
    if (job.rows.length <= 0) {
      return;
    }
    this.jobs.push(job);
    this.work();
  }

  private working = false;

  divide(job) {
    if (job.rows.length <= 0) {
      return;
    }
    if (job.rows.length > 10) {
      const otherRows = job.rows.splice(0, Math.floor(job.rows.length / 2));

      this.addJob(job);
      this.addJob({ ...job, rows: otherRows });
    } else {
      do {
        const record = job.rows.shift();
        this.addJob({ ...job, rows: [record] });
      } while (job.rows.length);
    }
  }

  async work() {
    if (this.working) {
      return;
    }
    if (this.jobs.length) {
      const job = this.jobs.shift();
      if (job.rows.length <= 0) {
        return;
      }
      try {
        await this.prisma[job.tableName].createMany({
          data: job.rows,
          skipDuplicates: true,
        });

        console.log(
          'work -- wrote ',
          job.rows.length,
          'rows to ',
          job.tableName,
        );
      } catch (err) {
        // @ts-ignore
        if (err.code === 'P2024') {
          this.jobs.unshift(job);
        } else {
          job.buffer.onError(job, err);
          if (job.rows.length > 1) {
            this.divide(job);
          }
        }
      }
    }
  }
}
