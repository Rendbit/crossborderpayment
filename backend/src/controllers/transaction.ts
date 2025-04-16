import StellarSdk from "@stellar/stellar-sdk";
import { Networks, Server } from "stellar-sdk";
import httpStatus from "http-status";
import { Types } from "mongoose";
import { emitEvent } from "../microservices/rabbitmq";
import { TransactionHistory } from "../models/TransactionHistory";
import { PaginationQuerySchema } from "../validators/pagination";
import { WalletHelper } from "../helpers/wallet.helper";
import { PUBLIC_ASSETS, TESTNET_ASSETS } from "../common/assets";
import { WalletDecryption } from "../helpers/encryption-decryption.helper";
import { WithdrawalEnum } from "../common/enums";

const server = new StellarSdk.SorobanRpc.Server(
  process.env.STELLAR_NETWORK === "public"
    ? process.env.STELLAR_PUBLIC_SERVER
    : process.env.STELLAR_TESTNET_SERVER
);

export const addTrustline = async (req: any, res: any) => {
  try {
    let { assetCode } = req.body;
    assetCode = assetCode.toUpperCase();

    const user = req.user;
    // Create the asset object using the provided asset code and the corresponding issuer.
    const asset = new StellarSdk.Asset(
      assetCode,
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer
    );

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;

    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Fetch the source account details from the Stellar network using the user's public key.
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // Construct a transaction to change the trustline for the specified asset.
    const transaction = await new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: Number(process.env.FEE), // Set the transaction fee.
      // Set the network passphrase based on the network configuration.
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        // Add the change trust operation to the transaction.
        StellarSdk.Operation.changeTrust({
          asset: asset,
          source: user.stellarPublicKey,
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.

    // console.log({ transaction });

    // Sign the transaction using the user's decrypted private key.
    const signedTransaction: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      'changeTrust'
    );

    if (!signedTransaction.status) {
      throw new Error(signedTransaction.msg);
    }
    // Return the transaction details, network passphrase, and signed transaction.
    return res.status(httpStatus.OK).json({
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
    });
  } catch (error: any) {
    console.log("Error adding trustline.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error adding trustline.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const removeTrustline = async (req: any, res: any) => {
  try {
    let { assetCode } = req.body;
    assetCode = assetCode.toUpperCase();

    const user = req.user;
    // Create the asset object using the provided asset code and the corresponding issuer.
    const asset = new StellarSdk.Asset(
      assetCode,
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer
    );

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;

    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Fetch the source account details from the Stellar network using the user's public key.
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // Construct a transaction to remove the trustline for the specified asset.
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: Number(process.env.FEE), // Set the transaction fee.
      // Set the network passphrase based on the network configuration.
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        // Add the change trust operation to the transaction with a limit of '0' to remove the trustline.
        StellarSdk.Operation.changeTrust({
          asset: asset,
          source: user.stellarPublicKey,
          limit: "0",
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.

    // Sign the transaction using the user's decrypted private key.
    const signedTransaction: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      'changeTrust'
    );
    if (!signedTransaction.status) {
      throw new Error(signedTransaction.msg);
    }

    // Return the transaction details, network passphrase, and signed transaction.
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
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error removing trustline.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const payment = async (req: any, res: any) => {
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
    } = req.body;
    const user = req.user;
    // Ensure the asset code is in uppercase.
    assetCode = assetCode.toUpperCase();

    // Validate the destination Stellar address.
    if (address === user.stellarPublicKey)
      throw new Error("Sender and receiver address cannot be the same.");
    if (!WalletHelper.isValidStellarAddress(address))
      throw new Error("Invalid address");

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;

    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Determine the asset to be used for the payment.
    const asset =
      assetCode !== "NATIVE"
        ? new StellarSdk.Asset(
            assetCode,
            process.env.STELLAR_NETWORK === "public"
              ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
              : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer
          )
        : StellarSdk.Asset.native(); // Use the native asset if assetCode is 'NATIVE'.

    // Fetch the source account details from the Stellar network using the user's public key.
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // Construct a payment transaction.
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: process.env.FEE, // Set the transaction fee.
      // Set the network passphrase based on the network configuration.
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        // Add the payment operation to the transaction.
        StellarSdk.Operation.payment({
          asset: asset,
          destination: address, // Set the destination address for the payment.
          amount: amount.toString(), // Set the payment amount.
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.
    // Sign the transaction using the user's decrypted private key.
    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      'payment'
    );

    if (!resp.status) throw new Error(resp.msg);
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
    return res.status(httpStatus.CREATED).json({
      data: { hash: resp.hash },
      status: httpStatus.CREATED,
      message: "Success",
      success: true,
    });
  } catch (error: any) {
    console.log("Error handling payment.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error handling payment.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const swap = async (req: any, res: any) => {
  try {
    let { slippage, sourceAssetCode, desAssetCode, sourceAmount } = req.body;
    const user = req.user;
    // Ensure the slippage value is a number.
    slippage *= 1;

    // Determine the source asset issuer based on the network configuration.
    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Determine the destination asset issuer based on the network configuration.
    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Find the payment path from the source asset to the destination asset.
    const paths: any = await WalletHelper.sendPaymentPath({
      sourceAssetCode: sourceAssetCode,
      sourceAssetIssuer,
      desAssetCode: desAssetCode,
      desAssetIssuer,
      amount: sourceAmount,
    });

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;

    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Calculate the destination amount based on the provided amount or the paths.
    const desAmount =
      sourceAmount ||
      paths.filter(
        (pth: any) =>
          pth.destination_asset_type === desAssetIssuer ||
          desAssetCode.startsWith(pth.destination_asset_code)
      )[0].payload.desAmount;

    // Create the source asset object.
    const sourceAsset =
      sourceAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(sourceAssetCode, sourceAssetIssuer)
        : StellarSdk.Asset.native();

    // Create the destination asset object.
    const desAsset =
      desAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(desAssetCode, desAssetIssuer)
        : StellarSdk.Asset.native();

    // Calculate the minimum destination amount considering the slippage.
    const destMin = (((100 - slippage) * parseFloat(desAmount)) / 100).toFixed(
      7
    );

    // Fetch the source account details from the Stellar network using the user's public key.
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // Construct the strict send payment transaction.
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: process.env.FEE, // Set the transaction fee.
      // Set the network passphrase based on the network configuration.
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        // Add the path payment strict send operation to the transaction.
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset: sourceAsset, // Set the source asset.
          sendAmount: sourceAmount.toString(), // Set the source amount.
          destination: user.stellarPublicKey, // Set the destination address.
          destAsset: desAsset, // Set the destination asset.
          destMin: "0.0000001", // Set the minimum destination amount.
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.
    // Sign the transaction using the user's decrypted private key.
    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      'swap'
    );
    if (!resp.status) throw new Error(resp.msg);

    // Return the transaction hash.
    return res.status(httpStatus.OK).json({
      data: { hash: resp.hash },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error handling swap.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error handling swap.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const strictSend = async (req: any, res: any) => {
  try {
    const user = req.user;
    let {
      desAddress,
      slippage,
      sourceAssetCode,
      desAssetCode,
      sourceAmount,
      desAmount,
    } = req.body;
    // Ensure the slippage value is a number.
    slippage *= 1;

    // Validate the destination Stellar address.
    if (!WalletHelper.isValidStellarAddress(desAddress))
      throw new Error("Invalid Address");

    // Determine the source asset issuer based on the network configuration.
    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Determine the destination asset issuer based on the network configuration.
    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Find the payment path from the source asset to the destination asset.
    const paths: any = await WalletHelper.sendPaymentPath({
      sourceAssetCode: sourceAssetCode,
      sourceAssetIssuer,
      desAssetCode: desAssetCode,
      desAssetIssuer,
      amount: sourceAmount,
    });

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;

    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Calculate the destination amount based on the provided amount or the paths.
    const _desAmount: any =
      desAmount ||
      paths.filter(
        (pth: any) =>
          pth.destination_asset_type === desAssetIssuer ||
          desAssetCode.startsWith(pth.destination_asset_code)
      )[0].payload.desAmount;

    // Create the source asset object.
    const sourceAsset =
      sourceAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(sourceAssetCode, sourceAssetIssuer)
        : StellarSdk.Asset.native();

    // Create the destination asset object.
    const desAsset =
      desAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(desAssetCode, desAssetIssuer)
        : StellarSdk.Asset.native();

    // Calculate the minimum destination amount considering the slippage.
    const destMin = (((100 - slippage) * parseFloat(_desAmount)) / 100).toFixed(
      7
    );

    // Fetch the source account details from the Stellar network using the user's public key.
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // Construct the strict send payment transaction.
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: process.env.FEE, // Set the transaction fee.
      // Set the network passphrase based on the network configuration.
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        // Add the path payment strict send operation to the transaction.
        StellarSdk.Operation.pathPaymentStrictSend({
          sendAsset: sourceAsset, // Set the source asset.
          sendAmount: sourceAmount.toString(), // Set the source amount.
          destination: desAddress, // Set the destination address.
          destAsset: desAsset, // Set the destination asset.
          destMin: "0.0000001", // Set the minimum destination amount.
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.
    // Sign the transaction using the user's decrypted private key.

    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      'strictSend'
    );
    if (!resp.status) throw new Error(resp.msg);

    // Return the transaction hash.
    return res.status(httpStatus.OK).json({
      data: { hash: resp.hash },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error handling strict send.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error handling strict send.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const strictReceive = async (req: any, res: any) => {
  try {
    let {
      slippage,
      desAddress,
      sourceAssetCode,
      desAssetCode,
      sourceAmount,
      desAmount,
    } = req.body;
    const user = req.user;
    // Ensure the slippage value is a number.
    slippage *= 1;

    // Validate the destination Stellar address.
    if (!WalletHelper.isValidStellarAddress(desAddress))
      throw new Error("Invalid Address");

    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;

    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Find the payment path from the source asset to the destination asset.
    const paths: any = await WalletHelper.receivePaymentPath({
      sourceAssetCode: sourceAssetCode,
      sourceAssetIssuer,
      desAssetCode: desAssetCode,
      desAssetIssuer,
      amount: desAmount,
    });

    // Calculate the source amount based on the provided amount or the paths.
    const _sourceAmount =
      sourceAmount ||
      paths.filter(
        (pth: any) =>
          pth.source_asset_type === sourceAssetIssuer ||
          sourceAssetCode.startsWith(pth.source_asset_code)
      )[0].payload.sourceAmount;

    // Create the source asset object.
    const sourceAsset =
      sourceAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(sourceAssetCode, sourceAssetIssuer)
        : StellarSdk.Asset.native();

    // Create the destination asset object.
    const desAsset =
      desAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(desAssetCode, desAssetIssuer)
        : StellarSdk.Asset.native();

    // Calculate the maximum amount to send considering the slippage.
    const sendMax = (
      (100 * parseFloat(_sourceAmount)) /
      (100 - slippage)
    ).toFixed(7);

    // Fetch the source account details from the Stellar network using the user's public key.
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // Construct the strict receive payment transaction.
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: process.env.FEE, // Set the transaction fee.
      // Set the network passphrase based on the network configuration.
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        // Add the path payment strict receive operation to the transaction.
        StellarSdk.Operation.pathPaymentStrictReceive({
          sendAsset: sourceAsset, // Set the source asset.
          sendMax: "0.0000001", // Set the maximum amount to send.
          destination: desAddress, // Set the destination address.
          destAsset: desAsset, // Set the destination asset.
          destAmount: desAmount.toString(), // Set the destination amount.
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.

    // Sign the transaction using the user's decrypted private key.
    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      'strictReceive'
    );

    if (!resp.status) throw new Error(resp.msg);

    // Return the transaction response.
    return res.status(httpStatus.OK).json({
      data: { hash: resp.hash },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error handling strict receive.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error handling strict receive.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const getTransactions = async (req: any, res: any) => {
  try {
    const user = req.user;
    // Fetch transactions for the given Stellar account from the Horizon server
    const response = await fetch(
      `${
        process.env.STELLAR_NETWORK === "public"
          ? process.env.HORIZON_MAINNET_URL
          : process.env.HORIZON_TESTNET_URL
      }/accounts/${user.stellarPublicKey}/transactions`
    );

    // Check if the response is successful, otherwise throw an exception
    if (!response.ok) {
      throw new Error("Failed to fetch transactions");
    }

    // Parse the JSON response to get transaction data
    const data = await response.json();
    const transactions = data._embedded.records;

    // Initialize the Stellar SDK server
    const server = new Server(
      `${process.env.STELLAR_NETWORK}` === "public"
        ? `${process.env.HORIZON_MAINNET_URL}`
        : `${process.env.HORIZON_TESTNET_URL}`
    );
    const allOperations: any = [];

    // Iterate through each transaction to fetch its operations
    for (const tx of transactions) {
      const operationsResponse = await server
        .operations()
        .forTransaction(tx.id)
        .call();
      const operations = operationsResponse.records;

      // Collect all operations into a single array
      operations.forEach(() => {
        allOperations.push(...operations);
      });
    }

    return res.status(httpStatus.OK).json({
      data: { transactions: allOperations },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching transactions:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching transactions",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const getFiatTransactions = async (req: any, res: any) => {
  try {
    const user = req.user;
    const parsedQuery = PaginationQuerySchema.parse(req.query);
    const limit = parsedQuery.limit ?? 10;
    const page = parsedQuery.page ?? 0;
    const skip = (page - 1) * limit;
    const fiatTransactions = await TransactionHistory.find({
      user: new Types.ObjectId(user._id),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res
      .status(httpStatus.OK)
      .json({ data: fiatTransactions, status: httpStatus.OK, success: true });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching fiat transactions",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
