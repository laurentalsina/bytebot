import { Controller, Get, Post, Put, Delete, Param, Body } from '@nestjs/common';
import { PromptsService } from './prompts.service';

@Controller('api/prompts')
export class PromptsController {
  constructor(private readonly promptsService: PromptsService) {}

  @Get('/:type')
  getPrompts(@Param('type') type: string) {
    return this.promptsService.getPrompts(type);
  }

  @Get('/:type/active')
  getActivePrompt(@Param('type') type: string) {
    return this.promptsService.getActivePrompt(type);
  }

  @Post()
  createPrompt(@Body() body: { name: string; content: string; type: string }) {
    return this.promptsService.createPrompt(body.name, body.content, body.type);
  }

  @Put('/:id')
  updatePrompt(
    @Param('id') id: string,
    @Body() body: { name: string; content: string },
  ) {
    return this.promptsService.updatePrompt(id, body.name, body.content);
  }

  @Delete('/:id')
  deletePrompt(@Param('id') id: string) {
    return this.promptsService.deletePrompt(id);
  }

  @Post('/:id/activate')
  setActivePrompt(@Param('id') id: string, @Body() body: { type: string }) {
    return this.promptsService.setActivePrompt(id, body.type);
  }
}
