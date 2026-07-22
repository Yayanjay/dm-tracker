import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RemindersProcessor } from "./reminders.processor";
import { RemindersScheduler } from "./reminders.scheduler";
import { RemindersService } from "./reminders.service";
import { RemindersController } from "./reminders.controller";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "reminders",
    }),
  ],
  controllers: [RemindersController],
  providers: [RemindersProcessor, RemindersScheduler, RemindersService],
})
export class RemindersModule {}
