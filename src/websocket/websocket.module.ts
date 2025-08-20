import { Module } from '@nestjs/common';
import { ConfigApiModule } from '../config/config.module';
import { FacebookAuthWebSocketService } from './facebook-auth-websocket.service';
import { KaraokeWebSocketGateway } from './websocket.gateway';

@Module({
  imports: [ConfigApiModule],
  providers: [KaraokeWebSocketGateway, FacebookAuthWebSocketService],
  exports: [KaraokeWebSocketGateway, FacebookAuthWebSocketService],
})
export class WebSocketModule {}
