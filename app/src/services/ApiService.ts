import { baseApiService } from './BaseApiService';

/**
 * Legacy ApiService - now just re-exports the BaseApiService
 * This maintains backward compatibility while using the new centralized service
 * 
 * @deprecated Use baseApiService directly instead
 */
class ApiService {
  // Re-export all methods and properties from BaseApiService
  get endpoints() {
    return baseApiService.endpoints;
  }

  get environmentInfo() {
    return baseApiService.environmentInfo;
  }

  // HTTP Methods
  async get<T = any>(url: string, config?: any): Promise<T> {
    return baseApiService.get<T>(url, config);
  }

  async post<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return baseApiService.post<T>(url, data, config);
  }

  async put<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return baseApiService.put<T>(url, data, config);
  }

  async patch<T = any>(url: string, data?: any, config?: any): Promise<T> {
    return baseApiService.patch<T>(url, data, config);
  }

  async delete<T = any>(url: string, config?: any): Promise<T> {
    return baseApiService.delete<T>(url, config);
  }

  // Utility methods
  async uploadFile(file: { uri: string; type: string; name: string }, additionalData?: any) {
    return baseApiService.uploadFile(file, additionalData);
  }

  // Auth methods
  async setAuthTokens(token: string, refreshToken?: string) {
    return baseApiService.setAuthTokens(token, refreshToken);
  }

  async getAuthToken(): Promise<string | null> {
    return baseApiService.getAuthToken();
  }

  async isAuthenticated(): Promise<boolean> {
    return baseApiService.isAuthenticated();
  }
}

// Export singleton instance (maintains backward compatibility)
export const apiService = new ApiService();
export default apiService;

// Also export the base service for direct use
export { baseApiService };
