import { horizonService } from "../services/horizonQueries";

export const getAllWalletAssets = async (req: any, res: any) => {
  const any = await horizonService.getAllWalletAssets(req);
  return res.status(any.status).json(any);
};

export const getPath = async (req: any, res: any) => {
  const any = await horizonService.getPath(req);
  return res.status(any.status).json(any);
};

export const fetchAssets = async (req: any, res: any) => {
  const any = await horizonService.fetchAssets(req);
  return res.status(any.status).json(any);
};

export const getConversionRates = async (req: any, res: any) => {
  const any = await horizonService.getConversionRates(req);
  return res.status(any.status).json(any);
};

export const getAllTrustLines = async (req: any, res: any) => {
  const any = await horizonService.getAllTrustLines();
  return res.status(any.status).json(any);
};

export const fetchUserDetailsWithInput = async (req: any, res: any) => {
  const any = await horizonService.fetchUserDetailsWithInput(req);
  return res.status(any.status).json(any);
};
