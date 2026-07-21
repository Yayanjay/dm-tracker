import { Processor, WorkerHost } from "@nestjs/bullmq";
import { Job } from "bullmq";
import { RemindersService } from "./reminders.service";

@Processor("reminders")
export class RemindersProcessor extends WorkerHost {
  constructor(private remindersService: RemindersService) {
    super();
  }

  async process(job: Job) {
    switch (job.name) {
      case "seed":
        await this.remindersService.seedReminders();
        break;
      case "dispatch":
        await this.remindersService.dispatchReminders();
        break;
      case "missed-marker":
        await this.remindersService.markMissed();
        break;
    }
  }
}
