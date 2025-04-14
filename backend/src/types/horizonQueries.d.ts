interface ConversionRequest {
  inputAmount: number;
  symbol: string;
}
interface GetConversionRate {
  tokenList: any[];
  currencyType: string;
}

interface GetAllWalletAssets {
  currencyType: string;
}
interface GetPathRequest {
  txType: string;
  sourceAssetCode: string;
  desAssetCode: string;
  amount: number;
}
