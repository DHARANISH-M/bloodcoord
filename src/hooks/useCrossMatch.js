import { useState, useCallback } from 'react';
import { crossMatchApi } from '../services/crossMatchApi';

export function useCrossMatch(hospitalUser = null) {
  const [bloodResults, setBloodResults] = useState(null);
  const [donorResults, setDonorResults] = useState(null);
  const [compatibilityInfo, setCompatibilityInfo] = useState(null);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [status, setStatus] = useState('idle'); // 'idle' | 'loading' | 'success' | 'empty' | 'error'

  const searchBloodMatches = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setStatus('loading');
    try {
      const payload = {
        hospitalId: hospitalUser?.profileId || hospitalUser?.id,
        recipientBloodGroup: params.recipientBloodGroup || params.bloodGroup || 'A+',
        componentType: params.componentType || params.component || 'RBC',
        unitsNeeded: parseInt(params.unitsNeeded || params.units) || 1,
        radiusKm: parseFloat(params.radiusKm || params.radius) || 25,
        urgency: params.urgency || 'routine'
      };

      const result = await crossMatchApi.crossMatchBlood(payload);
      setBloodResults(result);

      if (!result.banks || result.banks.length === 0) {
        setStatus('empty');
      } else {
        setStatus('success');
      }
      return result;
    } catch (err) {
      console.error('Cross-match blood search error:', err);
      const msg = err.message || 'Failed to perform blood cross-match';
      setError(msg);
      setStatus('error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hospitalUser]);

  const searchDonorMatches = useCallback(async (params) => {
    setLoading(true);
    setError(null);
    setStatus('loading');
    try {
      const query = {
        hospitalId: hospitalUser?.profileId || hospitalUser?.id,
        bloodGroup: params.recipientBloodGroup || params.bloodGroup || 'A+',
        component: params.componentType || params.component || 'RBC',
        radiusKm: parseFloat(params.radiusKm || params.radius) || 25
      };

      const result = await crossMatchApi.getNearbyDonors(query);
      setDonorResults(result);

      if (!result.donors || result.donors.length === 0) {
        setStatus('empty');
      } else {
        setStatus('success');
      }
      return result;
    } catch (err) {
      console.error('Cross-match donor search error:', err);
      const msg = err.message || 'Failed to find compatible donors';
      setError(msg);
      setStatus('error');
      throw err;
    } finally {
      setLoading(false);
    }
  }, [hospitalUser]);

  const getCompatibility = useCallback(async (bloodGroup, component = 'RBC') => {
    try {
      const res = await crossMatchApi.getCompatibility(bloodGroup, component);
      setCompatibilityInfo(res);
      return res;
    } catch (err) {
      console.error('Compatibility lookup error:', err);
      return null;
    }
  }, []);

  const reset = useCallback(() => {
    setBloodResults(null);
    setDonorResults(null);
    setError(null);
    setStatus('idle');
  }, []);

  return {
    bloodResults,
    donorResults,
    compatibilityInfo,
    loading,
    error,
    status,
    searchBloodMatches,
    searchDonorMatches,
    getCompatibility,
    reset
  };
}
