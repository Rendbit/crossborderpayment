import { authService } from "../services/auth";

// Wallet Operations
export const createWallet = async (req: any, res: any) => {
  const response = await authService.createWallet(req);
  return res.status(response.status).json(response);
};

export const fundWithFriendbot = async (req: any, res: any) => {
  const { publicKey } = req.params;
  const response = await authService.fundWithFriendbot(publicKey);
  return res.status(response.status).json(response);
};

export const fundAccountPreview = async (req: any, res: any) => {
  const response = await authService.fundAccountPreview(req);
  return res.status(response.status).json(response);
};

export const fundAccount = async (req: any, res: any) => {
  const response = await authService.fundAccount(req);
  return res.status(response.status).json(response);
};

// Authentication Operations
export const login = async (req: any, res: any) => {
  const response = await authService.login(req);
  return res.status(response.status).json(response);
};

export const authorizeRefreshToken = async (req: any, res: any) => {
  const response = await authService.authorizeRefreshToken(req);
  return res.status(response.status).json(response);
};

export const requestEmailValidation = async (req: any, res: any) => {
  const response = await authService.requestEmailValidation(req);
  return res.status(response.status).json(response);
};

export const register = async (req: any, res: any) => {
  const response = await authService.register(req);
  return res.status(response.status).json(response);
};

export const validateUser = async (req: any, res: any) => {
  const response = await authService.validateUser(req.body);
  return res.status(response.status).json(response);
};

export const forgotPassword = async (req: any, res: any) => {
  const response = await authService.forgotPassword(req);
  return res.status(response.status).json(response);
};

export const resendForgotPasswordOTP = async (req: any, res: any) => {
  const response = await authService.resendForgotPasswordOTP(req);
  return res.status(response.status).json(response);
};

export const verifyEmail = async (req: any, res: any) => {
  const response = await authService.verifyEmail(req);
  return res.status(response.status).json(response);
};

export const resendEmailVerificationOTP = async (
  req: any,
  res: any
) => {
  const response = await authService.resendEmailVerificationOTP(req);
  return res.status(response.status).json(response);
};

export const resetPassword = async (req: any, res: any) => {
  const response = await authService.resetPassword(req);
  return res.status(response.status).json(response);
};
