import { Schema, model, type Document, type Types } from "mongoose";
import type { RegistryEntryKind } from "./RegistryEntry.model";

export type RegistryAuditAction = "add" | "remove";

export interface IRegistryAudit extends Document {
  action: RegistryAuditAction;
  targetType: RegistryEntryKind;
  targetValue: string;
  adminUserId: Types.ObjectId;
  transactionHash: string;
  ledgerSequence: number;
  createdAt: Date;
}

const RegistryAuditSchema = new Schema<IRegistryAudit>(
  {
    action: { type: String, enum: ["add", "remove"], required: true },
    targetType: { type: String, enum: ["tee_hash", "provider"], required: true },
    targetValue: { type: String, required: true, trim: true },
    adminUserId: { type: Schema.Types.ObjectId, ref: "User", required: true, index: true },
    transactionHash: { type: String, required: true, index: true },
    ledgerSequence: { type: Number, required: true, min: 0 },
  },
  {
    timestamps: { createdAt: true, updatedAt: false },
    versionKey: false,
  }
);

RegistryAuditSchema.index({ targetType: 1, targetValue: 1, createdAt: -1 });

export const RegistryAuditModel = model<IRegistryAudit>(
  "RegistryAudit",
  RegistryAuditSchema
);
