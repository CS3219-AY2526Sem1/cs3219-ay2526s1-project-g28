export async function fetchHistory(id: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/collaboration/history`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        id: String,
      }),
    }
  );
  const data = await response.json();
  return { response: response, data: data };
}
