import { Request, Response, NextFunction } from "express";
import { AnyZodObject, ZodError } from "zod";

export const validateRequest = (schema: AnyZodObject) => {
  return async (req: Request, res: Response, next: NextFunction) => {
    try {
      await schema.parseAsync({
        body: req.body,
        query: req.query,
        params: req.params,
      });
      next();
    } catch (error) {
      if (error instanceof ZodError) {
        // Extract all field errors
        const fieldErrors = error.errors.map((err) => ({
          field: err.path.join("."),
          message: err.message,
        }));

        // Create a user-friendly error message
        const errorMessage =
          fieldErrors.length > 0
            ? `${fieldErrors
                .map((fe) => fe.message)
                .join(", ")}`
            : "Validation failed";

        // Use your custom error response method
        return res.error({
          message: errorMessage,
          status: 400,
        });
      }
      next(error);
    }
  };
};
