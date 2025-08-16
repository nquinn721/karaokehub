import { Module } from '@nestjs/common';
import { ConfigApiModule } from '../config/config.module';
import { KaraokeWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [ConfigApiModule],
  providers: [KaraokeWebSocketGateway],
})
export class WebSocketModule {}
