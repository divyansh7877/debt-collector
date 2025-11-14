import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import {
  getStrategy as getStrategyApi,
  updateStrategy as updateStrategyApi,
  aiGenerate as aiGenerateApi,
  executeStrategy as executeStrategyApi,
} from '../../api/services.js';

const initialState = {
  strategies: {}, // keyed by userId
  loading: false,
  error: null,
};

export const fetchStrategy = createAsyncThunk('strategies/fetchStrategy', async (userId) => {
  const res = await getStrategyApi(userId);
  return { userId, strategy: res.data };
});

export const updateStrategy = createAsyncThunk(
  'strategies/updateStrategy',
  async ({ userId, timeline, prompt }, { rejectWithValue }) => {
    try {
      const res = await updateStrategyApi(userId, { timeline, prompt });
      return { userId, strategy: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Failed to update strategy');
    }
  },
);

export const aiGenerate = createAsyncThunk(
  'strategies/aiGenerate',
  async ({ userId, prompt }, { rejectWithValue }) => {
    try {
      const res = await aiGenerateApi(userId, prompt);
      return { userId, strategy: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Failed to generate strategy');
    }
  },
);

export const execute = createAsyncThunk(
  'strategies/execute',
  async (userId, { rejectWithValue }) => {
    try {
      const res = await executeStrategyApi(userId);
      return { userId, result: res.data };
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Failed to execute strategy');
    }
  },
);

const strategiesSlice = createSlice({
  name: 'strategies',
  initialState,
  reducers: {},
  extraReducers: (builder) => {
    builder
      .addCase(fetchStrategy.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchStrategy.fulfilled, (state, action) => {
        state.loading = false;
        const { userId, strategy } = action.payload;
        if (strategy) {
          state.strategies[userId] = strategy;
        }
      })
      .addCase(fetchStrategy.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch strategy';
      })
      .addCase(updateStrategy.fulfilled, (state, action) => {
        const { userId, strategy } = action.payload;
        state.strategies[userId] = strategy;
      })
      .addCase(aiGenerate.fulfilled, (state, action) => {
        const { userId, strategy } = action.payload;
        state.strategies[userId] = strategy;
      })
      .addCase(execute.fulfilled, (state, action) => {
        const { userId } = action.payload;
        if (state.strategies[userId]) {
          state.strategies[userId].executed = true;
        }
      });
  },
});

export default strategiesSlice.reducer;
