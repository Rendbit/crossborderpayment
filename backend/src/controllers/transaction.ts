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
import { generateConfirmationToken } from "../utils/token";

const server = new StellarSdk.SorobanRpc.Server(
  process.env.STELLAR_NETWORK === "public"
    ? process.env.STELLAR_PUBLIC_SERVER
    : process.env.STELLAR_TESTNET_SERVER
);

export const addTrustline = async (req: any, res: any) => {
  try {
    let { assetCode } = req.body;
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
      "changeTrust"
    );

    if (!signedTransaction.status) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: signedTransaction.msg || "Failed to add asset.",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
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
      "changeTrust"
    );

    if (!signedTransaction.status) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: signedTransaction.msg || "Failed to remove asset.",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Return the transaction details, network passphrase, and signed transaction.
    return res.status(httpStatus.OK).json({
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
    });
  } catch (error: any) {
    console.log("Error removing trustline.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error removing trustline.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const paymentPreview = async (req: any, res: any) => {
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

    // Validate input parameters
    if (!assetCode || !address || !amount) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Missing required parameters",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    assetCode = assetCode.toUpperCase();

    // Validate addresses
    if (address === user.stellarPublicKey) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Sender and receiver address cannot be the same.",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    if (!WalletHelper.isValidStellarAddress(address)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid Stellar address",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Determine asset details
    const asset =
      assetCode !== "NATIVE"
        ? {
            code: assetCode,
            issuer:
              process.env.STELLAR_NETWORK === "public"
                ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
                : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS]
                    .issuer,
          }
        : { code: "XLM", issuer: "", type: "native" };

    // Get current balance for validation
    const sourceAccount = await server.getAccount(user.stellarPublicKey);
    const balance = sourceAccount.balances.find(
      (b: any) =>
        (assetCode === "NATIVE" && b.asset_type === "native") ||
        (b.asset_code === assetCode && b.asset_issuer === asset.issuer)
    );

    if (!balance) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: `No balance found for ${assetCode}`,
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    const availableBalance = parseFloat(balance.balance);
    const paymentAmount = parseFloat(amount);
    const fee = parseFloat(process.env.FEE || "0.00001");

    // Check sufficient balance
    if (availableBalance < paymentAmount + fee) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Insufficient balance for payment and fee",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Prepare transaction details
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
      network: process.env.STELLAR_NETWORK,
      memo: transactionDetails,
      timestamp: new Date().toISOString(),
      expiration: new Date(Date.now() + 5 * 60 * 1000).toISOString(), // 5 minutes expiration
      fiatDetails:
        currencyType === WithdrawalEnum.FIAT
          ? {
              accountNumber,
              accountName,
              bankName,
            }
          : undefined,
    };

    // Generate confirmation token
    const confirmationToken = generateConfirmationToken(paymentDetails);

    return res.status(httpStatus.OK).json({
      data: {
        paymentDetails,
        confirmationToken,
      },
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error generating payment preview:", error);
    return res.status(httpStatus.BAD_REQUEST).json({
      message: error.message || "Error generating payment preview",
      status: httpStatus.BAD_REQUEST,
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
    if (address === user.stellarPublicKey) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Sender and receiver address cannot be the same.",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }
    if (!WalletHelper.isValidStellarAddress(address)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid Stellar address",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

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

function getRouteDetails(
  paths: any[],
  sourceAssetCode: string,
  desAssetCode: string
): any[] {
  try {
    if (!paths || paths.length === 0) return [];

    // Get the best path (first one)
    const bestPath = paths[0];

    // Extract all assets in the path
    const route = [];

    // Add source asset
    route.push({
      asset: sourceAssetCode,
      type: sourceAssetCode === "XLM" ? "native" : "credit_alphanum",
      issuer: sourceAssetCode === "XLM" ? "" : bestPath.source_asset_issuer,
    });

    // Add intermediate assets
    if (bestPath.path && bestPath.path.length > 0) {
      bestPath.path.forEach((asset: any) => {
        route.push({
          asset: asset.asset_code || "XLM",
          type: asset.asset_type === "native" ? "native" : "credit_alphanum",
          issuer: asset.asset_issuer || "",
        });
      });
    }

    // Add destination asset
    route.push({
      asset: desAssetCode,
      type: desAssetCode === "XLM" ? "native" : "credit_alphanum",
      issuer: desAssetCode === "XLM" ? "" : bestPath.destination_asset_issuer,
    });

    // Simplify route by merging consecutive duplicates
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
    return []; // Return empty array on error
  }
}

function calculatePriceImpact(
  paths: any[],
  sourceAmount: string,
  desAmount: string
): string {
  try {
    if (!paths || paths.length === 0) return "0%";

    // Get the best path (first one in Stellar's path payment results)
    const bestPath = paths[0];

    // Get the ideal price without slippage (from the first path)
    const idealPrice =
      parseFloat(bestPath.destination_amount) /
      parseFloat(bestPath.source_amount);

    // Get the actual price with slippage
    const actualPrice = parseFloat(desAmount) / parseFloat(sourceAmount);

    // Calculate price impact percentage
    const priceImpact = ((idealPrice - actualPrice) / idealPrice) * 100;

    // Format to 2 decimal places and ensure it's not negative
    const formattedImpact = Math.max(0, priceImpact).toFixed(2);

    return `${formattedImpact}%`;
  } catch (error) {
    console.error("Error calculating price impact:", error);
    return "0%"; // Fallback to 0% on error
  }
}
export const swapPreview = async (req: any, res: any) => {
  try {
    let { slippage, sourceAssetCode, desAssetCode, sourceAmount } = req.body;
    slippage *= 1;

    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

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
    console.log(paths);
    const desAmount = paths?.filter(
      (pth: any) =>
        pth.destination_asset_type === desAssetIssuer ||
        desAssetCode.startsWith(pth.destination_asset_code)
    )[0].destination_amount;

    const destMin = (((100 - slippage) * parseFloat(desAmount)) / 100).toFixed(
      7
    );

    // Return the swap details for confirmation
    return res.status(httpStatus.OK).json({
      data: {
        swapDetails: {
          sourceAsset: sourceAssetCode,
          destinationAsset: desAssetCode,
          sourceAmount: sourceAmount,
          expectedDestinationAmount: desAmount,
          minimumReceived: destMin,
          slippage: slippage + "%",
          fee: process.env.FEE,
          network: process.env.STELLAR_NETWORK,
          exchangeRate: (
            parseFloat(desAmount) / parseFloat(sourceAmount)
          ).toFixed(7),
          priceImpact: calculatePriceImpact(paths, sourceAmount, desAmount),
          route: getRouteDetails(paths, sourceAssetCode, desAssetCode),
        },
      },
      message: "Swap preview generated successfully.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error generating swap preview.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error generating swap preview.",
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
          destMin: destMin, // Set the minimum destination amount.
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.
    // Sign the transaction using the user's decrypted private key.
    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      "swap"
    );
    console.log({ resp });

    if (!resp.status) {
      return res.status(httpStatus.BAD_REQUEST).json({
        data: { hash: resp.details.hash },
        message: resp.userMessage || resp.msg,
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Return the transaction response.
    return res.status(httpStatus.OK).json({
      data: { hash: resp.hash },
      message: resp.userMessage || resp.msg,
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

export const strictSendPreview = async (req: any, res: any) => {
  try {
    let { desAddress, slippage, assetCode, amount, desAmount } = req.body;

    slippage *= 1;

    if (!WalletHelper.isValidStellarAddress(desAddress)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid Address",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
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

    const destMin = (((100 - slippage) * parseFloat(_desAmount)) / 100).toFixed(
      7
    );

    // Return the transaction details for confirmation
    return res.status(httpStatus.OK).json({
      data: {
        transactionDetails: {
          sourceAsset: assetCode,
          destinationAsset: assetCode,
          sourceAmount: amount,
          estimatedDestinationAmount: _desAmount,
          minimumDestinationAmount: destMin,
          destinationAddress: desAddress,
          slippage: slippage,
          fee: process.env.FEE,
          network: process.env.STELLAR_NETWORK,
        },
      },
      message: "Strict send preview generated successfully.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error generating strict send preview.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error generating strict send preview.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const strictSend = async (req: any, res: any) => {
  try {
    const user = req.user;
    let { desAddress, slippage, assetCode, amount } = req.body;
    // Ensure the slippage value is a number.
    slippage *= 1;

    // Validate the destination Stellar address.
    if (!WalletHelper.isValidStellarAddress(desAddress)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid Address",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Determine the source asset issuer based on the network configuration.
    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Determine the destination asset issuer based on the network configuration.
    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[assetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Find the payment path from the source asset to the destination asset.
    const _paths: any = await WalletHelper.sendPaymentPath({
      sourceAssetCode: assetCode,
      sourceAssetIssuer,
      desAssetCode: assetCode,
      desAssetIssuer,
      amount: amount.toString(),
    });

    // Extract the hashed password from the account object.
    const hashedPassword = user.password;
    const paths = _paths.data.sendPaymentPath;
    // Decrypt the user's private key using their encrypted private key,
    // primary email, hashed password, and pin code.
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // Calculate the destination amount based on the provided amount or the paths.
    const _desAmount: any =
      amount ||
      paths.filter(
        (pth: any) =>
          pth.destination_asset_type === desAssetIssuer ||
          assetCode.startsWith(pth.destination_asset_code)
      )[0].destination_amount;

    // Create the source asset object.
    const sourceAsset =
      assetCode !== "NATIVE"
        ? new StellarSdk.Asset(assetCode, sourceAssetIssuer)
        : StellarSdk.Asset.native();

    // Create the destination asset object.
    const desAsset =
      assetCode !== "NATIVE"
        ? new StellarSdk.Asset(assetCode, desAssetIssuer)
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
          sendAmount: amount.toString(), // Set the source amount.
          destination: desAddress, // Set the destination address.
          destAsset: desAsset, // Set the destination asset.
          destMin: destMin, // Set the minimum destination amount.
        })
      )
      .setTimeout(process.env.TIMEOUT) // Set the transaction timeout.
      .build(); // Build the transaction.
    // Sign the transaction using the user's decrypted private key.

    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      "strictSend"
    );
    if (!resp.status) {
      return res.status(httpStatus.BAD_REQUEST).json({
        data: { hash: resp.details.hash },
        message: resp.userMessage || resp.msg,
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Return the transaction response.
    return res.status(httpStatus.OK).json({
      data: { hash: resp.hash },
      message: resp.userMessage || resp.msg,
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

export const strictReceivePreview = async (req: any, res: any) => {
  try {
    let { slippage, desAddress, sourceAssetCode, desAssetCode, desAmount } =
      req.body;
    slippage = parseFloat(slippage) || 0;

    if (!WalletHelper.isValidStellarAddress(desAddress)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid Address",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Get issuers for both assets (depends on network)
    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Ask Stellar for payment paths (strict receive)
    const _paths: any = await WalletHelper.receivePaymentPath({
      sourceAssetCode,
      sourceAssetIssuer,
      desAssetCode,
      desAssetIssuer,
      amount: desAmount,
    });

    const paths = _paths?.data?.receivePaymentPath || [];

    if (!paths.length) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "No payment path found for the given assets and amount.",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // Take best path (lowest source amount)
    const bestPath = paths[0];
    const _sourceAmount = bestPath.source_amount;

    const sendMax = (
      (100 * parseFloat(_sourceAmount)) /
      (100 - slippage)
    ).toFixed(7);

    // Return the transaction details for confirmation
    return res.status(httpStatus.OK).json({
      data: {
        transactionDetails: {
          sourceAsset: sourceAssetCode,
          destinationAsset: desAssetCode,
          sourceAmount: _sourceAmount,
          destinationAmount: desAmount,
          destinationAddress: desAddress,
          slippage,
          estimatedSendMax: sendMax,
          fee: process.env.FEE,
          network: process.env.STELLAR_NETWORK,
        },
      },
      message: "Strict receive preview generated successfully.",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.error("Error generating strict receive preview.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error generating strict receive preview.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};

export const strictReceive = async (req: any, res: any) => {
  try {
    let { slippage, desAddress, sourceAssetCode, desAssetCode, desAmount } =
      req.body;
    const user = req.user;
    slippage = parseFloat(slippage) || 0;

    // ✅ Validate destination address
    if (!WalletHelper.isValidStellarAddress(desAddress)) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "Invalid Address",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // ✅ Get issuers for both assets
    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // ✅ Decrypt user’s private key
    const hashedPassword = user.password;
    const decryptedPrivateKey = WalletDecryption.decryptPrivateKey(
      user.encryptedPrivateKey,
      `${user.primaryEmail}${hashedPassword}${user.pinCode}`
    );

    // ✅ Query payment paths (strict receive)
    const _paths: any = await WalletHelper.receivePaymentPath({
      sourceAssetCode,
      sourceAssetIssuer,
      desAssetCode,
      desAssetIssuer,
      amount: desAmount,
    });

    const paths = _paths?.data?.receivePaymentPath || [];

    if (!paths.length) {
      return res.status(httpStatus.BAD_REQUEST).json({
        message: "No payment path found for the given assets and amount.",
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    // ✅ Use best path (lowest source amount)
    const bestPath = paths[0];
    const _sourceAmount = bestPath.source_amount;

    // ✅ Build asset objects
    const sourceAsset =
      sourceAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(sourceAssetCode, sourceAssetIssuer)
        : StellarSdk.Asset.native();

    const desAsset =
      desAssetCode !== "NATIVE"
        ? new StellarSdk.Asset(desAssetCode, desAssetIssuer)
        : StellarSdk.Asset.native();

    // ✅ Calculate send max (with slippage)
    const sendMax = (
      (100 * parseFloat(_sourceAmount)) /
      (100 - slippage)
    ).toFixed(7);

    // ✅ Load source account
    const sourceAccount = await server.getAccount(user.stellarPublicKey);

    // ✅ Build transaction
    const transaction = new StellarSdk.TransactionBuilder(sourceAccount, {
      fee: process.env.FEE,
      networkPassphrase:
        process.env.STELLAR_NETWORK === "public"
          ? Networks.PUBLIC
          : Networks.TESTNET,
    })
      .addOperation(
        StellarSdk.Operation.pathPaymentStrictReceive({
          sendAsset: sourceAsset,
          sendMax,
          destination: desAddress,
          destAsset: desAsset,
          destAmount: desAmount.toString(),
        })
      )
      .setTimeout(parseInt(process.env.TIMEOUT || "60", 10))
      .build();

    // ✅ Sign + Submit
    const resp: any = await WalletHelper.execTranst(
      transaction,
      StellarSdk.Keypair.fromSecret(decryptedPrivateKey),
      "strictReceive"
    );

    if (!resp.status) {
      return res.status(httpStatus.BAD_REQUEST).json({
        data: { hash: resp.details?.hash },
        message: resp.userMessage || resp.msg,
        status: httpStatus.BAD_REQUEST,
        success: false,
      });
    }

    return res.status(httpStatus.OK).json({
      data: { hash: resp.hash },
      message: resp.userMessage || resp.msg,
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.error("Error handling strict receive.", error);
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
    const { cursor, limit, order } = req.query;
    const server = new Server(
      `${process.env.STELLAR_NETWORK}` === "public"
        ? `${process.env.HORIZON_MAINNET_URL}`
        : `${process.env.HORIZON_TESTNET_URL}`
    );
    // First, check if the account exists
    try {
      const account = await server.loadAccount(user.stellarPublicKey);
    } catch (error) {
      return res.status(httpStatus.NOT_FOUND).json({
        message:
          "Fund your wallet with at least 5 XLM to activate your account.",
        status: httpStatus.NOT_FOUND,
        success: false,
      });
    }

    // Set up the initial call builder with query parameters
    let callBuilder = server
      .transactions()
      .forAccount(user.stellarPublicKey)
      .order(order === "asc" ? "asc" : "desc") // Default to descending
      .limit(Math.min(parseInt(limit) || 10, 200)); // Default 10, max 200

    // If cursor is provided, start from that point
    if (cursor) {
      callBuilder.cursor(cursor);
    }

    // Get the page of transactions
    const page = await callBuilder.call();
    const transactions = page.records;

    // Process operations for the fetched transactions
    const BATCH_SIZE = 5;
    const allOperations: any[] = [];

    for (let i = 0; i < transactions.length; i += BATCH_SIZE) {
      const batch = transactions.slice(i, i + BATCH_SIZE);
      const batchOperations = await Promise.all(
        batch.map(async (tx: any) => {
          try {
            const operationsResponse = await server
              .operations()
              .forTransaction(tx.id)
              .limit(200)
              .call();
            return operationsResponse.records;
          } catch (error) {
            console.error(`Error fetching operations for tx ${tx.id}:`, error);
            return [];
          }
        })
      );
      allOperations.push(...batchOperations.flat());
    }

    return res.status(httpStatus.OK).json({
      data: {
        paging: {
          next: page.next
            ? page.next().then((p: any) => p.records.length)
            : null,
          prev: page.prev
            ? page.prev().then((p: any) => p.records.length)
            : null,
          count: transactions.length,
          cursor:
            page.records.length > 0
              ? page.records[page.records.length - 1].paging_token
              : null,
        },
        transactions,
        operations: allOperations,
      },
      message: "Transactions fetched successfully",
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
    const page = parsedQuery.page ?? 1;
    const skip = (page - 1) * limit;
    const fiatTransactions = await TransactionHistory.find({
      user: new Types.ObjectId(user._id),
    })
      .sort({ createdAt: -1 })
      .skip(skip)
      .limit(limit)
      .lean();

    return res.status(httpStatus.OK).json({
      data: fiatTransactions,
      message: "Fiat transactions fetched successfully",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching fiat transactions",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
