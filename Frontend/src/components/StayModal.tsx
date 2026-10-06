import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import api from "../services/api";
import { addProduct, checkout } from "../services/stayService";

export default function StayModal({
  stay,
  onClose,
  reload,
}: any) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  const [quantity, setQuantity] = useState(1);

  // 🔥 cargar productos
  useEffect(() => {
    api
      .get("/products")
      .then((res) => setProducts(res.data))
      .catch(() => Swal.fire("Error", "No se pudieron cargar los productos", "error"));
  }, []);

  // El backend responde con el motivo (ej. "Stock insuficiente: ..."); se muestra tal cual.
  const showError = (error: any) =>
    Swal.fire("Error", error.response?.data?.message ?? "Ocurrió un error", "error");

  const handleAdd = async () => {
    if (!selectedProduct) {
      Swal.fire("Seleccione un producto", "", "warning");
      return;
    }

    try {
      await addProduct({
        stayId: stay._id,
        productId: selectedProduct,
        quantity,
      });
    } catch (error) {
      showError(error);
      return;
    }

    Swal.fire("Agregado", "", "success");
    reload();
  };

  const handleCheckout = async () => {
    let res;

    try {
      res = await checkout(stay._id);
    } catch (error) {
      showError(error);
      return;
    }

    Swal.fire({
      title: "Cuenta",
      html: `
        <p>Horas: ${res.hours}</p>
        <p>Habitación: $${res.roomTotal}</p>
        <p>Productos: $${res.productsTotal}</p>
        <h3>Total: $${res.total}</h3>
      `,
    });

    onClose();
    reload();
  };

  if (!stay) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-30 flex justify-center items-center">
      <div className="bg-white p-6 rounded-2xl w-[400px]">
        <h2 className="text-xl font-bold mb-4">
          Habitación activa
        </h2>

        {/* productos consumidos */}
        <div className="mb-4">
          {stay.products.map((p: any, i: number) => (
            <p key={i}>
              {p.product?.name} x{p.quantity}
            </p>
          ))}
        </div>

        {/* agregar producto */}
        <select
          className="w-full border p-2 mb-2"
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Seleccione producto</option>
          {products.map((p) => (
            <option key={p._id} value={p._id}>
              {p.name}
            </option>
          ))}
        </select>

        <input
          type="number"
          className="w-full border p-2 mb-2"
          value={quantity}
          onChange={(e) => setQuantity(Number(e.target.value))}
        />

        <button
          className="bg-green-500 text-white w-full mb-2"
          onClick={handleAdd}
        >
          Agregar producto
        </button>

        <button
          className="bg-red-500 text-white w-full"
          onClick={handleCheckout}
        >
          Checkout
        </button>
      </div>
    </div>
  );
}