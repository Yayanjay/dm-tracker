import { Global, Module } from "@nestjs/common";
import { WahaClientService } from "./waha-client.service";

@Global()
@Module({
  providers: [WahaClientService],
  exports: [WahaClientService],
})
export class WahaClientModule {}
