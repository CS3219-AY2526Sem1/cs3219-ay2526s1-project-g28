export async function runCodeApi(
  language: string,
  code: string,
  input: any,
  timeout?: number
) {
  const response = await fetch(
    "https://4esosnme10.execute-api.ap-southeast-1.amazonaws.com/execute/run",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        language: language,
        code: code,
        input: input,
      }),
    }
  );
  const data = await response.json();
  return { response: response, data: data };
}
