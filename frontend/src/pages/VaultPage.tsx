import { useEffect, useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";

export default function VaultPage() {
  const [files, setFiles] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);

  useEffect(() => {
    api.getVault()
      .then(setFiles)
      .catch(() => {
        setFiles([
          {
            id: "1",
            fileName: "imagen.png",
            url: "https://via.placeholder.com/300",
          },
          {
            id: "2",
            fileName: "video.mp4",
            url: "",
          },
        ]);
      });
  }, []);

  const renderPreview = (file: any) => {
    if (!file?.url) return <p>Sin preview</p>;

    if (file.url.match(/\.(jpg|jpeg|png|gif|webp)$/i)) {
      return <img src={file.url} style={{ width: "100%", borderRadius: 10 }} />;
    }

    if (file.url.match(/\.(mp4|webm|mov)$/i)) {
      return <video src={file.url} controls style={{ width: "100%" }} />;
    }

    if (file.url.match(/\.pdf$/i)) {
      return <iframe src={file.url} style={{ width: "100%", height: 300 }} />;
    }

    return <p>Preview no disponible</p>;
  };

  return (
    <div className="container">
      <h1>Bóveda</h1>

      {/* LISTA */}
      <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
        {files.map((file) => (
          <div
            key={file.id}
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              padding: "12px 16px",
              borderRadius: "12px",
              background: "rgba(255,255,255,0.08)",
              backdropFilter: "blur(6px)",
            }}
          >
            <span>{file.fileName}</span>

            <Button onClick={() => setSelected(file)}>
              Más
            </Button>
          </div>
        ))}
      </div>

      {/* MODAL */}
      {selected && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            {/* Header */}
            <div style={headerStyle}>
              <h2>{selected.fileName}</h2>
              <button onClick={() => setSelected(null)} style={closeBtn}>
                ✖
              </button>
            </div>

            {/* Preview */}
            <div style={{ marginBottom: 20 }}>
              {renderPreview(selected)}
            </div>

            {/* 🎯 BOTONES CENTRADOS */}
            <div
              style={{
                display: "flex",
                justifyContent: "center",
                gap: 12,
                flexWrap: "wrap",
              }}
            >
              <Button onClick={() => api.downloadFile(selected.id)}>
                Descargar
              </Button>

              <Button onClick={() => alert("Reconvertir (demo)")}>
                Convertir otra vez
              </Button>

              <Button onClick={() => alert("Original (demo)")}>
                Original
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* estilos */

const overlayStyle: React.CSSProperties = {
  position: "fixed",
  top: 0,
  left: 0,
  width: "100%",
  height: "100%",
  background: "rgba(0,0,0,0.6)",
  display: "flex",
  alignItems: "center",
  justifyContent: "center",
  zIndex: 2000,
};

const modalStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.95)",
  padding: "20px",
  borderRadius: "16px",
  width: "90%",
  maxWidth: "500px",
  boxShadow: "0 20px 40px rgba(0,0,0,0.5)",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  marginBottom: "10px",
};

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: "18px",
  cursor: "pointer",
};
