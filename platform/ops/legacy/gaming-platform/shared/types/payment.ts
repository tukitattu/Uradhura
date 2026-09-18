import { PaymentGatewayConfig, PaymentOrder } from './superadmin';

export interface PaymentInitiateRequest {
  packageId: string;
  provider: string;
}

export interface PaymentInitiateResponse {
  orderId: string;
  checkoutUrl: string;
  status: string;
}

export interface PaymentValidateReceiptRequest {
  packageId: string;
  receipt: string;
  platform: 'ios' | 'android';
}

export interface PaymentValidateReceiptResponse {
  orderId: string;
  tokensAdded: number;
}
