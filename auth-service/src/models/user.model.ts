import { Document, Schema, model } from "mongoose";

export type UserRole = "admin" | "recepcionista";

export interface IUser extends Document {
  username: string;
  name: string;
  password: string;
  role: UserRole;
  active: boolean;
  createdAt: Date;
  updatedAt: Date;
}

const userSchema = new Schema<IUser>(
  {
    username: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      minlength: 3,
      maxlength: 50
    },
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100
    },
    password: {
      type: String,
      required: true,
      select: false
    },
    role: {
      type: String,
      enum: ["admin", "recepcionista"],
      default: "recepcionista",
      required: true
    },
    active: {
      type: Boolean,
      default: true
    }
  },
  {
    timestamps: true
  }
);

export const User = model<IUser>("User", userSchema);
