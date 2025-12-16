import { mfaService } from "../services/mfa";
export const generateSecret = async (
  req: any,
  res: any
): Promise<any> => {
  const result = await mfaService.generateSecret(req);
  return res.status(result.status).json(result);
};

export const setupMFA = async (req: any, res: any): Promise<any> => {
  const result = await mfaService.setupMFA(req);
  return res.status(result.status).json(result);
};

export const verifyOTP = async (req: any, res: any): Promise<any> => {
  const result = await mfaService.verifyOTP(req);
  return res.status(result.status).json(result);
};

export const getMFASetting = async (
  req: any,
  res: any
): Promise<any> => {
  const result = await mfaService.getMFASetting(req);
  return res.status(result.status).json(result);
};

export const toggleMFASetup = async (
  req: any,
  res: any
): Promise<any> => {
  const result = await mfaService.toggleMFASetup(req);
  return res.status(result.status).json(result);
};
