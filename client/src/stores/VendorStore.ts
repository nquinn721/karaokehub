import { makeAutoObservable, runInAction } from 'mobx';
import { apiStore } from './ApiStore';

export interface Vendor {
  id: string;
  name: string;
  owner: string;
  website?: string;
  instagram?: string;
  facebook?: string;
  kjs?: Array<{
    id: string;
    name: string;
  }>;
  shows?: Array<{
    id: string;
    address: string;
    day: string;
    startTime: string;
    endTime: string;
  }>;
}

export interface CreateVendorData {
  name: string;
  website?: string;
  instagram?: string;
  facebook?: string;
}

export class VendorStore {
  vendors: Vendor[] = [];
  currentVendor: Vendor | null = null;
  isLoading = false;

  constructor() {
    makeAutoObservable(this);
  }

  setLoading(loading: boolean) {
    this.isLoading = loading;
  }

  async fetchVendors() {
    try {
      this.setLoading(true);
      console.log('VendorStore: Fetching vendors...');

      const response = await apiStore.get(apiStore.endpoints.vendors.base);
      console.log('VendorStore: Vendors fetched:', response);

      runInAction(() => {
        this.vendors = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      console.error('VendorStore: Error fetching vendors:', error);
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch vendors',
      };
    }
  }

  async fetchVendor(id: string) {
    try {
      this.setLoading(true);

      const response = await apiStore.get(apiStore.endpoints.vendors.byId(id));

      runInAction(() => {
        this.currentVendor = response;
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to fetch vendor',
      };
    }
  }

  async createVendor(vendorData: CreateVendorData) {
    try {
      this.setLoading(true);

      const response = await apiStore.post(apiStore.endpoints.vendors.base, vendorData);

      runInAction(() => {
        this.vendors.push(response);
        this.isLoading = false;
      });

      return { success: true, vendor: response };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to create vendor',
      };
    }
  }

  async updateVendor(id: string, updateData: Partial<CreateVendorData>) {
    try {
      this.setLoading(true);

      const response = await apiStore.patch(apiStore.endpoints.vendors.byId(id), updateData);

      runInAction(() => {
        const index = this.vendors.findIndex((vendor) => vendor.id === id);
        if (index !== -1) {
          this.vendors[index] = response;
        }
        if (this.currentVendor?.id === id) {
          this.currentVendor = response;
        }
        this.isLoading = false;
      });

      return { success: true, vendor: response };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to update vendor',
      };
    }
  }

  async deleteVendor(id: string) {
    try {
      this.setLoading(true);

      await apiStore.delete(apiStore.endpoints.vendors.byId(id));

      runInAction(() => {
        this.vendors = this.vendors.filter((vendor) => vendor.id !== id);
        if (this.currentVendor?.id === id) {
          this.currentVendor = null;
        }
        this.isLoading = false;
      });

      return { success: true };
    } catch (error: any) {
      runInAction(() => {
        this.isLoading = false;
      });
      return {
        success: false,
        error: error.response?.data?.message || 'Failed to delete vendor',
      };
    }
  }
}
