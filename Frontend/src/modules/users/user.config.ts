export const userFields = [
  { name: "name", label: "Nombre", type: "text" },
  { name: "username", label: "Usuario", type: "text" },
  {
    name: "password",
    label: "Contraseña",
    type: "password",
    placeholder: "Mínimo 6 caracteres",
    helpText: "Al editar, déjala vacía para no cambiarla",
  },
  {
    name: "role",
    label: "Rol",
    type: "select",
    options: [
      { label: "Recepcionista", value: "recepcionista" },
      { label: "Administrador", value: "admin" },
    ],
  },
];

export const userColumns = [
  { header: "Nombre", accessor: "name" },
  { header: "Usuario", accessor: "username" },
  { header: "Rol", accessor: "role" },
];