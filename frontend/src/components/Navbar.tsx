import { useNavigate, useLocation } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = async () => {
    await logout();
    navigate("/login");
  };

  return (
    <div style={{ display: "flex", justifyContent: "center", marginBottom: 30 }}>
      <div
        style={{
          position: "fixed",
          top: 20,
          left: 0,
          width: "100%",
          display: "flex",
          justifyContent: "center",
          alignItems: "center",
          zIndex: 1000,
          paddingTop: "10px",
        }}
      >
        <NavItem
          label="Dashboard"
          active={isActive("/")}
          onClick={() => navigate("/")}
        />

        <NavItem
          label="Convert"
          active={isActive("/convert")}
          onClick={() => navigate("/convert")}
        />

        <NavItem
          label="Vault"
          active={isActive("/vault")}
          onClick={() => navigate("/vault")}
        />
      </div>
    </div>
  );
}

function NavItem({
  label,
  onClick,
  active,
}: {
  label: string;
  onClick: () => void;
  active: boolean;
}) {
  return (
    <button
      onClick={onClick}
      style={{
        background: active ? "#6366f1" : "transparent",
        color: "white",
        border: "none",
        padding: "10px 16px",
        borderRadius: 12,
        cursor: "pointer",
        transition: "0.3s",
      }}
      onMouseEnter={(e) => {
        if (!active) e.currentTarget.style.background = "rgba(255,255,255,0.2)";
      }}
      onMouseLeave={(e) => {
        if (!active) e.currentTarget.style.background = "transparent";
      }}
    >
      {label}
    </button>
  );
}