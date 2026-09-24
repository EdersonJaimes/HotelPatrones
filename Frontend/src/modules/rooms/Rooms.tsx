import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import Form from "../../components/Form";
import Modal from "../../components/Modal";

import {
  createRoom,
  deleteRoom,
  getRooms,
  updateRoom,
} from "../../services/roomService";

import {
  closeAlert,
  confirmAction,
  error,
  loadingAlert,
  success,
} from "../../utils/alerts";

import { roomColumns, roomFields } from "./room.config";
import { Room } from "./room.types";

export default function Rooms() {
  const [data, setData] = useState<Room[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Room | null>(null);

  const loadData = async () => {
    try {
      const res = await getRooms();
      setData(res);
    } catch {
      error("Error al cargar habitaciones");
    }
  };

  useEffect(() => {
    loadData();
  }, []);

  // VALIDACIÓN
  const validateForm = (form: any) => {
    if (!form.number) return "El número es obligatorio";
    if (isNaN(Number(form.number))) return "El número debe ser numérico";

    if (!form.type) return "El tipo es obligatorio";

    if (!form.price) return "El precio es obligatorio";
    if (isNaN(Number(form.price))) return "El precio debe ser numérico";

    return null;
  };

  //SUBMIT
  const handleSubmit = async (form: any) => {
    const validationError = validateForm(form);

    if (validationError) {
      return error(validationError);
    }

    try {
      loadingAlert("Guardando habitación...");

      const cleanForm: Room = {
        number: Number(form.number),
        type: form.type,
        price: Number(form.price),
        status: form.status || "available",
        amenities: Array.isArray(form.amenities) ? form.amenities : [],
      };

      if (editing) {
        await updateRoom(editing._id!, cleanForm);
        closeAlert();
        success("Habitación actualizada");
      } else {
        await createRoom(cleanForm);
        closeAlert();
        success("Habitación creada");
      }

      setOpen(false);
      setEditing(null);
      loadData();

    } catch (err: any) {
      closeAlert();

      if (err.response?.data?.message) {
        error(err.response.data.message);
      } else {
        error("Error al guardar habitación");
      }
    }
  };

  //DELETE
  const handleDelete = async (row: Room) => {
    const result = await confirmAction("Se eliminará la habitación");

    if (result.isConfirmed) {
      try {
        loadingAlert("Eliminando...");

        await deleteRoom(row._id!);

        closeAlert();
        success("Habitación eliminada");

        loadData();
      } catch {
        closeAlert();
        error("Error al eliminar habitación");
      }
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Habitaciones</h1>

      <Button
        text="+ Nueva"
        onClick={() => {
          setEditing(null);
          setOpen(true);
        }}
        type="success"
      />

      <DataTable
        data={data}
        columns={roomColumns}
        onEdit={(row: Room) => {
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
        title={editing ? "Editar Habitación" : "Nueva Habitación"}
      >
        <Form
          fields={roomFields}
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