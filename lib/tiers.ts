// Central source of truth for feature gating (see cymatics-portal-subscription-build.md)

export type UserTier = 'free' | 'trial' | 'pro' | 'creator' | 'lifetime';

export interface TierFeatures {
  maxPresets: number;
  solfeggioFrequencies: string[] | 'all';
  visualModes: string[] | 'all';
  sessionMinutes: number;
  exportWatermark: boolean;
  micInput: boolean;
  customFrequencyInput: boolean;
  videoExport: boolean;
  apiAccess: boolean;
  resolution4k: boolean;
  embedWidget: boolean;
  saveConfigs: boolean;
  maxSavedConfigs: number;
  customColourPalettes: boolean;
  commercialLicence: boolean;
}

/** Preset row indices in the portal IIFE `PRESETS` array: 0 placeholder, 5 = 432 Hz, 6 = 528 Hz */
export const FREE_PRESET_INDICES = [0, 5, 6] as const;

export function getAllowedPresetIndices(tier: UserTier): number[] | null {
  if (tier === 'free') return [...FREE_PRESET_INDICES];
  return null;
}

export const FREE_SOLFEGGIO: string[] = ['432', '528'];
/**
 * Iframe `aggressionSel` values for the free (and anonymous) tier: Julia-only preview;
 * Balanced, Mandelbrot, mic, custom Hz, and extra presets require sign-up / upgrade.
 */
export const FREE_VISUAL_MODES: string[] = ['fractalJulia'];

export const TIER_FEATURES: Record<UserTier, TierFeatures> = {
  free: {
    maxPresets: 3,
    solfeggioFrequencies: FREE_SOLFEGGIO,
    visualModes: FREE_VISUAL_MODES,
    sessionMinutes: 15,
    exportWatermark: true,
    micInput: false,
    customFrequencyInput: false,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: false,
    maxSavedConfigs: 0,
    customColourPalettes: false,
    commercialLicence: false,
  },
  trial: {
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: true,
    maxSavedConfigs: 5,
    customColourPalettes: false,
    commercialLicence: false,
  },
  pro: {
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: true,
    maxSavedConfigs: 20,
    customColourPalettes: false,
    commercialLicence: false,
  },
  creator: {
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: true,
    apiAccess: true,
    resolution4k: true,
    embedWidget: true,
    saveConfigs: true,
    maxSavedConfigs: Infinity,
    customColourPalettes: true,
    commercialLicence: true,
  },
  lifetime: {
    maxPresets: Infinity,
    solfeggioFrequencies: 'all',
    visualModes: 'all',
    sessionMinutes: Infinity,
    exportWatermark: false,
    micInput: true,
    customFrequencyInput: true,
    videoExport: false,
    apiAccess: false,
    resolution4k: false,
    embedWidget: false,
    saveConfigs: true,
    maxSavedConfigs: 20,
    customColourPalettes: false,
    commercialLicence: false,
  },
} as const;

export function resolveEffectiveTier(
  tier: UserTier,
  trialExpiresAt: string | null
): UserTier {
  if (tier === 'trial' && trialExpiresAt) {
    const expired = new Date(trialExpiresAt) < new Date();
    /* Legacy 7-day rows: after expiry treat as full access (aligned with current signup policy). */
    if (expired) return 'pro';
  }
  return tier;
}

export function getFeaturesForTier(tier: UserTier): TierFeatures {
  return TIER_FEATURES[tier];
}

/** JSON/postMessage-safe copy: `Infinity` → `null` (unlimited). */
export type TierFeaturesMessage = {
  maxPresets: number | null;
  solfeggioFrequencies: string[] | 'all';
  visualModes: string[] | 'all';
  sessionMinutes: number | null;
  exportWatermark: boolean;
  micInput: boolean;
  customFrequencyInput: boolean;
  videoExport: boolean;
  apiAccess: boolean;
  resolution4k: boolean;
  embedWidget: boolean;
  saveConfigs: boolean;
  maxSavedConfigs: number | null;
  customColourPalettes: boolean;
  commercialLicence: boolean;
};

export function tierFeaturesToMessage(tier: UserTier): TierFeaturesMessage {
  const f = getFeaturesForTier(tier);
  return {
    maxPresets: f.maxPresets === Infinity ? null : f.maxPresets,
    solfeggioFrequencies: f.solfeggioFrequencies,
    visualModes: f.visualModes,
    sessionMinutes: f.sessionMinutes === Infinity ? null : f.sessionMinutes,
    exportWatermark: f.exportWatermark,
    micInput: f.micInput,
    customFrequencyInput: f.customFrequencyInput,
    videoExport: f.videoExport,
    apiAccess: f.apiAccess,
    resolution4k: f.resolution4k,
    embedWidget: f.embedWidget,
    saveConfigs: f.saveConfigs,
    maxSavedConfigs: f.maxSavedConfigs === Infinity ? null : f.maxSavedConfigs,
    customColourPalettes: f.customColourPalettes,
    commercialLicence: f.commercialLicence,
  };
}

export function hasFeature(
  tier: UserTier,
  feature: keyof TierFeatures
): boolean {
  const features = TIER_FEATURES[tier];
  const value = features[feature];
  if (typeof value === 'boolean') return value;
  if (typeof value === 'number') return value > 0;
  if (value === 'all') return true;
  if (Array.isArray(value)) return value.length > 0;
  return false;
}

export function isVisualModeAvailable(
  tier: UserTier,
  modeId: string
): boolean {
  const modes = TIER_FEATURES[tier].visualModes;
  if (modes === 'all') return true;
  return modes.includes(modeId);
}

/** PostMessage: `null` = all visual modes; otherwise explicit allow-list for `aggressionSel`. */
export function getAllowedAggressionValuesForMessage(
  tier: UserTier,
  isDev: boolean
): string[] | null {
  if (isDev) return null;
  const vm = TIER_FEATURES[tier].visualModes;
  if (vm === 'all') return null;
  return [...vm];
}

export function isFrequencyAvailable(
  tier: UserTier,
  frequencyHz: string
): boolean {
  const freqs = TIER_FEATURES[tier].solfeggioFrequencies;
  if (freqs === 'all') return true;
  return freqs.includes(frequencyHz);
}

export function trialDaysRemaining(trialExpiresAt: string | null): number {
  if (!trialExpiresAt) return 0;
  const diff = new Date(trialExpiresAt).getTime() - Date.now();
  return Math.max(0, Math.ceil(diff / (1000 * 60 * 60 * 24)));
}
