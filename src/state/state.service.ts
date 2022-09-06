import { Injectable } from "@nestjs/common";
import { PrismaService } from "../prisma/prisma.service";
import dayjs from "dayjs";
import Redis from "ioredis";
import { Cron } from "@nestjs/schedule";
import { HOURS_IN_MS } from "../utils";

const redis = new Redis(); // Default port is 6379

class Place {
  constructor(iso3, admin2, states: string | any[] = []) {
    let stateData = [];
    if (typeof states === "string") {
      stateData = [new Place(iso3, states)];
    } else {
      stateData = states.map((item) => {
        return typeof item === "string" ? new Place(iso3, item) : item;
      });
    }

    this.iso3 = iso3;
    this.admin2 = admin2;
    this.states = stateData;
  }

  states: Place[];
  admin2: string;
  iso3: string;
}

// mapping death data abbr to state data abbr

const StateDeathsMap = [
  new Place("GBR", "Northern Ireland",
    [
      "Antrim",
      "Down",
      "Armagh",
      "Derry",
      "Fermanagh"
    ]
  ),
  new Place("PAK", "K.P.", ["Khyber Pakhtunkhwa"]),
  new Place("PAK", "Azad Jammu and Kashmir", ["Azad Kashmir"]),
  new Place("PAK", "Sindh", "Sind"),
  new Place("PAK", "Balochistan", ["Baluchistan"]),
  new Place("RUS", "Adygea Republic", "Adygey"),
  new Place("RUS", "Amur Oblast", "Amur"),
  new Place("RUS", "Arkhangelsk Oblast", "Arkhangel'sk"),
  new Place("RUS", "Chechen Republic", "Chechnya"),
  new Place("RUS", "Chelyabinsk Oblast", "Chelyabinsk"),
  new Place("RUS", "Chukotka Autonomous Okrug", "Chukchi Autonomous Okrug"),
  new Place("RUS", "Chuvashia Republic", "Chuvash"),
  new Place("RUS", "Irkutsk Oblast", "Irkutsk"),
  new Place("RUS", "Ivanovo Oblast", "Ivanovo"),
  new Place("RUS", "Jewish Autonomous Okrug", "Amur"),
  new Place("RUS", "Jewish Autonomous Okrug", "Amur")

];

@Injectable()
export class StateService {
  constructor(private prismaService: PrismaService) {
  }

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

  @Cron(" 0 */5  *  * * *")
  async summary(field = "deaths") {
    const states = await this.prismaService.prisma.location.findMany({
      where: {
        level: 2
      }
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
            gt: 0
          }
        },
        take: SUM_INC,
        skip,
        select: {
          [field]: true,
          date: true
        },
        orderBy: {
          date: "asc"
        }
      });
      skip += SUM_INC;
      data = data.concat(retrieved);
    } while (retrieved.length);
    if (data.length) {
      const { date } = data[0];
      const firstDay = dayjs(date);
      start = firstDay.unix();
      summary = data.reduce((list, item) => {
        const offset = dayjs(item.date).diff(firstDay, "d");
        const value = item[field];
        while (list.length < offset) {
          list.push(value);
        }
        return list;
      }, summary);
    }
    const out = { ...state, [field]: summary, start };
    redis.set(REDIS_KEY, JSON.stringify(out), "PX", HOURS_IN_MS * 8);
    return out;
  }

  states() {
    return this.prismaService.prisma.location.findMany({
      where: {
        level: 2
      },
      include: {
        shape_states: true
      }
    });
  }

  async findOne(id) {
    return this.prismaService.prisma.location.findUniqueOrThrow({
      where: {
        id
      }
    });
  }

  async alias(location_id: string, alias) {
    return this.prismaService.prisma.shape_state.create({
      data: { location_id, ...alias }
    });
  }
}

const SUM_INC = 5000;
