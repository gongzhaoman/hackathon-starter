import { Controller, Get } from '@nestjs/common';
import { ToolkitsService } from './toolkits.service';

@Controller('toolkits')
export class ToolkitsController {
  constructor(private readonly toolkitsService: ToolkitsService) {}

  @Get()
  async getAllToolkits() {
    return this.toolkitsService.getAllToolkits();
  }
}
