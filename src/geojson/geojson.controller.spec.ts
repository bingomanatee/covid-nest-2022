import { Test, TestingModule } from '@nestjs/testing';
import { GeojsonController } from './geojson.controller';
import { GeojsonService } from './geojson.service';

describe('GeojsonController', () => {
  let controller: GeojsonController;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      controllers: [GeojsonController],
      providers: [GeojsonService],
    }).compile();

    controller = module.get<GeojsonController>(GeojsonController);
  });

  it('should be defined', () => {
    expect(controller).toBeDefined();
  });
});
