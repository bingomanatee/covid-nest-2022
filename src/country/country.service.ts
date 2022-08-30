import { Injectable } from '@nestjs/common';
import { CreateCountryDto } from './dto/create-country.dto';
import { UpdateCountryDto } from './dto/update-country.dto';
import { PrismaService } from '../prisma/prisma.service';
import dayjs from 'dayjs';
import Redis from 'ioredis';
import { Cron } from "@nestjs/schedule";
const redis = new Redis(); // Default port is 6379

@Injectable()
export class CountryService {
  constructor(private prismaService: PrismaService) {}

  create(createCountryDto: CreateCountryDto) {
    return 'This action adds a new country';
  }

  findAll() {
    return `This action returns all country`;
  }

  findOne(id: number) {
    return `This action returns a #${id} country`;
  }

  update(id: number, updateCountryDto: UpdateCountryDto) {
    return `This action updates a #${id} country`;
  }

  remove(id: number) {
    return `This action removes a #${id} country`;
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
    const countries = await this.prismaService.prisma.location.findMany({
      where: {
        level: 1,
      },
    });

    for (let i = 0; i < countries.length; ++i) {
      countries[i] = await this.summarize(countries[i], field);
    }

    return countries;
  }

  private async summarize(country, field) {
    const REDIS_KEY = `${country.id}/${field}`;
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
          location_id: country.id,
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
    const out = { ...country, [field]: summary, start };
    redis.set(REDIS_KEY, JSON.stringify(out), 'PX', 100 * 60 * 1000);
    return out;
  }
}

const SUM_INC = 5000;
