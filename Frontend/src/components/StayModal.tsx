import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getProduct } from "../services/productService";
import { addConsumption, checkout } from "../services/stayService";

export default function StayModal({
  reservation,
  onClose,
  reload,
}: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);
  const [current, setCurrent] = useState(reservation);

  // 🔥 cargar productos (vía productService, ya autenticado con el token real)
  useEffect(() => {
    getProduct()
      .then(setProducts)
      .catch((error: any) => console.error("Error cargando productos:", error.response?.data));
  }, []);

  const handleAdd = async () => {
    if (!selectedProduct) {
      Swal.fire("Selecciona un producto", "", "warning");
      return;
    }

    try {
      const updated = await addConsumption(current._id, {
        productId: selectedProduct,
        quantity,
      });
      setCurrent(updated);
      Swal.fire("Agregado a la cuenta", "", "success");
    } catch (error: any) {
      // Por ejemplo "Stock insuficiente: disponible 2, solicitado 5"
      Swal.fire("No se pudo agregar", error.response?.data?.message ?? "Error", "error");
    }
  };

  const handleCheckout = async () => {
    try {
      const res = await checkout(current._id);

      const nights = Math.ceil(
        (new Date(res.actualCheckOut).getTime() - new Date(res.actualCheckIn).getTime()) /
          (1000 * 60 * 60 * 24)
      );

      Swal.fire({
        title: "Cuenta final",
        html: `
          <p>Cliente: ${res.clientName}</p>
          <p>Noches: ${Math.max(1, nights)}</p>
          <p>Habitación: $${res.roomTotal}</p>
          <p>Consumo: $${res.productsTotal}</p>
          <h3>Total: $${res.grandTotal}</h3>
        `,
      });

      onClose();
      reload();
    } catch (error: any) {
      Swal.fire("No se pudo hacer check-out", error.response?.data?.message ?? "Error", "error");
    }
  };

  if (!current) return null;

  const productsTotal = (current.consumptions ?? []).reduce(
    (sum: number, item: any) => sum + item.subtotal,
    0
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-2xl w-[400px]">
        <h2 className="text-xl font-bold mb-1">Habitación {current.roomNumber}</h2>
        <p className="text-sm text-gray-500 mb-4">{current.clientName}</p>

        {/* productos consumidos */}
        <div className="mb-4">
          {(current.consumptions ?? []).length === 0 && (
            <p className="text-sm text-gray-400">Sin consumo todavía</p>
          )}
          {(current.consumptions ?? []).map((p: any, i: number) => (
            <p key={i}>
              {p.name} x{p.quantity} = ${p.subtotal}
            </p>
          ))}
          {productsTotal > 0 && (
            <p className="font-semibold mt-1">Subtotal consumo: ${productsTotal}</p>
          )}
        </div>

        {/* agregar producto */}
        <select
          className="w-full border p-2 mb-2"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Seleccione producto</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name} - ${p.price}
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          className="w-full border p-2 mb-2"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        <button
          className="bg-green-500 text-white w-full mb-2 py-2 rounded"
          onClick={handleAdd}
        >
          Agregar producto
        </button>

        <button
          className="bg-red-500 text-white w-full py-2 rounded mb-2"
          onClick={handleCheckout}
        >
          Check-out
        </button>

        <button
          className="w-full py-2 rounded border"
          onClick={onClose}
        >
          Cerrar
        </button>
      </div>
    </div>
  );
}
