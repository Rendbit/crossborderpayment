import { Sep10Helper } from "../../helpers/sep10.helper";
import { Sep1Helper } from "../../helpers/sep1.helper";
import { ITransferProvider } from "../../types/blockchain";

export class StellarSEP24 implements ITransferProvider {
  async initiateTransfer(
    user: any,
    txType: string,
    assetCode: string,
    stellarPublicKey: string
  ): Promise<{
    data: any;
    authToken: string;
  }> {
    const [authToken, { TRANSFER_SERVER_SEP0024 }] = await Promise.all([
      Sep10Helper.getChallengeTransaction(user),
      Sep1Helper.fetchStellarToml(),
    ]);

    const resp = await fetch(
      `${TRANSFER_SERVER_SEP0024}/transactions/${txType}/interactive`,
      {
        method: "POST",
        mode: "cors",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
        body: JSON.stringify({
          asset_code: assetCode,
          account: stellarPublicKey,
        }),
      }
    );

    const json = await resp.json();

    if (!resp.ok) {
      throw new Error(`${json.error}`);
    }

    return {
      data: json,
      authToken,
    };
  }

  async queryTransfers(
    user: any,
    assetCode: string
  ): Promise<{
    transactions: any[];
  }> {
    const [authToken, { TRANSFER_SERVER_SEP0024 }] = await Promise.all([
      Sep10Helper.getChallengeTransaction(user),
      Sep1Helper.fetchStellarToml(),
    ]);

    const resp = await fetch(
      `${TRANSFER_SERVER_SEP0024}/transactions?${new URLSearchParams({
        asset_code: assetCode,
      })}`,
      {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${authToken}`,
        },
      }
    );

    const json: any = await resp.json();

    if (!resp.ok) {
      console.log(json);
      throw new Error(json.error || "Failed to query transaction.");
    }

    return {
      transactions: json.transactions,
    };
  }
}
