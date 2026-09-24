export const ROOM_AMENITIES = [
  "Aire acondicionado",
  "Ventilador",
  "TV",
  "Wifi",
  "Minibar",
  "Jacuzzi",
  "Balcón",
  "Caja fuerte",
];

export const roomFields = [
  { name: "number", label: "Número", type: "number" },

  {
    name: "type",
    label: "Tipo",
    type: "select",
    helpText: "Define la capacidad y el rango de tarifa de la habitación",
    options: [
      { label: "Individual", value: "individual" },
      { label: "Doble", value: "doble" },
      { label: "Triple", value: "triple" },
      { label: "Suite", value: "suite" },
    ],
  },

  { name: "price", label: "Precio", type: "number" },

  {
    name: "status",
    label: "Estado",
    type: "select",
    options: [
      { label: "Disponible", value: "available" },
      { label: "Ocupada", value: "occupied" },
      { label: "Limpieza", value: "cleaning" },
      { label: "Mantenimiento", value: "maintenance" },
    ],
  },

  {
    name: "amenities",
    label: "Amenities",
    type: "checkbox-group",
    options: ROOM_AMENITIES.map((amenity) => ({ label: amenity, value: amenity })),
  },
];

export const roomColumns = [
  { header: "Número", accessor: "number" },
  { header: "Tipo", accessor: "type" },
  { header: "Capacidad", accessor: "capacity" },
  { header: "Precio", accessor: "price" },
  { header: "Estado", accessor: "status" },
  {
    header: "Amenities",
    accessor: "amenities",
    render: (row: any) =>
      Array.isArray(row.amenities) && row.amenities.length > 0
        ? row.amenities.join(", ")
        : "—",
  },
];
