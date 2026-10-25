import { publishLowStock, publishStockChanged } from "../broker/product.publisher";
import { getMovementTypeFlyweight, getProductFlyweight, KardexEntry, kardexPoolSizes } from "../flyweights/kardex.flyweight";
import { deserialize, retainedBytes } from "../flyweights/memory.probe";
import { MovementType } from "../models/inventoryMovement.model";
import { IProduct } from "../models/product.model";
import { InventoryMovementRepository, LeanMovement } from "../repositories/inventoryMovement.repository";
import { ProductRepository } from "../repositories/product.repository";

const NOT_FOUND = "Producto no encontrado";

function lowStockThreshold(): number {
  const value = Number(process.env.LOW_STOCK_THRESHOLD);
  return Number.isFinite(value) && value >= 0 ? value : 5;
}

// Forma que espera el frontend (inventory.types.ts): { _id, product: { _id, name }, stock }
function toInventoryRow(product: IProduct) {
  const id = product._id.toString();

  return {
    _id: id,
    product: { _id: id, name: product.name },
    stock: product.stock
  };
}

// Patrón Flyweight: cada movimiento se convierte en un contexto (KardexEntry)
// que apunta al flyweight compartido de su producto y de su tipo, y solo
// guarda lo propio (id, cantidad, motivo, fecha). La fila resultante tiene la
// forma que espera el frontend (InventoryMovement), pero su `product` es el
// mismo objeto para todos los movimientos de ese producto.
function toMovementRow(movement: LeanMovement) {
  const entry = new KardexEntry(
    getProductFlyweight(movement.productId.toString(), movement.productName),
    getMovementTypeFlyweight(movement.type),
    {
      id: movement._id.toString(),
      quantity: movement.quantity,
      reason: movement.reason,
      date: movement.date
    }
  );

  return entry.toRow();
}

export class InventoryService {
  private readonly productRepository = new ProductRepository();
  private readonly movementRepository = new InventoryMovementRepository();

  async listInventory() {
    const products = await this.productRepository.findAll();
    return products.map(toInventoryRow);
  }

  async getSummary(limit: number) {
    const { count, items } = await this.productRepository.lowStockSummary(lowStockThreshold(), limit);

    return {
      threshold: lowStockThreshold(),
      lowStock: count,
      lowStockItems: items.map((p) => ({ _id: String(p._id), name: p.name, stock: p.stock }))
    };
  }

  async addStock(productId: string, quantity: number, reason: string) {
    const product = await this.productRepository.increaseStock(productId, quantity);

    if (!product) {
      throw new Error(NOT_FOUND);
    }

    await this.recordMovement(product, "IN", quantity, reason, () =>
      this.productRepository.decreaseStock(productId, quantity)
    );

    await publishStockChanged({
      productId,
      name: product.name,
      type: "IN",
      quantity,
      stock: product.stock,
      reason
    });

    return toInventoryRow(product);
  }

  async removeStock(productId: string, quantity: number, reason: string) {
    const product = await this.productRepository.decreaseStock(productId, quantity);

    if (!product) {
      // decreaseStock devuelve null tanto si no existe como si no alcanza: se distingue aquí.
      const existing = await this.productRepository.findById(productId);

      if (!existing) {
        throw new Error(NOT_FOUND);
      }

      throw new Error(`Stock insuficiente: disponible ${existing.stock}, solicitado ${quantity}`);
    }

    await this.recordMovement(product, "OUT", quantity, reason, () =>
      this.productRepository.increaseStock(productId, quantity)
    );

    await publishStockChanged({
      productId,
      name: product.name,
      type: "OUT",
      quantity,
      stock: product.stock,
      reason
    });

    // Solo se avisa al CRUZAR el umbral hacia abajo, para no repetir el evento en cada venta.
    const threshold = lowStockThreshold();
    const previousStock = product.stock + quantity;

    if (product.stock <= threshold && previousStock > threshold) {
      await publishLowStock({ productId, name: product.name, stock: product.stock, threshold });
    }

    return toInventoryRow(product);
  }

  async getMovements(productId: string) {
    const movements = await this.movementRepository.findByProductId(productId);
    return movements.map(toMovementRow);
  }

  async getRecentMovements(limit: number) {
    const movements = await this.movementRepository.findRecent(limit);
    return movements.map(toMovementRow);
  }

  // RAM retenida por la respuesta del kardex en este proceso, antes y después
  // del Flyweight, con los datos reales de la base. Se mide la fila ya armada
  // más el JSON que envía res.json(): el pico de cada petición.
  async measureKardexMemory(limit: number) {
    const raw = await this.movementRepository.findRecentRaw(limit);
    const withJson = (rows: unknown[]) => [rows, JSON.stringify(rows)];

    // Antes: documentos Mongoose y cada fila con su propia copia de { _id, name } del producto.
    const before = retainedBytes(() =>
      withJson(
        raw.map((buffer) => {
          const m = this.movementRepository.hydrate(deserialize(buffer));
          return {
            _id: m._id.toString(),
            product: { _id: m.productId.toString(), name: m.productName },
            type: m.type,
            quantity: m.quantity,
            reason: m.reason,
            date: m.date
          };
        })
      )
    );
    // Paso intermedio: objetos planos, pero cada fila con su propia copia del producto.
    const leanOnly = retainedBytes(() =>
      withJson(
        raw.map((buffer) => {
          const m = deserialize<LeanMovement>(buffer);
          return {
            _id: m._id.toString(),
            product: { _id: m.productId.toString(), name: m.productName },
            type: m.type,
            quantity: m.quantity,
            reason: m.reason,
            date: m.date
          };
        })
      )
    );
    // Después: lo que hace hoy getRecentMovements().
    const after = retainedBytes(() => withJson(raw.map((buffer) => toMovementRow(deserialize<LeanMovement>(buffer)))));

    return { rows: raw.length, before, leanOnly, after, shared: kardexPoolSizes() };
  }

  async getTopConsumed(limit: number) {
    return this.movementRepository.aggregateTopConsumed(limit);
  }

  // Mongo standalone no tiene transacciones: si el kardex no se puede escribir,
  // se deshace el cambio de stock (compensación) para que ambos queden consistentes.
  private async recordMovement(
    product: IProduct,
    type: MovementType,
    quantity: number,
    reason: string,
    compensate: () => Promise<unknown>
  ): Promise<void> {
    try {
      await this.movementRepository.create({
        productId: product._id.toString(),
        productName: product.name,
        type,
        quantity,
        reason
      });
    } catch (error) {
      await compensate();
      throw error;
    }
  }
}
