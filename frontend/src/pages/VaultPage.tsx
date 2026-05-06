import { useEffect, useState } from "react";
import { api } from "../utils/api";
import Button from "../components/Button";

const formatOptions: Record<string, string[]> = {
  image: ["png", "jpg", "webp", "gif"],
  audio: ["mp3", "wav", "ogg"],
  video: ["mp4", "mov", "webm"],
  document: ["pdf", "txt", "html"],
};

const mapExtToType = (ext: string): keyof typeof formatOptions => {
  if (["png", "jpg", "jpeg", "gif", "webp"].includes(ext)) return "image";
  if (["mp3", "wav", "ogg"].includes(ext)) return "audio";
  if (["mp4", "mov", "webm"].includes(ext)) return "video";
  return "document";
};

export default function VaultPage() {
  const [groups, setGroups] = useState<any[]>([]);
  const [selected, setSelected] = useState<any | null>(null);
  const [selectedOriginal, setSelectedOriginal] = useState<any | null>(null);
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [reconvertMode, setReconvertMode] = useState(false);
  const [selectedReconvertFormat, setSelectedReconvertFormat] = useState("");
  const [reconvertOriginalMode, setReconvertOriginalMode] = useState(false);
  const [selectedOriginalReconvertFormat, setSelectedOriginalReconvertFormat] = useState("");

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
                  url: converted?.preview?.url || "/placeholder.png",
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

    return <img src="/placeholder.png" style={{ width: "100%", height: "auto", borderRadius: 10, objectFit: "contain", margin: "0 auto", display: "block" }} />;
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
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  alignItems: "center",
                  padding: "12px 16px",
                }}
              >
                <div onClick={() => toggle(i)} style={{ cursor: "pointer", flex: 1 }}>
                  <strong>{group.originalName}</strong>
                  <p style={{ fontSize: 12, opacity: 0.6 }}>
                    Conversión
                  </p>
                </div>

                <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
                  {isOpen && (
                    <Button
                      onClick={() =>
                        setSelectedOriginal({
                          fileName: group.originalName,
                          url: group.originalUrl,
                          fileId: group.originalFileId,
                          groupIndex: i,
                        })
                      }
                      style={{ padding: "6px 12px", fontSize: "12px" }}
                    >
                      Ver Original
                    </Button>
                  )}
                  <span
                    onClick={() => toggle(i)}
                    style={{ fontSize: 18, cursor: "pointer" }}
                  >
                    {isOpen ? "▲" : "▼"}
                  </span>
                </div>
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
                  {group.files
                    .filter((file: any) => file.status !== "failed")
                    .map((file: any) => (
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

      {/* MODAL CONVERSIÓN */}
      {selected && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={headerStyle}>
              <h2>{selected.fileName}</h2>
              <button onClick={() => setSelected(null)} style={closeBtn}>
                ✖
              </button>
            </div>

            <div style={{ marginBottom: 20, maxHeight: 400, overflow: "hidden", borderRadius: 12 }}>
              {renderPreview(selected)}
            </div>

            {!reconvertMode ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  onClick={async () => {
                    const data = await api.downloadFile(selected.resultFileId);
                    window.location.href = data.url;
                  }}
                >
                  Descargar
                </Button>

                <Button
                  onClick={() => {
                    setReconvertMode(true);
                    setSelectedReconvertFormat("");
                  }}
                >
                  Convertir otra vez
                </Button>

                <Button
                  onClick={() => {
                    setSelected(null);
                    setSelectedOriginal({
                      fileName: selected.originalName,
                      url: selected.originalUrl,
                      fileId: selected.originalFileId,
                      groupIndex: groups.findIndex(
                        (g) => g.originalFileId === selected.originalFileId
                      ),
                    });
                  }}
                >
                  Original
                </Button>
              </div>
            ) : (
              <div style={{ marginTop: 20 }}>
                <p style={{ marginBottom: 10 }}>Selecciona formato destino:</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}>
                  {formatOptions[mapExtToType(selected.sourceFormat)]?.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedReconvertFormat(fmt)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        border: "none",
                        cursor: "pointer",
                        background:
                          selectedReconvertFormat === fmt
                            ? "#6366f1"
                            : "rgba(255,255,255,0.1)",
                        color: "white",
                      }}
                      disabled={fmt === selected.sourceFormat}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    onClick={() => {
                      setReconvertMode(false);
                      setSelectedReconvertFormat("");
                    }}
                  >
                    Cancelar
                  </Button>

                  <Button
                    onClick={async () => {
                      try {
                        const response = await api.reconvertFile(
                          selected.originalFileId,
                          selectedReconvertFormat
                        );
                        alert(
                          `Reconversión iniciada: ${response.status || "En proceso"}`
                        );
                        setReconvertMode(false);
                        setSelectedReconvertFormat("");
                        setSelected(null);
                      } catch (error) {
                        alert(
                          `Error: ${
                            error instanceof Error
                              ? error.message
                              : "No se pudo iniciar reconversión"
                          }`
                        );
                      }
                    }}
                    disabled={!selectedReconvertFormat}
                  >
                    Reconvertir
                  </Button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* MODAL ORIGINAL */}
      {selectedOriginal && (
        <div style={overlayStyle}>
          <div style={modalStyle}>
            <div style={headerStyle}>
              <h2>{selectedOriginal.fileName}</h2>
              <button onClick={() => setSelectedOriginal(null)} style={closeBtn}>
                ✖
              </button>
            </div>

            <div style={{ marginBottom: 20, maxHeight: 400, overflow: "hidden", borderRadius: 12 }}>
              {renderPreview(selectedOriginal)}
            </div>

            {!reconvertOriginalMode ? (
              <div
                style={{
                  display: "flex",
                  justifyContent: "center",
                  gap: 12,
                  flexWrap: "wrap",
                }}
              >
                <Button
                  onClick={async () => {
                    const data = await api.downloadFile(selectedOriginal.fileId);
                    window.location.href = data.url;
                  }}
                >
                  Descargar
                </Button>

                <Button
                  onClick={() => {
                    setReconvertOriginalMode(true);
                    setSelectedOriginalReconvertFormat("");
                  }}
                >
                  Convertir otra vez
                </Button>

                <Button
                  onClick={() => {
                    setSelectedOriginal(null);
                    setOpenIndex(selectedOriginal.groupIndex);
                    setSelected(null);
                  }}
                >
                  Conversiones
                </Button>
              </div>
            ) : (
              <div style={{ marginTop: 20 }}>
                <p style={{ marginBottom: 10 }}>Selecciona formato destino:</p>
                <div style={{ display: "flex", gap: 10, flexWrap: "wrap", marginBottom: 15 }}>
                  {formatOptions[mapExtToType(selectedOriginal.url.split(".").pop()?.toLowerCase() || "")]?.map((fmt) => (
                    <button
                      key={fmt}
                      onClick={() => setSelectedOriginalReconvertFormat(fmt)}
                      style={{
                        padding: "8px 14px",
                        borderRadius: "10px",
                        border: "none",
                        cursor: "pointer",
                        background:
                          selectedOriginalReconvertFormat === fmt
                            ? "#6366f1"
                            : "rgba(255,255,255,0.1)",
                        color: "white",
                      }}
                    >
                      {fmt.toUpperCase()}
                    </button>
                  ))}
                </div>
                <div
                  style={{
                    display: "flex",
                    gap: 10,
                    justifyContent: "center",
                    flexWrap: "wrap",
                  }}
                >
                  <Button
                    onClick={() => {
                      setReconvertOriginalMode(false);
                      setSelectedOriginalReconvertFormat("");
                    }}
                  >
                    Cancelar
                  </Button>

                  <Button
                    onClick={async () => {
                      try {
                        const response = await api.reconvertFile(
                          selectedOriginal.fileId,
                          selectedOriginalReconvertFormat
                        );
                        alert(
                          `Reconversión iniciada: ${response.status || "En proceso"}`
                        );
                        setReconvertOriginalMode(false);
                        setSelectedOriginalReconvertFormat("");
                        setSelectedOriginal(null);
                      } catch (error) {
                        alert(
                          `Error: ${
                            error instanceof Error
                              ? error.message
                              : "No se pudo iniciar reconversión"
                          }`
                        );
                      }
                    }}
                    disabled={!selectedOriginalReconvertFormat}
                  >
                    Reconvertir
                  </Button>
                </div>
              </div>
            )}
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