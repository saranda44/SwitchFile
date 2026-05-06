import { useState } from "react";
import JSZip from "jszip";
import { useNavigate } from "react-router-dom";
import { api } from "../utils/api";
import Button from "../components/Button";

export default function ConvertPage() {
  const navigate = useNavigate();
  const [file, setFile] = useState<File | null>(null);
  const [format, setFormat] = useState("");

  const [zipTypes, setZipTypes] = useState<string[]>([]);
  const [selectedZipType, setSelectedZipType] = useState("");

  // detector normal (archivo individual)
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

  // mapear extensión → tipo lógico
  const mapExtToType = (ext: string) => {
    if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
    if (["mp3", "wav", "ogg"].includes(ext)) return "audio";
    if (["mp4", "mov", "webm"].includes(ext)) return "video";
    return "document";
  };

  // leer contenido ZIP
  const handleZip = async (file: File) => {
    const zip = await JSZip.loadAsync(file);
    const extensions = new Set<string>();

    zip.forEach((path) => {
      const ext = path.split(".").pop()?.toLowerCase();
      if (ext) extensions.add(ext);
    });

    setZipTypes(Array.from(extensions));
  };

  // manejar archivo
  const handleFile = async (f: File) => {
    setFile(f);
    setFormat("");
    setZipTypes([]);
    setSelectedZipType("");

    if (f.name.endsWith(".zip")) {
      await handleZip(f);
    }
  };

  // formatos normales
  const formats =
    file && !file.name.endsWith(".zip")
      ? formatOptions[getFileType(file)]
      : [];

  // formatos para ZIP 
  const zipFormats =
    selectedZipType && formatOptions[mapExtToType(selectedZipType)]
      ? formatOptions[mapExtToType(selectedZipType)]
      : [];

  const handleConvert = async () => {
    if (!file || !format) {
      alert("Selecciona archivo y formato");
      return;
    }

    try {
      const response = await api.uploadFile(file, format);
      alert(`Conversión iniciada: ${response.status || "En proceso"}`);
      navigate("/");
    } catch (error) {
      alert(`Error: ${error instanceof Error ? error.message : "No se pudo iniciar conversión"}`);
      navigate("/");
    }
  };

  return (
    <div className="container">
      <h1>Nueva conversión</h1>

      <div className="card">
        {/* INPUT */}
        <input
          type="file"
          onChange={(e) => {
            const f = e.target.files?.[0];
            if (f) handleFile(f);
          }}
        />

        {/* nombre */}
        {file && <p style={{ marginTop: 10 }}>{file.name}</p>}

        {/* TIPOS EN ZIP */}
        {zipTypes.length > 0 && (
          <div style={{ marginTop: 15 }}>
            <p>Tipos dentro del ZIP:</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {zipTypes.map((type) => (
                <button
                  key={type}
                  onClick={() => setSelectedZipType(type)}
                  style={{
                    padding: "8px 14px",
                    borderRadius: "10px",
                    border: "none",
                    cursor: "pointer",
                    background:
                      selectedZipType === type
                        ? "#6366f1"
                        : "rgba(255,255,255,0.1)",
                    color: "white",
                  }}
                >
                  {type.toUpperCase()}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* FORMATOS NORMALES */}
        {formats.length > 0 && (
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

        {/* FORMATOS PARA ZIP */}
        {zipFormats.length > 0 && (
          <div style={{ marginTop: 15 }}>
            <p>Convertir a:</p>

            <div style={{ display: "flex", gap: 10, flexWrap: "wrap" }}>
              {zipFormats.map((opt) => (
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

        {/* BOTÓN */}
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