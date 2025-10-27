// API client configuration

import axios, { AxiosError } from 'axios';
import { API_BASE_URL } from '../utils/constants';
import type { ApiError } from '../types';

export const apiClient = axios.create({
  baseURL: API_BASE_URL,
  headers: {
    'Content-Type': 'application/json',
  },
  timeout: 30000, // 30 seconds
});

// Response interceptor for error handling
apiClient.interceptors.response.use(
  (response) => response,
  (error: AxiosError<ApiError>) => {
    const apiError = error.response?.data;

    // Format error for display
    const formattedError: ApiError = {
      error: apiError?.error || 'unknown_error',
      message: apiError?.message || error.message || 'An unexpected error occurred',
      details: apiError?.details,
    };

    console.error('API Error:', formattedError);
    throw formattedError;
  }
);
