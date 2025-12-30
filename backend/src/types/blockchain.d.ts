import { Request } from "express";
import { ServiceResponse } from "./response";

export interface IAuthService {
  createWallet(req: Request): Promise<ServiceResponse<WalletData>>;
  fundWithFriendbot(publicKey: string): Promise<ServiceResponse<FriendbotData>>;
  fundAccountPreview(req: Request): Promise<ServiceResponse<FundPreviewData>>;
  fundAccount(req: Request): Promise<ServiceResponse<FundData>>;
  login(req: Request): Promise<ServiceResponse<LoginData>>;
  authorizeRefreshToken(req: Request): Promise<ServiceResponse<TokenData>>;
  requestEmailValidation(
    req: Request
  ): Promise<ServiceResponse<EmailValidationData>>;
  register(req: Request): Promise<ServiceResponse<RegisterData>>;
  validateUser(details: any): Promise<ServiceResponse<ValidateUserData>>;
  forgotPassword(req: Request): Promise<ServiceResponse<ForgotPasswordData>>;
  resendForgotPasswordOTP(
    req: Request
  ): Promise<ServiceResponse<ResendOTPData>>;
  verifyEmail(req: Request): Promise<ServiceResponse<VerifyEmailData>>;
  resendEmailVerificationOTP(
    req: Request
  ): Promise<ServiceResponse<ResendOTPData>>;
  resetPassword(req: Request): Promise<ServiceResponse<ResetPasswordData>>;
}

// Response data interfaces
export interface WalletData {
  account: any;
  publicKey: string;
  token: string;
  refreshToken: string;
}

export interface FriendbotData {
  transactionHash: string;
}

export interface FundPreviewData {
  previewDetails: any;
}

export interface FundData {
  transactionHash: string;
}

export interface LoginData {
  user: any;
  mfaSetup: any;
  token: string;
  refreshToken: string;
}

export interface TokenData {
  user: any;
  token: string;
  refreshToken: string;
}

export interface EmailValidationData {
  success: boolean;
}

export interface RegisterData {
  user: any;
  token: string;
  refreshToken: string;
}

export interface VerifyUserData {
  user: any;
  mfaSetup: any;

}

export interface ValidateUserData {
  user: any;
  mfaSetup: any;
  token: string;
  refreshToken: string;
}

export interface ForgotPasswordData {
  success: boolean;
}

export interface ResendOTPData {
  success: boolean;
}

export interface VerifyEmailData {
  success: boolean;
}

export interface ResetPasswordData {
  success: boolean;
}

export interface IBlockchainAuth {
  createWallet(
    user: any,
    pinCode: string
  ): Promise<{
    publicKey: string;
    secretKey: string;
    encryptedPrivateKey: string;
  }>;

  fundAccountPreview(
    destination: string
  ): Promise<{ status: boolean; balanceError?: string }>;

  fundAccount(
    destination: string,
    amount: string,
    sourceSecretKey: string
  ): Promise<{
    status: boolean;
    data?: any;
    error?: string;
  }>;

  fundWithFriendbot(publicKey: string): Promise<any>;
}

// Transfer Interface (for SEP-24 transfers)
export interface IBlockchainTransfer {
  initiateTransfer(
    user: any,
    txType: string,
    assetCode: string,
    stellarPublicKey: string
  ): Promise<{
    data: any;
    authToken: string;
  }>;

  queryTransfers(
    user: any,
    assetCode: string
  ): Promise<{
    transactions: any[];
  }>;
}

// Horizon Interface (for Horizon API queries)
export interface IBlockchainHorizon {
  getAllWalletAssets(publicKey: string): Promise<any>;
  getPath(
    txType: string,
    sourceAssetCode: string,
    desAssetCode: string,
    amount: string
  ): Promise<any>;
  fetchAssets(assetCode: string, limit: number, page: number): Promise<any>;
}

// Types
export type BlockchainType = "stellar" | "ethereum" | "solana" | "bitcoin";
export type TransferType = "deposit" | "withdrawal";

export interface IBlockchainTransaction {
  addTrustline(user: any, assetCode: string): Promise<any>;
  removeTrustline(user: any, assetCode: string): Promise<any>;
  paymentPreview(params: PaymentPreviewParams): Promise<any>;
  payment(params: PaymentParams): Promise<any>;
  swapPreview(params: SwapPreviewParams): Promise<any>;
  swap(params: SwapParams): Promise<any>;
  strictSendPreview(params: StrictSendParams): Promise<any>;
  strictSend(params: StrictSendParams): Promise<any>;
  strictReceivePreview(params: StrictReceiveParams): Promise<any>;
  strictReceive(params: StrictReceiveParams): Promise<any>;
  getTransactions(params: GetTransactionsParams): Promise<any>;
}

export interface ITransactionService {
  addTrustline(req: Request): Promise<ServiceResponse<TrustlineData>>;
  removeTrustline(req: Request): Promise<ServiceResponse<TrustlineData>>;
  paymentPreview(req: Request): Promise<ServiceResponse<PaymentPreviewData>>;
  payment(req: Request): Promise<ServiceResponse<PaymentData>>;
  swapPreview(req: Request): Promise<ServiceResponse<SwapPreviewData>>;
  swap(req: Request): Promise<ServiceResponse<SwapData>>;
  strictSendPreview(
    req: Request
  ): Promise<ServiceResponse<StrictSendPreviewData>>;
  strictSend(req: Request): Promise<ServiceResponse<StrictSendData>>;
  strictReceivePreview(
    req: Request
  ): Promise<ServiceResponse<StrictReceivePreviewData>>;
  strictReceive(req: Request): Promise<ServiceResponse<StrictReceiveData>>;
  getTransactions(req: Request): Promise<ServiceResponse<TransactionsData>>;
  getFiatTransactions(
    req: Request
  ): Promise<ServiceResponse<FiatTransactionsData>>;
}

// Response data interfaces
export interface TrustlineData {
  transaction: string;
  network: string;
  signedTransaction: any;
  network_passphrase?: string;
}

export interface PaymentPreviewData {
  paymentDetails: any;
  confirmationToken: string;
}

export interface PaymentData {
  hash: string;
}

export interface SwapPreviewData {
  swapDetails: any;
}

export interface SwapData {
  hash: string;
}

export interface StrictSendPreviewData {
  transactionDetails: any;
}

export interface StrictSendData {
  hash: string;
}

export interface StrictReceivePreviewData {
  transactionDetails: any;
}

export interface StrictReceiveData {
  hash: string;
}

export interface TransactionsData {
  paging: {
    next: string | null;
    prev: string | null;
    count: number;
    cursor: string | null;
  };
  transactions: Array<any>;
}

export interface FiatTransactionsData {
  transactions: Array<any>;
  pagination: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

// Add parameter interfaces
export interface PaymentPreviewParams {
  user: any;
  assetCode: string;
  address: string;
  amount: string;
  transactionDetails?: string;
  currencyType?: string;
  accountNumber?: string;
  accountName?: string;
  bankName?: string;
}

export interface PaymentParams extends PaymentPreviewParams {
  pinCode: string;
}

export interface SwapPreviewParams {
  slippage: number;
  sourceAssetCode: string;
  desAssetCode: string;
  sourceAmount: string;
}

export interface SwapParams extends SwapPreviewParams {
  user: any;
  pinCode: string;
}

export interface StrictSendParams {
  user?: any;
  desAddress: string;
  slippage: number;
  assetCode: string;
  amount: string;
  desAmount?: string;
  pinCode?: string;
}

export interface StrictReceiveParams {
  user?: any;
  slippage: number;
  desAddress: string;
  sourceAssetCode: string;
  desAssetCode: string;
  desAmount: string;
  pinCode?: string;
}

export interface GetTransactionsParams {
  user: any;
  cursor?: string;
  limit?: number;
  order?: "asc" | "desc";
}

export interface ITransferProvider {
  initiateTransfer(
    user: any,
    txType: string,
    assetCode: string,
    stellarPublicKey: string
  ): Promise<{
    data: any;
    authToken: string;
  }>;

  queryTransfers(
    user: any,
    assetCode: string
  ): Promise<{
    transactions: any[];
  }>;
}

export type TransferType = "deposit" | "withdrawal";

export interface IStatsProvider {
  fetchTransactionsWithLimit(address: string, limit?: number): Promise<any[]>;

  batchFetchOperations(
    txIds: string[],
    batchSize?: number
  ): Promise<Record<string, any[]>>;

  generateStats(users: Record<string, any>): Promise<{
    totalUsers: number;
    totalTransactions: number;
    latestTransactionTime: string | null;
    operationTypesBreakdown: Record<string, number>;
    transactionsPerDay: { date: string; count: number; addresses: string[] }[];
    userGrowth: { date: string; count: number }[];
    activeUsersLast7Days: number;
  }>;
}

export interface ConversionRequest {
  inputAmount: number;
  inputSymbol: string;
  outputSymbol: string;
}
interface GetConversionRate {
  tokenList: any[];
  currencyType: string;
}

interface GetAllWalletAssets {
  currencyType: string;
}
export interface GetPathRequest {
  txType: string;
  sourceAssetCode: string;
  desAssetCode: string;
  amount: number;
}

export interface IHorizonProvider {
  getAllWalletAssets(publicKey: string): Promise<any>;
  getPath(
    txType: string,
    sourceAssetCode: string,
    desAssetCode: string,
    amount: string
  ): Promise<any>;
  fetchAssets(assetCode: string, limit: number, page: number): Promise<any>;
}

export interface ITransferService {
  initiateTransfer(req: Request): Promise<ServiceResponse<TransferData>>;
  queryTransfers(req: Request): Promise<ServiceResponse<TransferListData>>;
}

// Response data interfaces
export interface TransferData {
  json: any;
  authToken: string;
}

export interface TransferListData {
  transactions: Array<any>;
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface IHorizonService {
  getAllWalletAssets(req: Request): Promise<ServiceResponse<WalletAssetsData>>;
  getPath(req: Request): Promise<ServiceResponse<PathData>>;
  fetchAssets(req: Request): Promise<ServiceResponse<AssetsData>>;
  getConversionRates(req: Request): Promise<ServiceResponse<ConversionData>>;
  getAllTrustLines(req: Request): Promise<ServiceResponse<TrustLinesData>>;
  fetchUserDetailsWithInput(
    req: Request
  ): Promise<ServiceResponse<UserDetailsData>>;
}

// Response data interfaces
export interface WalletAssetsData {
  currencyType: string;
  allWalletTotalBalanceInSelectedCurrency: number;
  allWalletTotalBalanceInUsd: number;
  yieldWalletTotalBalanceInSelectedCurrency: number;
  yieldWalletTotalBalanceInUsd: number;
  nonYieldWalletTotalBalanceInSelectedCurrency: number;
  nonYieldWalletTotalBalanceInUsd: number;
  allWalletAssets: Asset[];
  yieldWalletAssets: Asset[];
  nonYieldWalletAssets: Asset[];
}

export interface Asset {
  asset_code: string;
  asset_name: string;
  asset_issuer: string;
  symbol_id: string;
  balance: number;
  trust_limit: number;
  image: string;
  equivalentBalanceInUsd?: number;
}

export interface PathData {
  paths: any[];
}

export interface AssetsData {
  records: any[];
  pagination?: {
    page: number;
    limit: number;
    total: number;
    totalPages: number;
  };
}

export interface ConversionData {
  inputAmount: number;
  inputSymbol: string;
  outputSymbol: string;
  originalAmount: number;
  convertedAmount: number;
  rate: number;
}

export interface TrustLinesData {
  trustLines: any;
}

export interface UserDetailsData {
  user: {
    userProfileUrl?: string;
    username: string;
    primaryEmail: string;
    country?: string;
    rendbitId?: string;
  };
}
