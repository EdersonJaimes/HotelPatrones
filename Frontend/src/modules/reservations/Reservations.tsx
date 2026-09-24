import { useEffect, useState } from "react";
import Button from "../../components/Button";
import DataTable from "../../components/DataTable";
import Form from "../../components/Form";
import Modal from "../../components/Modal";

import { getRooms } from "../../services/roomService";
import {
  cancelReservation,
  checkInReservation,
  checkOutReservation,
  confirmReservation,
  createReservation,
  getReservations,
  updateReservation,
} from "../../services/reservationService";

import {
  closeAlert,
  confirmAction,
  error,
  loadingAlert,
  success,
} from "../../utils/alerts";

import { buildReservationColumns, getReservationFields } from "./reservation.config";
import type { Reservation } from "./reservation.types";

export default function Reservations() {
  const [data, setData] = useState<Reservation[]>([]);
  const [rooms, setRooms] = useState<any[]>([]);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState<Reservation | null>(null);

  const loadData = async () => {
    try {
      const res = await getReservations();
      setData(res);
    } catch {
      error("Error al cargar reservas");
    }
  };

  const loadRooms = async () => {
    try {
      const res = await getRooms();
      setRooms(res);
    } catch {
      error("Error al cargar habitaciones");
    }
  };

  useEffect(() => {
    loadData();
    loadRooms();
  }, []);

  // VALIDACIÓN
  const validateForm = (form: any) => {
    if (!form.roomId) return "La habitación es obligatoria";
    if (!form.clientName) return "El nombre del cliente es obligatorio";
    if (!form.checkIn) return "El check-in es obligatorio";
    if (!form.checkOut) return "El check-out es obligatorio";
    if (!form.guests) return "El número de huéspedes es obligatorio";
    if (isNaN(Number(form.guests))) return "El número de huéspedes debe ser numérico";
    if (!editing && !form.channel) return "El canal es obligatorio";

    return null;
  };

  // SUBMIT
  const handleSubmit = async (form: any) => {
    const validationError = validateForm(form);

    if (validationError) {
      return error(validationError);
    }

    try {
      loadingAlert("Guardando reserva...");

      if (editing) {
        await updateReservation(editing._id, {
          clientName: form.clientName,
          clientDocument: form.clientDocument,
          clientPhone: form.clientPhone,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          notes: form.notes,
        });
        closeAlert();
        success("Reserva actualizada");
      } else {
        await createReservation({
          roomId: form.roomId,
          clientName: form.clientName,
          clientDocument: form.clientDocument,
          clientPhone: form.clientPhone,
          checkIn: form.checkIn,
          checkOut: form.checkOut,
          guests: Number(form.guests),
          channel: form.channel,
          notes: form.notes,
        });
        closeAlert();
        success("Reserva creada");
      }

      setOpen(false);
      setEditing(null);
      loadData();

    } catch (err: any) {
      closeAlert();

      if (err.response?.data?.message) {
        error(err.response.data.message);
      } else {
        error("Error al guardar reserva");
      }
    }
  };

  // TRANSICIONES DE ESTADO
  const handleConfirm = async (row: Reservation) => {
    try {
      loadingAlert("Confirmando reserva...");
      await confirmReservation(row._id);
      closeAlert();
      success("Reserva confirmada");
      loadData();
    } catch (err: any) {
      closeAlert();
      error(err.response?.data?.message || "Error al confirmar reserva");
    }
  };

  const handleCheckIn = async (row: Reservation) => {
    try {
      loadingAlert("Registrando check-in...");
      await checkInReservation(row._id);
      closeAlert();
      success("Check-in registrado. La habitación quedó ocupada.");
      loadData();
    } catch (err: any) {
      closeAlert();
      error(err.response?.data?.message || "Error al registrar check-in");
    }
  };

  const handleCheckOut = async (row: Reservation) => {
    try {
      loadingAlert("Registrando check-out...");
      await checkOutReservation(row._id);
      closeAlert();
      success("Check-out registrado. La habitación pasó a limpieza.");
      loadData();
    } catch (err: any) {
      closeAlert();
      error(err.response?.data?.message || "Error al registrar check-out");
    }
  };

  const handleCancel = async (row: Reservation) => {
    const result = await confirmAction("Se cancelará la reserva");

    if (!result.isConfirmed) return;

    try {
      loadingAlert("Cancelando reserva...");
      await cancelReservation(row._id);
      closeAlert();
      success("Reserva cancelada");
      loadData();
    } catch (err: any) {
      closeAlert();
      error(err.response?.data?.message || "Error al cancelar reserva");
    }
  };

  return (
    <div>
      <h1 className="text-xl font-bold mb-4">Reservas</h1>

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
        columns={buildReservationColumns({
          onConfirm: handleConfirm,
          onCheckIn: handleCheckIn,
          onCheckOut: handleCheckOut,
          onCancel: handleCancel,
        })}
        onEdit={(row: Reservation) => {
          setEditing(row);
          setOpen(true);
        }}
      />

      <Modal
        isOpen={open}
        onClose={() => {
          setOpen(false);
          setEditing(null);
        }}
        title={editing ? "Editar Reserva" : "Nueva Reserva"}
      >
        <Form
          fields={getReservationFields(rooms)}
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
