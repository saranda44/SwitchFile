import { useState } from "react";
import Button from "../components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  const handleLogin = async () => {
    // Conectar con Amplify Auth
    console.log("Login:", email, password);
    alert("Login simulado");
  };

  return (
    <div className="container" style={{ display: "flex", justifyContent: "center" }}>
      <div className="card" style={{ maxWidth: 400, margin: "0 auto" }}>
        <h2>Iniciar sesión</h2>

        <input
          type="email"
          placeholder="Correo"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          style={{ width: "100%", marginBottom: 10 }}
        />

        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          style={{ width: "100%", marginBottom: 20 }}
        />

        <Button onClick={handleLogin}>Entrar</Button>
      </div>
    </div>
  );
}