import { Body, Controller, Get, Param, Post } from "@nestjs/common";
import { StateService } from './state.service';

@Controller('state')
export class StateController {
  constructor(private readonly stateService: StateService) {}

  @Get('states')
  states() {
    return this.stateService.states();
  }
  @Get('summary')
  summary() {
    return this.stateService.summary();
  }
  @Post('alias/:id')
  alias( @Param('id') id: string, @Body() alias) {
    return this.stateService.alias(id, alias);
  }

}
