import { useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";

export default function UploadPage() {
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("");

  // detector robusto (NO usar file.type)
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

  const handleUpload = async () => {
    if (!file || !format) {
      alert("Selecciona archivo y formato");
      return;
    }

    try {
      await api.uploadFile(file);
      alert("Archivo subido");
    } catch {
      alert("Modo demo");
    }
  };

  return (
    <div className="container">
      <h1>Subir archivo</h1>

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
            <Button onClick={handleUpload} disabled={!format}>
              Subir
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}