import type { Storage } from 'redux-persist';
import { createMMKV } from 'react-native-mmkv';

const mmkv = createMMKV();

export const reduxStorage: Storage = {
  setItem: (k, v) => {
    mmkv.set(k, v);
    return Promise.resolve(true);
  },
  getItem: (k) => Promise.resolve(mmkv.getString(k) ?? null),
  removeItem: (k) => {
    mmkv.remove(k);
    return Promise.resolve();
  },
};
