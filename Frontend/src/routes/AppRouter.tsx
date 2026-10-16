import { BrowserRouter, Navigate, Route, Routes } from "react-router-dom";

import Login from "../modules/login/Login";
import AppShell from "../ui/Shell";
import ProtectedRoute from "./ProtectedRoute";

import Clients from "../modules/clients/Clients";
import Dashboard from "../modules/dashboard/Dashboard";
import Inventory from "../modules/inventory/Inventory";
import Products from "../modules/products/Products";
import Reception from "../modules/reception/Reception";
import Reservations from "../modules/reservations/Reservations";
import Rooms from "../modules/rooms/Rooms";
import Users from "../modules/users/Users";

const AppRouter = () => {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Navigate to="/login" />} />

        {/* Público */}
        <Route path="/login" element={<Login />} />

        {/* ADMIN */}
        <Route element={<ProtectedRoute allowedRoles={["admin"]} />}>
          <Route element={<AppShell />}>
            <Route path="/dashboard" element={<Dashboard />} />
            <Route path="/clients" element={<Clients />} />
            <Route path="/rooms" element={<Rooms />} />
            <Route path="/users" element={<Users />} />
            <Route path="/products" element={<Products />} />
            <Route path="/inventory" element={<Inventory />} />
          </Route>
        </Route>

        {/* Recepción y reservas: admin y recepcionista */}
        <Route element={<ProtectedRoute allowedRoles={["admin", "recepcionista"]} />}>
          <Route element={<AppShell />}>
            <Route path="/reception" element={<Reception />} />
            <Route path="/reservations" element={<Reservations />} />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/login" />} />
      </Routes>
    </BrowserRouter>
  );
};

export default AppRouter;
