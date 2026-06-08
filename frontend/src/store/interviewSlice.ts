import { createSlice, createAsyncThunk } from '@reduxjs/toolkit';
import type { PayloadAction } from '@reduxjs/toolkit';
import axios from 'axios';

// Type definitions
export interface AudioAnalysis {
  analysisId: string;
  sessionId: string;
  speechRate: number;
  pauseCount: number;
  pitchScore: number;
  fillerCount: number;
  emotionScore: string; // Stored JSON or primary emotion name
  confidenceScore: number;
}

export interface Report {
  reportId: string;
  sessionId: string;
  generatedAt: string;
  feedback: string;
  recommendations: string; // Newline-separated string
}

export interface InterviewSession {
  sessionId: string;
  userId: string;
  date: string;
  questionSet: string;
  overallScore: number;
  audioAnalyses: AudioAnalysis[];
  report: Report | null;
}

interface InterviewState {
  currentSession: InterviewSession | null;
  history: InterviewSession[];
  loading: boolean;
  error: string | null;
}

const initialState: InterviewState = {
  currentSession: null,
  history: [],
  loading: false,
  error: null,
};

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL || 'http://localhost:5094/api'; // .NET Core Web API Default Port

// Thunks
export const uploadAudioResponse = createAsyncThunk(
  'interview/uploadAudio',
  async (
    { userId, question, audioBlob, fileExtension }: { userId: string; question: string; audioBlob: Blob; fileExtension: string },
    { rejectWithValue }
  ) => {
    try {
      const formData = new FormData();
      formData.append('userId', userId);
      formData.append('question', question);
      
      // Create valid file name (e.g. recording.webm)
      const filename = `recording.${fileExtension.replace('.', '')}`;
      formData.append('file', audioBlob, filename);

      const response = await axios.post(`${API_BASE_URL}/sessions/upload`, formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
        },
      });

      return response.data as InterviewSession;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to analyze recording';
      return rejectWithValue(message);
    }
  }
);

export const fetchSessionDetails = createAsyncThunk(
  'interview/fetchSession',
  async (sessionId: string, { rejectWithValue }) => {
    try {
      const response = await axios.get(`${API_BASE_URL}/sessions/${sessionId}`);
      return response.data as InterviewSession;
    } catch (err: any) {
      const message = err.response?.data?.message || 'Failed to fetch session results';
      return rejectWithValue(message);
    }
  }
);

const interviewSlice = createSlice({
  name: 'interview',
  initialState,
  reducers: {
    clearCurrentSession: (state) => {
      state.currentSession = null;
    },
    clearInterviewError: (state) => {
      state.error = null;
    }
  },
  extraReducers: (builder) => {
    builder
      // uploadAudioResponse
      .addCase(uploadAudioResponse.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(uploadAudioResponse.fulfilled, (state, action: PayloadAction<InterviewSession>) => {
        state.loading = false;
        state.currentSession = action.payload;
        state.history = [action.payload, ...state.history];
      })
      .addCase(uploadAudioResponse.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      })
      
      // fetchSessionDetails
      .addCase(fetchSessionDetails.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchSessionDetails.fulfilled, (state, action: PayloadAction<InterviewSession>) => {
        state.loading = false;
        state.currentSession = action.payload;
      })
      .addCase(fetchSessionDetails.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload as string;
      });
  },
});

export const { clearCurrentSession, clearInterviewError } = interviewSlice.actions;
export default interviewSlice.reducer;
