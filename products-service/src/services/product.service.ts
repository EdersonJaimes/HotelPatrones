import {
  publishProductCreated,
  publishProductDeleted,
  publishProductUpdated
} from "../broker/product.publisher";
import { IProduct, ProductCategory } from "../models/product.model";
import { ProductRepository } from "../repositories/product.repository";

const DUPLICATE_NAME = "Ya existe un producto con ese nombre";
const NOT_FOUND = "Producto no encontrado";

function toEventData(product: IProduct) {
  return {
    productId: product._id.toString(),
    name: product.name,
    price: product.price,
    category: product.category,
    stock: product.stock
  };
}

// Código 11000 = violación del índice único (carrera entre dos altas simultáneas).
function isDuplicateKeyError(error: unknown): boolean {
  return typeof error === "object" && error !== null && (error as { code?: number }).code === 11000;
}

export class ProductService {
  private readonly productRepository = new ProductRepository();

  async listProducts() {
    return this.productRepository.findAll();
  }

  async getProductById(id: string) {
    const product = await this.productRepository.findById(id);

    if (!product) {
      throw new Error(NOT_FOUND);
    }

    return product;
  }

  async createProduct(data: { name: string; price: number; category?: ProductCategory }) {
    if (await this.productRepository.findByName(data.name)) {
      throw new Error(DUPLICATE_NAME);
    }

    let product: IProduct;

    try {
      product = await this.productRepository.create(data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error(DUPLICATE_NAME);
      }
      throw error;
    }

    await publishProductCreated(toEventData(product));

    return product;
  }

  async updateProduct(
    id: string,
    data: { name?: string; price?: number; category?: ProductCategory }
  ) {
    const current = await this.productRepository.findById(id);

    if (!current) {
      throw new Error(NOT_FOUND);
    }

    if (data.name !== undefined) {
      const sameName = await this.productRepository.findByName(data.name);

      if (sameName && sameName._id.toString() !== id) {
        throw new Error(DUPLICATE_NAME);
      }
    }

    let product: IProduct | null;

    try {
      product = await this.productRepository.update(id, data);
    } catch (error) {
      if (isDuplicateKeyError(error)) {
        throw new Error(DUPLICATE_NAME);
      }
      throw error;
    }

    if (!product) {
      throw new Error(NOT_FOUND);
    }

    await publishProductUpdated(toEventData(product));

    return product;
  }

  async deleteProduct(id: string) {
    const product = await this.productRepository.deleteById(id);

    if (!product) {
      throw new Error(NOT_FOUND);
    }

    // El historial de movimientos se conserva a propósito (kardex).
    await publishProductDeleted({ productId: product._id.toString(), name: product.name });

    return product;
  }
}
