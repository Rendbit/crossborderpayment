import { transferService } from "../services/transfer";

export const initiateTransfer = async (req: any, res: any) => {
  const response = await transferService.initiateTransfer(req);
  return res.status(response.status).json(response);
};

export const queryTransfers = async (req: any, res: any) => {
  const response = await transferService.queryTransfers(req);
  return res.status(response.status).json(response);
};
