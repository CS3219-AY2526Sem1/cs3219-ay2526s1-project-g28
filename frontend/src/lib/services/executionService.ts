export async function runCodeApi(code: string, input: any, timeout?: number) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/execute/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      input: input,
    }),
  });
  const data = await response.json();
  return { response: response, data: data };
}
