import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import Form from "../../components/Form";
import Modal from "../../components/Modal";

import {
  createProduct,
  deleteProduct,
  getProduct,
  updateProduct,
} from "../../services/productService";

import {
  closeAlert,
  confirmAction,
  error,
  loadingAlert,
  success,
} from "../../utils/alerts";

import { productColumns, productFields } from "./product.config";
import { Product } from "./product.types";

export default function Products() {
  const [data, setData] = useState<Product[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Product | null>(null);

  // ✅ CARGAR DATOS
  const loadData = async () => {
    try {
      const res = await getProduct();
      setData(res);
    } catch {
      error("Error al cargar productos");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ VALIDACIÓN
  const validateForm = (form: any) => {
    if (!form.name) return "El nombre es obligatorio";

    if (!form.price) return "El precio es obligatorio";
    if (isNaN(Number(form.price)))
      return "El precio debe ser un número";

    return null;
  };

  // ✅ SUBMIT
  const handleSubmit = async (form: any) => {
    const validationError = validateForm(form);

    if (validationError) {
      return error(validationError);
    }

    try {
      loadingAlert("Guardando producto...");

      const cleanForm: Product = {
        name: form.name,
        price: Number(form.price),
        category: form.category || "General",
      };

      if (editing) {
        await updateProduct(editing._id!, cleanForm);
        closeAlert();
        success("Producto actualizado");
      } else {
        await createProduct(cleanForm);
        closeAlert();
        success("Producto creado");
      }

      setOpen(false);
      setEditing(null);
      loadData();

    } catch (err: any) {
      closeAlert();

      if (err.response?.data?.message) {
        error(err.response.data.message);
      } else {
        error("Error al guardar producto");
      }
    }
  };

  // ✅ DELETE
  const handleDelete = async (row: Product) => {
    const result = await confirmAction("Se eliminará el producto");

    if (result.isConfirmed) {
      try {
        loadingAlert("Eliminando...");

        await deleteProduct(row._id!);

        closeAlert();
        success("Producto eliminado");

        loadData();
      } catch {
        closeAlert();
        error("Error al eliminar producto");
      }
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Productos</h1>

      <Button
        text="+ Nuevo"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        type="success"
      />

      <DataTable
        data={data}
        columns={productColumns}
        onEdit={(row: Product) => {
          setEditing(row);
          setOpen(true);
        }}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar Producto" : "Nuevo Producto"}
      >
        <Form
          fields={productFields}
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => {
            setOpen(false);
            setEditing(null);
          }}
        />
      </Modal>
    </div>
  );
}