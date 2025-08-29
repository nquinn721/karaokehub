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
   * Build the analysis prompt for DeepSeek - focused on karaoke extraction
   */
  private buildAnalysisPrompt(
    url: string,
    content: string,
    title: string,
    options: DeepSeekParsingOptions,
  ): string {
    const contentPreview = content.length > 12000 ? content.substring(0, 12000) + '...' : content;

    let prompt = `Extract ALL karaoke shows from this webpage content. Each venue + day combination is a separate show.

URL: ${url}
Title: ${title}

Content:
${contentPreview}

CRITICAL RESPONSE REQUIREMENTS:
- Return ONLY valid JSON, no other text
- Maximum 50 shows per response to prevent truncation
- Ensure JSON is properly closed with all brackets and braces

🚫 DUPLICATE PREVENTION - CRITICAL RULES:
- ONLY extract UNIQUE shows - no duplicates allowed
- Different days at the same venue = separate shows (e.g., "Bar Monday" vs "Bar Saturday")  
- Different times at the same venue = separate shows (e.g., "Bar 7:00 PM" vs "Bar 10:00 PM")
- Same address, same day, same time = DUPLICATE, include only once

SHOW EXTRACTION RULES:
- Each venue name + day of week = one show entry
- Look for patterns like "Monday: Park St Tavern - 9 pm - DJ Name"
- Extract venue name, day, time, and DJ/host name for each entry
- If a venue appears under multiple days, create separate show entries for each day

EXCLUDE: Shows marked "CLOSED", "CANCELLED", "SUSPENDED", "UNAVAILABLE", "DISCONTINUED", "TEMPORARILY CLOSED", "OUT OF BUSINESS", "INACTIVE", "NOT RUNNING"

Return a JSON object with this exact structure:
{
  "title": "cleaned page title",
  "description": "brief description of the page content",`;

    if (options.includeNavigation) {
      prompt += `
  "navLinks": ["array of karaoke-related navigation URLs found"],`;
    }

    if (options.includeShows) {
      prompt += `
  "shows": [
    {
      "venue": "exact venue name",
      "address": "street address only (no city/state)",
      "city": "city name",
      "state": "state abbreviation (e.g., FL, CA, NY)",
      "zip": "zip code if available",
      "day": "monday/tuesday/wednesday/thursday/friday/saturday/sunday",
      "time": "show time (e.g., 8:00 PM)",
      "startTime": "start time in 24h format (e.g., 20:00)",
      "endTime": "end time in 24h format if available",
      "djName": "DJ or host name if mentioned",
      "description": "additional details about the show",
      "venuePhone": "venue phone number if available",
      "venueWebsite": "venue website if available",
      "source": "${url}",
      "confidence": 0.9
    }
  ],`;
    }

    if (options.includeDJs) {
      prompt += `
  "djs": [
    {
      "name": "DJ name",
      "confidence": 0.8,
      "context": "where the DJ was mentioned"
    }
  ],`;
    }

    if (options.includeVendors) {
      prompt += `
  "vendors": [
    {
      "name": "karaoke company/vendor name",
      "website": "${url}",
      "description": "company description",
      "confidence": 0.9
    }
  ],`;
    }

    prompt += `
  "confidence": 0.95,
  "reasoning": "brief explanation of what karaoke content was found"
}

FOCUS SPECIFICALLY ON:
- Karaoke nights and shows
- DJ-hosted karaoke events  
- Weekly karaoke schedules
- Venue karaoke information
- Entertainment venues with karaoke

Return only valid JSON. If no karaoke shows are found, return empty arrays but valid JSON structure.`;

    return prompt;
  }

  /**
   * Get the system prompt for DeepSeek - karaoke-focused
   */
  private getSystemPrompt(): string {
    return `You are an expert karaoke schedule parser specializing in extracting structured karaoke show information from websites. Your primary tasks are:

1. Extract karaoke shows with complete venue and schedule details
2. Identify DJ names, karaoke hosts, and entertainment providers
3. Parse venue addresses with proper city/state/zip separation
4. Convert show times to consistent formats
5. Provide accurate confidence scores
6. Return only valid, complete JSON responses

CRITICAL RULES:
- Focus ONLY on karaoke-related content and shows
- Each venue + day combination is a separate show entry
- Never include duplicate shows (same venue, day, time)
- Always separate address components properly (street, city, state, zip)
- Include source URL for traceability
- If unsure about information, indicate lower confidence rather than guessing

EXCLUDE any shows that are cancelled, closed, or inactive.`;
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
