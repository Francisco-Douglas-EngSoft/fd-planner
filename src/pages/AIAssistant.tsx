import { useState } from "react";
import { useChat } from "@ai-sdk/react";
import { DefaultChatTransport } from "ai";
import ReactMarkdown from "react-markdown";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Sparkles, Send, Loader2 } from "lucide-react";
import { toast } from "sonner";

const endpoint = `${import.meta.env.VITE_SUPABASE_URL}/functions/v1/ai-assistant`;

const transport = new DefaultChatTransport({
  api: endpoint,
  headers: {
    Authorization: `Bearer ${import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY}`,
  },
});

const SUGGESTIONS = [
  "Resuma o método Pomodoro em tópicos.",
  "Crie 5 flashcards sobre Direito Constitucional.",
  "Sugira um plano de estudos de 4 semanas para revisão.",
  "Explique repetição espaçada de forma simples.",
];

export default function AIAssistant() {
  const [input, setInput] = useState("");
  const { messages, sendMessage, status } = useChat({
    transport,
    onError: (err) => toast.error(err.message || "Erro no assistente"),
  });
  const isLoading = status === "submitted" || status === "streaming";

  const handleSend = async (text?: string) => {
    const content = (text ?? input).trim();
    if (!content || isLoading) return;
    setInput("");
    await sendMessage({ text: content });
  };

  return (
    <div className="container max-w-4xl mx-auto p-4 md:p-6 flex flex-col h-[calc(100vh-5rem)]">
      <div className="mb-4">
        <h1 className="text-2xl md:text-3xl font-bold flex items-center gap-2">
          <Sparkles className="h-6 w-6 text-primary" />
          Assistente de Estudos
        </h1>
        <p className="text-sm text-muted-foreground">
          Peça resumos, explicações, planos de estudo e flashcards.
        </p>
      </div>

      <div className="flex-1 overflow-y-auto space-y-4 pr-1">
        {messages.length === 0 && (
          <Card>
            <CardContent className="p-6 space-y-3">
              <p className="text-sm font-medium">Sugestões para começar:</p>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                {SUGGESTIONS.map((s) => (
                  <Button
                    key={s}
                    variant="outline"
                    className="justify-start h-auto py-2 text-left whitespace-normal"
                    onClick={() => handleSend(s)}
                  >
                    {s}
                  </Button>
                ))}
              </div>
            </CardContent>
          </Card>
        )}

        {messages.map((m) => {
          const text = m.parts
            .map((p) => (p.type === "text" ? p.text : ""))
            .join("");
          const isUser = m.role === "user";
          return (
            <div key={m.id} className={isUser ? "flex justify-end" : "flex justify-start"}>
              <div
                className={
                  isUser
                    ? "max-w-[85%] rounded-lg px-4 py-2 bg-primary text-primary-foreground"
                    : "max-w-[85%] rounded-lg px-4 py-2 bg-muted"
                }
              >
                {isUser ? (
                  <p className="whitespace-pre-wrap text-sm">{text}</p>
                ) : (
                  <div className="prose prose-sm dark:prose-invert max-w-none">
                    <ReactMarkdown>{text}</ReactMarkdown>
                  </div>
                )}
              </div>
            </div>
          );
        })}

        {isLoading && (
          <div className="flex justify-start">
            <div className="rounded-lg px-4 py-2 bg-muted text-sm flex items-center gap-2">
              <Loader2 className="h-4 w-4 animate-spin" /> Pensando...
            </div>
          </div>
        )}
      </div>

      <form
        className="mt-4 flex gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          handleSend();
        }}
      >
        <Input
          placeholder="Pergunte algo ao assistente..."
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={isLoading}
        />
        <Button type="submit" disabled={isLoading || !input.trim()}>
          <Send className="h-4 w-4" />
        </Button>
      </form>
    </div>
  );
}