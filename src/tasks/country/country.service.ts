/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable } from '@nestjs/common';
import { CsvService } from '../../csv/csv.service';
import { Cron } from '@nestjs/schedule';
import { QueueWorkerService } from '../queue-worker/queue-worker.service';
import { taskJob } from '../../types';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { PrismaService } from '../../prisma/prisma.service';
import { asFloat, asInt, asString } from '../../utils';

const COUNTRY_CSV_URL = 'https://storage.covid19datahub.io/level/1.csv';

function csvToLocation(row) {
  const {
    id,
    iso_alpha_3,
    latitude,
    administrative_area_level_1,
    longitude,
    population,
  } = row;
  if (!(id && iso_alpha_3)) {
    return null;
  }
  return {
    id: asString(id),
    iso3: asString(iso_alpha_3),
    latitude: asFloat(latitude),
    name: asString(administrative_area_level_1),
    admin1: asString(administrative_area_level_1),
    longitude: asFloat(longitude),
    level: 1,
    population: asInt(population),
  };
}
function csvToData(row) {
  const { id, date, deaths, hosp } = row;
  if (!(id && date)) {
    return null;
  }
  return {
    date,
    location_id: asString(id),
    hosp: asInt(hosp),
    deaths: asInt(deaths),
  };
}

const LOC_COUNTRIES = 'locations-countries';
const DATA_COUNTRIES = 'data-countries';

@Processor('tasks')
@Injectable()
export class CountryService {
  constructor(
    @InjectQueue('tasks') private taskQueue: Queue,
    private cssService: CsvService,
    private queueWorker: QueueWorkerService,
    private prismaService: PrismaService,
  ) {
    this.prismaService.initBuffer(LOC_COUNTRIES, {
      limit: 100,
      onWrite(buffer, rows) {
        return {
          tableName: 'location',
          rows,
          buffer,
        };
      },
      filter(row, rows) {
        const data = csvToLocation(row);
        if (data && !rows.find((otherRow) => otherRow.iso3 === data.iso3)) {
          return [...rows, data];
        }
        return rows;
      },
      onError(job, err) {
        console.log('location error:', err);
      },
    });
    this.prismaService.initBuffer(DATA_COUNTRIES, {
      limit: 10000,
      onWrite(buffer, rows) {
        return {
          tableName: 'covid_data',
          rows,
          buffer,
        };
      },
      filter(row, rows) {
        const data = csvToData(row);
        if (data) {
          return [...rows, data];
        }
        return rows;
      },
      onError(job, err) {
        console.log('location error:', err);
      },
    });
  }

  @Process('update-countries')
  async updateCountryData(job: Job<taskJob>) {
    const task = await this.queueWorker.jobTask(job);
    if (!task) {
      return;
    }
    const target = this;
    console.log('---- updating countries', task);
    this.cssService.readCsvFile(COUNTRY_CSV_URL, {
      onRecord(row) {
        return row;
      },
      onData(row) {
        target.prismaService.buffers.get(LOC_COUNTRIES).add(row);
        target.prismaService.buffers.get(DATA_COUNTRIES).add(row);
      },
      onEnd() {
        target.prismaService.buffers.get(LOC_COUNTRIES).flush();
        target.prismaService.buffers.get(DATA_COUNTRIES).flush();
        console.log('done with country data');
        target.queueWorker.finish(task);
      },
      async onError(err) {
        console.log('job error: ', err);
      },
    });
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

  @Cron(' 0 0 */6  * * *')
  async updateCountries() {
    this.queueWorker.createTask(
      'update-countries',
      {},
      {
        source: true,
        frequency: 4,
        frequency_unit: 'h',
      },
    );
  }
}
