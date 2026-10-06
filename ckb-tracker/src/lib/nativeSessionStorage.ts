import { Capacitor } from '@capacitor/core';
import { KeychainAccess, SecureStorage } from '@aparajita/capacitor-secure-storage';

const ACCESS_TOKEN_KEY = 'access_token';
const REFRESH_TOKEN_KEY = 'refresh_token';

export interface NativeSessionTokens {
  accessToken: string;
  refreshToken: string;
}

let nativeAccessToken: string | null = null;

export function isNativeApp(): boolean {
  return Capacitor.isNativePlatform();
}

export async function saveNativeSession(tokens: NativeSessionTokens): Promise<void> {
  if (!isNativeApp()) return;

  await SecureStorage.setDefaultKeychainAccess(KeychainAccess.whenPasscodeSetThisDeviceOnly);
  await SecureStorage.set(ACCESS_TOKEN_KEY, tokens.accessToken);
  await SecureStorage.set(REFRESH_TOKEN_KEY, tokens.refreshToken);
  nativeAccessToken = tokens.accessToken;
}

export async function loadNativeSession(): Promise<NativeSessionTokens | null> {
  if (!isNativeApp()) return null;

  const [accessToken, refreshToken] = await Promise.all([
    SecureStorage.getItem(ACCESS_TOKEN_KEY),
    SecureStorage.getItem(REFRESH_TOKEN_KEY),
  ]);

  if (!accessToken || !refreshToken) {
    nativeAccessToken = null;
    return null;
  }
  nativeAccessToken = accessToken;
  return { accessToken, refreshToken };
}

export async function clearNativeSession(): Promise<void> {
  if (!isNativeApp()) return;

  nativeAccessToken = null;
  await Promise.all([
    SecureStorage.remove(ACCESS_TOKEN_KEY),
    SecureStorage.remove(REFRESH_TOKEN_KEY),
  ]);
}

export function getNativeAccessToken(): string | null {
  return nativeAccessToken;
}

export function setNativeAccessToken(token: string | null): void {
  nativeAccessToken = token;
}
