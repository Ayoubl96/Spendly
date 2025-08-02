import { createSlice } from '@reduxjs/toolkit';

const analyticsSlice = createSlice({
  name: 'analytics',
  initialState: {
    summary: null,
    isLoading: false,
    error: null,
  },
  reducers: {},
});

export default analyticsSlice.reducer;