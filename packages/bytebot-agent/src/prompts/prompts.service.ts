import { Injectable, OnModuleInit } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { AGENT_SYSTEM_PROMPT, SUMMARIZATION_SYSTEM_PROMPT } from '../agent/agent.constants';

@Injectable()
export class PromptsService implements OnModuleInit {
  constructor(private prisma: PrismaService) {}

  async onModuleInit() {
    await this.createDefaultPrompts();
  }

  async createDefaultPrompts() {
    const agentSystemPrompt = await this.prisma.prompt.findFirst({
      where: { name: 'AGENT_SYSTEM_PROMPT' },
    });
    if (!agentSystemPrompt) {
      await this.prisma.prompt.create({
        data: {
          name: 'AGENT_SYSTEM_PROMPT',
          content: AGENT_SYSTEM_PROMPT,
          type: 'AGENT_SYSTEM_PROMPT',
          isActive: true,
        },
      });
    }

    const summarizationSystemPrompt = await this.prisma.prompt.findFirst({
      where: { name: 'SUMMARIZATION_SYSTEM_PROMPT' },
    });
    if (!summarizationSystemPrompt) {
      await this.prisma.prompt.create({
        data: {
          name: 'SUMMARIZATION_SYSTEM_PROMPT',
          content: SUMMARIZATION_SYSTEM_PROMPT,
          type: 'SUMMARIZATION_SYSTEM_PROMPT',
          isActive: true,
        },
      });
    }
  }

  async getPrompts(type: string) {
    return this.prisma.prompt.findMany({ where: { type } });
  }

  async getActivePrompt(type: string) {
    return this.prisma.prompt.findFirst({ where: { type, isActive: true } });
  }

  async createPrompt(name: string, content: string, type: string) {
    return this.prisma.prompt.create({ data: { name, content, type } });
  }

  async updatePrompt(id: string, name: string, content: string) {
    return this.prisma.prompt.update({ where: { id }, data: { name, content } });
  }

  async deletePrompt(id: string) {
    return this.prisma.prompt.delete({ where: { id } });
  }

  async setActivePrompt(id: string, type: string) {
    await this.prisma.$transaction([
      this.prisma.prompt.updateMany({
        where: { type, isActive: true },
        data: { isActive: false },
      }),
      this.prisma.prompt.update({
        where: { id },
        data: { isActive: true },
      }),
    ]);
    return this.prisma.prompt.findFirst({ where: { id } });
  }
}
