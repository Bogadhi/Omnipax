import { Controller, Get } from '@nestjs/common';
import { AppService } from './app.service';

@Controller()
export class AppController {
  constructor(private readonly appService: AppService) {}

  @Get()
  getHello(): string {
    return this.appService.getHello();
  }

  @Get('health')
  getHealth() {
    return {
      status: 'UP',
      timestamp: new Date().toISOString(),
      uptime: process.uptime(),
      memory: process.memoryUsage(),
      cpu: process.cpuUsage(),
    };
  }

  @Get('test-prisma')
  async testPrisma() {
    try {
      // @ts-ignore
      const result = await this.appService.testPrisma();
      return result;
    } catch (e: any) {
      return {
        error: e.message,
        code: e.code,
        stack: e.stack,
      };
    }
  }

  @Get('/')
  getSystemStatus() {
    return {
      service: 'StarPass Backend',
      version: '1.0.0',
      status: 'OPERATIONAL',
      docs: '/docs',
      health: '/health',
    };
  }
}
