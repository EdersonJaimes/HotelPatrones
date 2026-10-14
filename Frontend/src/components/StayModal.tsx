import { useEffect, useState } from "react";
import Swal from "sweetalert2";
import { getProduct } from "../services/productService";
import { addConsumption, checkout } from "../services/stayService";
import type { Account, ReservationWithAccount } from "../services/stayService";
import { escapeHtml, formatDateTime, formatMoney } from "../utils/format";

interface Props {
  reservation: ReservationWithAccount;
  onClose: () => void;
  // Se llama cuando el check-out ya quedó hecho (para pasar la habitación a aseo).
  onCheckedOut: (roomId: string) => void;
}

// Factura final: una fila por cada cargo + total.
const invoiceHtml = (res: ReservationWithAccount): string => {
  const a: Account = res.account;

  const rows = a.lines
    .map(
      (l) => `
      <tr>
        <td style="text-align:left;padding:4px 6px">${escapeHtml(l.concept)}</td>
        <td style="text-align:center;padding:4px 6px">${l.quantity}${l.type === "room" ? (l.quantity === 1 ? " noche" : " noches") : ""}</td>
        <td style="text-align:right;padding:4px 6px">${formatMoney(l.unitPrice)}</td>
        <td style="text-align:right;padding:4px 6px">${formatMoney(l.subtotal)}</td>
      </tr>`
    )
    .join("");

  return `
    <p style="margin:0 0 4px"><b>Cliente:</b> ${escapeHtml(res.clientName)}</p>
    <p style="margin:0 0 10px;font-size:13px;color:#666">
      Entrada: ${formatDateTime(res.actualCheckIn)} · Salida: ${formatDateTime(res.actualCheckOut)}
    </p>
    <table style="width:100%;border-collapse:collapse;font-size:14px">
      <thead>
        <tr style="border-bottom:1px solid #ccc">
          <th style="text-align:left;padding:4px 6px">Concepto</th>
          <th style="padding:4px 6px">Cant.</th>
          <th style="text-align:right;padding:4px 6px">Valor unit.</th>
          <th style="text-align:right;padding:4px 6px">Subtotal</th>
        </tr>
      </thead>
      <tbody>${rows}</tbody>
      <tfoot>
        <tr style="border-top:1px solid #ccc">
          <td colspan="3" style="text-align:right;padding:6px"><b>Hospedaje</b></td>
          <td style="text-align:right;padding:6px">${formatMoney(a.roomTotal)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;padding:6px"><b>Consumo</b></td>
          <td style="text-align:right;padding:6px">${formatMoney(a.productsTotal)}</td>
        </tr>
        <tr>
          <td colspan="3" style="text-align:right;padding:6px;font-size:16px"><b>TOTAL A PAGAR</b></td>
          <td style="text-align:right;padding:6px;font-size:16px"><b>${formatMoney(a.grandTotal)}</b></td>
        </tr>
      </tfoot>
    </table>`;
};

export default function StayModal({ reservation, onClose, onCheckedOut }: Props) {
  const [products, setProducts] = useState<any[]>([]);
  const [selectedProduct, setSelectedProduct] = useState("");
  // Texto tal cual lo escribe el usuario (si se forzara a número al teclear,
  // al borrar el campo volvería a 1 y escribir "50" daría "150").
  const [quantityInput, setQuantityInput] = useState("1");
  const [current, setCurrent] = useState<ReservationWithAccount>(reservation);
  const [busy, setBusy] = useState(false);

  const loadProducts = () =>
    getProduct()
      .then(setProducts)
      .catch((error: any) => console.error("Error cargando productos:", error.response?.data));

  useEffect(() => {
    loadProducts();
  }, []);

  const handleAdd = async () => {
    if (!selectedProduct) {
      Swal.fire("Selecciona un producto", "", "warning");
      return;
    }

    const quantity = Number(quantityInput);

    if (!Number.isInteger(quantity) || quantity < 1) {
      Swal.fire("Cantidad inválida", "Ingresa un número entero mayor a 0", "warning");
      return;
    }

    setBusy(true);
    try {
      const updated = await addConsumption(current._id, { productId: selectedProduct, quantity });
      setCurrent(updated);
      setSelectedProduct("");
      setQuantityInput("1");
      loadProducts(); // refresca el stock mostrado
    } catch (error: any) {
      // Por ejemplo: "Stock insuficiente: disponible 2, solicitado 5"
      Swal.fire("No se pudo agregar", error.response?.data?.message ?? "Error", "error");
    } finally {
      setBusy(false);
    }
  };

  const handleCheckout = async () => {
    const confirmation = await Swal.fire({
      title: "Confirmar check-out",
      html: `Total a la fecha: <b>${formatMoney(current.account.grandTotal)}</b>`,
      showCancelButton: true,
      confirmButtonText: "Hacer check-out",
      cancelButtonText: "Cancelar",
    });

    if (!confirmation.isConfirmed) return;

    setBusy(true);
    try {
      const res = await checkout(current._id);

      await Swal.fire({
        title: `Cuenta final · Habitación ${res.roomNumber}`,
        html: invoiceHtml(res),
        width: 640,
        confirmButtonText: "Cerrar",
      });

      onCheckedOut(current.roomId);
    } catch (error: any) {
      Swal.fire("No se pudo hacer check-out", error.response?.data?.message ?? "Error", "error");
    } finally {
      setBusy(false);
    }
  };

  const account = current.account;

  return (
    <div className="fixed inset-0 z-40 bg-black bg-opacity-40 flex justify-center items-center">
      <div className="bg-white p-6 rounded-2xl w-[460px] max-h-[92vh] overflow-y-auto">
        <h2 className="text-xl font-bold">Habitación {current.roomNumber}</h2>
        <p className="text-sm text-gray-500">
          {current.clientName} · entrada {formatDateTime(current.actualCheckIn)}
        </p>

        {/* CUENTA: el hospedaje es el primer cargo desde el check-in */}
        <table className="w-full text-sm my-4">
          <thead>
            <tr className="border-b text-gray-500">
              <th className="text-left py-1">Concepto</th>
              <th className="text-center">Cant.</th>
              <th className="text-right">Subtotal</th>
            </tr>
          </thead>
          <tbody>
            {account.lines.map((line, i) => (
              <tr key={i} className="border-b border-gray-100">
                <td className="py-1">
                  {line.concept}
                  {line.type === "room" && (
                    <span className="block text-xs text-gray-400">
                      {formatMoney(line.unitPrice)} / noche (se cobra por noche cumplida)
                    </span>
                  )}
                </td>
                <td className="text-center">
                  {line.quantity}
                  {line.type === "room" ? (line.quantity === 1 ? " noche" : " noches") : ""}
                </td>
                <td className="text-right">{formatMoney(line.subtotal)}</td>
              </tr>
            ))}
          </tbody>
          <tfoot>
            <tr>
              <td colSpan={2} className="text-right pt-2 font-bold">
                Total a la fecha
              </td>
              <td className="text-right pt-2 font-bold">{formatMoney(account.grandTotal)}</td>
            </tr>
          </tfoot>
        </table>

        {/* CARGAR PRODUCTO */}
        <select
          className="w-full border p-2 mb-2 rounded"
          value={selectedProduct}
          onChange={(e) => setSelectedProduct(e.target.value)}
        >
          <option value="">Seleccione producto</option>
          {products.map((p) => (
            <option key={p._id} value={p._id} disabled={(p.stock ?? 0) <= 0}>
              {p.name} - {formatMoney(p.price)} (stock: {p.stock ?? 0})
            </option>
          ))}
        </select>

        <input
          type="number"
          min={1}
          className="w-full border p-2 mb-2 rounded"
          value={quantityInput}
          onChange={(e) => setQuantityInput(e.target.value)}
        />

        <button
          className="bg-green-500 text-white w-full mb-2 py-2 rounded disabled:opacity-50"
          onClick={handleAdd}
          disabled={busy}
        >
          Cargar a la cuenta
        </button>

        <button
          className="bg-red-500 text-white w-full py-2 rounded mb-2 disabled:opacity-50"
          onClick={handleCheckout}
          disabled={busy}
        >
          Check-out
        </button>

        <button className="w-full py-2 rounded border" onClick={onClose} disabled={busy}>
          Cerrar
        </button>
      </div>
    </div>
  );
}
