import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { KaraokeWebSocketGateway } from '../websocket/websocket.gateway';
import { ParsedSchedule, ParseStatus } from './parsed-schedule.entity';
import { UrlToParse } from './url-to-parse.entity';
import type { ParsedFacebookData } from './worker-types';

@Injectable()
export class FacebookParserService {
  private readonly logger = new Logger(FacebookParserService.name);
  private currentParsingLogs: Array<{
    timestamp: Date;
    level: 'info' | 'success' | 'warning' | 'error';
    message: string;
  }> = [];

  constructor(
    private readonly configService: ConfigService,
    private readonly webSocketGateway: KaraokeWebSocketGateway,
    @InjectRepository(ParsedSchedule)
    private parsedScheduleRepository: Repository<ParsedSchedule>,
    @InjectRepository(UrlToParse)
    private urlToParseRepository: Repository<UrlToParse>,
  ) {}

  /**
   * Main Facebook parsing entry point - follows the new clean architecture
   */
  async parseAndSaveFacebookPageClean(url: string): Promise<{
    parsedScheduleId: string;
    data: ParsedFacebookData;
    stats: any;
  }> {
    this.currentParsingLogs = [];
    const startTime = Date.now();

    this.logAndBroadcast(`🎯 Starting clean Facebook parsing for: ${url}`);

    try {
      // For now, return a basic structure until we implement the full worker system
      const mockData: ParsedFacebookData = {
        vendors: [],
        venues: [],
        djs: [],
        shows: [],
        rawData: {
          url,
          title: 'Mock Facebook Parse',
          content: 'Clean architecture implementation in progress',
          parsedAt: new Date(),
        },
      };

      // Save to database
      const savedSchedule = await this.saveToDatabase(mockData, url);

      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      this.logAndBroadcast(`✅ Clean parsing completed in ${duration.toFixed(2)}s`, 'success');

      return {
        parsedScheduleId: savedSchedule.id,
        data: mockData,
        stats: {
          shows: 0,
          djs: 0,
          vendors: 0,
          processingTime: duration,
          imageCount: 0,
        },
      };
    } catch (error) {
      const endTime = Date.now();
      const duration = (endTime - startTime) / 1000;

      this.logAndBroadcast(
        `💥 Clean parsing failed after ${duration.toFixed(2)}s: ${error.message}`,
        'error',
      );
      throw error;
    }
  }

  /**
   * Enhanced logging method that logs both to console and broadcasts to WebSocket clients
   */
  private logAndBroadcast(
    message: string,
    level: 'info' | 'success' | 'warning' | 'error' = 'info',
  ) {
    // Log to console using NestJS logger
    switch (level) {
      case 'success':
      case 'info':
        this.logger.log(message);
        break;
      case 'warning':
        this.logger.warn(message);
        break;
      case 'error':
        this.logger.error(message);
        break;
    }

    // Add to current parsing logs
    this.currentParsingLogs.push({
      timestamp: new Date(),
      level,
      message,
    });

    // Broadcast to WebSocket clients if available
    // TODO: Fix WebSocket integration
    // if (this.webSocketGateway) {
    //   try {
    //     this.webSocketGateway.emit('facebook-parsing-log', {
    //       timestamp: new Date(),
    //       level,
    //       message,
    //     });
    //   } catch (error) {
    //     this.logger.warn(`WebSocket broadcast failed: ${error.message}`);
    //   }
    // }
  }

  /**
   * Save validated data to database
   */
  private async saveToDatabase(data: ParsedFacebookData, url: string): Promise<ParsedSchedule> {
    const schedule = new ParsedSchedule();
    schedule.url = url;
    schedule.status = ParseStatus.PENDING;
    schedule.rawData = data;
    schedule.aiAnalysis = data;
    schedule.parsingLogs = this.currentParsingLogs;

    return await this.parsedScheduleRepository.save(schedule);
  }
}
