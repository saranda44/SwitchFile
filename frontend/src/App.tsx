import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "../src/components/Navbar";
import LoginPage from "../src/pages/LoginPage";
import DashboardPage from "../src/pages/DashboardPage";
import ConvertPage from "../src/pages/ConvertPage";
import VaultPage from "../src/pages/VaultPage";
import ConversionDetailPage from "../src/pages/ConversionDetailPage";
import RegisterPage from "../src/pages/RegisterPage";


function Layout() {
  const location = useLocation();

  const hideNavbar =
    location.pathname === "/login" ||
    location.pathname === "/register"; 

  return (
    <div className="app-container" style={{ paddingTop: "80px" }}>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/register" element={<RegisterPage />} />

        <Route path="/" element={<DashboardPage />} />
        <Route path="/convert" element={<ConvertPage />} />
        <Route path="/vault" element={<VaultPage />} />
        <Route path="/conversion/:id" element={<ConversionDetailPage />} />
      </Routes>
    </div>
  );
}

export default function App() {
  return (
    <BrowserRouter>
      <Layout />
    </BrowserRouter>
  );
}