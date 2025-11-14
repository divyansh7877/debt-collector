import { configureStore } from '@reduxjs/toolkit';

import usersReducer from '../features/users/usersSlice.js';
import strategiesReducer from '../features/strategies/strategiesSlice.js';

export const store = configureStore({
  reducer: {
    users: usersReducer,
    strategies: strategiesReducer,
  },
});
