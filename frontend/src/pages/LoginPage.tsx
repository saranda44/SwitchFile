import { useState } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function LoginPage() {
  const navigate = useNavigate();

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    console.log("Login:", email, password);
    alert("Login simulado");
  };

  return (
    <div
      className="container"
      style={{
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        minHeight: "100vh",
      }}
    >
      <div
        className="card"
        style={{
          maxWidth: 420,
          width: "100%",
          display: "flex",
          flexDirection: "column",
          gap: 20,
          padding: "40px",
          borderRadius: 20,
        }}
      >
        <h2 style={{ textAlign: "center", marginBottom: 10 }}>
          Iniciar sesión
        </h2>

        {/* INPUT CORREO */}
        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        {/* INPUT PASSWORD */}
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        {/* BOTÓN CENTRADO */}
        <div style={{ display: "flex", justifyContent: "center", marginTop: 10 }}>
          <Button
            onClick={handleLogin}
            style={{
              width: "60%",
              maxWidth: 250,
              padding: "14px",
              fontSize: "16px",
            }}
          >
            Entrar
          </Button>
        </div>

        {/* LINK REGISTER */}
        <p style={{ textAlign: "center", marginTop: 5 }}>
          ¿No tienes cuenta?{" "}
          <span
            style={{ color: "#6366f1", cursor: "pointer" }}
            onClick={() => navigate("/register")}
          >
            Regístrate
          </span>
        </p>
      </div>
    </div>
  );
}

/* INPUT ESTILO */
const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "14px",
  borderRadius: "12px",
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
  fontSize: "14px",
  margin: "0 -10px",
};