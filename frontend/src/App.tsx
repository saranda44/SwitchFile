import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";

import Navbar from "../src/components/Navbar";
import LoginPage from "../src/pages/LoginPage";
import DashboardPage from "../src/pages/DashboardPage";
import ConvertPage from "../src/pages/ConvertPage";
import UploadPage from "../src/pages/UploadPage";
import VaultPage from "../src/pages/VaultPage";
import ConversionDetailPage from "./pages/ConversionDetailPage";

function Layout() {
  const location = useLocation();

  const hideNavbar = location.pathname === "/login";

  return (
    <div className="app-container" style={{ paddingTop: "80px" }}>
      {!hideNavbar && <Navbar />}

      <Routes>
        <Route path="/login" element={<LoginPage />} />
        <Route path="/" element={<DashboardPage />} />
        <Route path="/convert" element={<ConvertPage />} />
        <Route path="/upload" element={<UploadPage />} />
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