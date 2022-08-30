import { Injectable } from "@nestjs/common";
import Redis from "ioredis";

const redis = new Redis(); // Default port is 6379
import fs from "fs";
import path from "path";
import { PrismaService } from "../prisma/prisma.service";

const COUNTRY_KEY = "geojson/country";
const COUNTRIES_KEY = 'geojson/country-data';

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

  private async genCountry() {
    return new Promise((done, fail) => {
      fs.readFile(path.join(__dirname, "../../data/ne_10m_admin_0_countries.geojson.json"), async (err, buffer) => {
        if (err) {
          return fail(err);
        }
        const txt = buffer.toString();
        try {
          const json = JSON.parse(txt);
          await this.parseFeatures(json);
          done(true);
        } catch (err) {
          return fail(err);
        }
      });
    });
  }

  private async parseFeatures(json) {
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
/*

    const activeCountries = features.filter(({ properties }) => iso3map.has(properties.ISO_A3));
    for (let i = 0; i < activeCountries.length; ++i) {
      const country = activeCountries[i];
      const { geometry, bounds, properties } = country;
      const ISO3 = properties.ISO_A3;
      const KEY = COUNTRIES_KEY + '/' + ISO3;
      console.log('setting ', KEY);
      const prop = iso3map.get(ISO3);

      try {
        await redis.hset(KEY, "geometry", JSON.stringify(geometry));
        await redis.hset(KEY, "properties", JSON.stringify(prop));
      } catch (err) {
        console.log('error setting gpb:', geometry, prop, err);
      }
    }

    const keys = await redis.keys(COUNTRIES_KEY + '*');
    await redis.set(COUNTRY_KEY,'[');

    for (let i = 0; i < keys.length; ++i) {
      const data = await redis.hgetall(keys[i]);
      Object.keys(data).forEach((key) => data[key] = JSON.parse(data[key]));
      if (i) {
        await redis.append(COUNTRY_KEY, ",")
      }
      await redis.append(COUNTRY_KEY, JSON.stringify(data) + "\n");
    }*/
    json.features = json.features.filter((feature) => iso3map.has(feature.properties.ISO_A3))
    json.features.forEach((feature) => {
      feature.properties = {ISO_A3: feature.properties.ISO_A3};
    })
    await redis.set(COUNTRY_KEY,JSON.stringify(json));
    await redis.expire(COUNTRY_KEY, 60 * 5);
  }
}
