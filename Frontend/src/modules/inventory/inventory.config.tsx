// 📦 TABLA INVENTARIO
export const inventoryColumns = [
  {
    header: "Producto",
    accessor: "product",
    render: (row: any) => row.product?.name ?? "Sin producto",
  },
  {
    header: "Stock",
    accessor: "stock",
  },
];

// 🧾 FORMULARIO
export const getInventoryFields = (products: any[]) => [
  {
    name: "productId",
    label: "Producto",
    type: "select",
    options: products.map((p) => ({
      label: p.name,
      value: p._id,
    })),
    required: true,
  },
  {
    name: "quantity",
    label: "Cantidad",
    type: "number",
    required: true,
    min: 1,
  },
  {
    name: "reason",
    label: "Motivo",
    required: true,
  },
];


// 📊 MOVIMIENTOS (KARDEX)
export const movementColumns = [
  {
    header: "Producto",
    accessor: "product",
    render: (row: any) => row.product?.name ?? "N/A",
  },
  {
    header: "Tipo",
    accessor: "type",
    render: (row: any) => (
      <span
        className={`px-2 py-1 rounded text-white ${
          row.type === "IN" ? "bg-green-500" : "bg-red-500"
        }`}
      >
        {row.type}
      </span>
    ),
  },
  {
    header: "Cantidad",
    accessor: "quantity",
  },
  {
    header: "Motivo",
    accessor: "reason",
  },
  {
    header: "Fecha",
    accessor: "date",
    render: (row: any) =>
      new Date(row.date).toLocaleString(),
  },
];