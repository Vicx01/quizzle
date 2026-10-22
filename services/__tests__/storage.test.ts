/**
 * Quizzle — cross-platform storage tests.
 *
 * Verifies the storage adapter namespaces keys and degrades gracefully.
 * AsyncStorage is mocked in jest.config.js with the package's official mock.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { getItem, setItem, removeItem, STORAGE_KEYS } from '../storage';

describe('storage', () => {
  beforeEach(async () => {
    await AsyncStorage.clear();
  });

  it('namespaces keys with the quizzle prefix', async () => {
    await setItem('theme', 'dark');
    const raw = await AsyncStorage.getItem('quizzle:theme');
    expect(raw).toBe('dark');
  });

  it('round-trips a value', async () => {
    await setItem(STORAGE_KEYS.theme, 'light');
    expect(await getItem(STORAGE_KEYS.theme)).toBe('light');
  });

  it('returns null for a missing key', async () => {
    expect(await getItem('does-not-exist')).toBeNull();
  });

  it('removes a value', async () => {
    await setItem('theme', 'dark');
    await removeItem('theme');
    expect(await getItem('theme')).toBeNull();
  });

  it('does not throw when the underlying store rejects', async () => {
    const spy = jest
      .spyOn(AsyncStorage, 'getItem')
      .mockRejectedValueOnce(new Error('storage unavailable'));
    await expect(getItem('theme')).resolves.toBeNull();
    spy.mockRestore();
  });
});
