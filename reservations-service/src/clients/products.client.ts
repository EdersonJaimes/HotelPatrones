import axios from "axios";

export interface ProductDto {
  _id: string;
  name: string;
  price: number;
}

/**
 * Cliente HTTP hacia products-service. No usa una clave interna propia:
 * reenvía el MISMO token Bearer de quien llamó a reservations-service. Como
 * ese token ya fue validado (authenticateToken) y el rol ya fue verificado
 * (requireRole) para llegar hasta aquí, products-service puede confiar en él
 * igual que si el usuario lo hubiera llamado directamente.
 */
export class ProductsClient {
  private get baseUrl(): string {
    const url = process.env.PRODUCTS_SERVICE_URL;

    if (!url) {
      throw new Error("PRODUCTS_SERVICE_URL no está configurada");
    }

    return url;
  }

  async getProduct(authorization: string, productId: string): Promise<ProductDto> {
    try {
      const res = await axios.get<ProductDto>(`${this.baseUrl}/api/products/${productId}`, {
        headers: { Authorization: authorization },
        timeout: 5000
      });
      return res.data;
    } catch (error: any) {
      if (error.response?.status === 404) {
        throw new Error("Producto no encontrado");
      }
      throw new Error("No se pudo contactar a products-service");
    }
  }

  async removeStock(
    authorization: string,
    productId: string,
    quantity: number,
    reason: string
  ): Promise<void> {
    try {
      await axios.post(
        `${this.baseUrl}/api/inventory/remove`,
        { productId, quantity, reason },
        { headers: { Authorization: authorization }, timeout: 5000 }
      );
    } catch (error: any) {
      // Propaga el mensaje real de products-service (p.ej. "Stock insuficiente: ...")
      if (error.response?.data?.message) {
        throw new Error(error.response.data.message);
      }
      throw new Error("No se pudo descontar el stock en products-service");
    }
  }
}
