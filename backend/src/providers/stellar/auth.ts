import {
  Asset,
  Horizon,
  Keypair,
  Networks,
  Operation,
  TransactionBuilder,
} from "stellar-sdk";
import { IBlockchainAuth } from "../../types/blockchain";

export class StellarAuth implements IBlockchainAuth {
  private server: Horizon.Server;
  private networkPassphrase: string;

  constructor() {
    const isPublic = `${process.env.STELLAR_NETWORK}` === "public";
    this.server = new Horizon.Server(
      isPublic
        ? `${process.env.STELLAR_PUBLIC_SERVER}`
        : `${process.env.STELLAR_TESTNET_SERVER}`
    );
    this.networkPassphrase = isPublic ? Networks.PUBLIC : Networks.TESTNET;
  }

  async createWallet(
    user: any,
    pinCode: string
  ): Promise<{
    publicKey: string;
    secretKey: string;
    encryptedPrivateKey: string;
  }> {
    const keypair = Keypair.random();
    const {
      WalletEncryption,
    } = require("../../helpers/encryption-decryption.helper");
    const hashedPasword = user.password;

    return {
      publicKey: keypair.publicKey(),
      secretKey: keypair.secret(),
      encryptedPrivateKey: WalletEncryption.encryptPrivateKey(
        keypair.secret(),
        `${user.primaryEmail}${hashedPasword}${pinCode}`
      ),
    };
  }

  async fundAccountPreview(
    destination: string
  ): Promise<{ status: boolean; balanceError?: string }> {
    let balanceError = "";
    try {
      let destinationExists = true;
      try {
        await this.server.loadAccount(destination);
      } catch (err: any) {
        if (err.response?.status === 404) {
          destinationExists = false;
        } else {
          throw err;
        }
      }

      if (!destinationExists) {
        balanceError = `Account doesn't exist on the ledger. You need to fund it in order to send/receive assets`;
        return { status: false, balanceError };
      }

      return { status: true };
    } catch (error: any) {
      console.log({ error });
      throw new Error(
        balanceError ? balanceError : "Error preparing funding preview"
      );
    }
  }

  async fundAccount(
    destination: string,
    amount: string,
    sourceSecretKey: string
  ): Promise<{ status: boolean; data?: any; error?: string }> {
    try {
      const sourceKeypair = Keypair.fromSecret(sourceSecretKey);
      const account = await this.server.loadAccount(sourceKeypair.publicKey());
      const fee = await this.server.fetchBaseFee();

      const latestLedger = await this.server
        .ledgers()
        .order("desc")
        .limit(1)
        .call();
      const baseReserve =
        parseFloat(`${latestLedger.records[0].base_reserve_in_stroops}`) /
        10000000;

      let operation;
      try {
        await this.server.loadAccount(destination);

        operation = Operation.payment({
          destination,
          asset: Asset.native(),
          amount,
        });
      } catch (e: any) {
        if (e?.response?.status === 404) {
          const nativeBalance = parseFloat(
            account.balances.find((b: any) => b.asset_type === "native")
              ?.balance || "0"
          );

          const minBalance = (2 + account.subentry_count) * baseReserve;
          const spendable = nativeBalance - minBalance;

          if (spendable < parseFloat(amount) + fee / 10000000) {
            return {
              status: false,
              error: `Funding account does not have enough *spendable* XLM.
Total balance: ${nativeBalance} XLM
Minimum reserve: ${minBalance} XLM
Spendable: ${spendable} XLM
Required: ${parseFloat(amount) + fee / 10000000} XLM`,
            };
          }

          operation = Operation.createAccount({
            destination,
            startingBalance: parseFloat(amount).toFixed(7),
          });
        } else {
          throw e;
        }
      }

      const transaction = new TransactionBuilder(account, {
        fee: fee.toString(),
        networkPassphrase: this.networkPassphrase,
      })
        .addOperation(operation)
        .setTimeout(30)
        .build();

      transaction.sign(sourceKeypair);

      const transactionResult = await this.server.submitTransaction(
        transaction
      );
      return { status: true, data: transactionResult };
    } catch (error: any) {
      console.error("Error funding account: ", error.response?.data || error);
      return { status: false, error: error.response?.data || error.message };
    }
  }

  async fundWithFriendbot(publicKey: string): Promise<any> {
    try {
      const response = await fetch(
        `https://friendbot.stellar.org?addr=${publicKey}`
      );
      if (!response.ok) {
        throw new Error(`Error funding account: ${response.statusText}`);
      }
      const data = await response.json();
      return data;
    } catch (error) {
      console.log("Error funding account with friend bot", error);
      throw new Error("Error funding account with friend bot");
    }
  }
}
