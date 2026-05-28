/**
 * StreamHandler parses the Server-Sent Events (SSE) from OpenRouter
 */
export class StreamHandler {
  private onToken: (token: string) => void;
  private onError: (err: any) => void;
  private onComplete: (fullText: string) => void;
  private fullText = "";

  constructor(callbacks: {
    onToken: (token: string) => void;
    onError: (err: any) => void;
    onComplete: (fullText: string) => void;
  }) {
    this.onToken = callbacks.onToken;
    this.onError = callbacks.onError;
    this.onComplete = callbacks.onComplete;
  }

  async processStream(response: Response) {
    const reader = response.body?.getReader();
    if (!reader) {
      this.onError("Response body is null");
      return;
    }

    const decoder = new TextDecoder();
    let buffer = "";

    try {
      while (true) {
        const { done, value } = await reader.read();
        if (done) break;

        buffer += decoder.decode(value, { stream: true });
        
        const lines = buffer.split("\n");
        buffer = lines.pop() || ""; // Keep the last partial line

        for (const line of lines) {
          const cleanedLine = line.trim();
          if (!cleanedLine || cleanedLine === "data: [DONE]") continue;

          if (cleanedLine.startsWith("data: ")) {
            try {
              const data = JSON.parse(cleanedLine.replace("data: ", ""));
              const token = data.choices[0]?.delta?.content || "";
              if (token) {
                this.fullText += token;
                this.onToken(token);
              }
            } catch (err) {
              console.warn("SSE Parse Error:", err, cleanedLine);
            }
          }
        }
      }
      this.onComplete(this.fullText);
    } catch (err) {
      this.onError(err);
    }
  }
}
