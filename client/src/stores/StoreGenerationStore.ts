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

export class StoreGenerationStore {
  generatedItems: GeneratedStoreItem[] = [];
  isLoading = false;
  error: string | null = null;
  success: string | null = null;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  setError(error: string | null) {
    this.error = error;
  }

  setSuccess(success: string | null) {
    this.success = success;
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

      if (response.data.success) {
        this.generatedItems = [...this.generatedItems, ...response.data.data.items];
        this.setSuccess(`Generated ${response.data.data.count} new ${settings.itemType} variations!`);
        return { success: true, data: response.data.data };
      } else {
        this.setError(response.data.error || 'Failed to generate items');
        return { success: false, error: response.data.error };
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

      const selectedItems = this.generatedItems.filter((item) =>
        selectedItemIds.includes(item.id),
      );

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

      if (response.data.success) {
        this.setSuccess(
          `Successfully saved ${response.data.data.count} items to the store!`,
        );
        // Remove saved items from the generated list
        this.generatedItems = this.generatedItems.filter(
          (item) => !selectedItemIds.includes(item.id),
        );
        return { success: true, data: response.data.data };
      } else {
        this.setError(response.data.error || 'Failed to save items');
        return { success: false, error: response.data.error };
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

      if (response.data.success) {
        return { success: true, data: response.data.data };
      } else {
        this.setError(response.data.error || 'Failed to get settings');
        return { success: false, error: response.data.error };
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