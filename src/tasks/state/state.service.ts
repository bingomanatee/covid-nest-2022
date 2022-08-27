/* eslint-disable @typescript-eslint/no-empty-function */
import { Injectable } from '@nestjs/common';
import { CsvService } from '../../csv/csv.service';
import { Cron } from '@nestjs/schedule';
import { QueueWorkerService } from '../queue-worker/queue-worker.service';
import { taskJob } from '../../types';
import { Job, Queue } from 'bull';
import { InjectQueue, Process, Processor } from '@nestjs/bull';
import { PrismaService } from '../../prisma/prisma.service';
import { asFloat, asInt, asString } from '../../utils';

const STATE_CSV_URL = 'https://storage.covid19datahub.io/level/2.csv';
const UPDATE_STATES = 'update-states';

function csvToLocation(row) {
  const {
    id,
    iso_alpha_3,
    latitude,
    administrative_area_level,
    administrative_area_level_1,
    administrative_area_level_2,
    longitude,
    population,
  } = row;
  if (administrative_area_level !== 2 || !(id && iso_alpha_3)) {
    return null;
  }
  return {
    id: asString(id),
    iso3: iso_alpha_3,
    latitude: asFloat(latitude),
    name: asString(administrative_area_level_1),
    admin1: asString(administrative_area_level_1),
    admin2: asString(administrative_area_level_2),
    longitude: asFloat(longitude),
    level: 2,
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

const LOC_STATES = 'locations-states';
const DATA_STATES = 'data-states';

@Processor('tasks')
@Injectable()
export class StateService {
  constructor(
    @InjectQueue('tasks') private taskQueue: Queue,
    private cssService: CsvService,
    private queueWorker: QueueWorkerService,
    private prismaService: PrismaService,
  ) {
    this.prismaService.initBuffer(LOC_STATES, {
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
        if (data && !rows.find((otherRow) => otherRow.id === data.id)) {
          return [...rows, data];
        }
        return rows;
      },
      onError(job, err) {
        console.log('location error:', err);
      },
    });
    this.prismaService.initBuffer(DATA_STATES, {
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

  @Process(UPDATE_STATES)
  async updateStateData(job: Job<taskJob>) {
    console.log('---- updating states?');
    const task = await this.queueWorker.jobTask(job);
    if (!task) {
      return;
    }
    const target = this;
    console.log('---- updating states', task);
    this.cssService.readCsvFile(STATE_CSV_URL, {
      onRecord(row) {
        return row;
      },
      onData(row) {
        target.prismaService.buffers.get(LOC_STATES).add(row);
        target.prismaService.buffers.get(DATA_STATES).add(row);
      },
      onEnd() {
        target.prismaService.buffers.get(LOC_STATES).flush();
        target.prismaService.buffers.get(DATA_STATES).flush();
        console.log('done with state data');
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

  @Cron(' 0 0 4,10,16 * * *')
  async updateStates() {
    this.queueWorker.createTask(
      UPDATE_STATES,
      {},
      {
        source: true,
        frequency: 10,
        frequency_unit: 'm',
      },
    );
  }
}
