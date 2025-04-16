import { verify } from "jsonwebtoken";
import httpStatus from "http-status";
import { User } from "../models/User";

export async function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.error({
      message: "Unauthorized",
      status: httpStatus.UNAUTHORIZED,
    });
  }

  const token = authHeader.split(" ")[1];

  try {
    const decoded = verify(token, `${process.env.JWT_SECRET}`);
    if (typeof decoded !== "string" && decoded.id) {
      const user = await User.findById(`${decoded.id}`).lean();
      req.user = { ...user, decoded };
      next();
    } else {
      return res.error({
        message: "Invalid token payload",
        status: httpStatus.UNAUTHORIZED,
      });
    }
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.error({
        message: "Login has expired",
        status: httpStatus.UNAUTHORIZED,
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.error({
        message: "Invalid token",
        status: httpStatus.UNAUTHORIZED,
      });
    } else {
      return res.error({
        message: "Authentication error",
        status: httpStatus.UNAUTHORIZED,
      });
    }
  }
}
