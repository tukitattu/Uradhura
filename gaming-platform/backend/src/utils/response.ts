import { Response } from 'express';
import { v4 as uuidv4 } from 'uuid';

export interface ApiResponse<T = unknown> {
  success: boolean;
  code: string;
  message: string;
  data?: T;
  serverTime: string;
  requestId: string;
}

export function sendSuccess<T>(
  res: Response,
  data: T,
  message = 'OK',
  statusCode = 200,
  requestId?: string
): Response {
  const response: ApiResponse<T> = {
    success: true,
    code: 'SUCCESS',
    message,
    data,
    serverTime: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
  return res.status(statusCode).json(response);
}

export function sendError(
  res: Response,
  message: string,
  code = 'ERROR',
  statusCode = 400,
  requestId?: string
): Response {
  const response: ApiResponse = {
    success: false,
    code,
    message,
    serverTime: new Date().toISOString(),
    requestId: requestId || uuidv4(),
  };
  return res.status(statusCode).json(response);
}
