import { combineReducers, configureStore } from '@reduxjs/toolkit';
import { useDispatch, useSelector } from 'react-redux';
import {
  FLUSH,
  PAUSE,
  PERSIST,
  persistReducer,
  persistStore,
  PURGE,
  REGISTER,
  REHYDRATE,
} from 'redux-persist';
import autoMergeLevel1 from 'redux-persist/lib/stateReconciler/autoMergeLevel1';
import { setupListeners } from '@reduxjs/toolkit/query';

import { reduxStorage } from './mmkv';
import filtersReducer from './filters-slice';
import { tasksApi } from './tasks-api';
import { chatApi } from './chat-api';

const rootReducer = combineReducers({
  filters: filtersReducer,
  [tasksApi.reducerPath]: tasksApi.reducer,
  [chatApi.reducerPath]: chatApi.reducer,
});

const persistedReducer = persistReducer<ReturnType<typeof rootReducer>>(
  {
    key: 'root',
    storage: reduxStorage,
    whitelist: ['filters', tasksApi.reducerPath],
    stateReconciler: autoMergeLevel1,
  },
  rootReducer
);

export const store = configureStore({
  reducer: persistedReducer,
  middleware: (getDefaultMiddleware) =>
    getDefaultMiddleware({
      serializableCheck: {
        ignoredActions: [FLUSH, REHYDRATE, PAUSE, PERSIST, PURGE, REGISTER],
      },
    }).concat(tasksApi.middleware, chatApi.middleware),
});

export const persistor = persistStore(store);

// Enables refetchOnFocus / refetchOnReconnect via RN AppState.
setupListeners(store.dispatch);

export type RootState = ReturnType<typeof rootReducer>;
export type AppDispatch = typeof store.dispatch;

export const useAppDispatch = () => useDispatch<AppDispatch>();
export const useAppSelector = <T>(selector: (state: RootState) => T): T =>
  useSelector(selector);
