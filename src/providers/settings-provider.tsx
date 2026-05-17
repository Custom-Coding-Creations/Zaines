/**
 * Settings Context Provider
 * Manages dynamic site settings with real-time updates across the entire application
 * Uses React Query for efficient caching and automatic invalidation
 */

'use client';

import React, { createContext, useContext } from 'react';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import type { AdminSettings } from '@/types/admin';
import { fullSettingsDefaults } from '@/lib/config/admin-settings-defaults';
import { safeJsonResponse } from '@/lib/safe-json-response';

interface SettingsContextType {
  settings: AdminSettings | undefined;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

const SETTINGS_QUERY_KEY = ['settings'];

/**
 * Default settings fallback (imported from centralized defaults)
 */
function getDefaultSettings(): AdminSettings {
  return fullSettingsDefaults as AdminSettings;
}

/**
 * Fetch settings from the API
 */
async function fetchSettings(): Promise<AdminSettings> {
  try {
    const response = await fetch('/api/settings', {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
      cache: 'no-store', // Don't use Next.js cache
    });

    if (!response.ok) {
      throw new Error(`Failed to fetch settings: ${response.status}`);
    }

    const data = await safeJsonResponse<{
      success?: boolean;
      data?: AdminSettings;
    }>(response, {});

    return data.data || getDefaultSettings();
  } catch (error) {
    console.error('Error fetching settings:', error);
    return getDefaultSettings();
  }
}

interface SettingsProviderProps {
  children: React.ReactNode;
}

/**
 * Provider component - wrap your app with this
 */
export function SettingsProvider({ children }: SettingsProviderProps) {
  const {
    data: settings,
    isLoading,
    error,
    refetch,
  } = useQuery({
    queryKey: SETTINGS_QUERY_KEY,
    queryFn: fetchSettings,
    staleTime: 60 * 1000, // 1 minute
    gcTime: 10 * 60 * 1000, // 10 minutes (formerly cacheTime)
    refetchOnWindowFocus: true, // Refetch when window regains focus
    retry: 3,
  });

  const value: SettingsContextType = {
    settings: settings || getDefaultSettings(),
    isLoading,
    error: error instanceof Error ? error : null,
    refetch: async () => {
      await refetch();
    },
  };

  return (
    <SettingsContext.Provider value={value}>{children}</SettingsContext.Provider>
  );
}

/**
 * Hook to use settings throughout the app
 * Automatically subscribes to cache updates
 */
export function useSettings(): SettingsContextType {
  const context = useContext(SettingsContext);

  if (!context) {
    throw new Error('useSettings must be used within SettingsProvider');
  }

  return context;
}

/**
 * Hook to invalidate settings cache (call after updating settings)
 */
export function useInvalidateSettings() {
  const queryClient = useQueryClient();

  return {
    invalidate: async () => {
      await queryClient.invalidateQueries({
        queryKey: SETTINGS_QUERY_KEY,
      });
    },
    reset: () => {
      queryClient.resetQueries({
        queryKey: SETTINGS_QUERY_KEY,
      });
    },
  };
}
