import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

const redis = new Redis(); // Default port is 6379
import fs from "fs";
import path from "path";
import { PrismaService } from "../prisma/prisma.service";
import _ from 'lodash';

const COUNTRY_KEY = "geojson/country";
const STATE_KEY = "geojson/state";

@Injectable()
export class GeojsonService {
  constructor(private prismaService: PrismaService) {
  }

  async country() {
    const hasGeoJson = await redis.exists(COUNTRY_KEY);
    if (!hasGeoJson) {
      await this.genCountry();
    }
    const countries = await redis.get(COUNTRY_KEY);
    return JSON.parse(countries);
  }

  async state() {
    const hasGeoJson = await redis.exists(STATE_KEY);
    if (true || !hasGeoJson) {
      await this.genState();
    }
    const states = await redis.get(STATE_KEY);
    return JSON.parse(states);
  }

  private async genState() {
    return new Promise((done, fail) => {
      fs.readFile(path.join(__dirname, "../../data/ne_10m_admin_1_states_provinces.geojson.json"), async (err, buffer) => {
        if (err) {
          return fail(err);
        }
        const txt = buffer.toString();
        try {
          const json = JSON.parse(txt);
          await this.parseStateFeatures(json);
          done(true);
        } catch (err) {
          return fail(err);
        }
      });
    });
  }

  private async genCountry() {
    return new Promise((done, fail) => {
      fs.readFile(path.join(__dirname, "../../data/ne_10m_admin_0_countries.geojson.json"), async (err, buffer) => {
        if (err) {
          return fail(err);
        }
        const txt = buffer.toString();
        try {
          const json = JSON.parse(txt);
          await this.parseCountryFeatures(json);
          done(true);
        } catch (err) {
          return fail(err);
        }
      });
    });
  }

  private async parseStateFeatures(json) {
    const stateAdmin2names = await this.prismaService.prisma.location.findMany({
      where: {
        level: 2
      },
      select: { iso3: true, admin2: true, population: true, latitude: true, longitude: true },
      orderBy: [
        {
          iso3: "asc"
        },
        {
          admin2: "asc"
        }
      ]
    });
    console.log("state locations:", stateAdmin2names.length);
    const iso3map = stateAdmin2names.reduce((map, data) => {
      map.set(`${data.iso3} ${data.admin2}`, data);
      return map;
    }, new Map());

    json.features = _.sortBy(json.features, "properties.adm0_a3", "properties.name")
      .filter((feature) => {
        const { adm0_a3, name } = feature.properties;
        if (iso3map.has(`${adm0_a3} ${name}`)) {
          return true;
        } else {
          console.log('cannot find  STATE ', adm0_a3, name);
          return false
        }
      });

    json.features.forEach((feature) => {
      const { adm0_a3, name } = feature.properties;
      feature.properties = iso3map.get(`${adm0_a3} ${name}`)
    });
    await redis.set(STATE_KEY, JSON.stringify(json));
    await redis.expire(STATE_KEY, 60 * 2);
  }

  private async parseCountryFeatures(json) {
    const countryISO3codes = await this.prismaService.prisma.location.findMany({
      where: {
        level: 1
      },
      select: { iso3: true, population: true, latitude: true, longitude: true }
    });
    const iso3map = countryISO3codes.reduce((map, data) => {
      map.set(data.iso3, data);
      return map;
    }, new Map());

    json.features = json.features.filter((feature) => iso3map.has(feature.properties.ISO_A3));
    json.features.forEach((feature) => {
      feature.properties = iso3map.get(feature.properties.ISO_A3);
    });
    await redis.set(COUNTRY_KEY, JSON.stringify(json));
    await redis.expire(COUNTRY_KEY, 60 * 2);
  }
}
