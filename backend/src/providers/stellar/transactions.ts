import {
  Horizon,
  Asset,
  TransactionBuilder,
  Operation,
  Keypair,
  Networks,
  Account,
} from "@stellar/stellar-sdk";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { emitEvent } from "../../microservices/rabbitmq";
import { TransactionHistory } from "../../models/TransactionHistory";
import { WalletHelper } from "../../helpers/wallet.helper";
import { PUBLIC_ASSETS, TESTNET_ASSETS } from "../../common/assets";
import { WalletDecryption } from "../../helpers/encryption-decryption.helper";
import { WithdrawalEnum } from "../../common/enums";
import { generateConfirmationToken } from "../../utils/token";
import {
  IBlockchainAuth,
  IBlockchainTransaction,
} from "../../types/blockchain";
import { BlockchainFactory } from "../blockchainFactory";

export class StellarTransaction implements IBlockchainTransaction {
  private server: Horizon.Server;
  private authService: IBlockchainAuth;

  constructor() {
    this.server = new Horizon.Server(
      process.env.STELLAR_NETWORK === "public"
        ? process.env.STELLAR_PUBLIC_SERVER || "https://horizon.stellar.org"
        : process.env.STELLAR_TESTNET_SERVER ||
          "https://horizon-testnet.stellar.org"
    );
    this.authService = BlockchainFactory.getAuthProvider("stellar");
  }

  async addTrustline(user: any, assetCode: string): Promise<any> {
    try {
      const asset = new Asset(
        assetCode,
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS]?.issuer
          : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS]?.issuer
      );

      const hashedPassword = user.password;
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${hashedPassword}${user.pinCode}`
      );

      const accountRecord = await this.server
        .accounts()
        .accountId(user.stellarPublicKey)
        .call();

      const sourceAccount = new Account(
        accountRecord.account_id,
        accountRecord.sequence
      );

      const transaction = await new TransactionBuilder(sourceAccount, {
        fee: `${process.env.FEE}`,
        networkPassphrase:
          process.env.STELLAR_NETWORK === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: asset,
            source: user.stellarPublicKey,
          })
        )
        .setTimeout(Number(`${process.env.TIMEOUT}`))
        .build();

      const signedTransaction: any = await WalletHelper.execTranst(
        transaction,
        Keypair.fromSecret(decryptedPrivateKey),
        "changeTrust"
      );

      if (!signedTransaction.status) {
        throw new Error(signedTransaction.msg || "Failed to add asset.");
      }

      return {
        data: {
          transaction: transaction.toXDR(),
          network:
            process.env.STELLAR_NETWORK === "public"
              ? Networks.PUBLIC
              : Networks.TESTNET,
          signedTransaction,
        },
        message: "Trustline added successfully.",
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.log("Error adding trustline.", error);
      throw error;
    }
  }

  async removeTrustline(user: any, assetCode: string): Promise<any> {
    try {
      const asset = new Asset(
        assetCode,
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS]?.issuer
          : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS]?.issuer
      );

      const hashedPassword = user.password;
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${hashedPassword}${user.pinCode}`
      );

      const accountRecord = await this.server
        .accounts()
        .accountId(user.stellarPublicKey)
        .call();

      const sourceAccount = new Account(
        accountRecord.account_id,
        accountRecord.sequence
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: `${process.env.FEE}`,
        networkPassphrase:
          process.env.STELLAR_NETWORK === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
      })
        .addOperation(
          Operation.changeTrust({
            asset: asset,
            source: user.stellarPublicKey,
            limit: "0",
          })
        )
        .setTimeout(Number(`${process.env.TIMEOUT}`))
        .build();

      const signedTransaction: any = await WalletHelper.execTranst(
        transaction,
        Keypair.fromSecret(decryptedPrivateKey),
        "changeTrust"
      );

      if (!signedTransaction.status) {
        throw new Error(signedTransaction.msg || "Failed to remove asset.");
      }

      return {
        data: {
          transaction: transaction.toXDR(),
          network_passphrase:
            process.env.STELLAR_NETWORK === "public"
              ? Networks.PUBLIC
              : Networks.TESTNET,
          signedTransaction,
        },
        message: "Trustline removed successfully.",
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.log("Error removing trustline.", error);
      throw error;
    }
  }

  async paymentPreview(params: any): Promise<any> {
    try {
      let {
        assetCode,
        address,
        amount,
        transactionDetails,
        currencyType,
        accountNumber,
        accountName,
        bankName,
      } = params;
      const user = params.user;

      if (!assetCode || !address || !amount) {
        throw new Error("Missing required parameters");
      }

      assetCode = assetCode.toUpperCase();

      if (address === user.stellarPublicKey) {
        throw new Error("Sender and receiver address cannot be the same.");
      }

      if (!WalletHelper.isValidStellarAddress(address)) {
        throw new Error("Invalid Stellar address");
      }

      const asset =
        assetCode !== "NATIVE"
          ? {
              code: assetCode,
              issuer:
                process.env.STELLAR_NETWORK === "public"
                  ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS]
                      .issuer
                  : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS]
                      .issuer,
            }
          : { code: "XLM", issuer: "", type: "native" };

      const sourceAccount = await this.server.loadAccount(
        user.stellarPublicKey
      );
      const balance = sourceAccount.balances.find(
        (b: any) =>
          (assetCode === "NATIVE" && b.asset_type === "native") ||
          (b.asset_code === assetCode && b.asset_issuer === asset.issuer)
      );

      if (!balance) {
        throw new Error(`No balance found for ${assetCode}`);
      }

      const availableBalance = parseFloat(balance.balance);
      const paymentAmount = parseFloat(amount);
      const fee = parseFloat(process.env.FEE || "0.00001");

      if (availableBalance < paymentAmount + fee) {
        throw new Error("Insufficient balance for payment and fee");
      }

      const paymentDetails = {
        sourceAddress: user.stellarPublicKey,
        destinationAddress: address,
        asset: {
          code: assetCode === "NATIVE" ? "XLM" : assetCode,
          issuer: asset.issuer,
          type: assetCode === "NATIVE" ? "native" : "credit_alphanum",
        },
        amount: amount,
        fee: fee.toString(),
        totalDebit: (paymentAmount + fee).toFixed(7),
        availableBalance: availableBalance.toFixed(7),
        network: `${process.env.STELLAR_NETWORK}`,
        memo: transactionDetails,
        timestamp: new Date().toISOString(),
        expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(),
        fiatDetails:
          currencyType === WithdrawalEnum.FIAT
            ? {
                accountNumber,
                accountName,
                bankName,
              }
            : undefined,
      };

      const confirmationToken = generateConfirmationToken(paymentDetails);

      return {
        data: {
          paymentDetails,
          confirmationToken,
        },
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.log("Error generating payment preview:", error);
      throw error;
    }
  }

  async payment(params: any): Promise<any> {
    try {
      let {
        assetCode,
        address,
        amount,
        transactionDetails,
        currencyType,
        accountNumber,
        accountName,
        bankName,
        pinCode,
      } = params;
      const user = params.user;

      if (pinCode !== user.pinCode) {
        throw new Error("Invalid transaction pin");
      }

      assetCode = assetCode.toUpperCase();

      if (address === user.stellarPublicKey) {
        throw new Error("Sender and receiver address cannot be the same.");
      }

      if (!WalletHelper.isValidStellarAddress(address)) {
        throw new Error("Invalid Stellar address");
      }

      const hashedPassword = user.password;
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${hashedPassword}${user.pinCode}`
      );

      const asset =
        assetCode !== "NATIVE"
          ? new Asset(
              assetCode,
              process.env.STELLAR_NETWORK === "public"
                ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
                : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS]
                    .issuer
            )
          : Asset.native();

      const accountRecord = await this.server
        .accounts()
        .accountId(user.stellarPublicKey)
        .call();

      const sourceAccount = new Account(
        accountRecord.account_id,
        accountRecord.sequence
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: `${process.env.FEE}`,
        networkPassphrase:
          process.env.STELLAR_NETWORK === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
      })
        .addOperation(
          Operation.payment({
            asset: asset,
            destination: address,
            amount: amount.toString(),
          })
        )
        .setTimeout(Number(`${process.env.TIMEOUT}`))
        .build();

      const resp: any = await WalletHelper.execTranst(
        transaction,
        Keypair.fromSecret(decryptedPrivateKey),
        "payment"
      );

      if (!resp.status) {
        throw new Error(resp.msg);
      }

      const timestamp = Date.now();
      const date = new Date(timestamp);

      const formattedDate = date.toLocaleString("en-US", {
        year: "numeric",
        month: "long",
        day: "numeric",
        hour: "numeric",
        minute: "numeric",
        hour12: true,
      });

      await TransactionHistory.create({
        user: new Types.ObjectId(user._id),
        transactionDetail: transactionDetails,
        txHash: resp.hash,
      });

      emitEvent("send:withdrawal:email", {
        to: user.primaryEmail,
        subject: `New Withdrawal Confirmation`,
        appName: process.env.APP_NAME,
        username: user.username,
        amount: amount,
        currency: assetCode === "NATIVE" ? "XLM" : assetCode,
        userAddress: user.stellarPublicKey,
        receiverAddress: address,
        txHash: resp.hash,
        txDate: formattedDate,
      }).catch((err: any) => {
        console.error("Error emitting send:withdrawal:email:", err.message);
      });

      if (currencyType === WithdrawalEnum.FIAT) {
        emitEvent("send:fait:withdrawal:email", {
          to: process.env.EMAIL_USERNAME,
          subject: `New Withdrawal Request`,
          appName: process.env.APP_NAME,
          username: user.username,
          email: user.primaryEmail,
          amount: amount,
          currency: assetCode,
          userAddress: user.stellarPublicKey,
          receiverAddress: address,
          txHash: resp.hash,
          accountNumber: accountNumber,
          accountName: accountName,
          bankName: bankName,
          txDate: formattedDate,
        }).catch((err: any) => {
          console.error(
            "Error emitting send:fait:withdrawal:email:",
            err.message
          );
        });
      }

      return {
        data: { hash: resp.hash },
        status: httpStatus.CREATED,
        message: "Success",
        success: true,
      };
    } catch (error: any) {
      console.log("Error handling payment.", error);
      throw error;
    }
  }

  async swapPreview(params: any): Promise<any> {
    try {
      let { slippage, sourceAssetCode, desAssetCode, sourceAmount } = params;
      slippage *= 1;

      const sourceAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS]
              .issuer;

      const desAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

      const _paths: any = await WalletHelper.sendPaymentPath({
        sourceAssetCode: sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode: desAssetCode,
        desAssetIssuer,
        amount: sourceAmount,
      });

      const paths = _paths.data.sendPaymentPath;
      if (!paths || paths.length === 0) {
        throw new Error("No available swap route between the selected assets.");
      }

      const desAmount = paths?.filter(
        (pth: any) =>
          pth?.destination_asset_type === desAssetIssuer ||
          desAssetCode?.startsWith(pth?.destination_asset_code)
      )[0]?.destination_amount;

      const destMin = (
        ((100 - slippage) * parseFloat(desAmount)) /
        100
      ).toFixed(7);

      return {
        data: {
          swapDetails: {
            sourceAsset: sourceAssetCode,
            destinationAsset: desAssetCode,
            sourceAmount: sourceAmount,
            expectedDestinationAmount: desAmount,
            minimumReceived: destMin,
            slippage: slippage,
            fee: `${process.env.FEE}`,
            network: `${process.env.STELLAR_NETWORK}`,
            exchangeRate: (
              parseFloat(desAmount) / parseFloat(sourceAmount)
            ).toFixed(7),
            priceImpact: this.calculatePriceImpact(
              paths,
              sourceAmount,
              desAmount
            ),
            route: this.getRouteDetails(paths, sourceAssetCode, desAssetCode),
          },
        },
        message: "Swap preview generated successfully.",
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.log("Error generating swap preview.", error);
      throw error;
    }
  }

  async swap(params: any): Promise<any> {
    try {
      let { slippage, sourceAssetCode, desAssetCode, sourceAmount, pinCode } =
        params;
      const user = params.user;

      if (pinCode !== user.pinCode) {
        throw new Error("Invalid transaction pin");
      }

      slippage *= 1;

      const sourceAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS]
              .issuer;

      const desAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

      const paths: any = await WalletHelper.sendPaymentPath({
        sourceAssetCode: sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode: desAssetCode,
        desAssetIssuer,
        amount: sourceAmount,
      });

      const hashedPassword = user.password;
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${hashedPassword}${user.pinCode}`
      );

      const _paths = paths.data.sendPaymentPath;
      const desAmount = _paths?.filter(
        (pth: any) =>
          pth?.destination_asset_type === desAssetIssuer ||
          desAssetCode?.startsWith(pth?.destination_asset_code)
      )[0]?.destination_amount;

      const sourceAsset =
        sourceAssetCode !== "NATIVE"
          ? new Asset(sourceAssetCode, sourceAssetIssuer)
          : Asset.native();

      const desAsset =
        desAssetCode !== "NATIVE"
          ? new Asset(desAssetCode, desAssetIssuer)
          : Asset.native();

      const destMin = (
        ((100 - slippage) * parseFloat(desAmount)) /
        100
      ).toFixed(7);
      const sourceAccount = await this.server.loadAccount(
        user.stellarPublicKey
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: `${process.env.FEE}`,
        networkPassphrase:
          process.env.STELLAR_NETWORK === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
      })
        .addOperation(
          Operation.pathPaymentStrictSend({
            sendAsset: sourceAsset,
            sendAmount: sourceAmount.toString(),
            destination: user.stellarPublicKey,
            destAsset: desAsset,
            destMin: destMin,
          })
        )
        .setTimeout(Number(`${process.env.TIMEOUT}`))
        .build();
      const resp: any = await WalletHelper.execTranst(
        transaction,
        Keypair.fromSecret(decryptedPrivateKey),
        "swap"
      );

      if (!resp.status) {
        return {
          data: { hash: resp.details.hash },
          message: resp.userMessage || resp.msg,
          status: httpStatus.BAD_REQUEST,
          success: false,
        };
      }

      return {
        data: { hash: resp.hash },
        message: resp.userMessage || resp.msg,
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.log("Error handling swap.", error);
      throw error;
    }
  }

  async strictSendPreview(params: any): Promise<any> {
    try {
      let { desAddress, slippage, assetCode, amount, desAmount } = params;
      slippage *= 1;

      if (!WalletHelper.isValidStellarAddress(desAddress)) {
        throw new Error("Invalid Address");
      }

      let fundResultMessage = "";
      try {
        const checkFunded: any = await this.authService.fundAccountPreview(
          desAddress
        );
        if (!checkFunded?.status) fundResultMessage = checkFunded?.balanceError;
      } catch (error: any) {
        fundResultMessage = error;
        throw error;
      }

      const sourceAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer;

      const desAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer;

      const _paths: any = await WalletHelper.sendPaymentPath({
        sourceAssetCode: assetCode,
        sourceAssetIssuer,
        desAssetCode: assetCode,
        desAssetIssuer,
        amount: amount.toString(),
      });

      const paths = _paths.data.sendPaymentPath;
      const _desAmount: any =
        desAmount ||
        paths.filter(
          (pth: any) =>
            pth.destination_asset_type === desAssetIssuer ||
            assetCode.startsWith(pth.destination_asset_code)
        )[0].destination_amount;

      const destMin = (
        ((100 - slippage) * parseFloat(_desAmount)) /
        100
      ).toFixed(7);

      return {
        data: {
          transactionDetails: {
            sourceAsset: assetCode,
            destinationAsset: assetCode,
            sourceAmount: amount,
            estimatedDestinationAmount: _desAmount,
            minimumDestinationAmount: destMin,
            destinationAddress: desAddress,
            slippage: slippage,
            fee: `${process.env.FEE}`,
            network: `${process.env.STELLAR_NETWORK}`,
            fundResultMessage,
          },
        },
        message: "Strict send preview generated successfully.",
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.log("Error generating strict send preview.", error);
      throw error;
    }
  }

  async strictSend(params: any): Promise<any> {
    try {
      const user = params.user;
      let { desAddress, slippage, assetCode, amount, pinCode } = params;

      if (pinCode !== user.pinCode) {
        throw new Error("Invalid transaction pin");
      }

      slippage = Number(slippage);

      if (!WalletHelper.isValidStellarAddress(desAddress)) {
        throw new Error("Invalid Stellar address");
      }

      let destinationExists = true;
      try {
        const checkAccount = await this.authService.fundAccountPreview(
          desAddress
        );
        if (!checkAccount?.status) destinationExists = false;
      } catch (err: any) {
        if (err?.response?.status === 404) {
          destinationExists = false;
        } else {
          throw err;
        }
      }

      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${user.password}${user.pinCode}`
      );

      if (!destinationExists) {
        const fundResult: any = await this.authService.fundAccount(
          desAddress,
          parseFloat(amount).toFixed(7).toString(),
          decryptedPrivateKey
        );
        if (fundResult.status) {
          return {
            data: { hash: fundResult.transactionResult.hash },
            message: "Destination account funded successfully",
            status: httpStatus.OK,
            success: true,
          };
        } else {
          return {
            data: {},
            message: "Failed to fund destination account",
            status: httpStatus.BAD_REQUEST,
            success: false,
          };
        }
      }

      const sourceAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer;

      const desAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer;

      const _paths: any = await WalletHelper.sendPaymentPath({
        sourceAssetCode: assetCode,
        sourceAssetIssuer,
        desAssetCode: assetCode,
        desAssetIssuer,
        amount: parseFloat(amount).toFixed(7).toString(),
      });

      const paths = _paths.data.sendPaymentPath;

      const _desAmount: any = paths.find(
        (pth: any) =>
          pth.destination_asset_type === desAssetIssuer ||
          assetCode.startsWith(pth.destination_asset_code)
      )?.destination_amount;

      if (!_desAmount) {
        throw new Error("No valid payment path found");
      }

      const sourceAsset =
        assetCode !== "NATIVE"
          ? new Asset(assetCode, sourceAssetIssuer)
          : Asset.native();
      const desAsset =
        assetCode !== "NATIVE"
          ? new Asset(assetCode, desAssetIssuer)
          : Asset.native();

      const destMin = (
        ((100 - slippage) * parseFloat(_desAmount)) /
        100
      ).toFixed(7);

      const accountRecord = await this.server
        .accounts()
        .accountId(user.stellarPublicKey)
        .call();

      const sourceAccount = new Account(
        accountRecord.account_id,
        accountRecord.sequence
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: `${process.env.FEE}`,
        networkPassphrase:
          process.env.STELLAR_NETWORK === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
      })
        .addOperation(
          Operation.pathPaymentStrictSend({
            sendAsset: sourceAsset,
            sendAmount: parseFloat(amount).toFixed(7).toString(),
            destination: desAddress,
            destAsset: desAsset,
            destMin,
          })
        )
        .setTimeout(Number(process.env.TIMEOUT))
        .build();

      const resp: any = await WalletHelper.execTranst(
        transaction,
        Keypair.fromSecret(decryptedPrivateKey),
        "strictSend"
      );

      if (!resp.status) {
        return {
          data: resp.details,
          message: resp.userMessage || resp.msg,
          status: httpStatus.BAD_REQUEST,
          success: false,
        };
      }

      return {
        data: { hash: resp.hash },
        message: resp.userMessage || resp.msg,
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.error(
        "Error handling strict send.",
        error.response?.data || error
      );
      throw error;
    }
  }

  async strictReceivePreview(params: any): Promise<any> {
    try {
      let { slippage, desAddress, sourceAssetCode, desAssetCode, desAmount } =
        params;
      slippage = parseFloat(slippage) || 0;

      if (!WalletHelper.isValidStellarAddress(desAddress)) {
        throw new Error("Invalid Address");
      }

      const sourceAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS]
              .issuer;

      const desAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

      const _paths: any = await WalletHelper.receivePaymentPath({
        sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode,
        desAssetIssuer,
        amount: desAmount?.toFixed(7)?.toString(),
      });

      const paths = _paths?.data?.receivePaymentPath || [];

      if (!paths.length) {
        throw new Error(
          "No payment path found for the given assets and amount."
        );
      }

      const bestPath = paths[0];
      const _sourceAmount = bestPath.source_amount;

      const sendMax = (
        (100 * parseFloat(_sourceAmount)) /
        (100 - slippage)
      ).toFixed(7);

      return {
        data: {
          transactionDetails: {
            sourceAsset: sourceAssetCode,
            destinationAsset: desAssetCode,
            sourceAmount: _sourceAmount,
            destinationAmount: desAmount,
            destinationAddress: desAddress,
            slippage,
            estimatedSendMax: sendMax,
            fee: `${process.env.FEE}`,
            network: `${process.env.STELLAR_NETWORK}`,
          },
        },
        message: "Strict receive preview generated successfully.",
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.error("Error generating strict receive preview.", error);
      throw error;
    }
  }

  async strictReceive(params: any): Promise<any> {
    try {
      let {
        slippage,
        desAddress,
        sourceAssetCode,
        desAssetCode,
        desAmount,
        pinCode,
      } = params;
      const user = params.user;

      if (pinCode !== user.pinCode) {
        throw new Error("Invalid transaction pin");
      }

      slippage = parseFloat(slippage) || 0;

      if (!WalletHelper.isValidStellarAddress(desAddress)) {
        throw new Error("Invalid Address");
      }

      const sourceAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS]
              .issuer;

      const desAssetIssuer =
        process.env.STELLAR_NETWORK === "public"
          ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
          : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

      const hashedPassword = user.password;
      const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
        user.encryptedPrivateKey,
        `${user.primaryEmail}${hashedPassword}${user.pinCode}`
      );

      const _paths: any = await WalletHelper.receivePaymentPath({
        sourceAssetCode,
        sourceAssetIssuer,
        desAssetCode,
        desAssetIssuer,
        amount: desAmount?.toFixed(7)?.toString(),
      });

      const paths = _paths?.data?.receivePaymentPath || [];

      if (!paths.length) {
        throw new Error(
          "No payment path found for the given assets and amount."
        );
      }

      const bestPath = paths[0];
      const _sourceAmount = bestPath.source_amount;

      const sourceAsset =
        sourceAssetCode !== "NATIVE"
          ? new Asset(sourceAssetCode, sourceAssetIssuer)
          : Asset.native();

      const desAsset =
        desAssetCode !== "NATIVE"
          ? new Asset(desAssetCode, desAssetIssuer)
          : Asset.native();

      const sendMax = (
        (100 * parseFloat(_sourceAmount)) /
        (100 - slippage)
      ).toFixed(7);

      const accountRecord = await this.server
        .accounts()
        .accountId(user.stellarPublicKey)
        .call();

      const sourceAccount = new Account(
        accountRecord.account_id,
        accountRecord.sequence
      );

      const transaction = new TransactionBuilder(sourceAccount, {
        fee: `${process.env.FEE}`,
        networkPassphrase:
          process.env.STELLAR_NETWORK === "public"
            ? Networks.PUBLIC
            : Networks.TESTNET,
      })
        .addOperation(
          Operation.pathPaymentStrictReceive({
            sendAsset: sourceAsset,
            sendMax,
            destination: desAddress,
            destAsset: desAsset,
            destAmount: desAmount?.toFixed(7)?.toString(),
          })
        )
        .setTimeout(parseInt(process.env.TIMEOUT || "60", 10))
        .build();

      const resp: any = await WalletHelper.execTranst(
        transaction,
        Keypair.fromSecret(decryptedPrivateKey),
        "strictReceive"
      );

      if (!resp.status) {
        return {
          data: { hash: resp.details?.hash },
          message: resp.userMessage || resp.msg,
          status: httpStatus.BAD_REQUEST,
          success: false,
        };
      }

      return {
        data: { hash: resp.hash },
        message: resp.userMessage || resp.msg,
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.error("Error handling strict receive.", error);
      throw error;
    }
  }

  async getTransactions(params: any): Promise<any> {
    try {
      const user = params.user;
      const { cursor, limit, order } = params;

      try {
        await this.server.loadAccount(user.stellarPublicKey);
      } catch (error) {
        console.log({ error });
        throw new Error(
          "Fund your wallet with at least 5 XLM to activate your account."
        );
      }

      let callBuilder = this.server
        .transactions()
        .forAccount(user.stellarPublicKey)
        .order(order === "asc" ? "asc" : "desc")
        .limit(Math.min(parseInt("100")));

      if (cursor) {
        callBuilder.cursor(cursor);
      }

      const page = await callBuilder.call();
      const transactions = page.records;

      const simplifiedTransactions = await Promise.all(
        transactions.map(async (tx: any) => {
          try {
            const operationsResponse = await this.server
              .operations()
              .forTransaction(tx.id)
              .limit(200)
              .call();

            const operations = operationsResponse.records;

            let type = "other";
            let from = tx.source_account;
            let to = "";
            let amountSent = "";
            let amountReceived = "";
            let tokenSent = "";
            let tokenReceived = "";

            const changeTrustOp: any = operations.find(
              (op: any) => op.type === "change_trust"
            );
            const accountMergeOp: any = operations.find(
              (op: any) => op.type === "account_merge"
            );
            const createAccountOp: any = operations.find(
              (op: any) => op.type === "create_account"
            );
            const pathPaymentOp: any = operations.find(
              (op: any) =>
                op.type === "path_payment_strict_receive" ||
                op.type === "path_payment_strict_send"
            );
            const paymentOp: any = operations.find(
              (op: any) => op.type === "payment"
            );

            if (changeTrustOp) {
              if (changeTrustOp.limit === "0.0000000") {
                type = "remove currency";
                tokenSent =
                  changeTrustOp.asset_type === "native"
                    ? "XLM"
                    : changeTrustOp.asset_code;
              } else {
                type = "add currency";
                tokenReceived =
                  changeTrustOp.asset_type === "native"
                    ? "XLM"
                    : changeTrustOp.asset_code;
              }
              from = changeTrustOp.source_account || tx.source_account;
              to = changeTrustOp.trustor || changeTrustOp.trustee || "";
            } else if (accountMergeOp) {
              type = "account merge";
              to = accountMergeOp.into;
            } else if (createAccountOp) {
              type = "create account";
              to = createAccountOp.account;
              amountReceived = createAccountOp.starting_balance;
              tokenReceived = "XLM";
            } else if (pathPaymentOp) {
              type = "swap";
              to = pathPaymentOp.to;
              amountSent = pathPaymentOp.source_amount;
              amountReceived = pathPaymentOp.amount;
              tokenSent =
                pathPaymentOp.source_asset_type === "native"
                  ? "XLM"
                  : pathPaymentOp.source_asset_code;
              tokenReceived =
                pathPaymentOp.asset_type === "native"
                  ? "XLM"
                  : pathPaymentOp.asset_code;
            } else if (paymentOp) {
              type =
                paymentOp.from === user.stellarPublicKey ? "send" : "receive";
              to = paymentOp.to;
              amountSent = type === "send" ? paymentOp.amount : "";
              amountReceived = type === "receive" ? paymentOp.amount : "";
              tokenSent =
                type === "send"
                  ? paymentOp.asset_type === "native"
                    ? "XLM"
                    : paymentOp.asset_code
                  : "";
              tokenReceived =
                type === "receive"
                  ? paymentOp.asset_type === "native"
                    ? "XLM"
                    : paymentOp.asset_code
                  : "";
            }

            return {
              hash: tx.hash,
              date: tx.created_at,
              fee: tx.fee_charged / 10000000,
              type,
              from,
              to,
              amountSent,
              amountReceived,
              tokenSent,
              tokenReceived,
            };
          } catch (error) {
            console.error(`Error processing transaction ${tx.hash}:`, error);
            return {
              hash: tx.hash,
              date: tx.created_at,
              fee: tx.fee_charged / 10000000,
              type: "error",
              from: tx.source_account,
              to: "",
              amountSent: "",
              amountReceived: "",
              tokenSent: "",
              tokenReceived: "",
            };
          }
        })
      );

      let totalCount = 0;
      try {
        const allTransactions = await this.server
          .transactions()
          .forAccount(user.stellarPublicKey)
          .limit(1000)
          .call();
        totalCount = allTransactions.records.length;
      } catch (error) {
        console.error("Error getting total transaction count:", error);
        totalCount = simplifiedTransactions.length;
      }

      return {
        data: {
          paging: {
            next:
              page.records.length > 0
                ? page.records[page.records.length - 1].paging_token
                : null,
            prev: cursor || null,
            count: totalCount,
            cursor:
              page.records.length > 0
                ? page.records[page.records.length - 1].paging_token
                : null,
          },
          transactions: simplifiedTransactions,
        },
        message: "Transactions fetched successfully",
        status: httpStatus.OK,
        success: true,
      };
    } catch (error: any) {
      console.error("Error fetching transactions:", error);
      throw error;
    }
  }

  // Helper methods
  private getRouteDetails(
    paths: any[],
    sourceAssetCode: string,
    desAssetCode: string
  ): any[] {
    try {
      if (!paths || paths.length === 0) return [];

      const bestPath = paths[0];
      const route = [];

      route.push({
        asset: sourceAssetCode,
        type: sourceAssetCode === "XLM" ? "native" : "credit_alphanum",
        issuer: sourceAssetCode === "XLM" ? "" : bestPath.source_asset_issuer,
      });

      if (bestPath.path && bestPath.path.length > 0) {
        bestPath.path.forEach((asset: any) => {
          route.push({
            asset: asset.asset_code || "XLM",
            type: asset.asset_type === "native" ? "native" : "credit_alphanum",
            issuer: asset.asset_issuer || "",
          });
        });
      }

      route.push({
        asset: desAssetCode,
        type: desAssetCode === "XLM" ? "native" : "credit_alphanum",
        issuer: desAssetCode === "XLM" ? "" : bestPath.destination_asset_issuer,
      });

      const simplifiedRoute = [];
      let lastAsset = null;

      for (const asset of route) {
        if (
          !lastAsset ||
          asset.asset !== lastAsset.asset ||
          asset.issuer !== lastAsset.issuer
        ) {
          simplifiedRoute.push(asset);
          lastAsset = asset;
        }
      }

      return simplifiedRoute;
    } catch (error) {
      console.error("Error extracting route details:", error);
      return [];
    }
  }

  private calculatePriceImpact(
    paths: any[],
    sourceAmount: string,
    desAmount: string
  ): string {
    try {
      if (!paths || paths.length === 0) return "0%";

      const bestPath = paths[0];
      const idealPrice =
        parseFloat(bestPath.destination_amount) /
        parseFloat(bestPath.source_amount);

      const actualPrice = parseFloat(desAmount) / parseFloat(sourceAmount);
      const priceImpact = ((idealPrice - actualPrice) / idealPrice) * 100;
      const formattedImpact = Math.max(0, priceImpact).toFixed(2);

      return `${formattedImpact}%`;
    } catch (error) {
      console.error("Error calculating price impact:", error);
      return "0%";
    }
  }
}
