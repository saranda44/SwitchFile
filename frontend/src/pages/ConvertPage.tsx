import { useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";

export default function ConvertPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("");

  // detector robusto
  const getFileType = (file: File) => {
    const name = file.name.toLowerCase();

    if (name.match(/\.(png|jpg|jpeg|gif|webp)$/)) return "image";
    if (name.match(/\.(mp3|wav|ogg)$/)) return "audio";
    if (name.match(/\.(mp4|mov|webm)$/)) return "video";

    return "document";
  };

  const formatOptions = {
    image: ["png", "jpg", "webp", "gif"],
    audio: ["mp3", "wav", "ogg"],
    video: ["mp4", "mov", "webm"],
    document: ["pdf", "txt", "html"],
  };

  const formats = file ? formatOptions[getFileType(file)] : [];

  const handleConvert = async () => {
    if (!file || !format) {
      alert("Selecciona archivo y formato");
      return;
    }

    try {
      //convert en lugar de reconvert para no depender de un archivo previo
      await api.reconvertFile("mock", format);
      alert("Conversión iniciada ");
    } catch {
      alert("Modo demo");
    }
  };

  return (
    <div className="container">
      <h1>Nueva conversión</h1>

      <div className="card">
        {/* input */}
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0] || null;
            setFile(f);
            setFormat("");
          }}
        />

        {/* nombre */}
        {file && <p style={{ marginTop: 10 }}>{file.name}</p>}

        {/* LISTA */}
        {file && (
          <div style={{ marginTop: 15 }}>
            <p>Selecciona formato:</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {formats.map((opt) => (
                <button
                  key={opt}
                  onClick={() => setFormat(opt)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    background:
                      format === opt
                        ? "#6366f1"
                        : "rgba(255,255,255,0.1)",
                    color: "white",
                  }}
                >
                  {opt.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* botón */}
        <div style={{ display: "flex", marginTop: 20 }}>
          <div style={{ marginLeft: "auto" }}>
            <Button onClick={handleConvert} disabled={!format}>
              Convertir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}