import { Request } from "express";
import httpStatus from "http-status";
import { PUBLIC_ASSETS } from "../common/assets";
import { User } from "../models/User";
import { BlockchainFactory } from "../providers/blockchainFactory";
import {
  IHorizonService,
  WalletAssetsData,
  PathData,
  AssetsData,
  ConversionData,
  TrustLinesData,
  UserDetailsData,
} from "../types/blockchain";
import { ServiceResponse } from "../types/response";
import {
  GetAllWalletAssetsSchema,
  GetPathSchema,
  FetchAssetsSchema,
  FetchAssetsQuerySchema,
  GetConversionRatesSchema,
  FetchUserDetailsSchema,
} from "../validators/horizonQueries";
import {
  sanitizeInput,
  isValidObjectId,
  isValidPublicKey,
} from "../utils/security";

export class HorizonService implements IHorizonService {
  async getAllWalletAssets(
    req: Request
  ): Promise<ServiceResponse<WalletAssetsData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as WalletAssetsData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletAssetsData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate query parameters
      console.log("REQ QUERY", req.query)
      const validatedQuery = GetAllWalletAssetsSchema.parse(req.query);

      // SECURITY: Sanitize currency type
      const sanitizedCurrencyType = sanitizeInput(validatedQuery.currencyType);

      if (!sanitizedCurrencyType || typeof sanitizedCurrencyType !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletAssetsData,
          success: false,
          message: "Invalid currency type format",
        };
      }

      // Check if user has Stellar wallet
      if (!user.stellarPublicKey) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletAssetsData,
          success: false,
          message: "User does not have a Stellar wallet",
        };
      }

      // SECURITY: Validate Stellar public key
      if (!isValidPublicKey(user.stellarPublicKey)) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletAssetsData,
          success: false,
          message: "Invalid Stellar public key format",
        };
      }

      // Use BlockchainFactory to get horizon provider
      const horizonProvider = BlockchainFactory.getHorizonProvider("stellar");
      const balances = await horizonProvider.getAllWalletAssets(
        user.stellarPublicKey
      );

      if (!balances || !Array.isArray(balances)) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as WalletAssetsData,
          success: false,
          message:
            "Account Inactive. This wallet needs a minimum balance of 5 XLM to be created on the network.",
        };
      }

      // Process assets and filter based on PUBLIC_ASSETS
      const resData: any[] = [];

      for (let i = 0; i < balances.length; i++) {
        const balance = balances[i];

        // SECURITY: Validate balance object structure
        if (!balance || typeof balance !== "object") {
          continue;
        }

        const assetCode = (balance.asset_code || "NATIVE") as string;
        const assetIssuer = (balance.asset_issuer || "native") as string;

        // SECURITY: Skip if asset is not in PUBLIC_ASSETS
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
          const nativeAsset = PUBLIC_ASSETS["NATIVE"];
          if (!nativeAsset) continue;
          image = nativeAsset.image;
          assetName = nativeAsset.name;
          symbolId = nativeAsset.symbolId;
        } else {
          const publicAsset =
            PUBLIC_ASSETS[assetCode as keyof typeof PUBLIC_ASSETS];
          if (!publicAsset || publicAsset.issuer !== assetIssuer) {
            continue;
          }
          image = publicAsset.image;
          assetName = publicAsset.name;
          symbolId = publicAsset.symbolId;
        }

        // SECURITY: Parse balance safely
        const balanceValue = parseFloat(balance.balance || "0");
        const trustLimitValue = parseFloat(balance.limit || "0");

        if (isNaN(balanceValue) || isNaN(trustLimitValue)) {
          continue;
        }

        resData.push({
          asset_code: assetCode,
          asset_name: assetName,
          asset_issuer: assetIssuer,
          symbol_id: symbolId,
          balance:
            assetIssuer === "native"
              ? Math.max(0, balanceValue - 3)
              : balanceValue,
          trust_limit: trustLimitValue,
          image: image,
        });
      }

      if (resData.length === 0) {
        return {
          status: httpStatus.OK,
          data: {
            currencyType: sanitizedCurrencyType,
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
          success: true,
          message: "No supported assets found in wallet",
        };
      }

      // Get conversion rates with security
      const allAssets = await this.getConversionRate({
        tokenList: resData,
        currencyType: sanitizedCurrencyType.toLowerCase(),
      });

      // Categorize and sort assets
      const yieldAssets =
        allAssets?.tokenList?.filter((asset: { asset_code: string }) =>
          asset.asset_code.startsWith("y")
        ) || [];

      const nonYieldAssets =
        allAssets?.tokenList?.filter(
          (asset: { asset_code: string }) => !asset.asset_code.startsWith("y")
        ) || [];

      const sortedAllWalletAssets = this.sortAssets(allAssets?.tokenList || []);
      const sortedYieldAssets = this.sortAssets(yieldAssets);
      const sortedNonYieldAssets = this.sortAssets(nonYieldAssets);

      return {
        status: httpStatus.OK,
        data: {
          currencyType: sanitizedCurrencyType,
          allWalletTotalBalanceInSelectedCurrency:
            allAssets?.allWalletTotalBalanceInSelectedCurrency || 0,
          allWalletTotalBalanceInUsd:
            allAssets?.allWalletTotalBalanceInUsd || 0,
          yieldWalletTotalBalanceInSelectedCurrency:
            allAssets?.yieldWalletTotalBalanceInSelectedCurrency || 0,
          yieldWalletTotalBalanceInUsd:
            allAssets?.yieldWalletTotalBalanceInUsd || 0,
          nonYieldWalletTotalBalanceInSelectedCurrency:
            allAssets?.nonYieldWalletTotalBalanceInSelectedCurrency || 0,
          nonYieldWalletTotalBalanceInUsd:
            allAssets?.nonYieldWalletTotalBalanceInUsd || 0,
          allWalletAssets: sortedAllWalletAssets,
          yieldWalletAssets: sortedYieldAssets,
          nonYieldWalletAssets: sortedNonYieldAssets,
        },
        success: true,
        message: "All wallet assets fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching all wallet assets:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletAssetsData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as WalletAssetsData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as WalletAssetsData,
          success: false,
          message: error.message || "Error fetching all wallet assets",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as WalletAssetsData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  private async getConversionRate(param: any): Promise<any> {
    // SECURITY: Validate input parameters
    if (!param || !param.tokenList || !Array.isArray(param.tokenList)) {
      return null;
    }

    const tokens = param.tokenList.filter(
      (asset: { asset_code: string }) => !asset.asset_code.startsWith("y")
    );

    if (tokens.length === 0) {
      return {
        tokenList: param.tokenList,
        allWalletTotalBalanceInUsd: 0,
        allWalletTotalBalanceInSelectedCurrency: 0,
        nonYieldWalletTotalBalanceInUsd: 0,
        nonYieldWalletTotalBalanceInSelectedCurrency: 0,
        yieldWalletTotalBalanceInUsd: 0,
        yieldWalletTotalBalanceInSelectedCurrency: 0,
      };
    }

    const symbols = tokens
      .map((token: { asset_code: string }) => {
        if (!token.asset_code) return null;

        let assetCode = token.asset_code;
        if (assetCode === "NATIVE") return "XLM";
        if (assetCode.endsWith("C") || assetCode.endsWith("c"))
          return assetCode.slice(0, -1).toUpperCase();
        return assetCode.toUpperCase();
      })
      .filter(Boolean)
      .join(",");

    if (!symbols) {
      return {
        tokenList: param.tokenList,
        allWalletTotalBalanceInUsd: 0,
        allWalletTotalBalanceInSelectedCurrency: 0,
        nonYieldWalletTotalBalanceInUsd: 0,
        nonYieldWalletTotalBalanceInSelectedCurrency: 0,
        yieldWalletTotalBalanceInUsd: 0,
        yieldWalletTotalBalanceInSelectedCurrency: 0,
      };
    }

    const selectedCurrency = param.currencyType?.toUpperCase() || "USD";

    const conversionCurrency = [
      "NGN",
      "GHS",
      "KES",
      "NATIVE",
    ].includes(selectedCurrency)
      ? selectedCurrency
      : "USD";

    const baseUrl =
      "https://pro-api.coinmarketcap.com/v1/cryptocurrency/quotes/latest";
    const currencyUrl = "https://api.exchangerate-api.com/v4/latest/USD";
    const usdUrl = `${baseUrl}?symbol=${symbols}&convert=USD`;

    // SECURITY: Validate API key
    const apiKey = process.env.CMC_PRO_API_KEY;
    if (!apiKey) {
      throw new Error("CoinMarketCap API key is not configured");
    }

    const headers = {
      "X-CMC_PRO_API_KEY": apiKey,
    };

    const [usdRes, currencyRes] = await Promise.all([
      fetch(usdUrl, { headers }),
      fetch(currencyUrl),
    ]);

    if (!usdRes.ok) {
      throw new Error(`Failed to fetch USD rates: ${usdRes.statusText}`);
    }

    if (!currencyRes.ok) {
      throw new Error(
        `Failed to fetch currency exchange rates: ${currencyRes.statusText}`
      );
    }

    const [usdData, currencyData] = await Promise.all([
      usdRes.json(),
      currencyRes.json(),
    ]);

    const fiatMap: Record<string, string> = {
      NGN: "NGN",
      GHS: "GHS",
      KES: "KES",
    };

    // Compute balances in USD with security checks
    param.tokenList.forEach((token: any) => {
      let assetCode = token.asset_code?.startsWith("y")
        ? token.asset_code.substring(1)
        : token.asset_code;

      if (!assetCode) {
        token.equivalentBalanceInUsd = 0;
        return;
      }

      const symbol =
        assetCode === "NATIVE"
          ? "XLM"
          : assetCode.endsWith("C") || assetCode.endsWith("c")
          ? assetCode.slice(0, -1).toUpperCase()
          : assetCode.toUpperCase();

      const isFiat = fiatMap[symbol];

      if (isFiat) {
        const isoCode = fiatMap[symbol];
        const rateToUSD = currencyData.rates?.[isoCode] || 1;
        token.equivalentBalanceInUsd = (token.balance || 0) / rateToUSD;
      } else if (usdData.data && usdData.data[symbol]) {
        const usdRate = usdData.data[symbol]?.quote?.USD?.price || 0;
        token.equivalentBalanceInUsd = usdRate * (token.balance || 0);
      } else {
        token.equivalentBalanceInUsd = 0;
      }
    });

    // Split yield and non-yield assets
    const yieldAssets = param.tokenList.filter((a: any) =>
      a.asset_code?.startsWith("y")
    );
    const nonYieldAssets = param.tokenList.filter(
      (a: any) => !a.asset_code?.startsWith("y")
    );

    const sum = (arr: any[], field: string) =>
      arr.reduce((total, t) => total + (t[field] || 0), 0);

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

    const usdToConversionRate =
      conversionCurrency && currencyData.rates?.[conversionCurrency]
        ? currencyData.rates[conversionCurrency]
        : 1;

    return {
      tokenList: param.tokenList,
      allWalletTotalBalanceInUsd,
      allWalletTotalBalanceInSelectedCurrency:
        allWalletTotalBalanceInUsd * usdToConversionRate,
      nonYieldWalletTotalBalanceInUsd,
      nonYieldWalletTotalBalanceInSelectedCurrency:
        nonYieldWalletTotalBalanceInUsd * usdToConversionRate,
      yieldWalletTotalBalanceInUsd,
      yieldWalletTotalBalanceInSelectedCurrency:
        yieldWalletTotalBalanceInUsd * usdToConversionRate,
      conversionCurrencyType: conversionCurrency,
    };
  }

  private sortAssets(assets: any[]) {
    if (!Array.isArray(assets)) {
      return [];
    }

    return assets.sort(
      (
        a: { balance: number; asset_code: string; asset_name: string },
        b: { balance: number; asset_code: string; asset_name: string }
      ) => {
        // Sort by balance (descending)
        if (a.balance !== b.balance) {
          return b.balance - a.balance;
        }

        const aCode = (a.asset_code || "").toLowerCase();
        const bCode = (b.asset_code || "").toLowerCase();

        // Priority order: BTC > ETH > XLM > NGNc > others
        const priorityOrder = {
          btc: 0,
          eth: 1,
          xlm: 2,
          ngnc: 3,
        } as const;

        type AssetCode = keyof typeof priorityOrder;

        const getPriority = (code: string) =>
          priorityOrder[code as AssetCode] ?? 4;

        const aPriority = getPriority(aCode);
        const bPriority = getPriority(bCode);

        if (aPriority !== bPriority) {
          return aPriority - bPriority;
        }

        // Finally sort alphabetically by asset name
        return (a.asset_name || "").localeCompare(b.asset_name || "");
      }
    );
  }

  async getPath(req: Request): Promise<ServiceResponse<PathData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = GetPathSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedTxType = sanitizeInput(validatedBody.txType);
      const sanitizedSourceAssetCode = sanitizeInput(
        validatedBody.sourceAssetCode
      );
      const sanitizedDesAssetCode = sanitizeInput(validatedBody.desAssetCode);
      const sanitizedAmount = sanitizeInput(validatedBody.amount);

      // Validate sanitized inputs
      if (
        !sanitizedTxType ||
        !["deposit", "withdrawal", "swap"].includes(sanitizedTxType)
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PathData,
          success: false,
          message: "Invalid transaction type",
        };
      }

      if (
        !sanitizedSourceAssetCode ||
        typeof sanitizedSourceAssetCode !== "string"
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PathData,
          success: false,
          message: "Invalid source asset code",
        };
      }

      if (!sanitizedDesAssetCode || typeof sanitizedDesAssetCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PathData,
          success: false,
          message: "Invalid destination asset code",
        };
      }

      if (!sanitizedAmount || !sanitizedAmount.match(/^\d+(\.\d+)?$/)) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PathData,
          success: false,
          message: "Invalid amount format",
        };
      }

      // Use BlockchainFactory to get horizon provider
      const horizonProvider = BlockchainFactory.getHorizonProvider("stellar");
      const paths = await horizonProvider.getPath(
        sanitizedTxType,
        sanitizedSourceAssetCode,
        sanitizedDesAssetCode,
        sanitizedAmount
      );

      return {
        status: httpStatus.OK,
        data: { paths },
        success: true,
        message: "Path retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error getting path:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PathData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as PathData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as PathData,
          success: false,
          message: error.message || "Error getting path",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as PathData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async fetchAssets(req: Request): Promise<ServiceResponse<AssetsData>> {
    try {
      // SECURITY: Validate request body and query parameters
      const validatedBody = FetchAssetsSchema.parse(req.body);
      const validatedQuery = FetchAssetsQuerySchema.parse(req.query);

      // SECURITY: Sanitize all inputs
      const sanitizedAssetCode = validatedBody.assetCode
        ? sanitizeInput(validatedBody.assetCode)
        : undefined;

      const sanitizedLimit = sanitizeInput(validatedQuery.limit.toString());
      const sanitizedPage = sanitizeInput(validatedQuery.page.toString());

      // Validate sanitized inputs
      if (sanitizedAssetCode && typeof sanitizedAssetCode !== "string") {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as AssetsData,
          success: false,
          message: "Invalid asset code format",
        };
      }

      const limit = parseInt(sanitizedLimit, 10);
      const page = parseInt(sanitizedPage, 10);

      if (isNaN(limit) || limit < 1 || limit > 100) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as AssetsData,
          success: false,
          message: "Invalid limit value",
        };
      }

      if (isNaN(page) || page < 1) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as AssetsData,
          success: false,
          message: "Invalid page value",
        };
      }

      // Use BlockchainFactory to get horizon provider
      const horizonProvider = BlockchainFactory.getHorizonProvider("stellar");
      const records = await horizonProvider.fetchAssets(
        sanitizedAssetCode,
        limit,
        page
      );

      return {
        status: httpStatus.OK,
        data: { records },
        success: true,
        message: "Assets fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching assets:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as AssetsData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as AssetsData,
          success: false,
          message: error.message,
        };
      }

      // Handle provider errors
      if (error.status) {
        return {
          status: error.status,
          data: {} as AssetsData,
          success: false,
          message: error.message || "Error fetching assets",
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as AssetsData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async getConversionRates(
    req: Request
  ): Promise<ServiceResponse<ConversionData>> {
    try {
      // SECURITY: Validate request body with Zod
      const validatedBody = GetConversionRatesSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedInputAmount = sanitizeInput(validatedBody.inputAmount);
      const sanitizedInputSymbol = sanitizeInput(validatedBody.inputSymbol);
      const sanitizedOutputSymbol = sanitizeInput(validatedBody.outputSymbol);

      // Validate sanitized inputs
      if (
        !sanitizedInputAmount ||
        !sanitizedInputAmount.match(/^\d+(\.\d+)?$/)
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ConversionData,
          success: false,
          message: "Invalid input amount format",
        };
      }

      if (
        !sanitizedInputSymbol ||
        typeof sanitizedInputSymbol !== "string" ||
        sanitizedInputSymbol.length > 10
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ConversionData,
          success: false,
          message: "Invalid input symbol format",
        };
      }

      if (
        !sanitizedOutputSymbol ||
        typeof sanitizedOutputSymbol !== "string" ||
        sanitizedOutputSymbol.length > 10
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ConversionData,
          success: false,
          message: "Invalid output symbol format",
        };
      }

      const fiatList = ["NGN", "GHS", "KES"];

      const cleanSymbol = (symbol: string) => {
        let upperSymbol = symbol.toUpperCase();
        if (upperSymbol === "NATIVE") return "XLM";

        if (upperSymbol.startsWith("Y")) upperSymbol = upperSymbol.slice(1);
        if (upperSymbol.endsWith("C")) upperSymbol = upperSymbol.slice(0, -1);

        return fiatList.includes(upperSymbol)
          ? upperSymbol
          : symbol.toUpperCase();
      };

      const input = cleanSymbol(sanitizedInputSymbol);
      const output =
        sanitizedOutputSymbol.toUpperCase() === "NATIVE"
          ? "XLM"
          : sanitizedOutputSymbol.replace(/c/gi, "");

      // SECURITY: Validate API key
      const apiKey = process.env.CMC_PRO_API_KEY;
      if (!apiKey) {
        return {
          status: httpStatus.INTERNAL_SERVER_ERROR,
          data: {} as ConversionData,
          success: false,
          message: "CoinMarketCap API key is not configured",
        };
      }

      const url = `https://pro-api.coinmarketcap.com/v1/tools/price-conversion?amount=${sanitizedInputAmount}&symbol=${input}&convert=${output}`;

      const response = await fetch(url, {
        method: "GET",
        headers: {
          "X-CMC_PRO_API_KEY": apiKey,
          Accept: "application/json",
        },
      });

      if (!response.ok) {
        throw new Error(
          `Error fetching conversion data: ${response.statusText}`
        );
      }

      const data = await response.json();

      // SECURITY: Validate response data structure
      if (!data.data || !data.data.quote || !data.data.quote[output]) {
        throw new Error("Invalid response format from conversion API");
      }

      const result = data.data;
      const convertedAmount = result.quote[output].price;
      const inputAmountNum = parseFloat(sanitizedInputAmount);

      return {
        status: httpStatus.OK,
        data: {
          inputAmount: inputAmountNum,
          inputSymbol: input,
          outputSymbol: output,
          originalAmount: inputAmountNum,
          convertedAmount,
          rate: convertedAmount / inputAmountNum,
        },
        success: true,
        message: "Conversion successful",
      };
    } catch (error: any) {
      console.error("Conversion error:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ConversionData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as ConversionData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as ConversionData,
        success: false,
        message: "Conversion failed",
      };
    }
  }

  async getAllTrustLines(): Promise<ServiceResponse<TrustLinesData>> {
    try {
      return {
        status: httpStatus.OK,
        data: { trustLines: PUBLIC_ASSETS },
        success: true,
        message: "Trust lines retrieved successfully",
      };
    } catch (error: any) {
      console.error("Error fetching trust lines:", error);

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as TrustLinesData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as TrustLinesData,
        success: false,
        message: "Internal server error",
      };
    }
  }

  async fetchUserDetailsWithInput(
    req: Request
  ): Promise<ServiceResponse<UserDetailsData>> {
    try {
      const user = (req as any).user;

      // SECURITY: Validate user exists
      if (!user || !user._id) {
        return {
          status: httpStatus.UNAUTHORIZED,
          data: {} as UserDetailsData,
          success: false,
          message: "User authentication required",
        };
      }

      // SECURITY: Validate ObjectId
      if (!isValidObjectId(user._id.toString())) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserDetailsData,
          success: false,
          message: "Invalid user ID format",
        };
      }

      // SECURITY: Validate request body with Zod
      const validatedBody = FetchUserDetailsSchema.parse(req.body);

      // SECURITY: Sanitize all inputs
      const sanitizedSearchType = sanitizeInput(validatedBody.searchType);
      const sanitizedInput = sanitizeInput(validatedBody.input);

      // Validate sanitized inputs
      if (
        !sanitizedSearchType ||
        !["username", "primaryEmail", "rendbitId"].includes(sanitizedSearchType)
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserDetailsData,
          success: false,
          message: "Invalid search type",
        };
      }

      if (
        !sanitizedInput ||
        typeof sanitizedInput !== "string" ||
        sanitizedInput.length > 100
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserDetailsData,
          success: false,
          message: "Invalid search input",
        };
      }

      // SECURITY: Prevent searching by email if not admin (add additional checks as needed)
      if (sanitizedSearchType === "primaryEmail" && !user.isAdmin) {
        return {
          status: httpStatus.FORBIDDEN,
          data: {} as UserDetailsData,
          success: false,
          message: "Email search is restricted",
        };
      }

      const query = { [sanitizedSearchType]: sanitizedInput };

      const foundUser = await User.findOne(
        query,
        "userProfileUrl username primaryEmail country rendbitId"
      ).lean();

      if (!foundUser) {
        return {
          status: httpStatus.NOT_FOUND,
          data: {} as UserDetailsData,
          success: false,
          message: "User not found",
        };
      }

      return {
        status: httpStatus.OK,
        data: { user: foundUser },
        success: true,
        message: "User details fetched successfully",
      };
    } catch (error: any) {
      console.error("Error fetching user details:", error);

      // Handle Zod validation errors
      if (error.name === "ZodError") {
        const errorMessages = error.errors
          .map((err: any) => err.message)
          .join(", ");
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserDetailsData,
          success: false,
          message: `${errorMessages}`,
        };
      }

      // Handle security validation errors
      if (
        error.message?.includes("Invalid input") ||
        error.message?.includes("Invalid key")
      ) {
        return {
          status: httpStatus.BAD_REQUEST,
          data: {} as UserDetailsData,
          success: false,
          message: error.message,
        };
      }

      return {
        status: httpStatus.INTERNAL_SERVER_ERROR,
        data: {} as UserDetailsData,
        success: false,
        message: "Internal server error",
      };
    }
  }
}

// Create and export service instance
export const horizonService = new HorizonService();
