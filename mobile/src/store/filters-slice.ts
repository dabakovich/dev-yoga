import { createSlice, PayloadAction } from '@reduxjs/toolkit';

import type { SortBy, SortOrder, TaskStatus } from '@/utils/api';

interface FiltersState {
  status: TaskStatus | null;
  sortBy: SortBy;
  sortOrder: SortOrder;
}

const initialState: FiltersState = {
  status: null,
  sortBy: 'priority',
  sortOrder: 'desc',
};

const filtersSlice = createSlice({
  name: 'filters',
  initialState,
  reducers: {
    setStatus(state, action: PayloadAction<TaskStatus | null>) {
      state.status = action.payload;
    },
    setSort(
      state,
      action: PayloadAction<{ sortBy?: SortBy; sortOrder?: SortOrder }>
    ) {
      if (action.payload.sortBy !== undefined) state.sortBy = action.payload.sortBy;
      if (action.payload.sortOrder !== undefined) state.sortOrder = action.payload.sortOrder;
    },
  },
});

export const { setStatus, setSort } = filtersSlice.actions;
export default filtersSlice.reducer;

type StateWithFilters = { filters: FiltersState };

export const selectFilters = (state: StateWithFilters) => state.filters;
export const selectStatus = (state: StateWithFilters) => state.filters.status;
export const selectSort = (state: StateWithFilters) => ({
  sortBy: state.filters.sortBy,
  sortOrder: state.filters.sortOrder,
});
