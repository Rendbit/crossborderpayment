import { verify } from "jsonwebtoken";
import httpStatus from "http-status";
import { User } from "../models/User";

export async function authenticate(req: any, res: any, next: any) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(httpStatus.UNAUTHORIZED).json({
      message: "Unauthorized",
      status: httpStatus.UNAUTHORIZED,
      success: false
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
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid token payload",
        status: httpStatus.UNAUTHORIZED,
        success: false
      });
    }
  } catch (error: any) {
    if (error.name === "TokenExpiredError") {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Login has expired",
        status: httpStatus.UNAUTHORIZED,
        success: false
      });
    } else if (error.name === "JsonWebTokenError") {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Invalid token",
        status: httpStatus.UNAUTHORIZED,
        success: false
      });
    } else {
      return res.status(httpStatus.UNAUTHORIZED).json({
        message: "Authentication error",
        status: httpStatus.UNAUTHORIZED,
        success: false
      });
    }
  }
}
