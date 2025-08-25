import { Module } from '@nestjs/common';
import { ScheduleModule } from '@nestjs/schedule';
import { ScheduledTaskService } from './scheduled-task.service';
import { ScheduledTaskController } from './scheduled-task.controller';
import { PrismaModule } from '../prisma/prisma.module';
import { ConversationModule } from '../conversation/conversation.module';

@Module({
  imports: [
    ScheduleModule.forRoot(),
    PrismaModule,
    ConversationModule,
  ],
  controllers: [ScheduledTaskController],
  providers: [ScheduledTaskService],
  exports: [ScheduledTaskService],
})
export class ScheduledTaskModule {}