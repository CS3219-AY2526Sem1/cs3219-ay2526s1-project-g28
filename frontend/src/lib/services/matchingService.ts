export async function startMatchApi(body: {
  userId: string;
  difficulty: string;
  topics: string[];
}) {
  const response = await fetch("http://localhost:3003/matching/", {
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
    `http://localhost:3003/matching/${body.action}`,
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
  const response = await fetch(`http://localhost:3003/matching/${userId}`, {
    method: "DELETE",
  });
  return response;
}
