import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { ScheduleModule } from '@nestjs/schedule';
import { PrismaService } from './prisma/prisma.service';
import { BullModule } from '@nestjs/bull';
import { TasksModule } from './tasks/tasks.module';
import { PrismaModule } from './prisma/prisma.module';

const REDIS = { host: 'localhost', port: 6379 };
@Module({
  imports: [
    ScheduleModule.forRoot(),
    BullModule.forRoot({
      // @ts-ignore
      redis: REDIS,
    }),
    TasksModule,
    PrismaModule,
  ],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}
