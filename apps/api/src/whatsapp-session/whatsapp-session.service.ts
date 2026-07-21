import { Injectable } from "@nestjs/common";
import { WahaClientService } from "../waha-client/waha-client.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class WhatsappSessionService {
  private readonly STATUS_KEY = "waha:session:status";
  private readonly NUMBER_KEY = "waha:session:number";

  constructor(
    private waha: WahaClientService,
    private redis: RedisService,
  ) {}

  async start(): Promise<void> {
    await this.waha.startSession();
  }

  async stop(): Promise<void> {
    await this.waha.stopSession();
  }

  async getStatus(): Promise<{ status: string; number: string | null }> {
    const status = await this.redis.get(this.STATUS_KEY);
    const number = await this.redis.get(this.NUMBER_KEY);

    if (status) {
      return { status, number };
    }

    const wahaStatus = await this.waha.getSessionStatus();
    await this.redis.set(this.STATUS_KEY, wahaStatus.status, 120);
    if (wahaStatus.number) {
      await this.redis.set(this.NUMBER_KEY, wahaStatus.number, 120);
    }

    return { status: wahaStatus.status, number: wahaStatus.number ?? null };
  }

  setSessionStatus(status: string, number?: string): void {
    this.redis.set(this.STATUS_KEY, status, 120);
    if (number) {
      this.redis.set(this.NUMBER_KEY, number, 120);
    }
  }

  async getQr(): Promise<Buffer | null> {
    return this.waha.getQr();
  }
}
