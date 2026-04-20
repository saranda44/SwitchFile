import { fetchAuthSession } from "aws-amplify/auth";
import type { Conversion, VaultFile, VaultFileDetail, DownloadResponse, ReconvertResponse } from "../types";

const API_URL = "https://c4ej2qj76i.execute-api.us-east-1.amazonaws.com";

const getAuthHeaders = async (): Promise<Record<string, string>> => {
  const session = await fetchAuthSession();
  const token = session.tokens?.idToken?.toString();
  return token ? { Authorization: token } : {};
};


// FILES (Dashboard)

const extractConversionId = (sk: string): string => sk.split("#")[2] ?? sk;

const getFiles = async (): Promise<Conversion[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/files`, { headers });
  const json = await res.json();
  return (json.files as Conversion[]).map((c) => ({
    ...c,
    conversionId: extractConversionId(c.SK ?? ""),
  }));
};

const getFileById = async (id: string): Promise<Conversion> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/files/${id}`, { headers });
  const json = await res.json();
  return { ...json, conversionId: extractConversionId(json.SK ?? id) };
};


// UPLOAD

const uploadFile = async (file: File, targetFormat: string) => {
  const headers = await getAuthHeaders();
  const formData = new FormData();
  formData.append("file", file);
  formData.append("targetFormat", targetFormat);

  const res = await fetch(`${API_URL}/upload`, {
    method: "POST",
    headers,
    body: formData,
  });

  return res.json();
};


// DOWNLOAD

const downloadFile = async (id: string): Promise<DownloadResponse> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/download/${id}`, { headers });
  const json = await res.json();
  window.open(json.data.url);
  return json.data;
};


// VAULT

const getVault = async (): Promise<VaultFile[]> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/vault`, { headers });
  const json = await res.json();
  return json.data.files;
};

const getVaultFile = async (id: string): Promise<VaultFileDetail> => {
  const headers = await getAuthHeaders();
  const res = await fetch(`${API_URL}/vault/${id}`, { headers });
  const json = await res.json();
  return json.data;
};

const reconvertFile = async (id: string, targetFormat: string): Promise<ReconvertResponse> => {
  const authHeaders = await getAuthHeaders();
  const res = await fetch(`${API_URL}/vault/${id}/reconvert`, {
    method: "POST",
    headers: { ...authHeaders, "Content-Type": "application/json" },
    body: JSON.stringify({ targetFormat }),
  });
  const json = await res.json();
  return json.data ?? json;
};


export const api = {
  getFiles,
  getFileById,
  uploadFile,
  downloadFile,
  getVault,
  getVaultFile,
  reconvertFile,
};
