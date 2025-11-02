export async function runCodeApi(code: string, input: any, timeout?: number) {
  const response = await fetch("http://localhost:3006/execute/run", {
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
