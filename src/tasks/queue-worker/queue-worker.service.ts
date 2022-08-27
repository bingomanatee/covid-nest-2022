import { Injectable } from '@nestjs/common';
import { PrismaService } from '../../prisma/prisma.service';
import { Cron } from '@nestjs/schedule';
import dayjs from 'dayjs';
import { Queue } from 'bull';
import { InjectQueue } from '@nestjs/bull';
import { Processor, Process } from '@nestjs/bull';
import { Job } from 'bull';
import { taskJob } from '../../types';

type createTaskInfo = {
  frequency?: number;
  source?: boolean;
  frequency_unit?: string;
};

@Processor('tasks')
@Injectable()
export class QueueWorkerService {
  private identity: string;

  constructor(
    private prismaService: PrismaService,
    @InjectQueue('tasks') private taskQueue: Queue,
  ) {
    this.identity = `${Math.random()}  ${Date.now()}`;
    // kill earlier tasks -- do not do in production
    this.prismaService.prisma.task_action.deleteMany({}).then(() => {
      this.prismaService.prisma.task.deleteMany({});
    });
  }

  public async broadcastTask(task, data = {}) {
    if (!task) {
      return;
    }
    console.log('broadcasting', task.name, task.id, data);
    this.taskQueue.add(task.name, {
      ...data,
      task_id: task.id,
    });
  }

  public jobTask(job: Job<taskJob>) {
    return this.prismaService.prisma.task.findUnique({
      where: { id: job.data.task_id },
    });
  }

  async createTask(name, data, info: createTaskInfo) {
    const sourceID = info.source ? this.identity : null;
    let frequency = null;
    if (info.frequency) {
      frequency = info.frequency;
      switch (info.frequency_unit) {
        case 'm':
          frequency *= 60;
          break;

        case 'h':
          frequency *= 68 ** 2;
          break;
      }
    }
    const task = await this.prismaService.prisma.task.create({
      data: {
        name,
        data,
        source: sourceID,
        frequency,
      },
    });
    console.log('created task', task);
  }

  @Process('foo')
  private async onFoo(job: Job<taskJob>) {
    if (job.name !== 'foo') {
      return;
    }
    const task = await this.jobTask(job);
    if (task) {
      await this.finish(task);
    }
  }

  async finish(task) {
    const task_id = typeof task === 'string' ? task : task.id;
    const updated = await this.prismaService.prisma.task.update({
      where: { id: task_id },
      data: {
        done_at: new Date(),
      },
    });
    console.log('finished: ', updated);
  }

  //@Cron('*/15 * * * *')
  async generateTestTask() {
    console.log('making a foo');
    await this.createTask(
      'foo',
      { test: true },
      {
        frequency: 100,
        source: true,
      },
    );
  }

  /*
          * * * * * *
          | | | | | |
          | | | | | day of week
          | | | | months
          | | | day of month
          | | hours
          | minutes
          seconds (optional)
   */

  //@TODO: housekeep unclaimed tasks

  @Cron('*/2 * * * *')
  async checkJobQueue() {
    const tasks = await this.prismaService.prisma.task.findMany({
      where: {
        claimed_at: {
          equals: null,
        },
        source: this.identity, // remove when tested;
      },
      include: {
        task_action: true,
      },
      take: 1,
      orderBy: {
        created_at: 'asc',
      },
    });

    tasks.forEach(async (task) => {
      if (task) {
        console.log('job queue checking ', task.name, task.id);

        if (task.source && task.source !== this.identity) {
          // produced by and owned by another instance; leave it alone
          return;
        }
        if (task.frequency) {
          const redundant = await this.checkFrequency(task);
          if (redundant) {
            console.log('redundant task - not claiming');
            return;
          }
        }
        this.claim(task);
      }
    });
  }

  async checkFrequency(task) {
    const day = dayjs();
    const start = day.add(-task.frequency, 's');

    const others = await this.prismaService.prisma.task.findMany({
      where: {
        created_at: {
          gte: start.toDate(),
        },
        claimed_at: {
          not: null,
        },
        id: {
          not: task.id,
        },
      },
    });

    if (others.length) {
      try {
        await this.prismaService.prisma.task.update({
          where: {
            id: task.id,
          },
          data: {
            claimed_at: day.toDate(),
            done_at: day.toDate(),
          },
        });
        await this.action(task, 'too frequent', {
          cutoff_date: start.toISOString(),
          started_at: dayjs(task.created_at).toISOString(),
        });
      } catch (err) {
        console.log('error updating task:', task, err);
      }

      return true;
    }
  }

  async action(task, event, data = {}) {
    const task_id = typeof task === 'string' ? task : task.id;
    const oldTask = await this.prismaService.prisma.task.findUnique({
      where: { id: task_id },
    });
    if (!oldTask || oldTask.done_at) {
      return;
    }
    return this.prismaService.prisma.task_action
      .create({
        data: {
          task_id: task_id,
          event,
          data,
          source: this.identity,
        },
      })
      .catch((err) => {});
  }

  async claim(task) {
    console.log('starting to claim task', task.id, task.name);
    const claim = await this.action(task, 'claim');
    if (!claim) {
      return;
    }

    // after establishing a task, pull the task again to see if someone else
    // has claimed it in the meantime
    const currentTask = await this.prismaService.prisma.task.findUnique({
      where: {
        id: task.id,
      },
      include: {
        task_action: true,
      },
    });

    if (currentTask.claimed_at) {
      console.log('side claim -- aborting task ', task);
      // kill the claim and terminate
      await this.prismaService.prisma.task_action.delete({
        where: {
          id: claim.id,
        },
      });
      return;
    }

    //... and kill other claims
    await this.finishClaim(task, claim);

    return this.broadcastTask(task);
  }

  private async finishClaim(task, claim) {
    const claimed_at = new Date();
    const updatedTask = await this.prismaService.prisma.task.update({
      where: {
        id: task.id,
      },
      data: {
        claimed_at,
      },
      include: {
        task_action: true,
      },
    });

    const otherClaimIDs = updatedTask.task_action
      .filter((action) => {
        return action.event === 'claim' && action.id !== claim.id;
      })
      .map((action) => action.id);

    if (otherClaimIDs.length) {
      await this.prismaService.prisma.task_action.deleteMany({
        where: {
          id: {
            in: otherClaimIDs,
          },
        },
      });
    }
  }

  @Cron('*/5 * * * *')
  private async cleanStaleTasks() {
    const threeMinAgo = dayjs().subtract(30, 'seconds');
    const unfinished = await this.prismaService.prisma.task.deleteMany({
      where: {
        created_at: {
          lt: threeMinAgo.toDate(),
        },
        claimed_at: {
          equals: null,
        },
      },
    });
  }
}
