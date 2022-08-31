import { Controller, Get } from "@nestjs/common";
import { StateService } from './state.service';

@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get('summary')
  summary() {
    return this.stateService.summary();
  }
}
