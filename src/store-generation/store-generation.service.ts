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
    // Extract number of items from custom prompt if specified
    const detectedVariations = this.extractVariationsFromPrompt(request.customPrompt);
    const actualVariations = detectedVariations || request.variations;

    this.logger.log(
      `Generating ${actualVariations} ${request.itemType} items with ${request.style} style${detectedVariations ? ' (detected from custom prompt)' : ''}`,
    );

    try {
      const generatedItems: GeneratedStoreItem[] = [];

      for (let i = 0; i < actualVariations; i++) {
        const item: GeneratedStoreItem = {
          id: `generated-${Date.now()}-${i}`,
          imageUrl: await this.generateImageWithAI(request, i, actualVariations),
          prompt: this.buildAvatarBasedPrompt(request, i, actualVariations),
          itemType: request.itemType,
          style: request.style,
          theme: request.theme,
          metadata: {
            quality: request.quality,
            generatedAt: new Date().toISOString(),
            variationIndex: i,
            totalVariations: actualVariations,
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

  private extractVariationsFromPrompt(customPrompt?: string): number | null {
    if (!customPrompt || !customPrompt.trim()) {
      return null;
    }

    // Look for patterns like "10 images", "5 characters", "3 items", etc.
    const patterns = [
      /(\d+)\s+(?:images?|pics?|pictures?)/i,
      /(\d+)\s+(?:characters?|avatars?|people)/i,
      /(\d+)\s+(?:items?|things?|objects?)/i,
      /(\d+)\s+(?:outfits?|clothes?|clothing)/i,
      /(\d+)\s+(?:shoes?|sneakers?|boots?)/i,
      /(\d+)\s+(?:microphones?|mics?)/i,
      /(?:create|make|generate)\s+(\d+)/i,
      /i\s+want\s+(\d+)/i,
    ];

    for (const pattern of patterns) {
      const match = customPrompt.match(pattern);
      if (match && match[1]) {
        const num = parseInt(match[1], 10);
        if (num > 0 && num <= 20) { // Reasonable limits
          this.logger.log(`Detected ${num} variations from custom prompt`);
          return num;
        }
      }
    }

    return null;
  }

  private modifyPromptForSingleItem(originalPrompt: string, currentIndex: number, totalItems: number): string {
    // Convert prompts like "10 characters" to "1 character" and add uniqueness
    let modifiedPrompt = originalPrompt;

    // Replace number patterns to generate ONE item
    const numberPatterns = [
      { pattern: /(\d+)\s+(images?|pics?|pictures?)/gi, replacement: '1 image' },
      { pattern: /(\d+)\s+(characters?|avatars?|people)/gi, replacement: '1 character' },
      { pattern: /(\d+)\s+(items?|things?|objects?)/gi, replacement: '1 item' },
      { pattern: /(\d+)\s+(outfits?|clothes?|clothing)/gi, replacement: '1 outfit' },
      { pattern: /(\d+)\s+(shoes?|sneakers?|boots?)/gi, replacement: '1 shoe' },
      { pattern: /(\d+)\s+(microphones?|mics?)/gi, replacement: '1 microphone' },
      { pattern: /(?:create|make|generate)\s+(\d+)/gi, replacement: 'create 1' },
      { pattern: /i\s+want\s+(\d+)/gi, replacement: 'create 1' },
    ];

    for (const { pattern, replacement } of numberPatterns) {
      modifiedPrompt = modifiedPrompt.replace(pattern, replacement);
    }

    // Add variation instruction to make each image unique
    const genderInstructions = [
      'male character',
      'female character', 
      'unique character design',
      'different character style',
      'varied character appearance'
    ];
    
    const variationInstruction = genderInstructions[currentIndex % genderInstructions.length];
    
    // Append uniqueness instruction
    modifiedPrompt += `, make it a ${variationInstruction}, unique and different from others`;

    return modifiedPrompt;
  }

  private async generateImageWithAI(
    request: GenerateStoreItemsRequest,
    variationIndex: number,
    totalVariations?: number,
  ): Promise<string> {
    try {
      this.logger.log(
        `Generating image with Gemini 2.5 Flash Image (Nano Banana) - Variation ${variationIndex + 1}`,
      );

      // Use the image generation model
      const model = this.genAI.getGenerativeModel({
        model: 'gemini-2.5-flash-image-preview',
      });

      // Build the prompt for this variation - use reference image like in successful example
      const prompt = this.buildAvatarBasedPrompt(request, variationIndex, totalVariations);

      // Convert base64 image to proper format for Gemini (if provided)
      let contentParts: any[] = [prompt];
      if (request.baseImage) {
        const imageData = {
          inlineData: {
            data: request.baseImage.split(',')[1], // Remove data:image/type;base64, prefix
            mimeType: this.getMimeTypeFromBase64(request.baseImage),
          },
        };
        contentParts = [prompt, imageData];
      }

      this.logger.log(`Avatar-based prompt: ${prompt}`);

      // Generate image with base image reference (like the successful example)
      const result = await model.generateContent(contentParts);
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

  private buildTextOnlyPrompt(request: GenerateStoreItemsRequest, variationIndex: number): string {
    // Create detailed prompts for different avatar store items without reference image
    const basePrompts = this.getTextOnlyItemPrompts(request.itemType, request.style, request.theme);
    const selectedPrompt = basePrompts[variationIndex % basePrompts.length];

    // Create a pure text prompt for clean product generation
    const textPrompt =
      `Product photography: ${selectedPrompt}. ` +
      `Requirements: Clean white background, professional studio lighting, e-commerce style. ` +
      `Subject: ONLY the ${request.itemType} item, no people, no humans, no models. ` +
      `Style: ${request.style}, Theme: ${request.theme}. ` +
      `Format: High-quality product catalog image suitable for online store. ` +
      `DO NOT include any people or human figures. Show only the clothing/item itself.`;

    return textPrompt;
  }

  private buildAvatarBasedPrompt(request: GenerateStoreItemsRequest, variationIndex: number, totalVariations?: number): string {
    // If user provided a custom prompt, modify it for individual image generation
    if (request.customPrompt && request.customPrompt.trim()) {
      const originalPrompt = request.customPrompt.trim();
      this.logger.log(`Using custom prompt: ${originalPrompt}`);
      
      // If generating multiple items, modify prompt to create ONE item per image
      if (totalVariations && totalVariations > 1) {
        const modifiedPrompt = this.modifyPromptForSingleItem(originalPrompt, variationIndex + 1, totalVariations);
        this.logger.log(`Modified for individual generation: ${modifiedPrompt}`);
        return modifiedPrompt;
      }
      
      return originalPrompt;
    }

    // Otherwise, create prompts that work like the successful Google AI Studio example
    const basePrompts = this.getAvatarItemPrompts(request.itemType, request.style, request.theme);
    const selectedPrompt = basePrompts[variationIndex % basePrompts.length];

    // Create a prompt that generates items for the avatar character (like the successful example)
    const avatarPrompt = request.baseImage 
      ? `Using this avatar character as reference, ${selectedPrompt}. Show the ${request.itemType} both as a separate item and worn by the character. Style: ${request.style}, Theme: ${request.theme}. Create clothing/items that would fit this character perfectly.`
      : `Create ${selectedPrompt} for a cartoon avatar character. Style: ${request.style}, Theme: ${request.theme}. Show the ${request.itemType} as it would appear on an avatar character.`;

    return avatarPrompt;
  }

  private getAvatarItemPrompts(itemType: string, style: string, theme: string): string[] {
    switch (itemType) {
      case 'outfit':
        return [
          `create a ${style} ${theme} outfit for this character - design clothing that fits their style and personality`,
          `design a ${style} ${theme} costume for this avatar - create wearable clothing items that suit the character`,
          `make a ${style} ${theme} outfit for this character to wear - design clothes that match their appearance`,
          `create ${style} ${theme} clothing for this avatar character - design an outfit that fits perfectly`,
          `design a ${style} ${theme} ensemble for this character - create clothing items they can wear`,
        ];

      case 'shoes':
        return [
          `create ${style} ${theme} shoes for this character - design footwear that fits their style`,
          `design ${style} ${theme} footwear for this avatar - create shoes that match the character`,
          `make ${style} ${theme} shoes for this character to wear - design footwear that suits them`,
          `create ${style} ${theme} boots/sneakers for this avatar character - design appropriate footwear`,
          `design ${style} ${theme} footwear that this character would wear - create matching shoes`,
        ];

      case 'microphone':
        return [
          `create a ${style} ${theme} microphone for this character - design a mic that fits their personality`,
          `design a ${style} ${theme} microphone that this avatar would use - create a custom mic`,
          `make a ${style} ${theme} microphone for this character - design a personalized mic`,
          `create a ${style} ${theme} karaoke microphone for this avatar - design a performance mic`,
          `design a ${style} ${theme} microphone that matches this character's style`,
        ];

      case 'hair':
        return [
          `create ${style} ${theme} hair accessories for this character - design items that enhance their hairstyle`,
          `design ${style} ${theme} hair ornaments for this avatar - create accessories that fit their look`,
          `make ${style} ${theme} hair clips/bands for this character - design hair accessories`,
          `create ${style} ${theme} hair decorations for this avatar character - design stylish accessories`,
          `design ${style} ${theme} hair accessories that complement this character's appearance`,
        ];

      case 'hat':
        return [
          `create a ${style} ${theme} hat for this character - design headwear that suits their personality`,
          `design a ${style} ${theme} hat that this avatar would wear - create matching headwear`,
          `make a ${style} ${theme} cap/beanie for this character - design appropriate headwear`,
          `create ${style} ${theme} headwear for this avatar character - design a fitting hat`,
          `design a ${style} ${theme} hat that complements this character's style`,
        ];

      case 'jewelry':
        return [
          `create ${style} ${theme} jewelry for this character - design accessories that enhance their look`,
          `design ${style} ${theme} jewelry that this avatar would wear - create matching accessories`,
          `make ${style} ${theme} necklace/earrings for this character - design elegant jewelry`,
          `create ${style} ${theme} jewelry accessories for this avatar character - design stylish pieces`,
          `design ${style} ${theme} jewelry that fits this character's personality and style`,
        ];

      default:
        return [
          `create a ${style} ${theme} accessory for this character - design an item that suits their style`,
          `design a ${style} ${theme} item that this avatar would use - create a matching accessory`,
          `make a ${style} ${theme} accessory for this character - design something that fits their personality`,
        ];
    }
  }

  private getTextOnlyItemPrompts(itemType: string, style: string, theme: string): string[] {
    switch (itemType) {
      case 'outfit':
        return [
          `clothing items: ${style} ${theme} shirt and pants laid flat on surface - no people, just the clothes`,
          `fashion flatlay: ${style} ${theme} top, bottom, and accessories arranged professionally - clothing only`,
          `wardrobe items: ${style} ${theme} blazer, shirt, trousers displayed on hangers - no human models`,
          `apparel collection: ${style} ${theme} casual wear pieces arranged for catalog photography - clothes only`,
          `garment display: ${style} ${theme} performance clothing ensemble on display stand - no people`,
        ];

      case 'shoes':
        return [
          `a pair of ${style} ${theme} shoes on white background - both shoes positioned for optimal product photography`,
          `${style} ${theme} footwear product shot - professional angle showing shoe design and details`,
          `a pair of ${style} ${theme} sneakers/dress shoes - clean product photography with both shoes visible`,
          `${style} ${theme} boots/heels/flats - high-quality product image showing craftsmanship and style`,
          `premium ${style} ${theme} footwear - professional studio photography of elegant shoes`,
        ];

      case 'microphone':
        return [
          `a ${style} ${theme} handheld microphone on white background - professional vocal microphone product shot`,
          `a ${style} ${theme} studio microphone - premium recording equipment with clean product photography`,
          `a wireless ${style} ${theme} microphone - modern performance microphone with sleek design`,
          `a ${style} ${theme} vintage-style microphone - classic design microphone for professional use`,
          `a ${style} ${theme} colored microphone - unique design microphone with custom finish and details`,
        ];

      case 'hair':
        return [
          `${style} ${theme} hair accessories on white background - hair clips, bands, and decorative pieces`,
          `a collection of ${style} ${theme} hair ornaments - elegant hair accessories product photography`,
          `${style} ${theme} hair clips and barrettes - professional product shot of hair styling accessories`,
          `a ${style} ${theme} headband or hair band - stylish hair accessory on clean background`,
          `${style} ${theme} hair scrunchies and ties - colorful hair accessories arranged for product photography`,
        ];

      case 'hat':
        return [
          `a ${style} ${theme} hat on white background - professional headwear product photography`,
          `a ${style} ${theme} cap/beanie/fedora - stylish headwear shot from optimal angle`,
          `a ${style} ${theme} baseball cap or snapback - modern headwear with clean product photography`,
          `a ${style} ${theme} winter hat or beanie - cozy headwear product shot with detailed texture`,
          `a ${style} ${theme} formal hat - elegant headwear suitable for special occasions`,
        ];

      case 'jewelry':
        return [
          `${style} ${theme} jewelry pieces on white background - rings, necklaces, earrings arranged elegantly`,
          `a ${style} ${theme} necklace or bracelet - fine jewelry product photography with proper lighting`,
          `${style} ${theme} earrings or rings - precious jewelry items photographed professionally`,
          `a ${style} ${theme} jewelry set - coordinated accessories displayed for premium product photography`,
          `${style} ${theme} statement jewelry - bold accessories with detailed product photography`,
        ];

      default:
        return [
          `a ${style} ${theme} accessory on white background - professional product photography`,
          `a ${style} ${theme} item suitable for avatars - clean product shot with studio lighting`,
          `a ${style} ${theme} performance accessory - stage-appropriate item with professional photography`,
        ];
    }
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
