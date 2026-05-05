import { useEffect, useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";

export default function VaultPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);

  useEffect(() => {
    api.getVault()
      .then(async (files) => {
        const originals = files.filter((f) => f.type === "original");
        const convertedMap = new Map<string, any>();
        files
          .filter((f) => f.type === "converted")
          .forEach((f) => {
            convertedMap.set(f.fileId, f);
          });

        const grouped = await Promise.all(
          originals.map(async (original) => {
            const detail = await api.getVaultFile(original.fileId);
            return {
              originalName: original.fileName,
              originalUrl: original.preview?.url || "/landscape-placeholder.svg",
              createdAt: original.createdAt,
              originalFileId: original.fileId,
              files: detail.conversions.map((conv) => {
                // resultFileId can be undefined, guard before using as map key
                const converted = conv.resultFileId
                  ? convertedMap.get(conv.resultFileId)
                  : undefined;
                return {
                  ...conv,
                  id: conv.conversionId,
                  fileName: `${original.fileName.split(".")[0]}.${conv.targetFormat}`,
                  url: converted?.preview?.url || "/landscape-placeholder.svg",
                };
              }),
            };
          })
        );

        const sorted = grouped.sort(
          (a, b) =>
            new Date(b.createdAt).getTime() -
            new Date(a.createdAt).getTime()
        );

        setGroups(sorted);
      })
      .catch(console.error);
  }, []);

  const toggle = (index: number) => {
    setOpenIndex(openIndex === index ? null : index);
  };

  const renderPreview = (file: any) => {
    const url = file?.url;

    if (url?.match(/\.(jpg|jpeg|png|gif|webp)(\?|$)/i)) {
      return <img src={url} style={{ width: "100%", borderRadius: 10 }} />;
    }

    if (url?.match(/\.(mp4|webm|mov)(\?|$)/i)) {
      return <video src={url} controls style={{ width: "100%" }} />;
    }

    if (url?.match(/\.pdf(\?|$)/i)) {
      return <iframe src={url} style={{ width: "100%", height: 300 }} />;
    }

    return <img src="/landscape-placeholder.svg" style={{ width: "100%", borderRadius: 10 }} />;
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
              <Button
                onClick={() => {
                  window.location.href = selected.url;
                }}
              >
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