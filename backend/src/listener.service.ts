import { Injectable, OnModuleInit, OnModuleDestroy, Logger } from "@nestjs/common";
import { startListener, stopListener, setupSignalHandlers } from "./listener";

@Injectable()
export class ListenerService implements OnModuleInit, OnModuleDestroy {
  private readonly logger = new Logger(ListenerService.name);

  async onModuleInit() {
    setupSignalHandlers();
    this.logger.log("Starting event listener...");
    startListener().catch((err) => {
      this.logger.error("Event listener failed:", err);
    });
  }

  async onModuleDestroy() {
    this.logger.log("Stopping event listener...");
    stopListener();
  }
}