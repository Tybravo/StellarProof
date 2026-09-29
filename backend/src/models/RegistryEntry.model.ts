import { Schema, model, type Document, type Types } from "mongoose";

export type RegistryEntryKind = "tee_hash" | "provider";

export interface IRegistryEntry extends Document {
  kind: RegistryEntryKind;
  value: string;
  active: boolean;
  lastTransactionHash: string;
  ledgerSequence: number;
  updatedBy: Types.ObjectId;
  createdAt: Date;
  updatedAt: Date;
}

const RegistryEntrySchema = new Schema<IRegistryEntry>(
  {
    kind: { type: String, enum: ["tee_hash", "provider"], required: true },
    value: { type: String, required: true, trim: true },
    active: { type: Boolean, required: true, default: true, index: true },
    lastTransactionHash: { type: String, required: true },
    ledgerSequence: { type: Number, required: true, min: 0 },
    updatedBy: { type: Schema.Types.ObjectId, ref: "User", required: true },
  },
  { timestamps: true, versionKey: false }
);

RegistryEntrySchema.index({ kind: 1, value: 1 }, { unique: true });
RegistryEntrySchema.index({ kind: 1, active: 1, value: 1 });

export const RegistryEntryModel = model<IRegistryEntry>(
  "RegistryEntry",
  RegistryEntrySchema
);
