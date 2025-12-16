import { transactionService } from "../services/transaction";

// Trustline Operations
export const addTrustline = async (req: any, res: any) => {
  const response = await transactionService.addTrustline(req);
  return res.status(response.status).json(response);
};

export const removeTrustline = async (req: any, res: any) => {
  const response = await transactionService.removeTrustline(req);
  return res.status(response.status).json(response);
};

// Payment Operations
export const paymentPreview = async (req: any, res: any) => {
  const response = await transactionService.paymentPreview(req);
  return res.status(response.status).json(response);
};

export const payment = async (req: any, res: any) => {
  const response = await transactionService.payment(req);
  return res.status(response.status).json(response);
};

// Swap Operations
export const swapPreview = async (req: any, res: any) => {
  const response = await transactionService.swapPreview(req);
  return res.status(response.status).json(response);
};

export const swap = async (req: any, res: any) => {
  const response = await transactionService.swap(req);
  return res.status(response.status).json(response);
};

// Strict Send Operations
export const strictSendPreview = async (req: any, res: any) => {
  const response = await transactionService.strictSendPreview(req);
  return res.status(response.status).json(response);
};

export const strictSend = async (req: any, res: any) => {
  const response = await transactionService.strictSend(req);
  return res.status(response.status).json(response);
};

// Strict Receive Operations
export const strictReceivePreview = async (req: any, res: any) => {
  const response = await transactionService.strictReceivePreview(req);
  return res.status(response.status).json(response);
};

export const strictReceive = async (req: any, res: any) => {
  const response = await transactionService.strictReceive(req);
  return res.status(response.status).json(response);
};

// Transaction History
export const getTransactions = async (req: any, res: any) => {
  const response = await transactionService.getTransactions(req);
  return res.status(response.status).json(response);
};

export const getFiatTransactions = async (req: any, res: any) => {
  const response = await transactionService.getFiatTransactions(req);
  return res.status(response.status).json(response);
};
