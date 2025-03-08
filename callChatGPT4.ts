import config from "./config.ts";

export async function callGPT4(promptText: string): Promise<string> {
  const response = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${config.openAiApiKey}`,
    },
    body: JSON.stringify({
      model: "gpt-4o",
      messages: [{ role: "user", content: promptText }],
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Error calling the API: ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}
