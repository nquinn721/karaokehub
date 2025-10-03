import {
  Body,
  Controller,
  Get,
  HttpException,
  HttpStatus,
  Logger,
  Param,
  Post,
  Query,
  Request,
  UseGuards,
} from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import {
  AddToQueueDto,
  ChatHistoryResponse,
  CreateLiveShowDto,
  JoinShowDto,
  LiveShowResponse,
  NearbyShowDto,
  QueueResponse,
  RemoveFromQueueDto,
  SendAnnouncementDto,
  SendChatMessageDto,
  SetCurrentSingerDto,
  ShowListResponse,
  ShowWithDistance,
  UpdateQueueDto,
} from './interfaces/live-show.interface';
import { LiveShowService } from './live-show.service';

@Controller('live-shows')
@UseGuards(AuthGuard('jwt'))
export class LiveShowController {
  private readonly logger = new Logger(LiveShowController.name);

  constructor(private readonly liveShowService: LiveShowService) {}

  @Post()
  async createShow(@Body() createShowDto: CreateLiveShowDto, @Request() req: any) {
    try {
      // Convert string dates to Date objects if needed
      const normalizedDto: CreateLiveShowDto = {
        ...createShowDto,
        startTime:
          typeof createShowDto.startTime === 'string'
            ? new Date(createShowDto.startTime)
            : createShowDto.startTime,
        endTime: createShowDto.endTime
          ? typeof createShowDto.endTime === 'string'
            ? new Date(createShowDto.endTime)
            : createShowDto.endTime
          : undefined,
      };

      const show = await this.liveShowService.createShow(normalizedDto, req.user.id);
      return {
        success: true,
        show,
        message: 'Live show created successfully',
      };
    } catch (error) {
      this.logger.error(`Error creating show: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get()
  async getActiveShows(): Promise<ShowListResponse & { success: boolean }> {
    try {
      const result = await this.liveShowService.getActiveShows();
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error getting active shows: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to fetch active shows',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('nearby')
  async getNearbyShows(
    @Body() nearbyShowDto: NearbyShowDto,
  ): Promise<{ success: boolean; shows: ShowWithDistance[] }> {
    try {
      const shows = await this.liveShowService.findNearbyShows(nearbyShowDto);
      return {
        success: true,
        shows,
      };
    } catch (error) {
      this.logger.error(`Error finding nearby shows: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: 'Failed to find nearby shows',
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get(':id')
  async getShow(@Param('id') id: string) {
    try {
      const show = await this.liveShowService.getShow(id);
      if (!show) {
        throw new HttpException(
          {
            success: false,
            message: 'Show not found',
          },
          HttpStatus.NOT_FOUND,
        );
      }

      return {
        success: true,
        show: {
          ...show,
          participants: Array.from(show.participants.values()),
        },
      };
    } catch (error) {
      this.logger.error(`Error getting show ${id}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        error instanceof HttpException ? error.getStatus() : HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post(':id/join')
  async joinShow(
    @Param('id') showId: string,
    @Body()
    body: {
      userLatitude: number;
      userLongitude: number;
      avatarId?: string;
      microphoneId?: string;
    },
    @Request() req: any,
  ): Promise<LiveShowResponse & { success: boolean }> {
    try {
      const joinDto: JoinShowDto = {
        showId,
        userId: req.user.id,
        userLatitude: body.userLatitude,
        userLongitude: body.userLongitude,
        avatarId: body.avatarId,
        microphoneId: body.microphoneId,
      };

      const result = await this.liveShowService.joinShow(joinDto);

      // Convert Map to array for JSON serialization
      const serializedShow = {
        ...result.show,
        participants:
          result.show.participants instanceof Map
            ? Array.from(result.show.participants.entries()).map(([userId, participant]) => ({
                userId,
                ...participant,
              }))
            : result.show.participants,
      };

      return {
        success: true,
        show: serializedShow as any, // Type assertion for API response
        userRole: result.userRole,
        queuePosition: result.queuePosition,
      };
    } catch (error) {
      this.logger.error(`Error joining show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/join-test')
  async joinTestShow(
    @Param('id') showId: string,
    @Request() req: any,
  ): Promise<LiveShowResponse & { success: boolean }> {
    try {
      // Test join without location validation (no coordinates provided)
      const joinDto: JoinShowDto = {
        showId,
        userId: req.user.id,
        // No userLatitude/userLongitude = bypasses location validation
      };

      const result = await this.liveShowService.joinShow(joinDto);

      // Convert Map to array for JSON serialization
      const serializedShow = {
        ...result.show,
        participants:
          result.show.participants instanceof Map
            ? Array.from(result.show.participants.entries()).map(([userId, participant]) => ({
                userId,
                ...participant,
              }))
            : result.show.participants,
      };

      return {
        success: true,
        show: serializedShow as any,
        userRole: result.userRole,
        queuePosition: result.queuePosition,
      };
    } catch (error) {
      this.logger.error(`Error joining test show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/populate-test-users')
  async populateTestUsers(
    @Param('id') showId: string,
    @Request() req: any,
  ): Promise<{ success: boolean; message: string }> {
    try {
      await this.liveShowService.populateShowWithTestUsers(showId);
      return {
        success: true,
        message: 'Test users added to show successfully',
      };
    } catch (error) {
      this.logger.error(`Error populating test users for show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/switch-role')
  async switchUserRole(
    @Param('id') showId: string,
    @Body() body: { role: 'dj' | 'singer' },
    @Request() req: any,
  ): Promise<{ success: boolean; newRole: string; message: string }> {
    try {
      const newRole = await this.liveShowService.switchUserRoleInShow(
        showId,
        req.user.id,
        body.role,
      );
      return {
        success: true,
        newRole,
        message: `Successfully switched to ${newRole} role`,
      };
    } catch (error) {
      this.logger.error(
        `Error switching role for user ${req.user.id} in show ${showId}: ${error.message}`,
      );
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/leave')
  async leaveShow(@Param('id') showId: string, @Request() req: any) {
    try {
      await this.liveShowService.leaveShow(showId, req.user.id);
      return {
        success: true,
        message: 'Left show successfully',
      };
    } catch (error) {
      this.logger.error(`Error leaving show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/queue')
  async getQueue(@Param('id') showId: string): Promise<QueueResponse & { success: boolean }> {
    try {
      const result = await this.liveShowService.getQueue(showId);
      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error getting queue for show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/queue/add')
  async addToQueue(
    @Param('id') showId: string,
    @Body() body: { songRequest?: string },
    @Request() req: any,
  ) {
    try {
      const addToQueueDto: AddToQueueDto = {
        showId,
        userId: req.user.id,
        songRequest: body.songRequest,
      };

      const queueEntry = await this.liveShowService.addToQueue(addToQueueDto);
      return {
        success: true,
        queueEntry,
        message: 'Added to queue successfully',
      };
    } catch (error) {
      this.logger.error(`Error adding to queue in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/queue/remove')
  async removeFromQueue(
    @Param('id') showId: string,
    @Body() body: { userId: string },
    @Request() req: any,
  ) {
    try {
      const removeDto: RemoveFromQueueDto = {
        showId,
        userId: body.userId,
        djId: req.user.id,
      };

      await this.liveShowService.removeFromQueue(removeDto);
      return {
        success: true,
        message: 'Removed from queue successfully',
      };
    } catch (error) {
      this.logger.error(`Error removing from queue in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/queue/reorder')
  async reorderQueue(
    @Param('id') showId: string,
    @Body() body: { queueOrder: string[] },
    @Request() req: any,
  ) {
    try {
      const updateDto: UpdateQueueDto = {
        showId,
        djId: req.user.id,
        queueOrder: body.queueOrder,
      };

      const reorderedQueue = await this.liveShowService.updateQueueOrder(updateDto);
      return {
        success: true,
        queue: reorderedQueue,
        message: 'Queue reordered successfully',
      };
    } catch (error) {
      this.logger.error(`Error reordering queue in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/singers/reorder')
  async reorderSingers(
    @Param('id') showId: string,
    @Body() body: { singerOrder: string[] },
    @Request() req: any,
  ) {
    try {
      const reorderedQueue = await this.liveShowService.updateSingerRotation(
        showId,
        req.user.id,
        body.singerOrder,
      );
      return {
        success: true,
        queue: reorderedQueue,
        message: 'Singer rotation reordered successfully',
      };
    } catch (error) {
      this.logger.error(`Error reordering singer rotation in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/current-singer')
  async setCurrentSinger(
    @Param('id') showId: string,
    @Body() body: { singerId: string },
    @Request() req: any,
  ) {
    try {
      const setCurrentDto: SetCurrentSingerDto = {
        showId,
        djId: req.user.id,
        singerId: body.singerId,
      };

      await this.liveShowService.setCurrentSinger(setCurrentDto);
      return {
        success: true,
        message: 'Current singer set successfully',
      };
    } catch (error) {
      this.logger.error(`Error setting current singer in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/chat')
  async sendChatMessage(
    @Param('id') showId: string,
    @Body() body: { message: string; type: string; recipientId?: string },
    @Request() req: any,
  ) {
    try {
      const chatDto: SendChatMessageDto = {
        showId,
        senderId: req.user.id,
        message: body.message,
        type: body.type as any,
        recipientId: body.recipientId,
      };

      const chatMessage = await this.liveShowService.sendChatMessage(chatDto);
      return {
        success: true,
        chatMessage,
        message: 'Message sent successfully',
      };
    } catch (error) {
      this.logger.error(`Error sending chat message in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Post(':id/announcement')
  async sendAnnouncement(
    @Param('id') showId: string,
    @Body() body: { message: string; displayDuration?: number },
    @Request() req: any,
  ) {
    try {
      const announcementDto: SendAnnouncementDto = {
        showId,
        djId: req.user.id,
        message: body.message,
        displayDuration: body.displayDuration,
      };

      const announcement = await this.liveShowService.sendAnnouncement(announcementDto);
      return {
        success: true,
        announcement,
        message: 'Announcement sent successfully',
      };
    } catch (error) {
      this.logger.error(`Error sending announcement in show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }

  @Get(':id/chat')
  async getChatHistory(
    @Param('id') showId: string,
    @Request() req: any,
    @Query('limit') limit?: string,
    @Query('offset') offset?: string,
  ): Promise<ChatHistoryResponse & { success: boolean }> {
    try {
      const result = await this.liveShowService.getChatHistory(
        showId,
        req.user.id,
        limit ? parseInt(limit) : undefined,
        offset ? parseInt(offset) : undefined,
      );

      return {
        success: true,
        ...result,
      };
    } catch (error) {
      this.logger.error(`Error getting chat history for show ${showId}: ${error.message}`);
      throw new HttpException(
        {
          success: false,
          message: error.message,
        },
        HttpStatus.BAD_REQUEST,
      );
    }
  }
}
