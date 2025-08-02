import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { RootState } from '../index';

export interface Category {
  id: string;
  name: string;
  type: 'income' | 'expense';
  color: string;
  icon?: string;
  parent_id?: string;
  subcategories?: Category[];
  created_at: string;
  updated_at: string;
}

interface CategoryState {
  categories: Category[];
  isLoading: boolean;
  error: string | null;
}

const initialState: CategoryState = {
  categories: [],
  isLoading: false,
  error: null,
};

// Fetch all categories
export const fetchCategories = createAsyncThunk(
  'categories/fetchCategories',
  async (_, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.get(`${API_URL}/categories`, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

// Create category
export const createCategory = createAsyncThunk(
  'categories/createCategory',
  async (categoryData: {
    name: string;
    type: 'income' | 'expense';
    color: string;
    icon?: string;
    parent_id?: string;
  }, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.post(`${API_URL}/categories`, categoryData, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

// Update category
export const updateCategory = createAsyncThunk(
  'categories/updateCategory',
  async ({ id, data }: {
    id: string;
    data: {
      name?: string;
      color?: string;
      icon?: string;
      parent_id?: string;
    };
  }, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.put(`${API_URL}/categories/${id}`, data, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

// Delete category
export const deleteCategory = createAsyncThunk(
  'categories/deleteCategory',
  async (id: string, { getState }) => {
    const state = getState() as RootState;
    await axios.delete(`${API_URL}/categories/${id}`, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return id;
  }
);

const categorySlice = createSlice({
  name: 'categories',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch categories
      .addCase(fetchCategories.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchCategories.fulfilled, (state, action) => {
        state.isLoading = false;
        state.categories = action.payload;
      })
      .addCase(fetchCategories.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch categories';
      })
      // Create category
      .addCase(createCategory.fulfilled, (state, action) => {
        // Re-fetch to get updated hierarchy
        state.categories.push(action.payload);
      })
      // Update category
      .addCase(updateCategory.fulfilled, (state, action) => {
        const index = state.categories.findIndex(c => c.id === action.payload.id);
        if (index !== -1) {
          state.categories[index] = action.payload;
        }
      })
      // Delete category
      .addCase(deleteCategory.fulfilled, (state, action) => {
        state.categories = state.categories.filter(c => c.id !== action.payload);
      });
  },
});

export default categorySlice.reducer;