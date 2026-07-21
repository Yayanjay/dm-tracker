import { Module } from "@nestjs/common";
import { BullModule } from "@nestjs/bullmq";
import { RemindersProcessor } from "./reminders.processor";
import { RemindersScheduler } from "./reminders.scheduler";
import { RemindersService } from "./reminders.service";

@Module({
  imports: [
    BullModule.registerQueue({
      name: "reminders",
    }),
  ],
  providers: [RemindersProcessor, RemindersScheduler, RemindersService],
})
export class RemindersModule {}
