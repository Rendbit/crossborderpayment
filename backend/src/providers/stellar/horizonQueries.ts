import { PUBLIC_ASSETS, TESTNET_ASSETS } from "../../common/assets";
import { WalletHelper } from "../../helpers/wallet.helper";
import { IHorizonProvider } from "../../types/blockchain";

export class StellarHorizonQuery implements IHorizonProvider {
  private horizonUrl: string;

  constructor() {
    this.horizonUrl =
      `${process.env.STELLAR_NETWORK}` === "public"
        ? `${process.env.HORIZON_MAINNET_URL}`
        : `${process.env.HORIZON_TESTNET_URL}`;
  }

  async getAllWalletAssets(publicKey: string): Promise<any> {
    try {
      const url = `${this.horizonUrl}/accounts/${publicKey}`;
      const resp = await fetch(url);

      if (!resp.ok) {
        const errorData = await resp.json();
        throw new Error(errorData.details || "Failed to fetch wallet assets");
      }

      const walletAssets = await resp.json();
      return walletAssets.balances;
    } catch (error: any) {
      throw new Error(`Horizon API error: ${error.message}`);
    }
  }

  async getPath(
    txType: string,
    sourceAssetCode: string,
    desAssetCode: string,
    amount: string
  ): Promise<any> {
    const sourceAssetIssuer =
      `${process.env.STELLAR_NETWORK}` === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS]?.issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS]
            ?.issuer;

    const desAssetIssuer =
      `${process.env.STELLAR_NETWORK}` === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS]?.issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS]?.issuer;

    if (txType === "receive") {
      return await WalletHelper.receivePaymentPath({
        sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode,
        desAssetIssuer,
        amount,
      });
    } else {
      return await WalletHelper.sendPaymentPath({
        sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode,
        desAssetIssuer,
        amount,
      });
    }
  }

  async fetchAssets(
    assetCode: string,
    limit: number,
    page: number
  ): Promise<any> {
    const network = `${process.env.STELLAR_NETWORK}`;
    const url = `https://api.stellar.expert/explorer/${network}/asset?${new URLSearchParams(
      {
        search: assetCode,
        sort: "rating",
        order: "desc",
        limit: String(limit),
        cursor: String(page),
      }
    )}`;

    const resp = await fetch(url);
    if (!resp.ok) {
      throw new Error("Failed to fetch assets from Stellar Expert");
    }

    const json = await resp.json();
    return json._embedded?.records || [];
  }
}
