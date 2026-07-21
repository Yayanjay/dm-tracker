import { Injectable, OnModuleInit } from "@nestjs/common";
import { InjectQueue } from "@nestjs/bullmq";
import { Queue } from "bullmq";

@Injectable()
export class RemindersScheduler implements OnModuleInit {
  constructor(@InjectQueue("reminders") private remindersQueue: Queue) {}

  async onModuleInit() {
    await this.remindersQueue.upsertJobScheduler(
      "reminder-seeder",
      { pattern: "*/5 * * * *" },
      {
        name: "seed",
        data: {},
        opts: {
          removeOnComplete: { count: 100 },
          removeOnFail: { count: 50 },
        },
      },
    );

    await this.remindersQueue.upsertJobScheduler(
      "reminder-dispatcher",
      { every: 60000 },
      {
        name: "dispatch",
        data: {},
        opts: {
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 50 },
        },
      },
    );

    await this.remindersQueue.upsertJobScheduler(
      "missed-marker",
      { every: 60000 },
      {
        name: "missed-marker",
        data: {},
        opts: {
          removeOnComplete: { count: 200 },
          removeOnFail: { count: 50 },
        },
      },
    );
  }
}
