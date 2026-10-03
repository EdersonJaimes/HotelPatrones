import { Document, Schema, model } from "mongoose";

export interface IClient extends Document {
  name: string;
  document: string;
  phone: string;
  createdAt: Date;
  updatedAt: Date;
}

const clientSchema = new Schema<IClient>(
  {
    name: {
      type: String,
      required: true,
      trim: true
    },
    document: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    }
  },
  {
    timestamps: true
  }
);

// El documento de identidad es el identificador natural del cliente: único.
clientSchema.index({ document: 1 }, { unique: true });

export const Client = model<IClient>("Client", clientSchema);
