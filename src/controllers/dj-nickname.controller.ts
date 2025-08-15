import { Body, Controller, Delete, Get, Param, Post, UseGuards } from '@nestjs/common';
import { AuthGuard } from '@nestjs/passport';
import { DJNickname } from '../entities/dj-nickname.entity';
import { DJNicknameService } from '../services/dj-nickname.service';

export class CreateDJNicknameDto {
  nickname: string;
  type: 'stage_name' | 'alias' | 'social_handle' | 'real_name';
  platform?: string;
}

@Controller('dj-nicknames')
@UseGuards(AuthGuard('jwt'))
export class DJNicknameController {
  constructor(private readonly djNicknameService: DJNicknameService) {}

  @Post(':djId')
  async addNickname(
    @Param('djId') djId: string,
    @Body() createDto: CreateDJNicknameDto,
  ): Promise<DJNickname> {
    return await this.djNicknameService.addNickname(
      djId,
      createDto.nickname,
      createDto.type,
      createDto.platform,
    );
  }

  @Get(':djId')
  async getDJNicknames(@Param('djId') djId: string): Promise<DJNickname[]> {
    return await this.djNicknameService.getDJNicknames(djId);
  }

  @Post('search/:nickname')
  async findDJByNickname(@Param('nickname') nickname: string) {
    const result = await this.djNicknameService.smartDJMatch(nickname);
    return {
      dj: result.dj,
      confidence: result.confidence,
      matchType: result.matchType,
    };
  }

  @Delete(':id')
  async removeNickname(@Param('id') id: string): Promise<void> {
    // Implementation would go here - deactivate the nickname
    throw new Error('Not implemented yet');
  }
}
