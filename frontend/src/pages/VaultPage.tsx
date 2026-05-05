import { useEffect, useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";

export default function VaultPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    api.getVault()
      .then((data) => {
        const map: any = {};

        data.forEach((file: any) => {
          if (!file.originalId) return;

          if (!map[file.originalId]) {
            map[file.originalId] = {
              originalName: file.originalName,
              originalUrl: file.originalUrl,
              files: [],
              createdAt: file.createdAt,
            };
          }

          map[file.originalId].files.push(file);
        });

        const grouped = Object.values(map).sort(
          (a: any, b: any) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

        setGroups(grouped);
      })
      .catch(() => {
        setGroups([
          {
            originalName: "imagen.jpg",
            originalUrl: "https://via.placeholder.com/150",
            createdAt: new Date().toISOString(),
            files: [
              {
                id: "1",
                fileName: "imagen.png",
                url: "https://via.placeholder.com/300",
              },
              {
                id: "2",
                fileName: "imagen.webp",
                url: "https://via.placeholder.com/300",
              },
            ],
          },
        ]);
      });
  }, []);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

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

      <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
        {groups.map((group, i) => {
          const isOpen = openIndex === i;

          return (
            <div
              key={i}
              style={{
                borderRadius: 12,
                background: "rgba(255,255,255,0.08)",
                overflow: "hidden",
              }}
            >
              {/* HEADER (CLICKABLE) */}
              <div
                onClick={() => toggle(i)}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                  cursor: "pointer",
                }}
              >
                <div>
                  <strong>{group.originalName}</strong>
                  <p style={{ fontSize: 12, opacity: 0.6 }}>
                    Conversión
                  </p>
                </div>

                <span style={{ fontSize: 18 }}>
                  {isOpen ? "▲" : "▼"}
                </span>
              </div>

              {/* CONTENIDO */}
              {isOpen && (
                <div
                  style={{
                    padding: "10px 16px",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                    borderTop: "1px solid rgba(255,255,255,0.1)",
                  }}
                >
                  {group.files.map((file: any) => (
                    <div
                      key={file.id}
                      style={{
                        display: "flex",
                        justifyContent: "space-between",
                        alignItems: "center",
                        padding: "8px 10px",
                        borderRadius: 8,
                        background: "rgba(255,255,255,0.05)",
                      }}
                    >
                      <span>{file.fileName}</span>

                      <Button
                        onClick={() =>
                          setSelected({ ...file, ...group })
                        }
                      >
                        Más
                      </Button>
                    </div>
                  ))}
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* MODAL */}
      {selected && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={headerStyle}>
              <h2>{selected.fileName}</h2>
              <button onClick={() => setSelected(null)} style={closeBtn}>
                ✖
              </button>
            </div>

            <div style={{ marginBottom: 20 }}>
              {renderPreview(selected)}
            </div>

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

              <Button onClick={() => alert("Reconvertir")}>
                Convertir otra vez
              </Button>

              <Button
                onClick={() => window.open(selected.originalUrl, "_blank")}
              >
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
};

const modalStyle: React.CSSProperties = {
  background: "rgba(15, 23, 42, 0.95)",
  padding: "20px",
  borderRadius: "16px",
  width: "90%",
  maxWidth: "500px",
};

const headerStyle: React.CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
};

const closeBtn: React.CSSProperties = {
  background: "transparent",
  border: "none",
  color: "white",
  fontSize: "18px",
  cursor: "pointer",
};