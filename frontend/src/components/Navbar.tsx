import { useNavigate, useLocation } from "react-router-dom";

export default function Navbar() {
  const navigate = useNavigate();
  const location = useLocation();

  const isActive = (path: string) => location.pathname === path;

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
          label="Upload"
          active={isActive("/upload")}
          onClick={() => navigate("/upload")}
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