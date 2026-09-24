import Swal from "sweetalert2";

// Éxito
export const success = (msg: string) => {
  Swal.fire({
    icon: "success",
    title: "Éxito",
    text: msg,
    timer: 1800,
    showConfirmButton: false,
  });
};

// Error
export const error = (msg: string) => {
  Swal.fire({
    icon: "error",
    title: "Error",
    text: msg,
    confirmButtonColor: "#d33",
  });
};

// Confirmación
export const confirmAction = async (msg: string) => {
  return await Swal.fire({
    title: "¿Estás seguro?",
    text: msg,
    icon: "warning",
    showCancelButton: true,
    confirmButtonText: "Sí, continuar",
    cancelButtonText: "Cancelar",
    confirmButtonColor: "#16a34a",
    cancelButtonColor: "#d33",
  });
};

// Loading
export const loadingAlert = (msg = "Procesando...") => {
  Swal.fire({
    title: msg,
    allowOutsideClick: false,
    allowEscapeKey: false,
    didOpen: () => {
      Swal.showLoading();
    },
  });
};

// Cerrar cualquier alerta
export const closeAlert = () => {
  Swal.close();
};

Swal.mixin({
  customClass: {
    popup: "rounded-xl",
  },
});