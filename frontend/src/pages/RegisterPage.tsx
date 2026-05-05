import { useState } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";

export default function RegisterPage() {
  const navigate = useNavigate();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");

  const handleRegister = () => {
    if (!username || !email || !password || !confirm) {
      alert("Completa todos los campos");
      return;
    }

    if (password !== confirm) {
      alert("Las contraseñas no coinciden");
      return;
    }

    console.log({ username, email, password });
    alert("Registro listo");
  };

  return (
    <div className="container">
      <div
        className="card"
        style={{
          maxWidth: 400,
          margin: "0 auto",
          display: "flex",
          flexDirection: "column",
          gap: 12,
        }}
      >
        <h2 style={{ textAlign: "center" }}>Crear cuenta</h2>

        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          style={inputStyle}
        />

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={inputStyle}
        />

        <input
          type="password"
          placeholder="Confirmar contraseña"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
          style={inputStyle}
        />

        {/* BOTONES */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            marginTop: 15,
          }}
        >
          <Button onClick={() => navigate("/login")}>
            Cancelar
          </Button>

          <Button onClick={handleRegister}>
            Registrarse
          </Button>
        </div>
      </div>
    </div>
  );
}

/* estilo */
const inputStyle: React.CSSProperties = {
  padding: "10px",
  borderRadius: "10px",
  border: "none",
  background: "rgba(255,255,255,0.1)",
  color: "white",
};