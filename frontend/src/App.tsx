import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "./components/Navbar";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";
import ConvertPage from "./pages/ConvertPage";
import VaultPage from "./pages/VaultPage";
import ConversionDetailPage from "./pages/ConversionDetailPage";
import RegisterPage from "./pages/RegisterPage";

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