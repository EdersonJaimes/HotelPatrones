export const productFields = [
  { name: "name", label: "Nombre" },
  { name: "price", label: "Precio", type: "number" },
  {
    name: "category",
    label: "Categoría",
    type: "select",
    options: [
      { label: "Bebida", value: "Bebida" },
      { label: "Snack", value: "Snack" },
      { label: "Aseo", value: "Aseo" },
      { label: "General", value: "General" },
    ],
  },
];

export const productColumns = [
  { header: "Nombre", accessor: "name" },
  { header: "Precio", accessor: "price" },
  {
    header: "Categoría",
    accessor: "category",
    render: (row: any) => row.category || "Sin categoría", // 🔥 FIX visual
  },
];