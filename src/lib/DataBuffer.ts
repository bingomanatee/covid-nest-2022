import { PrismaClient } from 'prisma/prisma-client/scripts/default-index';
import { errorFn, prismaClient, writeFn } from '../types';

export class DataBuffer {
  private filter: any;
  constructor(
    name,
    client: prismaClient,
    { filter, limit = 0, onWrite, onError },
  ) {
    this.name = name;
    this.limit = limit;
    this.onWrite = onWrite;
    this.filter = filter;
    this.onError = onError;
    this.client = client;
    this.rows = [];
  }

  public name: string;
  client: prismaClient;
  private rows: any[];
  limit: number;
  onWrite: writeFn;
  public onError: errorFn;

  add(row) {
    if (this.filter) {
      this.rows = this.filter(row, this.rows) || this.rows;
    } else this.rows.push(row);
    if (this.rows.length >= this.limit) {
      const rows = this.rows.splice(0, Math.max(1, this.limit));
      this.client.addJob(this.onWrite(this, rows));
    }
  }

  flush() {
    this.client.addJob(this.onWrite(this, this.rows));
    this.rows = [];
  }
}
