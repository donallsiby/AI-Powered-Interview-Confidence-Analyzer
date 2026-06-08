import { configureStore } from '@reduxjs/toolkit';
import authReducer from './authSlice';
import interviewReducer from './interviewSlice';

export const store = configureStore({
  reducer: {
    auth: authReducer,
    interview: interviewReducer,
  },
});

export type RootState = ReturnType<typeof store.getState>;
export type AppDispatch = typeof store.dispatch;
