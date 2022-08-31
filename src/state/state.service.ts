import { Injectable } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import Redis from 'ioredis';
import { Cron } from "@nestjs/schedule";
const redis = new Redis(); // Default port is 6379

@Injectable()
export class StateService {
  constructor(private prismaService: PrismaService) {}

  remove(id: number) {
    return `This action removes a #${id} state`;
  }
  /*
                  * *   * * * *
                  | |   | | | |
                  | |   | | | day of week
                  | |   | | months
                  | |   | day of month
                  | |   hours
                  | minutes
                  seconds (optional)
   */

  @Cron(' 0 */5  *  * * *')
  async summary(field = 'deaths') {
    const states = await this.prismaService.prisma.location.findMany({
      where: {
        level: 2,
      },
    });

    for (let i = 0; i < states.length; ++i) {
      states[i] = await this.summarize(states[i], field);
    }

    return states;
  }

  private async summarize(state, field) {
    const REDIS_KEY = `${state.id}/${field}`;
    const cached = await redis.get(REDIS_KEY);
    if (cached) {
      return JSON.parse(cached);
    }
    let data = [];
    let skip = 0;
    let retrieved = [];
    let start = 0;
    let summary = [];
    do {
      retrieved = await this.prismaService.prisma.covid_data.findMany({
        where: {
          location_id: state.id,
          [field]: {
            gt: 0,
          },
        },
        take: SUM_INC,
        skip,
        select: {
          [field]: true,
          date: true,
        },
        orderBy: {
          date: 'asc',
        },
      });
      skip += SUM_INC;
      data = data.concat(retrieved);
    } while (retrieved.length);
    if (data.length) {
      const { date } = data[0];
      const firstDay = dayjs(date);
      start = firstDay.unix();
      summary = data.reduce((list, item) => {
        const offset = dayjs(item.date).diff(firstDay, 'd');
        const value = item[field];
        while (list.length < offset) {
          list.push(value);
        }
        return list;
      }, summary);
    }
    const out = { ...state, [field]: summary, start };
    redis.set(REDIS_KEY, JSON.stringify(out), 'PX', 100 * 60 * 1000);
    return out;
  }
}

const SUM_INC = 5000;
