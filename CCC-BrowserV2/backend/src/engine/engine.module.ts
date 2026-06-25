import { Module } from '@nestjs/common';
import { BrowserLauncherService } from './browser-launcher.service';
import { StealthPluginService } from './stealth-plugin.service';
import { HumanSimulatorService } from './human-simulator.service';
import { SessionManagerService } from './session-manager.service';
import { ProxyManagerService } from './proxy-manager.service';

@Module({
  providers: [
    BrowserLauncherService,
    StealthPluginService,
    HumanSimulatorService,
    SessionManagerService,
    ProxyManagerService,
  ],
  exports: [
    BrowserLauncherService,
    StealthPluginService,
    HumanSimulatorService,
    SessionManagerService,
    ProxyManagerService,
  ],
})
export class EngineModule {}