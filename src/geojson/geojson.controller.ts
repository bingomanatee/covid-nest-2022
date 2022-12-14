import { Controller, Get, Header } from "@nestjs/common";
import { GeojsonService } from './geojson.service';

@Controller('geojson')
export class GeojsonController {
  constructor(private readonly geojsonService: GeojsonService) {}

  @Get('country.json')
  @Header('Content-Type', 'application/json')
  getState() {
    return this.geojsonService.country();
  }

  @Get('state.json')
  @Header('Content-Type', 'application/json')
  getCountry() {
    return this.geojsonService.state();
  }
}
