import { z } from "zod";

/**
 * Schema for validating a conversion request.
 *
 * This schema ensures that the input object adheres to the following structure:
 * - `inputAmount`: A positive number representing the amount to be converted.
 * - `symbol`: A string of exactly 3 alphabetic characters (case-insensitive) representing the currency symbol.
 *
 * The schema is strict, meaning no additional properties are allowed beyond the defined structure.
 */
const ConversionRequestSchema = z
  .object({
    inputAmount: z.number().positive(),
    symbol: z
      .string()
      .length(3)
      .regex(/^[A-Za-z]+$/),
  })
  .strict();

/**
 * Schema for validating a query to fetch all wallet assets.
 *
 * This schema ensures that the input object adheres to the following structure:
 * - `currencyType`: An optional string that defaults to "BOTH" if not provided.
 *
 * The schema is strict, meaning no additional properties are allowed beyond the defined structure.
 */
const AllWalletAssetsQuerySchema = z
  .object({
    currencyType: z.string(),
  })
  .strict();

/**
 * Schema for validating the parameters required to get a payment path.
 * 
 * This schema ensures that the following fields are provided and meet the specified criteria:
 * - `txType` (string): The type of transaction.
 * - `sourceAssetCode` (string): The asset code of the source asset.
 * - `desAssetCode` (string): The asset code of the destination asset.
 * - `amount` (number): A positive number representing the amount to be transferred.
 * 
 * The schema is strict, meaning no additional fields are allowed.
 */
const GetPathSchema = z
  .object({
    txType: z.string(),
    sourceAssetCode: z.string(),
    desAssetCode: z.string(),
    amount: z.number().positive(),
  })
  .strict();

/**
 * Schema for validating the parameters required to fetch assets.
 * 
 * This schema ensures that the following field is provided and meets the specified criteria:
 * - `assetCode` (string): The code of the asset to be fetched.
 * 
 * The schema is strict, meaning no additional fields are allowed.
 */
const FetchAssetsSchema = z
    .object({
        assetCode: z.string(),
    })
    .strict();



export {
  ConversionRequestSchema,
  AllWalletAssetsQuerySchema,
  GetPathSchema,
  FetchAssetsSchema,
};
