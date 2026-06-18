import dotenv from 'dotenv';
import { SignOptions } from 'jsonwebtoken';

dotenv.config();

interface Config {
  port: number;
  nodeEnv: string;
  redis: {
    url: string;
  };
  db: {
    host: string;
    port: number;
    user: string;
    password: string;
    name: string;
    sslMode: string;
    channelBinding: string;
  };
  jwt: {
    secret: string;
    expiresIn: SignOptions['expiresIn'];
    refreshSecret: string;
    refreshExpiresIn: SignOptions['expiresIn'];
  };
  prodURL: string;
  userDriverApiUrl: string;
  userBackendWebhookUrl: string;
  awsServiceUrl: string;
  internalServiceApiKey: string;
  internalServiceSecret: string;
  internalSecret: string;
  email: {
    service: string;
    user: string;
    pass: string;
    from: string;
  };
}

const config: Config = {
  port: Number(process.env.PORT) || 3000,
  nodeEnv: process.env.NODE_ENV || 'development',
  redis: {
    url: process.env.REDIS_URL || '',
  },
  db: {
    host: process.env.DB_HOST || 'localhost',
    port: Number(process.env.DB_PORT) || 5432,
    user: process.env.DB_USER || 'postgres',
    password: process.env.DB_PASSWORD || 'password',
    name: process.env.DB_NAME || 'mydb',
    sslMode: process.env.PGSSLMODE || '',
    channelBinding: process.env.PGCHANNELBINDING || '',
  },
  jwt: {
    secret: process.env.JWT_SECRET || '',
    expiresIn: (process.env.JWT_EXPIRES_IN || '1h') as SignOptions['expiresIn'],
    refreshSecret: process.env.JWT_REFRESH_SECRET || 'refresh-secret',
    refreshExpiresIn: (process.env.JWT_REFRESH_EXPIRES_IN || '7d') as SignOptions['expiresIn'],
  },
  prodURL: process.env.PROD_URL || 'http://localhost:3000',
  userDriverApiUrl: process.env.USER_DRIVER_API_URL || 'http://localhost:5006',
  userBackendWebhookUrl:
    process.env.USER_BACKEND_WEBHOOK_URL || 'http://localhost:5000/webhook/coupon',
  awsServiceUrl: process.env.AWS_SERVICE_URL || 'http://localhost:1235',
  internalServiceApiKey: process.env.INTERNAL_SERVICE_API_KEY || '',
  internalServiceSecret: process.env.INTERNAL_SERVICE_SECRET || '',
  internalSecret: process.env.INTERNAL_SECRET || '',
  email: {
    service: process.env.EMAIL_SERVICE || 'gmail',
    user: process.env.EMAIL_USER || '',
    pass: process.env.EMAIL_PASS || '',
    from: process.env.SMTP_USER || '',
  },
};

export default config;
