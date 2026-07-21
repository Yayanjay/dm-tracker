import { Injectable } from "@nestjs/common";
import { WahaClientService } from "../waha-client/waha-client.service";
import { RedisService } from "../redis/redis.service";

@Injectable()
export class WhatsappSessionService {
  private readonly STATUS_KEY = "waha:session:status";
  private readonly NUMBER_KEY = "waha:session:number";
  private readonly CACHE_TTL = 15;

  constructor(
    private waha: WahaClientService,
    private redis: RedisService,
  ) {}

  async start(): Promise<void> {
    const cached = await this.redis.get(this.STATUS_KEY);
    if (cached === "FAILED") {
      try {
        await this.waha.stopSession();
      } catch {
        // ignore stop errors before start
      }
    }

    await this.waha.startSession();
    await this.redis.del(this.STATUS_KEY);
    await this.redis.del(this.NUMBER_KEY);
  }

  async stop(): Promise<void> {
    await this.waha.stopSession();
    await this.redis.del(this.STATUS_KEY);
    await this.redis.del(this.NUMBER_KEY);
  }

  async getStatus(): Promise<{ status: string; number: string | null }> {
    const status = await this.redis.get(this.STATUS_KEY);
    const number = await this.redis.get(this.NUMBER_KEY);

    if (status) {
      return { status, number };
    }

    const wahaStatus = await this.waha.getSessionStatus();
    await this.redis.set(this.STATUS_KEY, wahaStatus.status, this.CACHE_TTL);
    if (wahaStatus.number) {
      await this.redis.set(this.NUMBER_KEY, wahaStatus.number, this.CACHE_TTL);
    }

    return { status: wahaStatus.status, number: wahaStatus.number ?? null };
  }

  setSessionStatus(status: string, number?: string): void {
    this.redis.set(this.STATUS_KEY, status, this.CACHE_TTL);
    if (number) {
      this.redis.set(this.NUMBER_KEY, number, this.CACHE_TTL);
    }
  }

  async getQr(): Promise<Buffer | null> {
    return this.waha.getQr();
  }
}
