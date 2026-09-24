import { useNetInfo } from "@react-native-community/netinfo";

export default function useNetworkStatus() {
  const { isConnected, isInternetReachable } = useNetInfo();
  const isChecking = isConnected === null || isInternetReachable === null;
  const isOffline = isConnected === false || isInternetReachable === false;

  return { isChecking, isOffline };
}
