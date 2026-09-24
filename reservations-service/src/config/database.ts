import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI no está configurada");
  }

  await mongoose.connect(mongoUri);
  console.log("[RESERVATIONS] MongoDB conectado - reservations_db");
}
