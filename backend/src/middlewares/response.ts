import { Request, Response, NextFunction } from 'express';
import httpStatus from 'http-status';

export const responseMiddleware = (
  req: Request,
  res: Response,
  next: NextFunction
) => {
  // Success response
  res.success = function <T>({
    data,
    message = 'Success',
    status = httpStatus.OK,
  }: {
    data: T;
    message?: string;
    status?: number;
  }) {
    return this.status(status).json({
      status,
      success: true,
      message,
      data,
    });
  };

  // Error response
  res.error = function ({
    message = 'Error',
    status = httpStatus.INTERNAL_SERVER_ERROR,
  }: {
    message: string;
    status?: number;
  }) {
    return this.status(status).json({
      status,
      success: false,
      message,
      data: null,
    });
  };

  next();
};