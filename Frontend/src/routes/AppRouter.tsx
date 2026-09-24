import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import AdminLayout from "../layouts/AdminLayout";
import Login from "../modules/login/Login";
import ProtectedRoute from "./ProtectedRoute";

// Admin
import Clients from "../modules/clients/Clients";
import Dashboard from "../modules/dashboard/Dashboard";
import Inventory from "../modules/inventory/Inventory";
import Products from "../modules/products/Products";
import Reservations from "../modules/reservations/Reservations";
import Rooms from "../modules/rooms/Rooms";
import Users from "../modules/users/Users";


// Recepción
import Reception from "../modules/reception/Reception";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>

        {/* Inicio */}
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* ADMIN 🔐 */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AdminLayout />}>

            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/users" element={<Users />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />


          </Route>
        </Route>

        {/* RECEPCIÓN 🔐 */}
        <Route element={<ProtectedRoute allowedRoles={["recepcionista"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/reception" element={<Reception />} />
          </Route>
        </Route>

        {/* RESERVAS 🔐 - admin y recepcionista */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "recepcionista"]} />}>
          <Route element={<AdminLayout />}>
            <Route path="/reservations" element={<Reservations />} />
          </Route>
        </Route>

        {/* fallback */}
        <Route path="*" element={<Navigate to="/login" />} />

      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;