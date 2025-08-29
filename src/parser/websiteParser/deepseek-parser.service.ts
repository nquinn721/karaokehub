import { Injectable, Logger } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import axios from 'axios';

export interface DeepSeekAnalysisResult {
  title: string;
  description: string;
  navLinks: string[];
  shows: any[];
  djs: any[];
  vendors: any[];
  confidence: number;
  reasoning: string;
}

export interface DeepSeekParsingOptions {
  includeNavigation: boolean;
  includeShows: boolean;
  includeDJs: boolean;
  includeVendors: boolean;
  maxTokens: number;
}

@Injectable()
export class DeepSeekParserService {
  private readonly logger = new Logger(DeepSeekParserService.name);
  private readonly deepSeekApiKey: string;
  private readonly deepSeekBaseUrl = 'https://api.deepseek.com/v1/chat/completions';

  constructor(private configService: ConfigService) {
    this.deepSeekApiKey = this.configService.get<string>('DEEPSEEK_API_KEY');
    if (!this.deepSeekApiKey) {
      this.logger.warn('⚠️ DEEPSEEK_API_KEY not found in environment variables');
    }
  }

  /**
   * Analyze webpage content using DeepSeek AI
   */
  async analyzeContent(
    url: string,
    content: string,
    title: string,
    options: Partial<DeepSeekParsingOptions> = {},
  ): Promise<DeepSeekAnalysisResult> {
    this.logger.log(`🤖 Analyzing content from ${url} with DeepSeek-V3.1`);

    if (!this.deepSeekApiKey) {
      throw new Error('DeepSeek API key not configured');
    }

    const defaultOptions: DeepSeekParsingOptions = {
      includeNavigation: true,
      includeShows: true,
      includeDJs: true,
      includeVendors: true,
      maxTokens: 4000,
    };

    const finalOptions = { ...defaultOptions, ...options };

    try {
      const prompt = this.buildAnalysisPrompt(url, content, title, finalOptions);

      const response = await axios.post(
        this.deepSeekBaseUrl,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'system',
              content: this.getSystemPrompt(),
            },
            {
              role: 'user',
              content: prompt,
            },
          ],
          max_tokens: finalOptions.maxTokens,
          temperature: 0.1,
          response_format: { type: 'json_object' },
        },
        {
          headers: {
            Authorization: `Bearer ${this.deepSeekApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 60000,
        },
      );

      const aiResponse = response.data.choices[0]?.message?.content;
      if (!aiResponse) {
        throw new Error('No response from DeepSeek API');
      }

      return this.parseAIResponse(aiResponse);
    } catch (error) {
      this.logger.error(`❌ DeepSeek analysis failed for ${url}: ${error.message}`);

      if (error.response?.status === 402) {
        throw new Error('DeepSeek API payment required. Please check your account credits.');
      } else if (error.response?.status === 401) {
        throw new Error('DeepSeek API authentication failed. Please check your API key.');
      } else if (error.response?.status === 429) {
        throw new Error('DeepSeek API rate limit exceeded. Please try again later.');
      }

      throw error;
    }
  }

  /**
   * Test DeepSeek API connectivity
   */
  async testConnection(): Promise<{
    success: boolean;
    message: string;
    model?: string;
    credits?: number;
  }> {
    if (!this.deepSeekApiKey) {
      return {
        success: false,
        message: 'DeepSeek API key not configured',
      };
    }

    try {
      const response = await axios.post(
        this.deepSeekBaseUrl,
        {
          model: 'deepseek-chat',
          messages: [
            {
              role: 'user',
              content: 'Hello, please respond with "Connection successful"',
            },
          ],
          max_tokens: 50,
          temperature: 0.1,
        },
        {
          headers: {
            Authorization: `Bearer ${this.deepSeekApiKey}`,
            'Content-Type': 'application/json',
          },
          timeout: 30000,
        },
      );

      return {
        success: true,
        message: 'DeepSeek API connection successful',
        model: 'deepseek-chat',
      };
    } catch (error) {
      let message = 'DeepSeek API connection failed';

      if (error.response?.status === 402) {
        message = 'DeepSeek API payment required. Please add credits to your account.';
      } else if (error.response?.status === 401) {
        message = 'DeepSeek API authentication failed. Please check your API key.';
      } else if (error.response?.status === 429) {
        message = 'DeepSeek API rate limit exceeded.';
      } else if (error.code === 'ECONNREFUSED' || error.code === 'ETIMEDOUT') {
        message = 'DeepSeek API network connection failed.';
      }

      return {
        success: false,
        message: `${message} Error: ${error.message}`,
      };
    }
  }

  /**
   * Build the analysis prompt for DeepSeek
   */
  private buildAnalysisPrompt(
    url: string,
    content: string,
    title: string,
    options: DeepSeekParsingOptions,
  ): string {
    const contentPreview = content.length > 8000 ? content.substring(0, 8000) + '...' : content;

    let prompt = `Analyze this webpage content and extract structured information.

URL: ${url}
Title: ${title}

Content:
${contentPreview}

Please analyze and return a JSON object with the following structure:
{
  "title": "cleaned page title",
  "description": "brief description of the page content",`;

    if (options.includeNavigation) {
      prompt += `
  "navLinks": ["array of navigation URLs found in the content"],`;
    }

    if (options.includeShows) {
      prompt += `
  "shows": [
    {
      "title": "show/event name",
      "venue": "venue name",
      "date": "date in YYYY-MM-DD format if found",
      "time": "time if found",
      "description": "event description",
      "dj": "DJ name if mentioned",
      "location": "location details"
    }
  ],`;
    }

    if (options.includeDJs) {
      prompt += `
  "djs": [
    {
      "name": "DJ name",
      "description": "DJ description or bio",
      "specialties": ["music genres or specialties"],
      "contact": "contact info if available"
    }
  ],`;
    }

    if (options.includeVendors) {
      prompt += `
  "vendors": [
    {
      "name": "vendor/business name",
      "type": "business type (venue, equipment, etc.)",
      "description": "business description",
      "contact": "contact information",
      "location": "location if mentioned"
    }
  ],`;
    }

    prompt += `
  "confidence": 0.95,
  "reasoning": "brief explanation of findings"
}

Focus on karaoke, DJ, music, and entertainment-related content. Return only valid JSON.`;

    return prompt;
  }

  /**
   * Get the system prompt for DeepSeek
   */
  private getSystemPrompt(): string {
    return `You are an expert web content analyzer specializing in karaoke, DJ, and entertainment industry information. Your task is to:

1. Extract structured data from webpage content
2. Identify karaoke shows, DJ events, and entertainment venues
3. Parse contact information and event details
4. Provide confidence scores for your findings
5. Return only valid JSON responses

Be thorough but accurate. If information is unclear or missing, indicate this rather than guessing.`;
  }

  /**
   * Parse and validate AI response
   */
  private parseAIResponse(aiResponse: string): DeepSeekAnalysisResult {
    try {
      const parsed = JSON.parse(aiResponse);

      // Validate required fields
      const result: DeepSeekAnalysisResult = {
        title: parsed.title || 'No title found',
        description: parsed.description || 'No description available',
        navLinks: Array.isArray(parsed.navLinks) ? parsed.navLinks : [],
        shows: Array.isArray(parsed.shows) ? parsed.shows : [],
        djs: Array.isArray(parsed.djs) ? parsed.djs : [],
        vendors: Array.isArray(parsed.vendors) ? parsed.vendors : [],
        confidence: typeof parsed.confidence === 'number' ? parsed.confidence : 0.5,
        reasoning: parsed.reasoning || 'No reasoning provided',
      };

      return result;
    } catch (error) {
      this.logger.error(`❌ Failed to parse DeepSeek response: ${error.message}`);
      this.logger.debug(`Raw response: ${aiResponse}`);

      // Return a default result instead of throwing
      return {
        title: 'Parse Error',
        description: 'Failed to parse AI response',
        navLinks: [],
        shows: [],
        djs: [],
        vendors: [],
        confidence: 0,
        reasoning: `Parse error: ${error.message}`,
      };
    }
  }

  /**
   * Batch analyze multiple content pieces
   */
  async batchAnalyze(
    contents: Array<{ url: string; content: string; title: string }>,
    options: Partial<DeepSeekParsingOptions> = {},
  ): Promise<DeepSeekAnalysisResult[]> {
    this.logger.log(`🔄 Batch analyzing ${contents.length} pieces of content`);

    const results: DeepSeekAnalysisResult[] = [];

    // Process in batches to avoid rate limiting
    const batchSize = 3;
    for (let i = 0; i < contents.length; i += batchSize) {
      const batch = contents.slice(i, i + batchSize);

      const batchPromises = batch.map((item) =>
        this.analyzeContent(item.url, item.content, item.title, options).catch((error) => {
          this.logger.error(`❌ Failed to analyze ${item.url}: ${error.message}`);
          return {
            title: 'Analysis Failed',
            description: `Error: ${error.message}`,
            navLinks: [],
            shows: [],
            djs: [],
            vendors: [],
            confidence: 0,
            reasoning: `Analysis failed: ${error.message}`,
          };
        }),
      );

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Add delay between batches to respect rate limits
      if (i + batchSize < contents.length) {
        await this.delay(2000);
      }
    }

    return results;
  }

  /**
   * Utility method to add delay
   */
  private delay(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }
}
