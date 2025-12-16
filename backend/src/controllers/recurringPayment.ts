import { recurringPaymentService } from "../services/recurringPayment";

export const createRecurringPayment = async (req: any, res: any) => {
  const response = await recurringPaymentService.createRecurringPayment(req);
  return res.status(response.status).json(response);
};

export const getRecurringPayment = async (req: any, res: any) => {
  const response = await recurringPaymentService.getRecurringPayment(req);
  return res.status(response.status).json(response);
};

export const listRecurringPayments = async (req: any, res: any) => {
  const response = await recurringPaymentService.listRecurringPayments(req);
  return res.status(response.status).json(response);
};

export const cancelRecurringPayment = async (req: any, res: any) => {
  const response = await recurringPaymentService.cancelRecurringPayment(req);
  return res.status(response.status).json(response);
};

export const processRecurringPayment = async (req: any, res: any) => {
  const response = await recurringPaymentService.processRecurringPayment(req);
  return res.status(response.status).json(response);
};
