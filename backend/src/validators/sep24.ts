import { z } from "zod";


/**
 * Schema for validating the parameters required to initiate a transfer
 * in the SEP-24 process. This schema ensures that the provided object
 * strictly adheres to the defined structure.
 *
 * Properties:
 * - `txType` (string): Specifies the type of transaction being initiated.
 *
 * The `.strict()` method enforces that no additional properties are allowed
 * beyond those explicitly defined in the schema.
 */
const InitiateTransfer24ParamsSchema = z
  .object({
    txType: z.string(),
  })
  .strict();


/**
 * Schema definition for validating query parameters related to SEP-24 transfers.
 * 
 * This schema ensures that the query object contains the required `assetCode` field
 * as a string and does not allow any additional properties.
 * 
 * @constant
 * @type {z.ZodObject}
 * @property {string} assetCode - The code of the asset being queried.
 */
const QueryTransfers24Schema = z
  .object({
    assetCode: z.string(),
  })
  .strict();


/**
 * Schema definition for validating the initiation of a transfer in the SEP-24 protocol.
 * 
 * This schema ensures that the required fields for initiating a transfer are present
 * and conform to the expected data types. The validation is strict, meaning no additional
 * properties beyond those defined are allowed.
 * 
 * Properties:
 * - `assetCode` (string): The code of the asset being transferred (e.g., "USD", "EUR").
 * - `stellarPublicKey` (string): The Stellar public key of the account initiating the transfer.
 */
const InitiateTransfer24Schema = z
    .object({
        assetCode: z.string(),
        stellarPublicKey: z.string(),
    })
    .strict();



export {
  InitiateTransfer24ParamsSchema,
  QueryTransfers24Schema,
  InitiateTransfer24Schema,
};
