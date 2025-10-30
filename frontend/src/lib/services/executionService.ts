export async function runCodeApi(code: string, input: any) {
  const response = await fetch("http://localhost:3006/execute/run", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: code,
      input: input,
    }),
  });
  const data = await response.json();
  console.log("Response data:", data);
  return { response: response, data: data };
}

export async function submitCodeApi(code: string) {
  const response = await fetch("http://localhost:3006/execute/submit", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      code: "function solution(nums){ return nums.reduce((a,b)=>a+b,0); }",
    }),
  });
  const data = await response.json();
  return { response: response, data: data };
}
