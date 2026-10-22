/**
 * Quizzle — network status hook.
 *
 * Reports whether the device currently has connectivity so screens can show an
 * offline state instead of failing silently on a request that cannot succeed.
 *
 * Uses @react-native-community/netinfo, which supports web, iOS and Android.
 * It is a native module, so it REQUIRES a development build (not Expo Go on
 * some SDK versions) and MUST be mocked in Jest (see jest.config.js).
 */

import { useEffect, useState } from 'react';
import NetInfo, { type NetInfoState } from '@react-native-community/netinfo';

export type NetworkStatus = {
  /** False only when we have positively determined there is no connection. */
  isConnected: boolean;
  /** Null until the first reachability check resolves. */
  isInternetReachable: boolean | null;
};

export function useNetworkStatus(): NetworkStatus {
  // Start optimistic: assume online until NetInfo says otherwise, so we never
  // show a false "offline" banner on first paint.
  const [status, setStatus] = useState<NetworkStatus>({
    isConnected: true,
    isInternetReachable: null,
  });

  useEffect(() => {
    const unsubscribe = NetInfo.addEventListener((state: NetInfoState) => {
      setStatus({
        isConnected: state.isConnected ?? true,
        isInternetReachable: state.isInternetReachable ?? null,
      });
    });
    return () => unsubscribe();
  }, []);

  return status;
}
