import { Module } from '@nestjs/common';
import { KaraokeWebSocketGateway } from './websocket.gateway';

@Module({
  providers: [KaraokeWebSocketGateway],
})
export class WebSocketModule {}
