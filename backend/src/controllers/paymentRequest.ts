import { paymentRequestService } from "../services/paymentRequest";

export const createPaymentRequest = async (req: any, res: any) => {
  const response = await paymentRequestService.createPaymentRequest(req);
  return res.status(response.status).json(response);
};

export const editPaymentRequest = async (req: any, res: any) => {
  const response = await paymentRequestService.editPaymentRequest(req);
  return res.status(response.status).json(response);
};

export const getPaymentRequest = async (req: any, res: any) => {
  const response = await paymentRequestService.getPaymentRequest(req);
  return res.status(response.status).json(response);
};

export const listPaymentRequests = async (req: any, res: any) => {
  const response = await paymentRequestService.listPaymentRequests(req);
  return res.status(response.status).json(response);
};

export const processPaymentRequest = async (req: any, res: any) => {
  const response = await paymentRequestService.processPaymentRequest(req);
  return res.status(response.status).json(response);
};

export const cancelPaymentRequest = async (req: any, res: any) => {
  const response = await paymentRequestService.cancelPaymentRequest(req);
  return res.status(response.status).json(response);
};

export const generatePaymentQRCode = async (req: any, res: any) => {
  const response = await paymentRequestService.generatePaymentQRCode(req);
  return res.status(response.status).json(response);
};

export const validatePaymentLink = async (req: any, res: any) => {
  const response = await paymentRequestService.validatePaymentLink(req);
  return res.status(response.status).json(response);
};
