import { Router, type Request, type Response, type NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { z } from "zod";
import { contractSimulationController } from "../controllers/contractSimulation.controller";

const simulateContractCallSchema = z.object({
  transactionXdr: z.string().min(1).max(1_400_000),
});

function validateSimulationRequest(req: Request, res: Response, next: NextFunction): void {
  const parsed = simulateContractCallSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(StatusCodes.BAD_REQUEST).json({
      success: false,
      error: "Invalid contract simulation request",
      details: parsed.error.flatten().fieldErrors,
    });
    return;
  }

  req.body = parsed.data;
  next();
}

const router = Router();

/** POST /api/v1/contract-simulations */
router.post(
  "/",
  validateSimulationRequest,
  contractSimulationController.simulateContractCall.bind(contractSimulationController)
);

export default router;