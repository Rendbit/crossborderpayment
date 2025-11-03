type WalletAsset = {
  asset_code: string; // "NATIVE" | code
  balance: string;
  issuer?: string;
};

const REQUIRED_XLM_BALANCE = import.meta.env.VITE_REQUIRED_XLM_BALANCE;

const formateDecimal = (value: number) => {
  if (!value) return "0";
  const balanceStr = value.toString();
  const decimalIndex = balanceStr.indexOf(".");
  if (decimalIndex === -1) return balanceStr;
  const decimalPlaces = balanceStr.length - decimalIndex - 1;
  if (decimalPlaces >= 2) return String(value.toFixed(2));
  if (decimalPlaces >= 4) return String(value.toFixed(4));
  if (decimalPlaces >= 6) return String(value.toFixed(6));
  return String(value.toFixed(8));
};

const getAssetDisplayName = (assetCode: string): string => {
  if (assetCode === "NATIVE") return "XLM";
  return assetCode?.replace(/c/gi, "");
};
const labelFor = (a?: WalletAsset | null) =>
  a ? (a.asset_code === "NATIVE" ? "XLM" : a.asset_code) : "";

const getMinimumSendAmount = (assetCode: string): number => {
  switch (assetCode) {
    case "XLM":
    case "NATIVE":
      return 5;
    case "NGNC":
      return 100;
    case "GHSC":
      return 1;
    case "KHSC":
      return 10;
    default:
      return 0.0000001;
  }
};

const getMinimumSwapAmount = (assetCode: string): number => {
  switch (assetCode) {
    case "XLM":
    case "NATIVE":
      return 1;
    case "NGNC":
      return 100;
    case "GHSC":
      return 1;
    case "KHSC":
      return 10;
    default:
      return 0.0000001;
  }
};

const getSpendableBalance = (asset: any): number => {
  if (!asset) return 0;

  const balance = Number(asset?.balance);
  if (labelFor(asset) === "XLM") {
    // const minRequired = REQUIRED_XLM_BALANCE ? Number(REQUIRED_XLM_BALANCE) : 3;
    const minRequired = 0;
    return Math.max(0, balance - minRequired);
  }
  return balance;
};
const formatNumberWithCommas = (n: number | string): string =>
  Number(n || 0).toLocaleString();

export {
  formateDecimal,
  getAssetDisplayName,
  labelFor,
  getMinimumSendAmount,
  getMinimumSwapAmount,
  getSpendableBalance,
  formatNumberWithCommas,
};
