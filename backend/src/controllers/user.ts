import { userService } from "../services/user";

export const getUserProfile = async (req: any, res: any): Promise<any> => {
  const result = await userService.getUserProfile(req);
  return res.status(result.status).json(result);
};

export const createPassword = async (req: any, res: any): Promise<any> => {
  const result = await userService.createPassword(req);
  return res.status(result.status).json(result);
};

export const getUserReferrals = async (req: any, res: any): Promise<any> => {
  const result = await userService.getUserReferrals(req);
  return res.status(result.status).json(result);
};

export const getReferralLeaderBoard = async (
  req: any,
  res: any
): Promise<any> => {
  const result = await userService.getReferralLeaderBoard(req);
  return res.status(result.status).json(result);
};

export const updateProfile = async (req: any, res: any): Promise<any> => {
  const result = await userService.updateProfile(req);
  return res.status(result.status).json(result);
};

export const updateProfileImage = async (req: any, res: any): Promise<any> => {
  const result = await userService.updateProfileImage(req);
  return res.status(result.status).json(result);
};

export const changePassword = async (req: any, res: any): Promise<any> => {
  const result = await userService.changePassword(req);
  return res.status(result.status).json(result);
};

export const exportPrivateKey = async (req: any, res: any): Promise<any> => {
  const result = await userService.exportPrivateKey(req);
  return res.status(result.status).json(result);
};
