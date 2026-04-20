import { useState } from "react";
import { useNavigate, Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import Button from "../components/Button";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);
  const { login, user } = useAuth();
  const navigate = useNavigate();

  if (user) return <Navigate to="/" replace />;

  const handleLogin = async () => {
    setError("");
    setLoading(true);
    try {
      await login(email, password);
      navigate("/");
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : "Error al iniciar sesión");
    } finally {
      setLoading(false);
    }
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
          onKeyDown={(e) => e.key === "Enter" && handleLogin()}
        />

        {error && <p style={{ color: "red", marginBottom: 10 }}>{error}</p>}

        <Button onClick={handleLogin} disabled={loading}>
          {loading ? "Cargando..." : "Entrar"}
        </Button>
      </div>
    </div>
  );
}