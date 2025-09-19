import { Body, Controller, Post, HttpException, HttpStatus, Get } from '@nestjs/common';
import { StoreGenerationService } from './store-generation.service';

export interface GenerateStoreItemsRequest {
  baseImage: string; // base64 encoded image
  itemType: 'outfit' | 'shoes' | 'microphone' | 'hair' | 'hat' | 'jewelry';
  style: string;
  theme: string;
  variations: number;
  quality: 'standard' | 'high' | 'ultra';
}

export interface GeneratedStoreItem {
  id: string;
  imageUrl: string;
  prompt: string;
  itemType: string;
  style: string;
  theme: string;
  metadata: any;
}

export interface SaveStoreItemsRequest {
  items: Array<{
    id: string;
    name: string;
    description?: string;
    itemType: string;
    style: string;
    theme: string;
    imageUrl: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    cost: number;
  }>;
}

@Controller('store-generation')
export class StoreGenerationController {
  constructor(private readonly storeGenerationService: StoreGenerationService) {}

  @Post('generate')
  async generateStoreItems(@Body() request: GenerateStoreItemsRequest) {
    try {
      // Validate request
      if (!request.baseImage) {
        throw new HttpException('Base image is required', HttpStatus.BAD_REQUEST);
      }

      if (!request.itemType) {
        throw new HttpException('Item type is required', HttpStatus.BAD_REQUEST);
      }

      if (request.variations < 1 || request.variations > 8) {
        throw new HttpException('Variations must be between 1 and 8', HttpStatus.BAD_REQUEST);
      }

      // Generate items using AI
      const generatedItems = await this.storeGenerationService.generateStoreItems(request);

      return {
        success: true,
        data: {
          items: generatedItems,
          count: generatedItems.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to generate store items',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Post('save')
  async saveStoreItems(@Body() request: SaveStoreItemsRequest) {
    try {
      if (!request.items || request.items.length === 0) {
        throw new HttpException('At least one item is required', HttpStatus.BAD_REQUEST);
      }

      const savedItems = await this.storeGenerationService.saveStoreItems(request.items);

      return {
        success: true,
        data: {
          items: savedItems,
          count: savedItems.length,
        },
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to save store items',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }

  @Get('settings')
  async getGenerationSettings() {
    try {
      const settings = await this.storeGenerationService.getGenerationSettings();
      return {
        success: true,
        data: settings,
      };
    } catch (error) {
      throw new HttpException(
        {
          success: false,
          message: 'Failed to get generation settings',
          error: error.message,
        },
        HttpStatus.INTERNAL_SERVER_ERROR,
      );
    }
  }
}