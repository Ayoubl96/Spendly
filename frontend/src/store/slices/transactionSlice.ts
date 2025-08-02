import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import axios from 'axios';
import { API_URL } from '../../config/constants';
import { RootState } from '../index';

export interface Transaction {
  id: string;
  amount: number;
  currency: string;
  date: string;
  description?: string;
  type: 'income' | 'expense';
  category_id?: string;
  category?: {
    id: string;
    name: string;
    color: string;
    icon?: string;
  };
  recurring: boolean;
  recurring_frequency?: string;
  tags?: string;
  receipt_url?: string;
  created_at: string;
  updated_at: string;
}

export interface TransactionSummary {
  total_income: number;
  total_expenses: number;
  net_amount: number;
  transaction_count: number;
  expense_by_category: { [key: string]: number };
  income_by_category: { [key: string]: number };
}

interface TransactionState {
  transactions: Transaction[];
  summary: TransactionSummary | null;
  isLoading: boolean;
  error: string | null;
  totalCount: number;
}

const initialState: TransactionState = {
  transactions: [],
  summary: null,
  isLoading: false,
  error: null,
  totalCount: 0,
};

export const fetchTransactions = createAsyncThunk(
  'transactions/fetchTransactions',
  async (params: {
    skip?: number;
    limit?: number;
    start_date?: string;
    end_date?: string;
    category_id?: string;
    transaction_type?: 'income' | 'expense';
    search?: string;
  }, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.get(`${API_URL}/transactions`, {
      params,
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

export const fetchTransactionSummary = createAsyncThunk(
  'transactions/fetchSummary',
  async (params: {
    start_date?: string;
    end_date?: string;
  }, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.get(`${API_URL}/transactions/summary`, {
      params,
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

export const createTransaction = createAsyncThunk(
  'transactions/createTransaction',
  async (transactionData: {
    amount: number;
    currency: string;
    date: string;
    description?: string;
    type: 'income' | 'expense';
    category_id?: string;
    recurring: boolean;
    recurring_frequency?: string;
    tags?: string;
  }, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.post(`${API_URL}/transactions`, transactionData, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

export const updateTransaction = createAsyncThunk(
  'transactions/updateTransaction',
  async ({ id, data }: {
    id: string;
    data: Partial<{
      amount: number;
      currency: string;
      date: string;
      description: string;
      type: 'income' | 'expense';
      category_id: string;
      recurring: boolean;
      recurring_frequency: string;
      tags: string;
    }>;
  }, { getState }) => {
    const state = getState() as RootState;
    const response = await axios.put(`${API_URL}/transactions/${id}`, data, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return response.data;
  }
);

export const deleteTransaction = createAsyncThunk(
  'transactions/deleteTransaction',
  async (id: string, { getState }) => {
    const state = getState() as RootState;
    await axios.delete(`${API_URL}/transactions/${id}`, {
      headers: { Authorization: `Bearer ${state.auth.token}` },
    });
    return id;
  }
);

export const importTransactions = createAsyncThunk(
  'transactions/importTransactions',
  async (file: File, { getState }) => {
    const state = getState() as RootState;
    const formData = new FormData();
    formData.append('file', file);
    
    const response = await axios.post(`${API_URL}/transactions/import`, formData, {
      headers: {
        Authorization: `Bearer ${state.auth.token}`,
        'Content-Type': 'multipart/form-data',
      },
    });
    return response.data;
  }
);

const transactionSlice = createSlice({
  name: 'transactions',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      // Fetch transactions
      .addCase(fetchTransactions.pending, (state) => {
        state.isLoading = true;
        state.error = null;
      })
      .addCase(fetchTransactions.fulfilled, (state, action) => {
        state.isLoading = false;
        state.transactions = action.payload;
        state.totalCount = action.payload.length;
      })
      .addCase(fetchTransactions.rejected, (state, action) => {
        state.isLoading = false;
        state.error = action.error.message || 'Failed to fetch transactions';
      })
      // Fetch summary
      .addCase(fetchTransactionSummary.fulfilled, (state, action) => {
        state.summary = action.payload;
      })
      // Create transaction
      .addCase(createTransaction.fulfilled, (state, action) => {
        state.transactions.unshift(action.payload);
        state.totalCount += 1;
      })
      // Update transaction
      .addCase(updateTransaction.fulfilled, (state, action) => {
        const index = state.transactions.findIndex(t => t.id === action.payload.id);
        if (index !== -1) {
          state.transactions[index] = action.payload;
        }
      })
      // Delete transaction
      .addCase(deleteTransaction.fulfilled, (state, action) => {
        state.transactions = state.transactions.filter(t => t.id !== action.payload);
        state.totalCount -= 1;
      })
      // Import transactions
      .addCase(importTransactions.fulfilled, (state, action) => {
        // Refresh transactions after import
        state.error = null;
      });
  },
});

export default transactionSlice.reducer;