/**
 * PMS Extensions
 *
 * Exports for all PMS (Property Management System) provider extensions.
 *
 * @module extensions/pms
 */

import type { PMSExtensionManifest } from '../types.js';

// Providers
export { MockPMSAdapter, createMockPMSAdapter, mockManifest } from './providers/index.js';

// Import manifests for registry
import { mockManifest } from './providers/index.js';

/**
 * PMS provider types
 */
export type PMSProviderType = 'mock' | 'mews' | 'cloudbeds' | 'opera' | 'apaleo';

/**
 * All registered PMS extension manifests
 */
export const pmsManifests: Record<string, PMSExtensionManifest> = {
  'pms-mock': mockManifest,
  // Future: mews, cloudbeds, opera, apaleo
};

/**
 * Get all PMS extension manifests
 */
export function getPMSManifests(): PMSExtensionManifest[] {
  return Object.values(pmsManifests);
}

/**
 * Get a specific PMS extension manifest
 */
export function getPMSManifest(id: string): PMSExtensionManifest | undefined {
  return pmsManifests[id];
}
