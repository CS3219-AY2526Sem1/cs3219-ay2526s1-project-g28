export async function startMatchApi(body: {
  userId: string;
  difficulty: string;
  topics: string[];
}) {
  const response = await fetch(`${import.meta.env.VITE_API_URL}/matching/`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  const data = await response.json();
  return { response: response, data: data };
}

export async function respondMatchApi(body: {
  action: String;
  userId: string;
  matchId: string;
}) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/matching/${body.action}`,
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        action: body.action,
        userId: body.userId,
        matchId: body.matchId,
      }),
    }
  );
  return response;
}

export async function cancelMatchApi(userId: string) {
  const response = await fetch(
    `${import.meta.env.VITE_API_URL}/matching/${userId}`,
    {
      method: "DELETE",
    }
  );
  return response;
}
