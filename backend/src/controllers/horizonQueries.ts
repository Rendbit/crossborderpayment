/**
 * This file contains controllers for handling various Horizon API queries and related operations.
 * It includes functions for fetching conversion rates, retrieving wallet assets, managing trust lines,
 * fetching payment paths, and querying user details. These controllers interact with external APIs
 * such as CoinMarketCap, Stellar Expert, and Horizon API to provide the required data and perform
 * necessary calculations for the application's functionality.
 */

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
export const getConversionRates = async (req: any, res: any): Promise<any> => {
  try {
    const { inputAmount, inputSymbol, outputSymbol }: ConversionRequest =
      ConversionRequestSchema.parse(req.body);
    const fiatList = ["NGN", "GHS", "KES"]; // Updated to match cleaned symbols

    const cleanSymbol = (symbol: string) => {
      let upperSymbol = symbol.toUpperCase();
      if (upperSymbol === "NATIVE") return "XLM";

      if (upperSymbol.startsWith("Y")) upperSymbol = upperSymbol.slice(1);
      if (upperSymbol.endsWith("C")) upperSymbol = upperSymbol.slice(0, -1); // remove ending C

      return fiatList.includes(upperSymbol)
        ? upperSymbol
        : symbol.toUpperCase();
    };

    const input = cleanSymbol(inputSymbol);
    const output =
      outputSymbol.toUpperCase() === "NATIVE"
        ? "XLM"
        : outputSymbol.replace(/c/gi, "");

    const url = `https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=${inputAmount}&symbol=${input}&convert=${output}`;

    const response = await fetch(url, {
      method: "GET",
      headers: {
        "X-CMC_PRO_API_KEY": `${process.env.CMC_PRO_API_KEY}`,
        Accept: "application/json",
      },
    });

    const data = await response.json();
    if (!response.ok) {
      console.log({ data });
      throw new Error(`Error fetching conversion data: ${response.statusText}`);
    }

    const result = data.data;

    return res.status(200).json({
      data: {
        inputAmount,
        inputSymbol: input,
        outputSymbol: output,
        originalAmount: inputAmount,
        convertedAmount: result.quote[output].price,
        rate: result.quote[output].price / inputAmount,
      },
      success: true,
    });
  } catch (error: any) {
    console.log({ error });
    console.error("Conversion error:", error.message);
    return res.status(500).json({
      message: error.message || "Conversion failed",
      success: false,
    });
  }
};

/**
 * Fetches and calculates the conversion rates for a list of tokens based on the provided currency type.
 * This function retrieves data from multiple APIs, processes the token list, and computes equivalent balances
 * in USD, conversion currency type and the selected currency type. It also categorizes tokens into yield and non-yield assets
 * and calculates their respective total balances.
 *
 * @param param - An object containing the token list and the target currency type.
 * @param param.tokenList - An array of tokens, each containing details such as `asset_code` and `balance`.
 * @param param.currencyType - The target currency type to convert the token balances into.
 *
 * @returns A promise that resolves to an object containing:
 * - `tokenList`: The updated token list with equivalent balances in USD, conversion currency type and the selected currency.
 * - `allWalletTotalBalanceInSelectedCurrency`: Total balance of all tokens in the selected currency.
 * - `allWalletTotalBalanceInUsd`: Total balance of all tokens in USD.
 * - `allWalletTotalBalanceInSelectedCurrency`: Total balance of all tokens in conversion currency type.
 * - `nonYieldWalletTotalBalanceInSelectedCurrency`: Total balance of non-yield tokens in the selected currency.
 * - `nonYieldWalletTotalBalanceInUsd`: Total balance of non-yield tokens in USD.
 * - `yieldWalletTotalBalanceInSelectedCurrency`: Total balance of yield tokens in the selected currency.
 * - `yieldWalletTotalBalanceInUsd`: Total balance of yield tokens in USD.
 * - `yieldWalletTotalBalanceInNgn`: Total balance of yield tokens in conversion currency type.
 * - `nonYieldWalletTotalBalanceInNgn`: Total balance of non-yield tokens in conversion currency type.
 *
 * @throws An error if there is an issue fetching data from the APIs or processing the token list.
 */
export const getConversionRate = async (
  param: GetConversionRate
): Promise<any> => {
  try {
    // Filter out yield tokens (y-prefixed)
    const tokens = param.tokenList.filter(
      (asset: { asset_code: string }) => !asset.asset_code.startsWith("y")
    );

    // Map tokens to CoinMarketCap symbols
    const symbols = tokens
      .map((token: { asset_code: string }) => {
        if (token.asset_code === "NATIVE") return "XLM";
        if (token.asset_code.endsWith("C") || token.asset_code.endsWith("c"))
          return token.asset_code.slice(0, -1).toUpperCase();
        return token.asset_code.toUpperCase();
      })
      .join(",");

    // Normalize selected currency type
    const selectedCurrency =
      param.currencyType.toUpperCase() === "NATIVE"
        ? "XLM"
        : param.currencyType.endsWith("c") ||
          param.currencyType.endsWith("C") ||
          param.currencyType.startsWith("y")
        ? param.currencyType.slice(0, -1)
        : param.currencyType;

    // Dynamic conversion target (e.g. NGN, EUR, GBP, etc.)
    const conversionCurrency = param.currencyType?.toUpperCase();

    // API endpoints
    const baseUrl =
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
    const currencyUrl = "https://api.exchangerate-api.com/v4/latest/USD";

    const [usdUrl] = [`${baseUrl}?symbol=${symbols}&convert=USD`];

    // Headers
    const headers = {
      "X-CMC_PRO_API_KEY": `${process.env.CMC_PRO_API_KEY}`,
    };

    // Fetch data concurrently
    const [usdRes, currencyRes] = await Promise.all([
      fetch(usdUrl, { headers }),
      fetch(currencyUrl),
    ]);

    const [usdData, currencyData] = await Promise.all([
      usdRes.json(),
      currencyRes.json(),
    ]);

    if (!usdRes.ok) throw new Error("Failed to fetch USD rates");
    if (!currencyRes.ok)
      throw new Error("Failed to fetch currency exchange rates");

    // Supported fiat map
    const fiatMap: Record<string, string> = {
      NGN: "NGN",
      GHS: "GHS",
      KES: "KES",
    };

    // Compute balances in USD
    param.tokenList.forEach((token) => {
      let assetCode = token.asset_code.startsWith("y")
        ? token.asset_code.substring(1)
        : token.asset_code;

      const symbol =
        assetCode === "NATIVE"
          ? "XLM"
          : assetCode.endsWith("C") || assetCode.endsWith("c")
          ? assetCode.slice(0, -1).toUpperCase()
          : assetCode.toUpperCase();

      const isFiat = fiatMap[symbol];

      if (isFiat) {
        // Handle fiat via exchange-rate-api
        const isoCode = fiatMap[symbol];
        const rateToUSD = currencyData.rates[isoCode];
        token.equivalentBalanceInUsd = token.balance / rateToUSD;
      } else if (usdData.data && usdData.data[symbol]) {
        const usdRate = usdData.data[symbol]?.quote?.USD?.price ?? 0;
        token.equivalentBalanceInUsd = usdRate * token.balance;
      } else {
        token.equivalentBalanceInUsd = 0;
      }
    });

    // Split yield and non-yield assets
    const yieldAssets = param.tokenList.filter((a) =>
      a.asset_code.startsWith("y")
    );
    const nonYieldAssets = param.tokenList.filter(
      (a) => !a.asset_code.startsWith("y")
    );

    // Sum helper
    const sum = (arr: any[], field: string) =>
      arr.reduce((total, t) => total + (t[field] || 0), 0);

    // Totals in USD
    const allWalletTotalBalanceInUsd = sum(
      param.tokenList,
      "equivalentBalanceInUsd"
    );
    const yieldWalletTotalBalanceInUsd = sum(
      yieldAssets,
      "equivalentBalanceInUsd"
    );
    const nonYieldWalletTotalBalanceInUsd = sum(
      nonYieldAssets,
      "equivalentBalanceInUsd"
    );

    // Convert from USD → selected currency using exchange-rate-api
    const usdToConversionRate =
      conversionCurrency && currencyData.rates[conversionCurrency]
        ? currencyData.rates[conversionCurrency]
        : 1;

    const allWalletTotalBalanceInSelectedCurrency =
      allWalletTotalBalanceInUsd * usdToConversionRate;
    const yieldWalletTotalBalanceInSelectedCurrency =
      yieldWalletTotalBalanceInUsd * usdToConversionRate;
    const nonYieldWalletTotalBalanceInSelectedCurrency =
      nonYieldWalletTotalBalanceInUsd * usdToConversionRate;

    // Final flattened return
    return {
      tokenList: param?.tokenList,
      allWalletTotalBalanceInUsd,
      allWalletTotalBalanceInSelectedCurrency,
      nonYieldWalletTotalBalanceInUsd,
      nonYieldWalletTotalBalanceInSelectedCurrency,
      yieldWalletTotalBalanceInUsd,
      yieldWalletTotalBalanceInSelectedCurrency,
      conversionCurrencyType: conversionCurrency,
    };
  } catch (error: any) {
    console.error("Error fetching conversion rate:", error);
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
 * 3. Calls the `getConversionRate` function to calculate equivalent balances in USD, conversion currency type and the selected currency.
 * 4. Categorizes assets into yield and non-yield assets and sorts them based on balance and asset type.
 * 5. Returns the processed data, including total balances and sorted asset lists, in the response.
 */
export const getAllWalletAssets = async (req: any, res: any) => {
  try {
    const user = req.user;
    const { currencyType }: GetAllWalletAssets =
      AllWalletAssetsQuerySchema.parse(req.query);

    const url: string = `${
      `${process.env.STELLAR_NETWORK}` == "public"
        ? process.env.HORIZON_MAINNET_URL
        : process.env.HORIZON_TESTNET_URL
    }/accounts/${user.stellarPublicKey}`;

    const resp = await fetch(url);
    const walletAssets = await resp.json();

    if (walletAssets.status === 404) {
      return res.status(httpStatus.NOT_FOUND).json({
        message:
          "Account Inactive. This wallet needs a minimum balance of 5 XLM to be created on the network. Activate your account to continue.",
        success: false,
      });
    }

    if (!resp.ok) {
      return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
        message: walletAssets.details || "Failed to fetch all wallet assets",
        success: false,
      });
    }

    const data = walletAssets.balances;
    const resData: any[] = [];

    for (let i = 0; i < data.length; i++) {
      const assetCode = data[i].asset_code || "NATIVE";
      const assetIssuer = data[i].asset_issuer || "native";

      // Skip if asset is not in PUBLIC_ASSETS
      if (
        assetIssuer !== "native" &&
        !PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS]
      ) {
        continue;
      }

      let image: string;
      let assetName: string;
      let symbolId: string;

      if (assetIssuer === "native") {
        image = PUBLIC_ASSETS["NATIVE"].image;
        assetName = PUBLIC_ASSETS["NATIVE"].name;
        symbolId = PUBLIC_ASSETS["NATIVE"].symbolId;
      } else {
        const publicAsset =
          PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS];
        // Additional check in case assetCode exists but issuer doesn't match
        if (!publicAsset || publicAsset.issuer !== assetIssuer) {
          continue;
        }
        image = publicAsset.image;
        assetName = publicAsset.name;
        symbolId = publicAsset.symbolId;
      }

      resData.push({
        asset_code: assetCode,
        asset_name: assetName,
        asset_issuer: assetIssuer,
        symbol_id: symbolId,
        balance:
          assetIssuer === "native"
            ? Number(data[i].balance) - 3
            : Number(data[i].balance),
        trust_limit: Number(data[i].limit || 0),
        image: image,
      });
    }

    if (resData.length === 0) {
      return res.status(httpStatus.OK).json({
        data: {
          currencyType: currencyType.trim().toUpperCase(),
          allWalletTotalBalanceInSelectedCurrency: 0,
          allWalletTotalBalanceInUsd: 0,
          yieldWalletTotalBalanceInSelectedCurrency: 0,
          yieldWalletTotalBalanceInUsd: 0,
          nonYieldWalletTotalBalanceInSelectedCurrency: 0,
          nonYieldWalletTotalBalanceInUsd: 0,
          allWalletAssets: [],
          yieldWalletAssets: [],
          nonYieldWalletAssets: [],
        },
        status: httpStatus.OK,
        success: true,
        message: "No supported assets found in wallet",
      });
    }

    const allAssets = await getConversionRate({
      tokenList: resData,
      currencyType: currencyType.trim().toLowerCase(),
    });


    const yieldAssets = allAssets?.tokenList?.filter(
      (asset: { asset_code: string }) => asset.asset_code.startsWith("y")
    );
    const nonYieldAssets = allAssets?.tokenList?.filter(
      (asset: { asset_code: string }) => !asset.asset_code.startsWith("y")
    );

    const sortedAllWalletAssets = allAssets?.tokenList?.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        if (a.balance !== b.balance) {
          return b.balance - a.balance;
        }

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

        return a.asset_name.localeCompare(b.asset_name);
      }
    );

    const sortedYieldAssets = yieldAssets.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        if (a.balance !== b.balance) {
          return b.balance - a.balance;
        }

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

        return a.asset_name.localeCompare(b.asset_name);
      }
    );

    const sortedNonYieldAssets = nonYieldAssets.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        if (a.balance !== b.balance) {
          return b.balance - a.balance;
        }

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

        return a.asset_name.localeCompare(b.asset_name);
      }
    );
    return res.status(httpStatus.OK).json({
      data: {
        currencyType: currencyType.trim().toUpperCase(),
        allWalletTotalBalanceInSelectedCurrency:
          allAssets?.allWalletTotalBalanceInSelectedCurrency,
        allWalletTotalBalanceInUsd: allAssets?.allWalletTotalBalanceInUsd,
        yieldWalletTotalBalanceInSelectedCurrency:
          allAssets?.yieldWalletTotalBalanceInSelectedCurrency,
        yieldWalletTotalBalanceInUsd: allAssets?.yieldWalletTotalBalanceInUsd,
        nonYieldWalletTotalBalanceInSelectedCurrency:
          allAssets?.nonYieldWalletTotalBalanceInSelectedCurrency,
        nonYieldWalletTotalBalanceInUsd:
          allAssets?.nonYieldWalletTotalBalanceInUsd,
        allWalletAssets: sortedAllWalletAssets,
        yieldWalletAssets: sortedYieldAssets,
        nonYieldWalletAssets: sortedNonYieldAssets,
      },
      status: httpStatus.OK,
      success: true,
      message: "All wallet assets fetched successfully",
    });
  } catch (error: any) {
    console.log("Error fetching all wallet assets. ", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching all wallet assets.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
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
export const getAllTrustLines = async (req: any, res: any): Promise<any> => {
  try {
    return res.status(httpStatus.OK).json({
      data: { trustLines: PUBLIC_ASSETS },
      status: httpStatus.OK,
      message: "Trust lines retrieved successfully",
      success: true,
    });
  } catch (error: any) {
    console.error("Error fetching trust lines: ", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching trust lines",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
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
export const getPath = async (req: any, res: any): Promise<any> => {
  try {
    const { txType, sourceAssetCode, desAssetCode, amount }: GetPathRequest =
      GetPathSchema.parse(req.body);
    // Determine the asset issuers based on the network configuration
    const sourceAssetIssuer =
      `${process.env.STELLAR_NETWORK}` === "public"
        ? PUBLIC_ASSETS[sourceAssetCode as keyof typeof PUBLIC_ASSETS].issuer
        : TESTNET_ASSETS[sourceAssetCode as keyof typeof TESTNET_ASSETS].issuer;

    const desAssetIssuer =
      `${process.env.STELLAR_NETWORK}` === "public"
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

    return res.status(httpStatus.OK).json({
      data: paths.data,
      status: httpStatus.OK,
      message: "Path retrieved successfully",
      success: true,
    });
  } catch (error: any) {
    console.log("Error getting path.", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error getting path.",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
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
export const fetchAssets = async (req: any, res: any): Promise<any> => {
  try {
    const { assetCode } = FetchAssetsSchema.parse(req.body);
    const parsedQuery = PaginationQuerySchema.parse(req.query);
    const limit = parsedQuery.limit ?? 10;
    const page = parsedQuery.page ?? 1;

    // Fetch assets from the Stellar Expert API based on the search criteria
    const resp = await fetch(
      `https://api.stellar.expert/explorer/${`${process.env.STELLAR_NETWORK}`}/asset?${new URLSearchParams(
        {
          search: assetCode,
          sort: "rating",
          order: "desc",
          limit: String(limit),
          cursor: String(page),
        }
      )}`
    );
    if (!resp.ok) {
      return res.status(httpStatus.EXPECTATION_FAILED).json({
        message: "Failed to fetch assets",
        status: httpStatus.EXPECTATION_FAILED,
        success: false,
      });
    }
    const json = await resp.json();

    // Extract and return the asset records from the API response
    const records = json._embedded?.records;
    return res.status(httpStatus.OK).json({
      data: { records },
      message: "Assets fetched successfully",
      status: httpStatus.OK,
      success: true,
    });
  } catch (error: any) {
    console.log("Error fetching assets. ", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching assets",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
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
  req: any,
  res: any
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
      return res.status(httpStatus.NOT_FOUND).json({
        message: "User not found",
        status: httpStatus.NOT_FOUND,
        success: false,
      });
    }

    return res
      .status(httpStatus.OK)
      .json({ data: { user }, status: httpStatus.OK });
  } catch (error: any) {
    console.log("Error fetching user details with input. ", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: error.message || "Error fetching user details",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
