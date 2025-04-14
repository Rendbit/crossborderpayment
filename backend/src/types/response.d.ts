import { Response } from 'express';

declare module 'express' {
  interface Response {
    success<T>(params: {
      data: T;
      message?: string;
      status?: number;
    }): Response<SuccessResponse<T>>;

    error(params: {
      message: string;
      status?: number;
    }): Response<ErrorResponse>;
  }
}

interface SuccessResponse<T> {
  status: number;
  success: true;
  message: string;
  data: T;
}

interface ErrorResponse {
  status: number;
  success: false;
  message: string;
  data: null;
}