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

    // Create a prompt that generates a new item inspired by the reference image
    const generationPrompt =
      `Create a high-quality, detailed image of ${selectedPrompt}. ` +
      `Use the provided reference image for inspiration on style and aesthetic, but generate a completely new ${request.itemType}. ` +
      `The ${request.itemType} should be the main subject of the image, clearly visible and well-lit. ` +
      `Style: ${request.style}, Theme: ${request.theme}. ` +
      `Perfect for a virtual karaoke avatar store item. ` +
      `Professional product photography style with clean background.`;

    return generationPrompt;
  }

  private getItemTypePrompts(itemType: string, style: string, theme: string): string[] {
    switch (itemType) {
      case 'outfit':
        return [
          `a ${style} ${theme} outfit including shirt, pants/skirt, and accessories - complete ensemble displayed on a mannequin or flat lay`,
          `a ${style} stage outfit with ${theme} elements - full costume with jacket, bottoms, and styling details`,
          `a ${theme} themed ${style} complete outfit - shirt, pants, belt, and coordinating accessories`,
          `a professional ${style} performance outfit - blazer, trousers/dress, and complementary pieces`,
          `a ${theme} inspired ${style} ensemble - coordinated top, bottom, and accessories in matching style`,
        ];

      case 'shoes':
        return [
          `a pair of ${style} ${theme} shoes - high-quality footwear product photography with clean background`,
          `${style} performance shoes for ${theme} settings - professional product shot showing both shoes`,
          `${theme} themed ${style} footwear - detailed shoe photography with clear view of design elements`,
          `professional ${style} stage shoes - product image showing the footwear from multiple angles`,
          `${theme} inspired ${style} shoes - clean product photography of stylish footwear`,
        ];

      case 'microphone':
        return [
          `a ${style} ${theme} microphone - professional product photography of a high-end vocal microphone`,
          `a ${style} performance microphone with ${theme} design elements - clean product shot with premium finish`,
          `a ${theme} themed ${style} microphone - detailed product image showing unique colors and artistic details`,
          `a professional ${style} stage microphone - high-quality product photography suitable for ${theme} venues`,
          `a ${theme} inspired ${style} microphone - premium product shot with distinctive styling and professional appearance`,
        ];

      case 'hair':
        return [
          `${style} ${theme} hair accessories - product photography of hair clips, bands, or decorative pieces`,
          `${style} hair styling accessories with ${theme} elements - clean product shots of hair ornaments`,
          `${theme} themed ${style} hair accessories - detailed product images of hair decorations and clips`,
          `professional ${style} hair accessories suitable for ${theme} performances - premium hair ornaments`,
          `${theme} inspired ${style} hair styling pieces - elegant hair accessories with distinctive design`,
        ];

      case 'hat':
        return [
          `a ${style} ${theme} hat or headwear - professional product photography of stylish headwear`,
          `${style} performance headwear with ${theme} decorative elements - clean product shot of premium hat`,
          `a ${theme} themed ${style} hat - detailed product image showing custom patterns and design`,
          `professional ${style} stage headwear - high-quality product photography of performance hat`,
          `${theme} inspired ${style} headwear - premium product shot with distinctive styling and materials`,
        ];

      case 'jewelry':
        return [
          `${style} ${theme} jewelry pieces - professional product photography of elegant accessories with gems`,
          `${style} performance jewelry with ${theme} elements - clean product shots of stage-appropriate accessories`,
          `${theme} themed ${style} jewelry - detailed product images of precious accessories with unique patterns`,
          `professional ${style} stage jewelry - high-quality product photography suitable for ${theme} performances`,
          `${theme} inspired ${style} jewelry - premium product shots with distinctive styling and precious appearance`,
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
