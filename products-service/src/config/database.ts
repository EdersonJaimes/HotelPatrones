import mongoose from "mongoose";

export async function connectDatabase(): Promise<void> {
  const mongoUri = process.env.MONGO_URI;

  if (!mongoUri) {
    throw new Error("MONGO_URI no está configurada");
  }

  await mongoose.connect(mongoUri);
  console.log("[PRODUCTS] MongoDB conectado - products_db");
}
