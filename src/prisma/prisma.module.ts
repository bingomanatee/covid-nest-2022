import { Module } from '@nestjs/common';
import { PrismaService } from './prisma.service';

@Module({})
export class PrismaModule {
  imports: [PrismaService];
  providers: [PrismaService];
}
