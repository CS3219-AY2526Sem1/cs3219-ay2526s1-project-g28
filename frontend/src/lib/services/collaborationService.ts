import { api } from "../api";

export async function fetchHistory(username: string) {
  const res = await api(`/collaboration/history/${encodeURIComponent(username)}`);
  return res;
}