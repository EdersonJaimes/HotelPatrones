import { useState } from "react";

interface Column<T> {
  header: string;
  accessor: keyof T;
  render?: (row: T) => React.ReactNode;
}

interface Props<T> {
  data: T[];
  columns: Column<T>[];
  onEdit?: (row: T) => void;
  onDelete?: (row: T) => void;
  onView?: (row: T) => void;
}

export default function DataTable<T extends { _id: string }>({
  data,
  columns,
  onEdit,
  onDelete,
  onView,
}: Props<T>) {
  const [search, setSearch] = useState("");

  // 🔍 FILTRO
  const filteredData = data.filter((row) =>
    Object.values(row).some((value) => {
      if (typeof value === "object" && value !== null) {
        return JSON.stringify(value)
          .toLowerCase()
          .includes(search.toLowerCase());
      }
      return String(value).toLowerCase().includes(search.toLowerCase());
    })
  );

  return (
    <div className="bg-white p-4 rounded shadow">

      {/* BUSCADOR */}
      <div className="mb-4 flex justify-between">
        <input
          type="text"
          placeholder="Buscar..."
          className="border p-2 rounded w-1/3"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
      </div>

      {/* TABLA */}
      <table className="w-full border-collapse">
        <thead>
          <tr className="bg-gray-100">
            {columns.map((col) => (
              <th key={String(col.accessor)} className="p-2 text-left">
                {col.header}
              </th>
            ))}
            <th className="p-2 text-center">Acciones</th>
          </tr>
        </thead>

        <tbody>
          {filteredData.map((row) => (
            <tr key={row._id} className="border-t hover:bg-gray-50">

              {columns.map((col) => (
                <td key={String(col.accessor)} className="p-2">
                  {col.render
                    ? col.render(row)
                    : String(row[col.accessor])}
                </td>
              ))}

              {/* ACCIONES */}
              <td className="p-2">
                <div className="flex justify-center items-center gap-2">

                  {onView && (
                    <button
                      onClick={() => onView(row)}
                      className="bg-purple-500 text-white px-3 py-1 rounded hover:bg-purple-600"
                    >
                      Movimientos
                    </button>
                  )}

                  {onEdit && (
                    <button
                      onClick={() => onEdit(row)}
                      className="bg-blue-500 text-white px-3 py-1 rounded hover:bg-blue-600"
                    >
                      Editar
                    </button>
                  )}

                  {onDelete && (
                    <button
                      onClick={() => onDelete(row)}
                      className="bg-red-500 text-white px-3 py-1 rounded hover:bg-red-600"
                    >
                      Eliminar
                    </button>
                  )}

                </div>
              </td>

            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}