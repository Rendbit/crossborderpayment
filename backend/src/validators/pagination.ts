import { z } from "zod";
/**
 * Schema for validating pagination query parameters.
 * 
 * This schema ensures that the query parameters for pagination
 * adhere to the expected structure and constraints:
 * 
 * - `limit` (optional): A positive number representing the maximum number of items to retrieve.
 * - `cursor` (optional): A positive number used as a reference point for pagination.
 * 
 * The schema is strict, meaning no additional properties are allowed.
 */
const PaginationQuerySchema = z
  .object({
    limit: z.number().positive().optional(),
    page: z.number().positive().optional(),
  })
  .strict();

export { PaginationQuerySchema };
