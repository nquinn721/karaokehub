import { GoogleGenerativeAI } from '@google/generative-ai';
import { Injectable, Logger } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { Microphone, MicrophoneRarity, MicrophoneType } from '../avatar/entities/microphone.entity';
import { Outfit, OutfitRarity, OutfitType } from '../avatar/entities/outfit.entity';
import { Shoes, ShoesRarity, ShoesType } from '../avatar/entities/shoes.entity';
import { GenerateStoreItemsRequest, GeneratedStoreItem } from './store-generation.controller';

@Injectable()
export class StoreGenerationService {
  private readonly logger = new Logger(StoreGenerationService.name);
  private readonly genAI: GoogleGenerativeAI;

  constructor(
    @InjectRepository(Microphone)
    private microphoneRepository: Repository<Microphone>,
    @InjectRepository(Outfit)
    private outfitRepository: Repository<Outfit>,
    @InjectRepository(Shoes)
    private shoesRepository: Repository<Shoes>,
  ) {
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) {
      throw new Error('GEMINI_API_KEY environment variable is required');
    }
    this.genAI = new GoogleGenerativeAI(apiKey);
  }

  async generateStoreItems(request: GenerateStoreItemsRequest): Promise<GeneratedStoreItem[]> {
    this.logger.log(
      `Generating ${request.variations} ${request.itemType} items with ${request.style} style`,
    );

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

  async saveStoreItems(
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
    }>,
  ): Promise<any[]> {
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

  private async generateImageWithAI(
    request: GenerateStoreItemsRequest,
    variationIndex: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating image with Gemini 2.5 Flash Image (Nano Banana) - Variation ${variationIndex + 1}`,
      );

      // Use the image generation model
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image-preview',
      });

      // Build the prompt for this variation
      const prompt = this.buildPrompt(request, variationIndex);

      // Convert base64 image to proper format for Gemini
      const imageData = {
        inlineData: {
          data: request.baseImage.split(',')[1], // Remove data:image/type;base64, prefix
          mimeType: this.getMimeTypeFromBase64(request.baseImage),
        },
      };

      this.logger.log(`Prompt: ${prompt}`);

      // Generate image with both base image and text prompt
      const result = await model.generateContent([prompt, imageData]);
      const response = await result.response;

      // Find the generated image in the response
      for (const part of response.candidates?.[0]?.content?.parts || []) {
        if (part.inlineData) {
          // Save the generated image and return URL
          const imageUrl = await this.saveGeneratedImage(
            part.inlineData.data,
            part.inlineData.mimeType,
          );
          this.logger.log(`Successfully generated image: ${imageUrl}`);
          return imageUrl;
        }
      }

      throw new Error('No image found in Gemini response');
    } catch (error) {
      this.logger.error(`Failed to generate image with Gemini: ${error.message}`);

      // Fallback to placeholder for demo purposes
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

      this.logger.warn(`Using placeholder image due to Gemini error: ${error.message}`);
      return placeholderImages[variationIndex % placeholderImages.length];
    }
  }

  private getMimeTypeFromBase64(base64String: string): string {
    const matches = base64String.match(/^data:([^;]+);base64,/);
    return matches ? matches[1] : 'image/png';
  }

  private async saveGeneratedImage(imageData: string, mimeType: string): Promise<string> {
    // For now, return a data URL. In production, you'd save to cloud storage
    return `data:${mimeType};base64,${imageData}`;
  }

  private buildPrompt(request: GenerateStoreItemsRequest, variationIndex: number): string {
    // Create detailed prompts for different avatar store items
    const basePrompts = this.getItemTypePrompts(request.itemType, request.style, request.theme);
    const selectedPrompt = basePrompts[variationIndex % basePrompts.length];

    // Add editing instructions to modify the base image
    const editingPrompt =
      `Using the provided image as a reference, ${selectedPrompt}. ` +
      `Maintain the overall composition and lighting of the original image, but focus on ` +
      `creating a distinct ${request.itemType} that would be perfect for a karaoke avatar. ` +
      `The result should be suitable for a virtual karaoke character store item. ` +
      `Make sure the ${request.itemType} is the main focus and clearly visible.`;

    return editingPrompt;
  }

  private getItemTypePrompts(itemType: string, style: string, theme: string): string[] {
    switch (itemType) {
      case 'outfit':
        return [
          `transform this into a ${style} ${theme} outfit with intricate details, perfect for a karaoke performer`,
          `create a ${style} stage outfit with ${theme} elements, featuring bold colors and performance-ready design`,
          `design a ${theme} themed ${style} costume with sparkles, sequins, and eye-catching patterns`,
          `craft a professional ${style} performance outfit suitable for ${theme} karaoke venues`,
          `generate a ${theme} inspired ${style} ensemble with unique textures and stage-appropriate styling`,
        ];

      case 'shoes':
        return [
          `replace the footwear with ${style} ${theme} shoes featuring comfortable soles and stylish design`,
          `create ${style} performance shoes perfect for ${theme} karaoke settings with non-slip soles`,
          `design ${theme} themed ${style} footwear with sparkly accents and comfortable fit`,
          `craft professional ${style} stage shoes suitable for ${theme} performances`,
          `generate ${theme} inspired ${style} shoes with unique patterns and performance features`,
        ];

      case 'microphone':
        return [
          `add a ${style} ${theme} microphone with unique design elements and professional appearance`,
          `create a ${style} performance microphone featuring ${theme} decorative patterns and premium finish`,
          `design a ${theme} themed ${style} microphone with custom colors and artistic details`,
          `craft a professional ${style} stage microphone perfect for ${theme} karaoke venues`,
          `generate a ${theme} inspired ${style} microphone with distinctive styling and high-end appearance`,
        ];

      case 'hair':
        return [
          `modify the hairstyle to a ${style} ${theme} look with vibrant colors and unique styling`,
          `create a ${style} performance hairstyle perfect for ${theme} karaoke settings`,
          `design ${theme} themed ${style} hair accessories and styling with eye-catching elements`,
          `craft a professional ${style} stage-ready hairstyle suitable for ${theme} performances`,
          `generate ${theme} inspired ${style} hair design with distinctive colors and textures`,
        ];

      case 'hat':
        return [
          `add a ${style} ${theme} hat or headwear with unique design and comfortable fit`,
          `create ${style} performance headwear featuring ${theme} decorative elements`,
          `design a ${theme} themed ${style} hat with custom patterns and stylish appearance`,
          `craft professional ${style} stage headwear perfect for ${theme} karaoke venues`,
          `generate ${theme} inspired ${style} headwear with distinctive styling and premium materials`,
        ];

      case 'jewelry':
        return [
          `add ${style} ${theme} jewelry pieces with sparkling gems and elegant design`,
          `create ${style} performance jewelry featuring ${theme} elements and stage-appropriate shine`,
          `design ${theme} themed ${style} accessories with precious metals and unique patterns`,
          `craft professional ${style} stage jewelry suitable for ${theme} performances`,
          `generate ${theme} inspired ${style} jewelry with distinctive styling and premium appearance`,
        ];

      default:
        return [
          `transform this into a ${style} ${theme} accessory perfect for karaoke performers`,
          `create a ${style} performance item with ${theme} elements and stage-ready design`,
          `design a ${theme} themed ${style} accessory with unique features and eye-catching appeal`,
        ];
    }
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
      modern: OutfitType.MODERN,
      vintage: OutfitType.VINTAGE,
      fantasy: OutfitType.FANTASY,
      casual: OutfitType.CASUAL,
      formal: OutfitType.FORMAL,
      stage: OutfitType.STAGE,
      steampunk: OutfitType.VINTAGE,
      cyberpunk: OutfitType.MODERN,
    };
    return mapping[style] || OutfitType.CASUAL;
  }

  private mapStyleToShoesType(style: string): ShoesType {
    const mapping: { [key: string]: ShoesType } = {
      modern: ShoesType.SNEAKERS,
      vintage: ShoesType.VINTAGE,
      fantasy: ShoesType.BOOTS,
      casual: ShoesType.SNEAKERS,
      formal: ShoesType.DRESS,
      stage: ShoesType.STAGE,
      steampunk: ShoesType.BOOTS,
      cyberpunk: ShoesType.PLATFORM,
    };
    return mapping[style] || ShoesType.SNEAKERS;
  }

  private mapStyleToMicrophoneType(style: string): MicrophoneType {
    const mapping: { [key: string]: MicrophoneType } = {
      modern: MicrophoneType.MODERN,
      vintage: MicrophoneType.VINTAGE,
      fantasy: MicrophoneType.PREMIUM,
      casual: MicrophoneType.BASIC,
      formal: MicrophoneType.PREMIUM,
      stage: MicrophoneType.WIRELESS,
      steampunk: MicrophoneType.VINTAGE,
      cyberpunk: MicrophoneType.MODERN,
    };
    return mapping[style] || MicrophoneType.BASIC;
  }

  private getUnlockLevelByRarity(rarity: string): number {
    const mapping: { [key: string]: number } = {
      common: 1,
      uncommon: 3,
      rare: 7,
      epic: 12,
      legendary: 20,
    };
    return mapping[rarity] || 1;
  }
}
