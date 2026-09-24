import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import Form from "../../components/Form";
import Modal from "../../components/Modal";

import {
  addStock,
  getInventory,
  removeStock,
} from "../../services/inventoryService";

import { getProduct } from "../../services/productService";

import {
  confirmAction,
  error,
  success,
} from "../../utils/alerts";

import InventoryMovements from "../inventory/inventoryMovements";

import {
  getInventoryFields,
  inventoryColumns,
} from "./inventory.config";

export default function Inventory() {
  const [data, setData] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [isRemove, setIsRemove] = useState(false);
  const [selectedProduct, setSelectedProduct] = useState<string | null>(null);

  // 📦 cargar inventario
  const loadData = async () => {
    const res = await getInventory();
    setData(res);
  };

  // 🛒 cargar productos
  const loadProducts = async () => {
    const res = await getProduct();
    setProducts(res);
  };

  useEffect(() => {
    loadData();
    loadProducts();
  }, []);

  // ➕ agregar stock
  const handleAdd = () => {
    setIsRemove(false);
    setOpen(true);
  };

  // ➖ descontar stock
  const handleRemove = () => {
    setIsRemove(true);
    setOpen(true);
  };

  // 📩 submit formulario
  const handleSubmit = async (form: any) => {
    try {
      if (!form.productId) {
        return error("Seleccione un producto");
      }

      if (!form.quantity || form.quantity <= 0) {
        return error("Cantidad inválida");
      }

      if (!form.reason) {
        return error("Ingrese un motivo");
      }

      if (isRemove) {
        const confirm = await confirmAction("Descontar stock");

        if (confirm.isConfirmed) {
          await removeStock(form);
          success("Stock descontado");
        }
      } else {
        await addStock(form);
        success("Stock agregado");
      }

      setOpen(false);
      loadData();

    } catch (err: any) {
      error(err.response?.data?.message || "Error en operación");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Inventario</h1>

      <div className="flex gap-2 mb-4">
        <Button text="+ Agregar Stock" onClick={handleAdd} type="success" />
        <Button text="- Descontar Stock" onClick={handleRemove} type="danger" />
      </div>

      <DataTable
        data={data}
        columns={inventoryColumns}
        onView={(row) => setSelectedProduct(row.product?._id)}
      />

      {/* MODAL FORM */}
      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={isRemove ? "Descontar Stock" : "Agregar Stock"}
      >
        <Form
          fields={getInventoryFields(products)}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </Modal>

      {/* MODAL MOVIMIENTOS */}
      {selectedProduct && (
        <InventoryMovements
          productId={selectedProduct}
          onClose={() => setSelectedProduct(null)}
        />
      )}
    </div>
  );
}