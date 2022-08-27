import { Test, TestingModule } from '@nestjs/testing';
import { QueueWorkerService } from './queue-worker.service';

describe('QueueWorkerService', () => {
  let service: QueueWorkerService;

  beforeEach(async () => {
    const module: TestingModule = await Test.createTestingModule({
      providers: [QueueWorkerService],
    }).compile();

    service = module.get<QueueWorkerService>(QueueWorkerService);
  });

  it('should be defined', () => {
    expect(service).toBeDefined();
  });
});
