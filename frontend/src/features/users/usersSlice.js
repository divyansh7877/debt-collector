import { createAsyncThunk, createSlice } from '@reduxjs/toolkit';
import { getUsers, getAnalytics, updateStatus as updateStatusApi } from '../../api/services.js';

const initialState = {
  users: [],
  groups: [],
  analytics: null,
  selectedId: null,
  selectedType: 'user',
  loading: false,
  error: null,
};

export const fetchUsers = createAsyncThunk('users/fetchUsers', async (status) => {
  const res = await getUsers(status);
  return res.data; // array of EntitySummary
});

export const fetchAnalytics = createAsyncThunk('users/fetchAnalytics', async () => {
  const res = await getAnalytics();
  return res.data;
});

export const updateStatus = createAsyncThunk(
  'users/updateStatus',
  async ({ id, status }, { rejectWithValue }) => {
    try {
      const res = await updateStatusApi(id, status);
      return res.data; // { type, data }
    } catch (err) {
      return rejectWithValue(err.response?.data || 'Failed to update status');
    }
  },
);

const usersSlice = createSlice({
  name: 'users',
  initialState,
  reducers: {
    selectEntity(state, action) {
      state.selectedId = action.payload.id;
      state.selectedType = action.payload.type;
    },
    clearSelection(state) {
      state.selectedId = null;
      state.selectedType = 'user';
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchUsers.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchUsers.fulfilled, (state, action) => {
        state.loading = false;
        const entities = action.payload || [];
        state.users = entities.filter((e) => e.type === 'user');
        state.groups = entities.filter((e) => e.type === 'group');
      })
      .addCase(fetchUsers.rejected, (state, action) => {
        state.loading = false;
        state.error = action.error?.message || 'Failed to fetch users';
      })
      .addCase(fetchAnalytics.fulfilled, (state, action) => {
        state.analytics = action.payload;
      })
      .addCase(updateStatus.fulfilled, (state, action) => {
        const payload = action.payload;
        if (!payload) return;
        const { type, data } = payload;
        if (type === 'user') {
          const idx = state.users.findIndex((u) => u.id === data.id);
          if (idx !== -1) {
            state.users[idx] = { ...state.users[idx], status: data.status };
          }
        } else if (type === 'group') {
          const idx = state.groups.findIndex((g) => g.id === data.id);
          if (idx !== -1) {
            state.groups[idx] = { ...state.groups[idx], status: data.status };
          }
        }
      });
  },
});

export const { selectEntity, clearSelection } = usersSlice.actions;

export default usersSlice.reducer;
