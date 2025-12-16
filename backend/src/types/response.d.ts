import { Response } from "express";

declare module "express" {
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

export interface ServiceResponse<T> {
  data: T;
  message: string;
  success: boolean;
  status: number;
}

export interface SuccessResponse<T> {
  status: number;
  success: true;
  message: string;
  data: T;
}

export interface ErrorResponse {
  status: number;
  success: false;
  message: string;
  data: null;
}
