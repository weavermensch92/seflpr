import { create } from 'zustand';
import { persist, createJSONStorage } from 'zustand/middleware';

export interface LocalProfileItem {
  tempId: string;
  profile_type: string;
  title: string;
  organization?: string;
  role?: string;
  description?: string;
  start_date?: string;
  end_date?: string;
  tags?: string[];
  metadata?: Record<string, any>;
  source: 'manual' | 'file_extract';
}

interface LocalProfileStore {
  pendingProfiles: LocalProfileItem[];
  rawExtractedTexts: { filename: string; text: string; uploadedAt: string }[];
  isSynced: boolean;
  lastSavedAt: string;
  
  addProfile: (profile: Omit<LocalProfileItem, 'tempId'>) => void;
  updateProfile: (tempId: string, updates: Partial<LocalProfileItem>) => void;
  removeProfile: (tempId: string) => void;
  addRawText: (filename: string, text: string) => void;
  setSynced: (status: boolean) => void;
  clearLocalData: () => void;
}

export const useLocalProfileStore = create<LocalProfileStore>()(
  persist(
    (set) => ({
      pendingProfiles: [],
      rawExtractedTexts: [],
      isSynced: false,
      lastSavedAt: new Date().toISOString(),
      
      addProfile: (profile) => set((state) => ({
        pendingProfiles: [...state.pendingProfiles, { ...profile, tempId: crypto.randomUUID() }],
        isSynced: false,
        lastSavedAt: new Date().toISOString(),
      })),
      
      updateProfile: (tempId, updates) => set((state) => ({
        pendingProfiles: state.pendingProfiles.map((p) => p.tempId === tempId ? { ...p, ...updates } : p),
        isSynced: false,
        lastSavedAt: new Date().toISOString(),
      })),
      
      removeProfile: (tempId) => set((state) => ({
        pendingProfiles: state.pendingProfiles.filter((p) => p.tempId !== tempId),
        lastSavedAt: new Date().toISOString(),
      })),
      
      addRawText: (filename, text) => set((state) => ({
        rawExtractedTexts: [...state.rawExtractedTexts, { filename, text, uploadedAt: new Date().toISOString() }],
        isSynced: false,
        lastSavedAt: new Date().toISOString(),
      })),
      
      setSynced: (status) => set({ isSynced: status }),
      
      clearLocalData: () => set({ 
        pendingProfiles: [], 
        rawExtractedTexts: [], 
        isSynced: true,
        lastSavedAt: new Date().toISOString()
      }),
    }),
    {
      name: 'local-profile-storage',
      storage: createJSONStorage(() => localStorage),
    }
  )
);
