import { useState } from "react";
import Button from "../components/Button";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";

export default function RegisterPage() {
  const navigate = useNavigate();
  const { register, verifyCode } = useAuth();

  const [username, setUsername] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [verificationCode, setVerificationCode] = useState("");
  const [step, setStep] = useState<"register" | "verify">("register");
  const [error, setError] = useState("");
  const [loading, setLoading] = useState(false);

  const handleRegister = async () => {
    if (!username || !email || !password || !confirm) {
      setError("Completa todos los campos");
      return;
    }

    if (password !== confirm) {
      setError("Las contraseñas no coinciden");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await register(username, email, password);
      setStep("verify");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error en registro");
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (!verificationCode) {
      setError("Ingresa el código de verificación");
      return;
    }

    setError("");
    setLoading(true);
    try {
      await verifyCode(email, verificationCode);
      alert("Registro completado");
      navigate("/login");
    } catch (err) {
      setError(err instanceof Error ? err.message : "Error verificando código");
    } finally {
      setLoading(false);
    }
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
        {step === "register" ? (
          <>
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

            {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <Button onClick={() => navigate("/login")} disabled={loading}>
                Cancelar
              </Button>

              <Button onClick={handleRegister} disabled={loading}>
                {loading ? "Registrando..." : "Registrarse"}
              </Button>
            </div>
          </>
        ) : (
          <>
            <h2 style={{ textAlign: "center" }}>Verificar cuenta</h2>
            <p style={{ textAlign: "center" }}>
              Ingresa el código enviado a {email}
            </p>

            <input
              type="text"
              placeholder="Código de verificación"
              value={verificationCode}
              onChange={(e) => setVerificationCode(e.target.value)}
              style={inputStyle}
            />

            {error && <p style={{ color: "red", margin: 0 }}>{error}</p>}

            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                marginTop: 15,
              }}
            >
              <Button onClick={() => setStep("register")} disabled={loading}>
                Atrás
              </Button>

              <Button onClick={handleVerify} disabled={loading}>
                {loading ? "Verificando..." : "Verificar"}
              </Button>
            </div>
          </>
        )}
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