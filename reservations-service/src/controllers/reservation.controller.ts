import { Response } from "express";
import { AuthenticatedRequest } from "../middlewares/auth.middleware";
import { ReservationService } from "../services/reservation.service";

function statusForError(message: string): number {
  if (message === "Reserva no encontrada" || message === "Habitación no encontrada") {
    return 404;
  }

  if (message === "La habitación ya tiene una reserva activa para esas fechas") {
    return 409;
  }

  return 400;
}

export class ReservationController {
  private readonly reservationService = new ReservationService();

  list = async (_req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservations = await this.reservationService.listReservations();
      res.status(200).json(reservations);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error obteniendo reservas";
      res.status(500).json({ message });
    }
  };

  getById = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.getReservationById(req.params.id as string);
      res.status(200).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error obteniendo reserva";
      res.status(statusForError(message)).json({ message });
    }
  };

  create = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.createReservation({
        ...req.body,
        createdBy: req.user?.id
      });
      res.status(201).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error creando reserva";
      res.status(statusForError(message)).json({ message });
    }
  };

  update = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.updateReservation(req.params.id as string, req.body);
      res.status(200).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error actualizando reserva";
      res.status(statusForError(message)).json({ message });
    }
  };

  confirm = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.confirmReservation(req.params.id as string);
      res.status(200).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error confirmando reserva";
      res.status(statusForError(message)).json({ message });
    }
  };

  checkIn = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.checkIn(req.params.id as string);
      res.status(200).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error registrando check-in";
      res.status(statusForError(message)).json({ message });
    }
  };

  checkOut = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.checkOut(req.params.id as string);
      res.status(200).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error registrando check-out";
      res.status(statusForError(message)).json({ message });
    }
  };

  cancel = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      const reservation = await this.reservationService.cancelReservation(req.params.id as string);
      res.status(200).json(reservation);
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error cancelando reserva";
      res.status(statusForError(message)).json({ message });
    }
  };

  remove = async (req: AuthenticatedRequest, res: Response): Promise<void> => {
    try {
      await this.reservationService.deleteReservation(req.params.id as string);
      res.status(200).json({ message: "Reserva eliminada correctamente" });
    } catch (error) {
      const message = error instanceof Error ? error.message : "Error eliminando reserva";
      res.status(statusForError(message)).json({ message });
    }
  };
}
