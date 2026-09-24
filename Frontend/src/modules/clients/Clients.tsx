import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import Form from "../../components/Form";
import Modal from "../../components/Modal";

import {
  closeAlert,
  confirmAction,
  error,
  loadingAlert,
  success,
} from "../../utils/alerts";

import { clientColumns, clientFields } from "./client.config";

import {
  createClient,
  deleteClient,
  getClients,
  updateClient,
} from "../../services/clientService";

export default function Clients() {
  const [data, setData] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  // ✅ CARGAR DATOS
  const loadData = async () => {
    try {
      const res = await getClients();
      setData(res);
    } catch {
      error("Error al cargar clientes");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // ✅ VALIDACIÓN
  const validateForm = (form: any) => {
    if (!form.name) return "El nombre es obligatorio";

    if (!form.document) return "El documento es obligatorio";
    if (!/^\d+$/.test(form.document))
      return "El documento debe contener solo números";

    if (!form.phone) return "El teléfono es obligatorio";
    if (!/^\d+$/.test(form.phone))
      return "El teléfono debe contener solo números";

    return null;
  };

  // ✅ CREAR / EDITAR
  const handleSubmit = async (form: any) => {
    const validationError = validateForm(form);

    if (validationError) {
      return error(validationError);
    }

    try {
      loadingAlert("Guardando cliente...");

      if (editing) {
        await updateClient(editing._id, form);
        closeAlert();
        success("Cliente actualizado");
      } else {
        await createClient(form);
        closeAlert();
        success("Cliente creado");
      }

      setOpen(false);
      setEditing(null);
      loadData();

    } catch (err: any) {
      closeAlert();

      if (err.response?.data?.message) {
        error(err.response.data.message);
      } else {
        error("Error al guardar cliente");
      }
    }
  };

  // ✅ ELIMINAR
  const handleDelete = async (row: any) => {
    const result = await confirmAction("Se eliminará el cliente");

    if (result.isConfirmed) {
      try {
        loadingAlert("Eliminando...");

        await deleteClient(row._id);

        closeAlert();
        success("Cliente eliminado");

        loadData();
      } catch {
        closeAlert();
        error("Error al eliminar cliente");
      }
    }
  };

  // ✅ ABRIR CREACIÓN
  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  // ✅ EDITAR
  const handleEdit = (row: any) => {
    setEditing(row);
    setOpen(true);
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Clientes</h1>

      <Button text="+ Nuevo" onClick={handleCreate} type="success" />

      <DataTable
        data={data}
        columns={clientColumns}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar Cliente" : "Nuevo Cliente"}
      >
        <Form
          fields={clientFields}
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