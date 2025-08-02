import { createSlice } from '@reduxjs/toolkit';

const budgetSlice = createSlice({
  name: 'budgets',
  initialState: {
    budgets: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
});

export default budgetSlice.reducer;