import { PrismaClient } from '@prisma/client';

export type dataBuffer = {
  name: string;
  client: prismaClient;
  onError: errorFn;
};
export type job = { rows: any[]; tableName: string; buffer: dataBuffer };

export type writeFn = (buffer: dataBuffer, rows: any[], ...rest) => job;

export type errorFn = (job, error) => void;

export type prismaClient = { prisma: PrismaClient; addJob: (job) => void };

export type taskJob = { task_id: string };
