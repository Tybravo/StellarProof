import { Schema, model, type Document } from "mongoose";

export interface IEventIngestionCursor extends Document {
  stream: string;
  cursor: string;
  latestLedger: number;
  updatedAt: Date;
}

const EventIngestionCursorSchema = new Schema<IEventIngestionCursor>(
  {
    stream: { type: String, required: true, unique: true },
    cursor: { type: String, required: true },
    latestLedger: { type: Number, required: true, min: 0 },
  },
  { timestamps: true, versionKey: false }
);

export const EventIngestionCursorModel = model<IEventIngestionCursor>(
  "EventIngestionCursor",
  EventIngestionCursorSchema
);
