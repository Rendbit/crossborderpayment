import httpStatus from "http-status";
import { StatsService } from "../services/stats";

const statsService = new StatsService();

export const getStats = async (req: any, res: any) => {
  try {
    const result = await statsService.getStats();
    return res.status(result.status).json(result);
  } catch (error: any) {
    console.error("Error in stats controller:", error);
    return res.status(httpStatus.INTERNAL_SERVER_ERROR).json({
      message: "Internal server error",
      status: httpStatus.INTERNAL_SERVER_ERROR,
      success: false,
    });
  }
};
