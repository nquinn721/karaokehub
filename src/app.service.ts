import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  getHello(): string {
    return 'KaraokeHub API is running! 🎤';
  }
}
