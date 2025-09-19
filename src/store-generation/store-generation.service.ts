import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Microphone, MicrophoneType, MicrophoneRarity } from '../avatar/entities/microphone.entity';
import { Outfit, OutfitType, OutfitRarity } from '../avatar/entities/outfit.entity';
import { Shoes, ShoesType, ShoesRarity } from '../avatar/entities/shoes.entity';
import { GenerateStoreItemsRequest, GeneratedStoreItem } from './store-generation.controller';

@Injectable()
export class StoreGenerationService {
  private readonly logger = new Logger(StoreGenerationService.name);

  constructor(
    @InjectRepository(Microphone)
    private microphoneRepository: Repository<Microphone>,
    @InjectRepository(Outfit)
    private outfitRepository: Repository<Outfit>,
    @InjectRepository(Shoes)
    private shoesRepository: Repository<Shoes>,
  ) {}

  async generateStoreItems(request: GenerateStoreItemsRequest): Promise<GeneratedStoreItem[]> {
    this.logger.log(`Generating ${request.variations} ${request.itemType} items with ${request.style} style`);

    try {
      // For now, we'll simulate the AI generation process
      // In a real implementation, this would call the Gemini API
      const generatedItems: GeneratedStoreItem[] = [];

      for (let i = 0; i < request.variations; i++) {
        const item: GeneratedStoreItem = {
          id: `generated-${Date.now()}-${i}`,
          imageUrl: await this.generateImageWithAI(request, i),
          prompt: this.buildPrompt(request, i),
          itemType: request.itemType,
          style: request.style,
          theme: request.theme,
          metadata: {
            quality: request.quality,
            generatedAt: new Date().toISOString(),
            variationIndex: i,
          },
        };

        generatedItems.push(item);
      }

      this.logger.log(`Successfully generated ${generatedItems.length} items`);
      return generatedItems;
    } catch (error) {
      this.logger.error(`Failed to generate store items: ${error.message}`);
      throw error;
    }
  }

  async saveStoreItems(items: Array<{
    id: string;
    name: string;
    description?: string;
    itemType: string;
    style: string;
    theme: string;
    imageUrl: string;
    rarity: 'common' | 'uncommon' | 'rare' | 'epic' | 'legendary';
    cost: number;
  }>): Promise<any[]> {
    this.logger.log(`Saving ${items.length} generated store items to database`);

    const savedItems = [];

    for (const item of items) {
      try {
        let savedItem;

        switch (item.itemType) {
          case 'outfit':
            savedItem = await this.saveOutfit(item);
            break;
          case 'shoes':
            savedItem = await this.saveShoes(item);
            break;
          case 'microphone':
            savedItem = await this.saveMicrophone(item);
            break;
          default:
            this.logger.warn(`Unsupported item type: ${item.itemType}`);
            continue;
        }

        savedItems.push(savedItem);
      } catch (error) {
        this.logger.error(`Failed to save item ${item.id}: ${error.message}`);
        // Continue with other items even if one fails
      }
    }

    this.logger.log(`Successfully saved ${savedItems.length} items to database`);
    return savedItems;
  }

  async getGenerationSettings() {
    return {
      itemTypes: [
        { value: 'outfit', label: 'Outfits', icon: '👔' },
        { value: 'shoes', label: 'Shoes', icon: '👟' },
        { value: 'microphone', label: 'Microphones', icon: '🎤' },
        { value: 'hair', label: 'Hair Accessories', icon: '💇' },
        { value: 'hat', label: 'Hats & Headwear', icon: '🎩' },
        { value: 'jewelry', label: 'Jewelry', icon: '💎' },
      ],
      styles: [
        { value: 'modern', label: 'Modern' },
        { value: 'vintage', label: 'Vintage' },
        { value: 'fantasy', label: 'Fantasy' },
        { value: 'casual', label: 'Casual' },
        { value: 'formal', label: 'Formal' },
        { value: 'stage', label: 'Stage Performance' },
        { value: 'steampunk', label: 'Steampunk' },
        { value: 'cyberpunk', label: 'Cyberpunk' },
      ],
      themes: [
        { value: 'casual', label: 'Casual' },
        { value: 'elegant', label: 'Elegant' },
        { value: 'rockstar', label: 'Rock Star' },
        { value: 'popstar', label: 'Pop Star' },
        { value: 'country', label: 'Country' },
        { value: 'hip-hop', label: 'Hip-Hop' },
        { value: 'jazz', label: 'Jazz' },
        { value: 'classical', label: 'Classical' },
      ],
      rarities: [
        { value: 'common', label: 'Common', probability: 0.4 },
        { value: 'uncommon', label: 'Uncommon', probability: 0.3 },
        { value: 'rare', label: 'Rare', probability: 0.2 },
        { value: 'epic', label: 'Epic', probability: 0.08 },
        { value: 'legendary', label: 'Legendary', probability: 0.02 },
      ],
      maxVariations: 8,
      qualityLevels: ['standard', 'high', 'ultra'],
    };
  }

  private async generateImageWithAI(request: GenerateStoreItemsRequest, variationIndex: number): Promise<string> {
    // TODO: Implement actual Gemini API integration
    // For now, return a placeholder image URL
    const placeholderImages = [
      'https://picsum.photos/400/400?random=1',
      'https://picsum.photos/400/400?random=2',
      'https://picsum.photos/400/400?random=3',
      'https://picsum.photos/400/400?random=4',
      'https://picsum.photos/400/400?random=5',
      'https://picsum.photos/400/400?random=6',
      'https://picsum.photos/400/400?random=7',
      'https://picsum.photos/400/400?random=8',
    ];

    return placeholderImages[variationIndex % placeholderImages.length];
  }

  private buildPrompt(request: GenerateStoreItemsRequest, variationIndex: number): string {
    const variations = [
      `${request.style} ${request.itemType}`,
      `${request.theme} style ${request.itemType}`,
      `${request.style} ${request.theme} ${request.itemType}`,
      `elegant ${request.itemType} with ${request.style} design`,
      `${request.itemType} perfect for ${request.theme} performers`,
      `premium ${request.style} ${request.itemType}`,
      `unique ${request.theme} ${request.itemType}`,
      `professional ${request.style} ${request.itemType}`,
    ];

    return variations[variationIndex % variations.length];
  }

  private async saveOutfit(item: any) {
    const outfit = this.outfitRepository.create({
      name: item.name,
      description: item.description || `AI generated ${item.style} ${item.theme} outfit`,
      type: this.mapStyleToOutfitType(item.style) as OutfitType,
      rarity: item.rarity as OutfitRarity,
      imageUrl: item.imageUrl,
      price: item.cost,
      isAvailable: true,
    });

    return await this.outfitRepository.save(outfit);
  }

  private async saveShoes(item: any) {
    const shoes = this.shoesRepository.create({
      name: item.name,
      description: item.description || `AI generated ${item.style} ${item.theme} shoes`,
      type: this.mapStyleToShoesType(item.style) as ShoesType,
      rarity: item.rarity as ShoesRarity,
      imageUrl: item.imageUrl,
      price: item.cost,
      isAvailable: true,
    });

    return await this.shoesRepository.save(shoes);
  }

  private async saveMicrophone(item: any) {
    const microphone = this.microphoneRepository.create({
      name: item.name,
      description: item.description || `AI generated ${item.style} ${item.theme} microphone`,
      type: this.mapStyleToMicrophoneType(item.style) as MicrophoneType,
      rarity: item.rarity as MicrophoneRarity,
      imageUrl: item.imageUrl,
      price: item.cost,
      isAvailable: true,
    });

    return await this.microphoneRepository.save(microphone);
  }

  private mapStyleToOutfitType(style: string): OutfitType {
    const mapping: { [key: string]: OutfitType } = {
      'modern': OutfitType.MODERN,
      'vintage': OutfitType.VINTAGE,
      'fantasy': OutfitType.FANTASY,
      'casual': OutfitType.CASUAL,
      'formal': OutfitType.FORMAL,
      'stage': OutfitType.STAGE,
      'steampunk': OutfitType.VINTAGE,
      'cyberpunk': OutfitType.MODERN,
    };
    return mapping[style] || OutfitType.CASUAL;
  }

  private mapStyleToShoesType(style: string): ShoesType {
    const mapping: { [key: string]: ShoesType } = {
      'modern': ShoesType.SNEAKERS,
      'vintage': ShoesType.VINTAGE,
      'fantasy': ShoesType.BOOTS,
      'casual': ShoesType.SNEAKERS,
      'formal': ShoesType.DRESS,
      'stage': ShoesType.STAGE,
      'steampunk': ShoesType.BOOTS,
      'cyberpunk': ShoesType.PLATFORM,
    };
    return mapping[style] || ShoesType.SNEAKERS;
  }

  private mapStyleToMicrophoneType(style: string): MicrophoneType {
    const mapping: { [key: string]: MicrophoneType } = {
      'modern': MicrophoneType.MODERN,
      'vintage': MicrophoneType.VINTAGE,
      'fantasy': MicrophoneType.PREMIUM,
      'casual': MicrophoneType.BASIC,
      'formal': MicrophoneType.PREMIUM,
      'stage': MicrophoneType.WIRELESS,
      'steampunk': MicrophoneType.VINTAGE,
      'cyberpunk': MicrophoneType.MODERN,
    };
    return mapping[style] || MicrophoneType.BASIC;
  }

  private getUnlockLevelByRarity(rarity: string): number {
    const mapping: { [key: string]: number } = {
      'common': 1,
      'uncommon': 3,
      'rare': 7,
      'epic': 12,
      'legendary': 20,
    };
    return mapping[rarity] || 1;
  }
}