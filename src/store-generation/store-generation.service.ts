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
        if (num > 0 && num <= 20) {
          // Reasonable limits
          this.logger.log(`Detected ${num} variations from custom prompt`);
          return num;
        }
      }
    }

    return null;
  }

  private modifyPromptForSingleItem(
    originalPrompt: string,
    currentIndex: number,
    totalItems: number,
  ): string {
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
      'varied character appearance',
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
      this.logger.log(
        `Content parts: ${contentParts.length} parts (${request.baseImage ? 'with' : 'without'} base image)`,
      );

      // Generate image with base image reference (like the successful example)
      const result = await model.generateContent(contentParts);
      const response = await result.response;

      this.logger.log(
        `Gemini response received with ${response.candidates?.length || 0} candidates`,
      );

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

      // No image found - this is an error
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

  private buildAvatarBasedPrompt(
    request: GenerateStoreItemsRequest,
    variationIndex: number,
    totalVariations?: number,
  ): string {
    // If user provided a custom prompt, handle both image-based and prompt-only scenarios
    if (request.customPrompt && request.customPrompt.trim()) {
      const originalPrompt = request.customPrompt.trim();
      this.logger.log(`Using custom prompt: ${originalPrompt}`);

      if (request.baseImage) {
        // We have both a base image and a custom prompt - use image as context
        const modificationKeywords =
          /\b(remove|delete|edit|modify|change|without|take\s+out|get\s+rid\s+of|eliminate)\b/i;
        const isModificationRequest = modificationKeywords.test(originalPrompt);

        if (isModificationRequest) {
          // This is an image modification request
          const enhancedPrompt = `Looking at this image, please modify it according to this request: "${originalPrompt}". 

REQUIREMENTS:
- Keep the same character/avatar style and appearance
- Only make the specific changes requested
- Maintain the same image quality and style
- Keep the same background style
- Preserve all other elements that weren't mentioned to be changed
- Return the complete modified image, not just a part

Please apply the requested modification while preserving everything else about the character.`;

          return enhancedPrompt;
        } else {
          // Use the base image as inspiration/context for generation
          const enhancedPrompt = `Using this image as reference/inspiration, create something based on this request: "${originalPrompt}". 

REQUIREMENTS:
- Use the provided image as context or inspiration
- Generate based on the specific request
- Maintain high quality and consistency
- Follow the user's request exactly

Please create what the user requested while using the provided image as context.`;

          return enhancedPrompt;
        }
      } else {
        // No base image - just generate based on the prompt alone
        const enhancedPrompt = `Generate an image based on this request: "${originalPrompt}". 

REQUIREMENTS:
- Create exactly what the user requested
- High quality image generation
- Professional style
- Clear and detailed result

Please create what the user requested without any additional constraints.`;

        return enhancedPrompt;
      }
    }

    // Otherwise, create very specific prompts for avatar items
    const basePrompts = this.getAvatarItemPrompts(request.itemType, request.style, request.theme);
    const selectedPrompt = basePrompts[variationIndex % basePrompts.length];

    // Create a highly specific prompt that generates avatar clothing/items
    const avatarPrompt = request.baseImage
      ? `Looking at this avatar character image, create a ${request.itemType} item that would suit this character.

SPECIFIC REQUIREMENTS:
- Generate ONLY ${request.itemType} clothing/accessories
- Style: ${request.style}
- Theme: ${request.theme}
- ${selectedPrompt}
- Professional fashion photography
- Clean white or transparent background
- High quality wearable item for avatar character
- NO landscapes, buildings, or unrelated objects
- Focus on clothing, shoes, accessories, or wearable items ONLY

The result should be a clear image of ${request.itemType} that this avatar character could wear.`
      : `Create a ${request.itemType} item for an avatar character.

SPECIFIC REQUIREMENTS:
- Generate ONLY ${request.itemType} clothing/accessories  
- Style: ${request.style}
- Theme: ${request.theme}
- ${selectedPrompt}
- Professional fashion/product photography
- Clean background
- High quality wearable item
- NO landscapes, buildings, or unrelated objects
- Focus on clothing, shoes, accessories, or wearable items ONLY

The result should be a clear image of ${request.itemType} suitable for an avatar character to wear.`;

    return avatarPrompt;
  }

  private getAvatarItemPrompts(itemType: string, style: string, theme: string): string[] {
    switch (itemType) {
      case 'outfit':
        return [
          `a ${style} ${theme} clothing outfit - jacket, shirt, dress, or complete clothing ensemble`,
          `a ${style} ${theme} costume or clothing set - wearable fashion items like tops, bottoms, dresses`,
          `a ${style} ${theme} fashion outfit - clothing pieces such as shirts, pants, skirts, or dresses`,
          `a ${style} ${theme} clothing ensemble - wearable garments like blouses, jackets, or complete outfits`,
          `a ${style} ${theme} wardrobe item - clothing such as sweaters, coats, or fashionable attire`,
        ];

      case 'shoes':
        return [
          `${style} ${theme} footwear - shoes, boots, sneakers, or other wearable foot accessories`,
          `${style} ${theme} shoes or boots - fashionable footwear like sneakers, dress shoes, or casual shoes`,
          `${style} ${theme} footwear items - boots, sandals, heels, or athletic shoes`,
          `${style} ${theme} shoe accessories - stylish footwear like loafers, pumps, or hiking boots`,
          `${style} ${theme} wearable shoes - fashionable footwear such as oxfords, flats, or running shoes`,
        ];

      case 'microphone':
        return [
          `a ${style} ${theme} karaoke microphone - professional singing microphone with unique design`,
          `a ${style} ${theme} performance microphone - decorative singing mic for karaoke use`,
          `a ${style} ${theme} vocal microphone - stylized singing microphone with custom appearance`,
          `a ${style} ${theme} karaoke mic - fashionable microphone for singing performances`,
          `a ${style} ${theme} singing microphone - decorative performance mic with unique styling`,
        ];

      case 'hair':
        return [
          `${style} ${theme} hair accessories - wearable hair clips, bands, or ornaments`,
          `${style} ${theme} hair ornaments - decorative hair accessories like clips, bows, or headbands`,
          `${style} ${theme} hair clips or bands - fashionable hair accessories for styling`,
          `${style} ${theme} hair decorations - stylish accessories to enhance hairstyles`,
          `${style} ${theme} hair accessories - elegant ornaments for hair styling and decoration`,
        ];

      case 'hat':
        return [
          `a ${style} ${theme} hat or cap - wearable headwear like baseball caps, beanies, or formal hats`,
          `a ${style} ${theme} headwear - fashionable hats such as fedoras, sun hats, or winter caps`,
          `a ${style} ${theme} cap or beanie - stylish head accessories like snapbacks, bucket hats, or knit caps`,
          `a ${style} ${theme} hat accessory - wearable headgear such as visors, cowboy hats, or dress hats`,
          `a ${style} ${theme} head covering - fashionable hats like bowler hats, panama hats, or casual caps`,
        ];

      case 'jewelry':
        return [
          `${style} ${theme} jewelry accessories - wearable items like necklaces, earrings, or bracelets`,
          `${style} ${theme} jewelry pieces - fashionable accessories such as rings, pendants, or chains`,
          `${style} ${theme} wearable jewelry - elegant accessories like earrings, bracelets, or necklaces`,
          `${style} ${theme} jewelry items - stylish accessories including rings, brooches, or pendants`,
          `${style} ${theme} decorative jewelry - fashionable wearable accessories for personal styling`,
        ];

      default:
        return [
          `a ${style} ${theme} ${itemType} accessory - wearable item or clothing piece for avatar character`,
          `a ${style} ${theme} ${itemType} item - fashionable accessory or clothing suitable for avatars`,
          `a ${style} ${theme} ${itemType} piece - wearable fashion item or character accessory`,
          `a ${style} ${theme} ${itemType} - stylish wearable item or clothing for avatar use`,
          `a ${style} ${theme} ${itemType} accessory - fashionable wearable item for character customization`,
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
