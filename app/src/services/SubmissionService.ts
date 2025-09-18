import { baseApiService } from './BaseApiService';

export interface ImageAnalysisRequest {
  images: string[]; // base64 data URLs
  vendorId?: string;
  maxConcurrentWorkers?: number;
}

export interface ImageAnalysisResponse {
  success: boolean;
  data?: any;
  error?: string;
}

export interface ManualShowRequest {
  venue: string;
  address?: string;
  city?: string;
  state?: string;
  zip?: string;
  djName?: string;
  description?: string;
  startTime: string;
  endTime?: string;
  phone?: string;
  website?: string;
  days: string[];
}

export interface ManualShowResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Submission Service for handling show submissions (images and manual entry)
 * Follows the same patterns as the webapp's ParserStore
 */
class SubmissionService {
  /**
   * Analyze multiple user images using parallel processing
   * Based on webapp's analyzeUserImagesParallel method
   */
  async analyzeImages(request: ImageAnalysisRequest): Promise<ImageAnalysisResponse> {
    try {
      console.log(`🚀 Analyzing ${request.images.length} user images in parallel...`);

      const requestBody = {
        screenshots: request.images,
        isAdminUpload: true, // Use admin upload flow for user images
        vendor: request.vendorId || 'user-submission',
        description: `User uploaded ${request.images.length} image(s) for parallel karaoke show analysis`,
        maxConcurrentWorkers: request.maxConcurrentWorkers || Math.min(request.images.length, 3),
      };

      const response = await baseApiService.post(
        '/parser/analyze-screenshots-parallel',
        requestBody,
      );

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to analyze images in parallel';
      console.error('Image analysis error:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit image analysis results
   * Based on webapp's submitImageAnalysis method
   */
  async submitImageAnalysis(analysisData: any): Promise<ImageAnalysisResponse> {
    try {
      await baseApiService.post('/parser/approve-admin-analysis', { data: analysisData });

      return { success: true };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit analysis';
      console.error('Submit analysis error:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Submit manual show entry
   * Based on webapp's submitManualShow method
   */
  async submitManualShow(request: ManualShowRequest): Promise<ManualShowResponse> {
    try {
      console.log('📝 Submitting manual show:', request);

      // Create show data in the format expected by the backend
      const showSubmission = {
        vendorId: 'user-submission', // Default vendor for user submissions
        venue: request.venue,
        address: request.address,
        days: request.days, // Send array of selected days
        startTime: request.startTime,
        endTime: request.endTime,
        djName: request.djName,
        description: request.description || '',
        venuePhone: request.phone || '',
        venueWebsite: request.website || '',
        city: request.city,
        state: request.state,
        zip: request.zip,
      };

      const response = await baseApiService.post('/parser/submit-manual-show', showSubmission);

      return {
        success: true,
        data: response,
      };
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to submit show';
      console.error('Submit manual show error:', error);
      return {
        success: false,
        error: errorMessage,
      };
    }
  }

  /**
   * Test API connection
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    try {
      await baseApiService.get('/config/client');
      return { success: true };
    } catch (error: any) {
      return {
        success: false,
        error: error.message || 'Connection failed',
      };
    }
  }
}

// Export singleton instance
export const submissionService = new SubmissionService();
