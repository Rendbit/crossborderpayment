/**
 * This file contains controllers for handling various Horizon API queries and related operations.
 * It includes functions for fetching conversion rates, retrieving wallet assets, managing trust lines,
 * fetching payment paths, and querying user details. These controllers interact with external APIs
 * such as CoinMarketCap, Stellar Expert, and Horizon API to provide the required data and perform
 * necessary calculations for the application's functionality.
 */

import { Request, Response } from "express";
import httpStatus from "http-status";
import {
  AllWalletAssetsQuerySchema,
  ConversionRequestSchema,
  FetchAssetsSchema,
  GetPathSchema,
} from "../validators/horizonQueries";
import { PUBLIC_ASSETS, TESTNET_ASSETS } from "../common/assets";
import { WalletHelper } from "../helpers/wallet.helper";
import { PaginationQuerySchema } from "../validators/pagination";
import { User } from "../models/User";

/**
 * Fetches the conversion rate of a specified currency (e.g., Nigerian Naira - NGN) to a target currency using the CoinMarketCap API.
 *
 * @param req - The Express request object containing the request details.
 * @param res - The Express response object for sending the response.
 * @returns A Promise that resolves to the response containing the conversion rates or an error message.
 *
 * The function performs the following steps:
 * 1. Fetches the list of fiat currencies from the CoinMarketCap API to retrieve the ID of the specified currency.
 * 2. Uses the retrieved currency ID to fetch the conversion rate of the specified currency to a target currency (e.g., USD).
 * 3. Returns the conversion rates in the response or an appropriate error message if any step fails.
 */

export const getConversionRates = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Parse the input amount and symbol from the request body
    const { inputAmount, symbol }: ConversionRequest =
      ConversionRequestSchema.parse(req.body);

    // Set up headers for the API requests, including the CoinMarketCap API key
    const headers = {
      "X-CMC_PRO_API_KEY": `${process.env.CMC_PRO_API_KEY}`,
    };

    // Construct the URL to fetch XLM rates from the CoinMarketCap API
    const xlmUrl = `${process.env.CMC_API_URL}${symbol}`;
    const xlmResponse = await fetch(xlmUrl, { headers });
    const xlmData = await xlmResponse.json();

    // Check if the XLM data is available in the API response
    if (!xlmData.data || !xlmData.data.XLM) {
      return res.error({
        message: "Failed to fetch XLM rates",
        status: httpStatus.EXPECTATION_FAILED,
      });
    }

    // Calculate the conversion rates for XLM to the target currency and vice versa
    const xlmToCurrency = xlmData.data.XLM.quote[symbol]?.price;
    const currencyToXlm = Number(inputAmount) / xlmToCurrency;

    // Fetch the list of fiat currencies from the CoinMarketCap API
    const fiatMapResponse = await fetch(
      `https://pro-api.coinmarketcap.com/v1/fiat/map`,
      { headers }
    );

    // Check if the fiat currency data request was successful
    if (!fiatMapResponse.ok) {
      return res.error({
        message: "Error fetching currency data",
        status: httpStatus.EXPECTATION_FAILED,
      });
    }

    // Parse the fiat currency data from the API response
    const fiatData = await fiatMapResponse.json();
    const currencyData = fiatData?.data?.find(
      (currency: { symbol: string }) => currency.symbol === symbol
    );

    // Check if the target currency is found in the CoinMarketCap data
    if (!currencyData) {
      return res.error({
        message: `${symbol} not found in CoinMarketCap data`,
        status: httpStatus.EXPECTATION_FAILED,
      });
    }

    // Fetch the conversion rate of the target currency to USD
    const conversionResponse = await fetch(
      `https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=1&id=${currencyData.id}&convert=USD`,
      { headers }
    );

    // Check if the conversion rate request was successful
    if (!conversionResponse.ok) {
      return res.error({
        message: "Error fetching conversion data",
        status: httpStatus.EXPECTATION_FAILED,
      });
    }

    // Parse the conversion rate data from the API response
    const conversionData = await conversionResponse.json();
    const usdToCurrencyRate = conversionData?.data?.quote?.USD?.price || 0;

    return res.success({
      data: {
        xlmToCurrency,
        currencyToXlm,
        usdToCurrencyRate,
        currencyToUsd: 1 / usdToCurrencyRate,
      },
      status: httpStatus.OK,
    });
  } catch (error: any) {
    console.error("Error fetching conversion rates:", error);
    return res.error({
      message: error.message || "Error fetching conversion rates",
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Fetches and calculates the conversion rates for a list of tokens based on the provided currency type.
 * This function retrieves data from multiple APIs, processes the token list, and computes equivalent balances
 * in USD, NGN, and the selected currency type. It also categorizes tokens into yield and non-yield assets
 * and calculates their respective total balances.
 *
 * @param param - An object containing the token list and the target currency type.
 * @param param.tokenList - An array of tokens, each containing details such as `asset_code` and `balance`.
 * @param param.currencyType - The target currency type to convert the token balances into.
 *
 * @returns A promise that resolves to an object containing:
 * - `tokenList`: The updated token list with equivalent balances in USD, NGN, and the selected currency.
 * - `allWalletTotalBalanceInSelectedCurrency`: Total balance of all tokens in the selected currency.
 * - `allWalletTotalBalanceInUsd`: Total balance of all tokens in USD.
 * - `allWalletTotalBalanceInNgn`: Total balance of all tokens in NGN.
 * - `nonYieldWalletTotalBalanceInSelectedCurrency`: Total balance of non-yield tokens in the selected currency.
 * - `nonYieldWalletTotalBalanceInUsd`: Total balance of non-yield tokens in USD.
 * - `yieldWalletTotalBalanceInSelectedCurrency`: Total balance of yield tokens in the selected currency.
 * - `yieldWalletTotalBalanceInUsd`: Total balance of yield tokens in USD.
 * - `yieldWalletTotalBalanceInNgn`: Total balance of yield tokens in NGN.
 * - `nonYieldWalletTotalBalanceInNgn`: Total balance of non-yield tokens in NGN.
 *
 * @throws An error if there is an issue fetching data from the APIs or processing the token list.
 */
export const getConversionRate = async (
  param: GetConversionRate
): Promise<any> => {
  try {
    // Filter out tokens that are not yield assets (those whose asset_code does not start with "y")
    const tokens = param.tokenList.filter(
      (asset: { asset_code: string }) => !asset.asset_code.startsWith("y")
    );

    // Map the asset codes to their corresponding symbols for API requests
    const symbols = tokens
      .map((token: { asset_code: string }) => {
        if (token.asset_code === "NATIVE") {
          return "XLM"; // Native Stellar asset
        } else if (token.asset_code === "NGNC") {
          return "NGN"; // Nigerian Naira
        } else {
          return token.asset_code.toUpperCase(); // Other assets
        }
      })
      .join(",");

    // Construct API URLs for fetching conversion rates in the selected currency, USD, and NGN
    const url = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=${param.currencyType
      .trim()
      .toUpperCase()}`;
    const usdUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=USD`;
    const ngnUrl = `https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest?symbol=${symbols}&convert=NGN`;
    const currencyUrl = `https://api.exchangerate-api.com/v4/latest/USD`;

    // Set headers for the API requests, including the CoinMarketCap API key
    const headers = {
      "X-CMC_PRO_API_KEY": `${process.env.CMC_PRO_API_KEY}`,
    };

    // Fetch data from the APIs concurrently
    const [response, usdResponse, ngnResponse, currencyRespose] =
      await Promise.all([
        fetch(url, { headers }), // Fetch rates for the selected currency
        fetch(usdUrl, { headers }), // Fetch rates in USD
        fetch(ngnUrl, { headers }), // Fetch rates in NGN
        fetch(currencyUrl, { headers }), // Fetch currency exchange rates
      ]);

    // Check if the responses are successful, throw errors if any request fails
    if (!response.ok) {
      throw new Error("Failed to fetch asset rates for the selected currency");
    }
    if (!usdResponse.ok) {
      throw new Error("Failed to fetch asset rates in USD");
    }
    if (!ngnResponse.ok) {
      throw new Error("Failed to fetch asset rates in NGN");
    }
    if (!currencyRespose.ok) {
      throw new Error("Failed to fetch currency exchange rates");
    }

    // Parse the JSON responses from the APIs
    const [data, usdData, ngnData, currencyData] = await Promise.all([
      response.json(),
      usdResponse.json(),
      ngnResponse.json(),
      currencyRespose.json(),
    ]);
  
    // Iterate through each token in the token list to calculate equivalent balances
    param.tokenList.forEach((token) => {
      let assetCode = token.asset_code;

      // Remove the "y" prefix from yield assets to get the actual asset code
      if (assetCode.startsWith("y")) {
        assetCode = assetCode.substring(1);
      }

      // Determine the symbol for the asset based on its code
      const symbol =
        assetCode === "NATIVE"
          ? "XLM" // Native Stellar asset
          : assetCode === "NGNC"
          ? "NGN" // Nigerian Naira
          : assetCode.toUpperCase(); // Other assets

      // Check if the asset data exists in the fetched data
      if (data.data && data.data[symbol]) {
        // Retrieve the conversion rates for the selected currency, USD, and NGN
        const selectedCurrencyRate =
          data.data[symbol].quote[param.currencyType.trim().toUpperCase()]
            .price;
        const usdRate = usdData.data[symbol].quote.USD.price;
        const ngnRate = ngnData.data[symbol].quote.NGN.price;

        // Calculate the equivalent balances for the token in USD, NGN, and the selected currency
        token.equivalentBalanceInUsd =
          symbol === "NGN" || symbol === "GHS"
            ? token.balance / currencyData.rates[symbol] // For fiat currencies
            : usdRate * token.balance; // For cryptocurrencies
        token.equivalentBalanceInNgn = ngnRate * token.balance;
        token.equivalentBalanceInSelectedCurrency =
          selectedCurrencyRate * token.balance;
      } else {
        // If asset data is not available, set equivalent balances to 0
        token.equivalentBalanceInUsd = 0;
        token.equivalentBalanceInNgn = 0;
        token.equivalentBalanceInSelectedCurrency = 0;
      }
    });

    // Calculate total balances in selected currency, USD, and NGN for all wallet assets
    // Also, categorize assets into yield and non-yield assets
    const [
      allWalletTotalBalanceInSelectedCurrency,
      allWalletTotalBalanceInUsd,
      allWalletTotalBalanceInNgn,
      yieldAssets,
      nonYieldAssets,
    ] = await Promise.all([
      // Sum up equivalent balances in the selected currency for all assets
      param.tokenList.reduce(
        (total, token) => total + token.equivalentBalanceInSelectedCurrency,
        0
      ),
      // Sum up equivalent balances in USD for all assets
      param.tokenList.reduce(
        (total, token) => total + token.equivalentBalanceInUsd,
        0
      ),
      // Sum up equivalent balances in NGN for all assets
      param.tokenList.reduce(
        (total, token) => total + token.equivalentBalanceInNgn,
        0
      ),
      // Filter out yield assets (assets whose code starts with "y")
      param.tokenList.filter((asset) => asset.asset_code.startsWith("y")),
      // Filter out non-yield assets (assets whose code does not start with "y")
      param.tokenList.filter((asset) => !asset.asset_code.startsWith("y")),
    ]);


    // Calculate total balances for yield and non-yield assets in selected currency, USD, and NGN
    const [
      yieldWalletTotalBalanceInSelectedCurrency,
      yieldWalletTotalBalanceInUsd,
      yieldWalletTotalBalanceInNgn,
      nonYieldWalletTotalBalanceInSelectedCurrency,
      nonYieldWalletTotalBalanceInUsd,
      nonYieldWalletTotalBalanceInNgn,
    ] = await Promise.all([
      // Sum up equivalent balances in the selected currency for yield assets
      yieldAssets.reduce(
        (total, token) => total + token.equivalentBalanceInSelectedCurrency,
        0
      ),
      // Sum up equivalent balances in USD for yield assets
      yieldAssets.reduce(
        (total, token) => total + token.equivalentBalanceInUsd,
        0
      ),
      // Sum up equivalent balances in NGN for yield assets
      yieldAssets.reduce(
        (total, token) => total + token.equivalentBalanceInNgn,
        0
      ),

      // Sum up equivalent balances in the selected currency for non-yield assets
      nonYieldAssets.reduce(
        (total, token) => total + token.equivalentBalanceInSelectedCurrency,
        0
      ),
      // Sum up equivalent balances in USD for non-yield assets
      nonYieldAssets.reduce(
        (total, token) => total + token.equivalentBalanceInUsd,
        0
      ),
      // Sum up equivalent balances in NGN for non-yield assets
      nonYieldAssets.reduce(
        (total, token) => total + token.equivalentBalanceInNgn,
        0
      ),
    ]);

    return {
      data: {
        tokenList: param.tokenList,
        allWalletTotalBalanceInSelectedCurrency,
        allWalletTotalBalanceInUsd,
        allWalletTotalBalanceInNgn,
        nonYieldWalletTotalBalanceInSelectedCurrency,
        nonYieldWalletTotalBalanceInUsd,
        yieldWalletTotalBalanceInSelectedCurrency,
        yieldWalletTotalBalanceInUsd,
        yieldWalletTotalBalanceInNgn,
        nonYieldWalletTotalBalanceInNgn,
      },
    };
  } catch (error: any) {
    console.log("Error fetching conversion rate. ", error);
    throw new Error("Error fetching all wallet assets.");
  }
};

/**
 * Retrieves all wallet assets for a user, processes the data, and calculates balances in various currencies.
 *
 * @param req - The Express request object containing user and query details.
 * @param res - The Express response object for sending the response.
 * @returns A Promise that resolves to the response containing wallet assets and their calculated balances or an error if their is any.
 *
 * The function performs the following steps:
 * 1. Fetches wallet assets from the Horizon API based on the user's Stellar public key.
 * 2. Processes the fetched data to format it and include additional details like asset images and names.
 * 3. Calls the `getConversionRate` function to calculate equivalent balances in USD, NGN, and the selected currency.
 * 4. Categorizes assets into yield and non-yield assets and sorts them based on balance and asset type.
 * 5. Returns the processed data, including total balances and sorted asset lists, in the response.
 */
export const getAllWalletAssets = async (req: any, res: Response) => {
  try {
    const user = req.user;
    const { currencyType }: GetAllWalletAssets =
      AllWalletAssetsQuerySchema.parse(req.query);
    // Construct the URL to fetch wallet assets from the Horizon API based on the network
    const url: string = `${
      process.env.STELLAR_NETWORK == "public"
        ? process.env.HORIZON_MAINNET_URL
        : process.env.HORIZON_TESTNET_URL
    }/accounts/${user.stellarPublicKey}`;

    // Fetch wallet assets data from the Horizon API
    const resp = await fetch(url);
    if (!resp.ok) {
      return res.error({
        message: "Failed to get all assets",
        status: httpStatus.EXPECTATION_FAILED,
      });
    }
    const walletAssets = await resp.json();

    // Process the fetched data and format the response
    const data = walletAssets.balances;
    const resData: any[] = [];

    // Iterate through the fetched wallet assets and process each asset
    for (let i = 0; i < data.length; i++) {
      const assetCode: keyof typeof PUBLIC_ASSETS =
        data[i].asset_code || "NATIVE"; // Default to "NATIVE" if asset_code is not provided
      const assetIssuer = data[i].asset_issuer || "native"; // Default to "native" if asset_issuer is not provided

      let image: string;
      let assetName: string;
      let symbolId: string;

      // Determine the asset details (image, name, symbolId) based on whether it's a native asset or not
      if (assetIssuer === "native") {
        image = PUBLIC_ASSETS["NATIVE"].image;
        assetName = PUBLIC_ASSETS["NATIVE"].name;
        symbolId = PUBLIC_ASSETS["NATIVE"].symbolId;
      } else {
        image = PUBLIC_ASSETS[assetCode].image;
        assetName = PUBLIC_ASSETS[assetCode].name;
        symbolId = PUBLIC_ASSETS[assetCode].symbolId;
      }

      // Push the processed asset details into the response data array
      resData.push({
        asset_code: assetCode,
        asset_name: assetName,
        asset_issuer: assetIssuer,
        symbol_id: symbolId,
        balance: Number(data[i].balance), // Convert balance to a number
        trust_limit: Number(data[i].limit || 0), // Convert trust limit to a number, default to 0 if not provided
        image: image,
      });
    }

    // Fetch conversion rates for the processed wallet assets
    const allAssets = await getConversionRate({
      tokenList: resData,
      currencyType: currencyType.trim().toLowerCase(), // Use the provided currency type
    });

    // Separate the assets into yield and non-yield categories
    const yieldAssets = allAssets.data.tokenList.filter(
      (asset: { asset_code: string }) => asset.asset_code.startsWith("y") // Yield assets start with "y"
    );
    const nonYieldAssets = allAssets.data.tokenList.filter(
      (asset: { asset_code: string }) => !asset.asset_code.startsWith("y") // Non-yield assets do not start with "y"
    );

    // Sort all wallet assets based on balance and asset type
    const sortedAllWalletAssets = allAssets.data.tokenList.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        if (a.balance !== b.balance) {
          return b.balance - a.balance; // Sort by balance in descending order
        }

        // Prioritize specific asset types (e.g., Bitcoin, Ethereum, Lumens, Naira)
        const aIsBitcoin = a.asset_code.toLowerCase() === "btc";
        const bIsBitcoin = b.asset_code.toLowerCase() === "btc";
        const aIsEthereum = a.asset_code.toLowerCase() === "eth";
        const bIsEthereum = b.asset_code.toLowerCase() === "eth";
        const aIsLumens = a.asset_code.toLowerCase() === "xlm";
        const bIsLumens = b.asset_code.toLowerCase() === "xlm";
        const aIsNaira = a.asset_code.toLowerCase() === "ngnc";
        const bIsNaira = b.asset_code.toLowerCase() === "ngnc";

        if (aIsBitcoin) return -1;
        if (bIsBitcoin) return 1;
        if (aIsEthereum) return aIsBitcoin ? 1 : -1;
        if (bIsEthereum) return bIsBitcoin ? -1 : 1;
        if (aIsLumens) return aIsBitcoin ? -1 : 1;
        if (bIsLumens) return bIsBitcoin ? 1 : -1;
        if (aIsNaira) return aIsBitcoin ? -1 : 1;
        if (bIsNaira) return bIsBitcoin ? 1 : -1;

        return a.asset_name.localeCompare(b.asset_name); // Sort alphabetically by asset name
      }
    );

    // Sort yield assets based on balance and asset type
    const sortedYieldAssets = yieldAssets.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        if (a.balance !== b.balance) {
          return b.balance - a.balance; // Sort by balance in descending order
        }

        // Prioritize specific asset types (e.g., Bitcoin, Ethereum, Lumens, Naira)
        const aIsBitcoin = a.asset_code.toLowerCase() === "btc";
        const bIsBitcoin = b.asset_code.toLowerCase() === "btc";
        const aIsEthereum = a.asset_code.toLowerCase() === "eth";
        const bIsEthereum = b.asset_code.toLowerCase() === "eth";
        const aIsLumens = a.asset_code.toLowerCase() === "xlm";
        const bIsLumens = b.asset_code.toLowerCase() === "xlm";
        const aIsNaira = a.asset_code.toLowerCase() === "ngnc";
        const bIsNaira = b.asset_code.toLowerCase() === "ngnc";

        if (aIsBitcoin) return -1;
        if (bIsBitcoin) return 1;
        if (aIsEthereum) return aIsBitcoin ? 1 : -1;
        if (bIsEthereum) return bIsBitcoin ? -1 : 1;
        if (aIsLumens) return aIsBitcoin ? -1 : 1;
        if (bIsLumens) return bIsBitcoin ? 1 : -1;
        if (aIsNaira) return aIsBitcoin ? -1 : 1;
        if (bIsNaira) return bIsBitcoin ? 1 : -1;

        return a.asset_name.localeCompare(b.asset_name); // Sort alphabetically by asset name
      }
    );

    // Sort non-yield assets based on balance and asset type
    const sortedNonYieldAssets = nonYieldAssets.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        if (a.balance !== b.balance) {
          return b.balance - a.balance; // Sort by balance in descending order
        }

        // Prioritize specific asset types (e.g., Bitcoin, Ethereum, Lumens, Naira)
        const aIsBitcoin = a.asset_code.toLowerCase() === "btc";
        const bIsBitcoin = b.asset_code.toLowerCase() === "btc";
        const aIsEthereum = a.asset_code.toLowerCase() === "eth";
        const bIsEthereum = b.asset_code.toLowerCase() === "eth";
        const aIsLumens = a.asset_code.toLowerCase() === "xlm";
        const bIsLumens = b.asset_code.toLowerCase() === "xlm";
        const aIsNaira = a.asset_code.toLowerCase() === "ngnc";
        const bIsNaira = b.asset_code.toLowerCase() === "ngnc";

        if (aIsBitcoin) return -1;
        if (bIsBitcoin) return 1;
        if (aIsEthereum) return aIsBitcoin ? 1 : -1;
        if (bIsEthereum) return bIsBitcoin ? -1 : 1;
        if (aIsLumens) return aIsBitcoin ? -1 : 1;
        if (bIsLumens) return bIsBitcoin ? 1 : -1;
        if (aIsNaira) return aIsBitcoin ? -1 : 1;
        if (bIsNaira) return bIsBitcoin ? 1 : -1;

        return a.asset_name.localeCompare(b.asset_name); // Sort alphabetically by asset name
      }
    );

    return res.success({
      data: {
        currencyType: currencyType.trim().toUpperCase(),
        allWalletTotalBalanceInSelectedCurrency:
          allAssets.data.allWalletTotalBalanceInSelectedCurrency,
        allWalletTotalBalanceInUsd: allAssets.data.allWalletTotalBalanceInUsd,
        allWalletTotalBalanceInNgn: allAssets.data.allWalletTotalBalanceInNgn,
        yieldWalletTotalBalanceInSelectedCurrency:
          allAssets.data.yieldWalletTotalBalanceInSelectedCurrency,
        yieldWalletTotalBalanceInUsd:
          allAssets.data.yieldWalletTotalBalanceInUsd,
        yieldWalletTotalBalanceInNgn:
          allAssets.data.yieldWalletTotalBalanceInNgn,
        nonYieldWalletTotalBalanceInSelectedCurrency:
          allAssets.data.nonYieldWalletTotalBalanceInSelectedCurrency,
        nonYieldWalletTotalBalanceInUsd:
          allAssets.data.nonYieldWalletTotalBalanceInUsd,
        nonYieldWalletTotalBalanceInNgn:
          allAssets.data.nonYieldWalletTotalBalanceInNgn,
        allWalletAssets: sortedAllWalletAssets,
        yieldWalletAssets: sortedYieldAssets,
        nonYieldWalletAssets: sortedNonYieldAssets,
      },
      status: httpStatus.OK,
    });
  } catch (error: any) {
    console.log("Error fetching all wallet assets. ", error);
    return res.error({
      message: error.message || "Error fetching all wallet assets.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Retrieves all trust lines available in the system.
 *
 * @param req - The Express request object.
 * @param res - The Express response object for sending the response.
 * @returns A Promise that resolves to the response containing the trust lines.
 *
 * The function simply returns the predefined list of public assets as trust lines.
 */
export const getAllTrustLines = async (
  req: Request,
  res: Response
): Promise<any> => {
  return res.success({
    data: { trustLines: PUBLIC_ASSETS },
  });
};

/**
 * Retrieves the payment path for a given transaction type, source asset, destination asset, and amount.
 *
 * @param req - The Express request object containing the request details.
 * @param res - The Express response object for sending the response.
 * @returns A Promise that resolves to the response containing the payment paths or an error message.
 *
 * The function performs the following steps:
 * 1. Parses the request body to extract transaction type, source asset, destination asset, and amount.
 * 2. Determines the asset issuers based on the network configuration (public or testnet).
 * 3. Fetches the payment path based on the transaction type (send or receive).
 * 4. Returns the payment paths in the response or an appropriate error message if any step fails.
 */
export const getPath = async (req: Request, res: Response): Promise<any> => {
  try {
    const { txType, sourceAssetCode, desAssetCode, amount }: GetPathRequest =
      GetPathSchema.parse(req.body);
    // Determine the asset issuers based on the network configuration
    const sourceAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;
    const desAssetIssuer =
      process.env.STELLAR_NETWORK === "public"
        ? PUBLIC_ASSETS[desAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[desAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    // Determine the type of transaction (send or receive) and fetch the payment path
    const paths =
      txType === "receive"
        ? await WalletHelper.receivePaymentPath({
            sourceAssetCode: sourceAssetCode,
            sourceAssetIssuer,
            desAssetCode: desAssetCode,
            desAssetIssuer,
            amount: amount,
          })
        : await WalletHelper.sendPaymentPath({
            sourceAssetCode: sourceAssetCode,
            sourceAssetIssuer,
            desAssetCode: desAssetCode,
            desAssetIssuer,
            amount: amount,
          });

    return res.success({
      data: { paths },
    });
  } catch (error: any) {
    console.log("Error getting path.", error);
    return res.error({
      message: error.message || "Error getting path.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};

/**
 * Fetches assets from the Stellar Expert API based on the provided asset code and pagination parameters.
 *
 * @param req - The Express request object containing the request details.
 * @param res - The Express response object for sending the response.
 * @returns A Promise that resolves to the response containing the fetched assets or an error message.
 *
 * The function performs the following steps:
 * 1. Parses the request body to extract the asset code and query parameters for pagination.
 * 2. Constructs the API URL with the search criteria and sends a request to the Stellar Expert API.
 * 3. Extracts the asset records from the API response and returns them in the response.
 * 4. Handles errors and returns appropriate error messages if any step fails.
 */
export const fetchAssets = async (
    req: Request,
    res: Response
): Promise<any> => {
    try {
        const { assetCode } = FetchAssetsSchema.parse(req.body);
        const parsedQuery = PaginationQuerySchema.parse(req.query);
        const limit: number = parsedQuery.limit ?? 10;
        const page: number = parsedQuery.page ?? 0;

        // Fetch assets from the Stellar Expert API based on the search criteria
        const resp = await fetch(
            `https://api.stellar.expert/explorer/${
                process.env.STELLAR_NETWORK
            }/asset?${new URLSearchParams({
                search: assetCode,
                sort: "rating",
                order: "desc",
                limit: String(limit),
                cursor: String(page),
            })}`
        );
        if (!resp.ok) {
            return res.error({
                message: "Failed to fetch assets",
                status: httpStatus.EXPECTATION_FAILED,
            });
        }
        const json = await resp.json();

        // Extract and return the asset records from the API response
        const records = json._embedded?.records;
        return res.success({ data: { records } });
    } catch (error: any) {
        console.log("Error fetching assets. ", error);
        return res.error({
            message: error.message || "Error fetching assets",
            status: httpStatus.INTERNAL_SERVER_ERROR,
        });
    }
};

/**
 * Fetches user details based on the provided search type and input.
 *
 * @param req - The HTTP request object containing the body with `searchType` and `input`.
 * @param res - The HTTP response object used to send the response.
 * @returns A Promise that resolves to the user details if found, or an error response if not found or an error occurs.
 *
 * @throws Will log an error and return an error response if an exception occurs during the query.
 *
 * The `searchType` in the request body determines the field to search by (e.g., username, email, etc.),
 * and `input` is the value to search for. If a user is found, their profile details are returned.
 * If no user is found, a 404 error response is sent. In case of any other error, a 500 error response is sent.
 */
export const fetchUserDetailsWithInput = async (
  req: Request,
  res: Response
): Promise<any> => {
  try {
    // Extract the search type and input value from the request body
    const { searchType, input } = req.body;

    // Construct a query object dynamically based on the search type and input
    const query = {
      [searchType]: input,
    };

    // Query the database to find a user matching the search criteria
    const user = await User.findOne(
      query,
      "userProfileUrl username primaryEmail country rendbitId" // Select specific fields to return
    ).lean(); // Use lean() for a plain JavaScript object instead of a Mongoose document

    // If no user is found, return a 404 error response
    if (!user) {
      return res.error({
        message: "User not found",
        status: httpStatus.NOT_FOUND,
      });
    }

    return res.success({ data: { user } });
  } catch (error: any) {
    console.log("Error fetching user details with input. ", error);
    return res.error({
      message: error.message || "Error fetching user details",
      status: httpStatus.INTERNAL_SERVER_ERROR,
    });
  }
};
