import axios, { AxiosRequestConfig, Method } from 'axios';
import { Request, Response, NextFunction } from 'express';
import { logger } from './logger';
import config from '../config';

/**
 * Forwards an incoming Express request to another service using Axios.
 *
 * @param req - The original Express Request object.
 * @param res - The Express Response object.
 * @param next - The Express NextFunction.
 * @param url - The base URL of the target service.
 * @param customPath - Optional path to override the original request path.
 */
export const forwardRequest = async (
  req: Request,
  res: Response,
  next: NextFunction,
  url: string,
  customPath?: string
) => {
  try {
    const { body: data } = req;

    const axiosConfig: AxiosRequestConfig = {
      method: req.method as Method,
      url: `${url}${customPath || req.originalUrl}`,
      headers: {
        'Content-Type': 'application/json',
        'x-api-key': config.internalServiceApiKey,
        'x-admin-id': (req as any).user?.id,
        // Forward original authorization header if available
        ...(req.headers.authorization && { Authorization: req.headers.authorization }),
      },
      data,
    };

    logger.info(`Forwarding Request to URL: ${url} tenant: ${(req as any).tenant || 'N/A'}`);

    const response = await axios(axiosConfig);

    logger.info(`Request Processed Successfully: ${url} tenant: ${(req as any).tenant || 'N/A'}`);

    return res.status(response.status).json(response.data);
  } catch (error: any) {
    logger.error(`Error In URL: ${url}`);

    const responseData = {
      data: {
        message:
          error?.response?.data?.message ||
          error?.response?.data?.error?.error ||
          'something unexpected happen.',
        statustext: error?.response?.statusText || 'something unexpected happen.',
      },
    };

    if (error?.response) {
      // The request was made, but the server responded with an error status code (e.g., 404, 500).
      logger.error('Response Error:', error?.response?.data);
      return res.status(error?.response?.status || 500).json(error?.response?.data || responseData);
    } else if (error?.request) {
      // The request was made, but no response was received.
      logger.error('Request Error:', error?.message);
      return res
        .status(error?.response?.status || 500)
        .json({ message: error?.message || 'Server cannot be reached' });
    } else {
      // Something happened in setting up the request that triggered an error.
      logger.error('Axios Error:', error?.message);
      return res.status(error?.response?.status || 500).json(error?.message);
    }
  }
};
