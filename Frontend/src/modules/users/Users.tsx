import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import Form from "../../components/Form";
import Modal from "../../components/Modal";
import { closeAlert, confirmAction, error, loadingAlert, success } from "../../utils/alerts";
import { userColumns, userFields } from "./user.config";

import {
  createUser,
  deleteUser,
  getUsers,
  updateUser
} from "../../services/userService";


export default function Users() {
  const [data, setData] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<any>(null);

  const loadData = async () => {
    const res = await getUsers();
    console.log(res);
    setData(res);
  };

  useEffect(() => {
    loadData();
  }, []);

  const handleCreate = () => {
    setEditing(null);
    setOpen(true);
  };

  const handleEdit = (row: any) => {
    setEditing(row);
    setOpen(true);
  };

  const handleDelete = async (row: any) => {
    const result = await confirmAction("Eliminar Usuario");

    if (!result.isConfirmed) {
      return;
    }

    try {
      loadingAlert("Eliminando...");
      await deleteUser(row._id);
      closeAlert();
      success("Usuario eliminado");
      loadData();
    } catch (err: any) {
      closeAlert();
      error(err.response?.data?.message || "Error al eliminar usuario");
    }
  };

  const handleSubmit = async (form: any) => {
    if (!form.name || !form.username) {
      alert("Nombre y usuario son obligatorios");
      return;
    }

    if (!form.role) {
      form.role = "recepcionista";
    }

    try {
      loadingAlert("Guardando usuario...");

      if (editing) {
        await updateUser(editing._id, form);
        closeAlert();
        success("Usuario actualizado correctamente");
      } else {
        await createUser(form);
        closeAlert();
        success("Usuario creado correctamente");
      }

      setOpen(false);
      loadData();
    } catch (err: any) {
      closeAlert();
      error(err.response?.data?.message || "Error al guardar usuario");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Usuarios</h1>

      <Button text="+ Nuevo" onClick={handleCreate} type="success" />

      <DataTable
        data={data}
        columns={userColumns}
        onEdit={handleEdit}
        onDelete={handleDelete}
      />

      <Modal
        isOpen={open}
        onClose={() => setOpen(false)}
        title={editing ? "Editar Usuario" : "Nuevo Usuario"}
      >
        <Form
          fields={userFields}
          initialData={editing}
          onSubmit={handleSubmit}
          onCancel={() => setOpen(false)}
        />
      </Modal>
    </div>
  );
}