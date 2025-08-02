import { createSlice } from '@reduxjs/toolkit';

const assetSlice = createSlice({
  name: 'assets',
  initialState: {
    assets: [],
    isLoading: false,
    error: null,
  },
  reducers: {},
});

export default assetSlice.reducer;