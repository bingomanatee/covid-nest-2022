import { Module } from '@nestjs/common';
import { BullModule } from '@nestjs/bull';
import { QueueWorkerService } from './queue-worker/queue-worker.service';
import { CountryService } from './country/country.service';
import { PrismaModule } from '../prisma/prisma.module';
import { PrismaService } from '../prisma/prisma.service';
import { CsvService } from '../csv/csv.service';
import { StateService } from './state/state.service';

@Module({
  controllers: [],
  providers: [
    QueueWorkerService,
    CountryService,
    PrismaService,
    CsvService,
    StateService,
  ],
  imports: [
    PrismaModule,
    BullModule.registerQueue({
      name: 'tasks',
    }),
  ],
})
export class TasksModule {}
