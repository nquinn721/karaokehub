import { Injectable, Logger } from '@nestjs/common';
import axios from 'axios';
import * as cheerio from 'cheerio';
import * as fs from 'fs';
import * as path from 'path';

export interface ExtractedImage {
  src: string;
  alt?: string;
  title?: string;
  width?: string;
  height?: string;
  size?: number;
  format?: string;
  isDownloaded?: boolean;
  localPath?: string;
}

export interface ImageParsingResult {
  url: string;
  images: ExtractedImage[];
  totalImages: number;
  downloadedImages: number;
  errors: string[];
}

@Injectable()
export class ImageParserService {
  private readonly logger = new Logger(ImageParserService.name);
  private readonly tempDir = path.join(process.cwd(), 'temp', 'images');

  constructor() {
    // Ensure temp directory exists
    this.ensureTempDirectory();
  }

  /**
   * Extract and optionally download images from HTML content
   */
  async parseImages(
    htmlContent: string,
    baseUrl: string,
    downloadImages: boolean = false,
    maxImages: number = 50
  ): Promise<ImageParsingResult> {
    this.logger.log(`🖼️ Parsing images from ${baseUrl}`);

    const $ = cheerio.load(htmlContent);
    const images: ExtractedImage[] = [];
    const errors: string[] = [];
    let downloadedCount = 0;

    // Extract all img tags
    $('img').each((index, element) => {
      if (images.length >= maxImages) return false; // Stop if we've hit the limit

      const $img = $(element);
      const src = $img.attr('src');
      
      if (src) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          const image: ExtractedImage = {
            src: absoluteUrl,
            alt: $img.attr('alt'),
            title: $img.attr('title'),
            width: $img.attr('width'),
            height: $img.attr('height'),
          };

          // Determine format from URL
          const urlPath = new URL(absoluteUrl).pathname;
          const extension = path.extname(urlPath).toLowerCase().substring(1);
          if (extension) {
            image.format = extension;
          }

          images.push(image);
        } catch (error) {
          errors.push(`Invalid image URL: ${src}`);
        }
      }
    });

    // Download images if requested
    if (downloadImages) {
      for (const image of images) {
        try {
          const downloadResult = await this.downloadImage(image.src, baseUrl);
          if (downloadResult.success) {
            image.isDownloaded = true;
            image.localPath = downloadResult.localPath;
            image.size = downloadResult.size;
            downloadedCount++;
          } else {
            errors.push(`Failed to download ${image.src}: ${downloadResult.error}`);
          }
        } catch (error) {
          errors.push(`Error downloading ${image.src}: ${error.message}`);
        }
      }
    }

    return {
      url: baseUrl,
      images,
      totalImages: images.length,
      downloadedImages: downloadedCount,
      errors,
    };
  }

  /**
   * Download a single image
   */
  async downloadImage(imageUrl: string, baseUrl: string): Promise<{
    success: boolean;
    localPath?: string;
    size?: number;
    error?: string;
  }> {
    try {
      // Create a safe filename
      const urlObj = new URL(imageUrl);
      const fileName = this.generateSafeFileName(urlObj.pathname, baseUrl);
      const localPath = path.join(this.tempDir, fileName);

      // Check if file already exists
      if (fs.existsSync(localPath)) {
        const stats = fs.statSync(localPath);
        return {
          success: true,
          localPath,
          size: stats.size,
        };
      }

      // Download the image
      const response = await axios.get(imageUrl, {
        responseType: 'arraybuffer',
        timeout: 30000,
        headers: {
          'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        },
      });

      // Write to file
      fs.writeFileSync(localPath, response.data);
      
      return {
        success: true,
        localPath,
        size: response.data.length,
      };
    } catch (error) {
      return {
        success: false,
        error: error.message,
      };
    }
  }

  /**
   * Extract images that might contain text (for OCR processing)
   */
  async extractTextCandidateImages(
    htmlContent: string,
    baseUrl: string
  ): Promise<ExtractedImage[]> {
    this.logger.log(`📝 Extracting text candidate images from ${baseUrl}`);

    const $ = cheerio.load(htmlContent);
    const candidates: ExtractedImage[] = [];

    $('img').each((_, element) => {
      const $img = $(element);
      const src = $img.attr('src');
      const alt = $img.attr('alt') || '';
      const title = $img.attr('title') || '';
      const className = $img.attr('class') || '';

      if (src && this.isTextCandidate(src, alt, title, className)) {
        try {
          const absoluteUrl = new URL(src, baseUrl).href;
          candidates.push({
            src: absoluteUrl,
            alt,
            title,
            width: $img.attr('width'),
            height: $img.attr('height'),
          });
        } catch (error) {
          // Skip invalid URLs
        }
      }
    });

    return candidates;
  }

  /**
   * Determine if an image might contain text worth OCR processing
   */
  private isTextCandidate(src: string, alt: string, title: string, className: string): boolean {
    const textIndicators = [
      // Alt text indicators
      /schedule|calendar|event|show|list|menu|hours|time/i,
      // Class name indicators  
      /schedule|calendar|event|show|list|menu/i,
      // File name indicators
      /schedule|calendar|event|show|list|menu|hours/i,
    ];

    const combinedText = `${src} ${alt} ${title} ${className}`.toLowerCase();
    
    return textIndicators.some(pattern => pattern.test(combinedText)) &&
           !this.isDecorative(src, alt, className);
  }

  /**
   * Check if image is likely decorative (not containing useful text)
   */
  private isDecorative(src: string, alt: string, className: string): boolean {
    const decorativeIndicators = [
      /logo|icon|avatar|banner|background|decoration|spacer/i,
      /\.svg$/i, // SVG files are often decorative
      /button|btn|arrow|star|rating/i,
    ];

    const combinedText = `${src} ${alt} ${className}`.toLowerCase();
    
    return decorativeIndicators.some(pattern => pattern.test(combinedText));
  }

  /**
   * Generate a safe filename for downloaded images
   */
  private generateSafeFileName(urlPath: string, baseUrl: string): string {
    // Extract domain for uniqueness
    const domain = new URL(baseUrl).hostname.replace(/\./g, '_');
    
    // Extract filename from path
    let fileName = path.basename(urlPath);
    
    // If no extension, add .jpg as default
    if (!path.extname(fileName)) {
      fileName += '.jpg';
    }
    
    // Sanitize filename
    fileName = fileName.replace(/[^a-zA-Z0-9._-]/g, '_');
    
    // Add timestamp and domain for uniqueness
    const timestamp = Date.now();
    const name = path.parse(fileName).name;
    const ext = path.parse(fileName).ext;
    
    return `${domain}_${timestamp}_${name}${ext}`;
  }

  /**
   * Clean up downloaded images
   */
  async cleanup(): Promise<void> {
    try {
      if (fs.existsSync(this.tempDir)) {
        const files = fs.readdirSync(this.tempDir);
        for (const file of files) {
          fs.unlinkSync(path.join(this.tempDir, file));
        }
        this.logger.log(`🧹 Cleaned up ${files.length} temporary images`);
      }
    } catch (error) {
      this.logger.error(`❌ Error cleaning up images: ${error.message}`);
    }
  }

  /**
   * Get image statistics from parsing result
   */
  getImageStats(result: ImageParsingResult): {
    totalImages: number;
    byFormat: Record<string, number>;
    downloadedImages: number;
    totalSize: number;
  } {
    const stats = {
      totalImages: result.totalImages,
      byFormat: {} as Record<string, number>,
      downloadedImages: result.downloadedImages,
      totalSize: 0,
    };

    result.images.forEach(image => {
      // Count by format
      if (image.format) {
        stats.byFormat[image.format] = (stats.byFormat[image.format] || 0) + 1;
      }
      
      // Sum total size
      if (image.size) {
        stats.totalSize += image.size;
      }
    });

    return stats;
  }

  /**
   * Ensure temp directory exists
   */
  private ensureTempDirectory(): void {
    if (!fs.existsSync(this.tempDir)) {
      fs.mkdirSync(this.tempDir, { recursive: true });
    }
  }
}
