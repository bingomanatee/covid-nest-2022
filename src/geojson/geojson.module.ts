import { Module } from '@nestjs/common';
import { GeojsonService } from './geojson.service';
import { GeojsonController } from './geojson.controller';
import { PrismaModule } from "../prisma/prisma.module";
import { PrismaService } from "../prisma/prisma.service";

@Module({
  controllers: [GeojsonController],
  providers: [GeojsonService, PrismaService],
  imports: [PrismaModule],
})
export class GeojsonModule {}
