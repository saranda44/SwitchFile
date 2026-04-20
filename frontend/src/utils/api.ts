// Funciones para llamar a Lambda

const API_URL = "http://localhost:3000"; // luego cambias a API Gateway

//  (uso de Amplify)
// const getAuthHeaders = async () => {
//   const session = await fetchAuthSession();
//   const token = session.tokens?.idToken?.toString();
//
//   return {
//     Authorization: token || "",
//   };
// };


//  FILES (Dashboard)

const getFiles = async () => {
  const res = await fetch(`${API_URL}/files`);
  return res.json();
};

const getFileById = async (id: string) => {
  const res = await fetch(`${API_URL}/files/${id}`);
  return res.json();
};


//  UPLOAD / CONVERT

const uploadFile = async (file: File) => {
  const formData = new FormData();
  formData.append("file", file);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    body: formData,
  });

  return res.json();
};

const convertFile = async (fileId: string, targetFormat: string) => {
  const res = await fetch(`${API_URL}/convert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      fileId,
      targetFormat,
    }),
  });

  return res.json();
};


// DOWNLOAD

const downloadFile = async (id: string) => {
  const res = await fetch(`${API_URL}/download/${id}`);
  const data = await res.json();

  // backend debe regresar { url: "presigned-url" }
  window.open(data.url);
};


// VAULT

const getVault = async () => {
  const res = await fetch(`${API_URL}/vault`);
  return res.json();
};

const getVaultFile = async (id: string) => {
  const res = await fetch(`${API_URL}/vault/${id}`);
  return res.json();
};

const sendFileByEmail = async (id: string) => {
  const res = await fetch(`${API_URL}/vault/${id}/email`, {
    method: "POST",
  });

  return res.json();
};

const reconvertFile = async (id: string, targetFormat: string) => {
  const res = await fetch(`${API_URL}/vault/${id}/reconvert`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      targetFormat,
    }),
  });

  return res.json();
};

// EXPORT FINAL

export const api = {
  // Files
  getFiles,
  getFileById,

  // Upload / Convert
  uploadFile,
  convertFile,

  // Download
  downloadFile,

  // Vault
  getVault,
  getVaultFile,
  sendFileByEmail,
  reconvertFile,
};