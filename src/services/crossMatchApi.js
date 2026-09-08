import { dataApi } from '../utils/api';
import {
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  getCompatibilityDetails,
  calculateMatchScore
} from '../utils/bloodCompatibility';

export const crossMatchApi = {
  /**
   * Search compatible blood across nearby blood banks
   */
  async crossMatchBlood(data) {
    return dataApi.crossMatchBlood(data);
  },

  /**
   * Search compatible volunteer donors
   */
  async getNearbyDonors(params) {
    return dataApi.crossMatchDonors(params);
  },

  /**
   * Get compatibility details for a group and component
   */
  async getCompatibility(bloodGroup, component = 'RBC') {
    return dataApi.getBloodCompatibility(bloodGroup, component);
  },

  /**
   * Synchronous local calculations
   */
  getCompatibleDonorGroups,
  getCompatibleRecipientGroups,
  isCompatible,
  getCompatibilityDetails,
  calculateMatchScore
};
