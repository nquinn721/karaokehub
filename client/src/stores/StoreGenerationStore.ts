import { makeAutoObservable } from 'mobx';
import { apiStore } from './ApiStore';

export interface GeneratedStoreItem {
  id: string;
  imageUrl: string;
  prompt: string;
  itemType: string;
  style: string;
  theme: string;
  metadata: any;
}

export interface GenerationSettings {
  itemType: string;
  style: string;
  theme: string;
  variations: number;
  quality: string;
}

export interface ExistingStoreItem {
  id: string;
  name: string;
  description?: string;
  imageUrl: string;
  type: string;
  rarity: string;
  price: number;
}

export class StoreGenerationStore {
  generatedItems: GeneratedStoreItem[] = [];
  existingMicrophones: ExistingStoreItem[] = [];
  existingAvatars: ExistingStoreItem[] = [];
  isLoading = false;
  isLoadingExisting = false;
  error: string | null = null;
  success: string | null = null;

  constructor() {
    makeAutoObservable(this);

    // Initialize arrays to prevent undefined errors
    this.existingMicrophones = [];
    this.existingAvatars = [];
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setLoadingExisting(loading: boolean) {
    this.isLoadingExisting = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setSuccess(success: string | null) {
    this.success = success;
  }

  async loadExistingStoreItems(): Promise<{ success: boolean; error?: string }> {
    try {
      this.setLoadingExisting(true);
      this.setError(null);

      console.log('Loading existing store items...');
      console.log('API Store base URL:', apiStore.environmentInfo);

      // Load avatars
      console.log('Calling /avatar/all-avatars...');
      const avatarsResponse = await apiStore.get('/avatar/all-avatars');
      console.log('Avatars response:', avatarsResponse);
      if (avatarsResponse && Array.isArray(avatarsResponse)) {
        this.existingAvatars = avatarsResponse.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          type: 'avatar',
          rarity: item.rarity || 'common',
          price: item.price || 0,
        }));
        console.log('Loaded avatars:', this.existingAvatars);
      }

      // Load microphones
      console.log('Calling /avatar/all-microphones...');
      const microphonesResponse = await apiStore.get('/avatar/all-microphones');
      console.log('Microphones response:', microphonesResponse);
      if (microphonesResponse && Array.isArray(microphonesResponse)) {
        this.existingMicrophones = microphonesResponse.map((item: any) => ({
          id: item.id,
          name: item.name,
          description: item.description,
          imageUrl: item.imageUrl,
          type: 'microphone',
          rarity: item.rarity || 'common',
          price: item.price || 0,
        }));
        console.log('Loaded microphones:', this.existingMicrophones);
      }

      console.log('All items loaded successfully');
      return { success: true };
    } catch (error: any) {
      console.error('Error loading store items:', error);
      const errorMessage = error.response?.data?.message || 'Failed to load existing store items';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoadingExisting(false);
    }
  }

  getAllExistingItems(): ExistingStoreItem[] {
    return [...(this.existingAvatars || []), ...(this.existingMicrophones || [])];
  }

  async generateStoreItems(
    baseImage: string,
    settings: GenerationSettings,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const requestBody = {
        baseImage,
        itemType: settings.itemType,
        style: settings.style,
        theme: settings.theme,
        variations: settings.variations,
        quality: settings.quality,
      };

      const response = await apiStore.post('/store-generation/generate', requestBody);

      if (response.success) {
        this.generatedItems = [...this.generatedItems, ...response.data.items];
        this.setSuccess(
          `Generated ${response.data.count} new ${settings.itemType} variations!`,
        );
        return { success: true, data: response.data };
      } else {
        this.setError(response.error || 'Failed to generate items');
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to generate store items';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async saveStoreItems(
    selectedItemIds: string[],
    itemDetails: Array<{
      id: string;
      name: string;
      description?: string;
      rarity: string;
      cost: number;
    }>,
  ): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      this.setLoading(true);
      this.setError(null);

      const selectedItems = this.generatedItems.filter((item) => selectedItemIds.includes(item.id));

      const itemsToSave = selectedItems.map((item) => {
        const details = itemDetails.find((d) => d.id === item.id);
        return {
          id: item.id,
          name: details?.name || `AI Generated ${item.itemType}`,
          description: details?.description || item.prompt,
          itemType: item.itemType,
          style: item.style,
          theme: item.theme,
          imageUrl: item.imageUrl,
          rarity: details?.rarity || 'common',
          cost: details?.cost || 0,
        };
      });

      const response = await apiStore.post('/store-generation/save', { items: itemsToSave });

      if (response.success) {
        this.setSuccess(`Successfully saved ${response.data.count} items to the store!`);
        // Remove saved items from the generated list
        this.generatedItems = this.generatedItems.filter(
          (item) => !selectedItemIds.includes(item.id),
        );
        return { success: true, data: response.data };
      } else {
        this.setError(response.error || 'Failed to save items');
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to save store items';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    } finally {
      this.setLoading(false);
    }
  }

  async getGenerationSettings(): Promise<{ success: boolean; error?: string; data?: any }> {
    try {
      const response = await apiStore.get('/store-generation/settings');

      if (response.success) {
        return { success: true, data: response.data };
      } else {
        this.setError(response.error || 'Failed to get settings');
        return { success: false, error: response.error };
      }
    } catch (error: any) {
      const errorMessage = error.response?.data?.message || 'Failed to get generation settings';
      this.setError(errorMessage);
      return { success: false, error: errorMessage };
    }
  }

  clearError() {
    this.setError(null);
  }

  clearSuccess() {
    this.setSuccess(null);
  }

  clearGeneratedItems() {
    this.generatedItems = [];
  }
}

export const storeGenerationStore = new StoreGenerationStore();
