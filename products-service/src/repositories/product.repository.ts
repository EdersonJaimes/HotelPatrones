import { IProduct, Product, ProductCategory } from "../models/product.model";

const SPANISH_CI = { locale: "es", strength: 2 } as const;

export interface CreateProductData {
  name: string;
  price: number;
  category?: ProductCategory;
}

export interface UpdateProductData {
  name?: string;
  price?: number;
  category?: ProductCategory;
}

export class ProductRepository {
  // Resumen de bajo stock calculado en la base de datos: el Dashboard solo necesita
  // cuántos hay y los más urgentes, no los 1 200 productos.
  async lowStockSummary(threshold: number, limit: number) {
    const [count, items] = await Promise.all([
      Product.countDocuments({ stock: { $lte: threshold } }),
      Product.find({ stock: { $lte: threshold } }).sort({ stock: 1, name: 1 }).limit(limit).select("name stock").lean()
    ]);

    return { count, items };
  }

  async findAll(): Promise<IProduct[]> {
    return Product.find().collation({ locale: "es" }).sort({ name: 1 });
  }

  async findById(id: string): Promise<IProduct | null> {
    return Product.findById(id);
  }

  async findByName(name: string): Promise<IProduct | null> {
    return Product.findOne({ name }).collation(SPANISH_CI);
  }

  async create(data: CreateProductData): Promise<IProduct> {
    return Product.create(data);
  }

  async update(id: string, data: UpdateProductData): Promise<IProduct | null> {
    return Product.findByIdAndUpdate(id, data, { new: true, runValidators: true });
  }

  async deleteById(id: string): Promise<IProduct | null> {
    return Product.findByIdAndDelete(id);
  }

  async increaseStock(id: string, quantity: number): Promise<IProduct | null> {
    return Product.findByIdAndUpdate(id, { $inc: { stock: quantity } }, { new: true });
  }

  // Atómico: el filtro { stock >= quantity } y el descuento ocurren en la misma
  // operación. Devuelve null si el producto no existe O si no alcanza el stock.
  async decreaseStock(id: string, quantity: number): Promise<IProduct | null> {
    return Product.findOneAndUpdate(
      { _id: id, stock: { $gte: quantity } },
      { $inc: { stock: -quantity } },
      { new: true }
    );
  }
}
