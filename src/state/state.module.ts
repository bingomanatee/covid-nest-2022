import { Module } from '@nestjs/common';
import { StateService } from './state.service';
import { StateController } from './state.controller';
import { PrismaService } from "../prisma/prisma.service";
import { PrismaModule } from "../prisma/prisma.module";

@Module({
  controllers: [StateController],
  imports: [PrismaModule],
  providers: [StateService, PrismaService]
})
export class StateModule {}
