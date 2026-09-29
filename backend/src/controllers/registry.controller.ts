import type { NextFunction, Request, Response } from "express";
import { StatusCodes } from "http-status-codes";
import { registryAdminService, type RegistryAdminService } from "../services/registryAdmin.service";

export class RegistryController {
  constructor(private readonly service: RegistryAdminService = registryAdminService) {}

  listTeeHashes = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await this.service.listTeeHashes() });
    } catch (error) {
      next(error);
    }
  };

  listProviders = async (_req: Request, res: Response, next: NextFunction): Promise<void> => {
    try {
      res.json({ success: true, data: await this.service.listProviders() });
    } catch (error) {
      next(error);
    }
  };

  addTeeHash = this.changeHandler("addTeeHash", "hash");
  removeTeeHash = this.changeHandler("removeTeeHash", "hash");
  addProvider = this.changeHandler("addProvider", "provider");
  removeProvider = this.changeHandler("removeProvider", "provider");

  private changeHandler(
    operation: "addTeeHash" | "removeTeeHash" | "addProvider" | "removeProvider",
    field: "hash" | "provider"
  ) {
    return async (req: Request, res: Response, next: NextFunction): Promise<void> => {
      try {
        const value = String(req.body?.[field] ?? req.params[field] ?? "");
        const data = await this.service[operation](value, String(req.user!._id));
        res.status(StatusCodes.OK).json({ success: true, data });
      } catch (error) {
        next(error);
      }
    };
  }
}

export const registryController = new RegistryController();
