import type { Request, Response, NextFunction } from "express";
import { StatusCodes } from "http-status-codes";
import { contractSimulationService } from "../services/contractSimulation.service";
import type { SimulateContractCallRequest } from "../types/contractSimulation.types";

class ContractSimulationController {
  async simulateContractCall(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await contractSimulationService.simulateContractCall(
        req.body as SimulateContractCallRequest
      );
      res.status(StatusCodes.OK).json({ success: true, data: result });
    } catch (error) {
      next(error);
    }
  }
}

export const contractSimulationController = new ContractSimulationController();