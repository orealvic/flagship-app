import { useState, useRef, useEffect } from "react";
import { api } from "../api";

const SUGGESTIONS = [
  "Which vendor sells coffee?",
  "What's the status of the MySQL Workbench requisition?",
  "How much did we spend on coffee?",
  "Are there any pending requisitions?",
  "Who supplies office equipment?",
];

function SourcePanel({ sources }) {
  const [open, setOpen] = useState(false);
  if (!sources || sources.length === 0) return null;
  return (
    <div className="mt-3 text-xs">
      <button onClick={() => setOpen(!open)} className="text-blue-700 hover:text-blue-900 font-medium">
        {open ? "Hide" : "Show"} Sources ({sources.length})
      </button>
      {open && (
        <div className="mt-2 space-y-2 pl-4 border-l-2 border-blue-200">
          {sources.map((s) => (
            <div key={s.id} className="bg-blue-50 p-2 rounded">
              <div className="flex items-center justify-between mb-1">
                <span className="font-mono text-xs bg-blue-200 text-blue-900 px-1 rounded">{s.entity_type}</span>
                <span className="text-gray-500">score: {s.score?.toFixed(4)}</span>
              </div>
              <div className="text-gray-700">{s.text}</div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === "user";
  return (
    <div className={`mb-4 ${isUser ? "flex justify-end" : "flex justify-start"}`}>
      <div className={`max-w-2xl rounded-lg px-4 py-3 ${isUser ? "bg-blue-600 text-white" : "bg-white border border-gray-200 shadow-sm"}`}>
        <div className={`text-xs font-medium mb-1 ${isUser ? "text-blue-100" : "text-gray-500"}`}>
          {isUser ? "You" : "AI Assistant"}
        </div>
        <div className="whitespace-pre-wrap">{msg.content}</div>
        {!isUser && msg.sources && <SourcePanel sources={msg.sources} />}
        {!isUser && msg.timing && (
          <div className="mt-2 text-xs text-gray-400">
            retrieval {msg.timing.retrieval_ms}ms . completion {msg.timing.completion_ms}ms . {msg.usage?.total_tokens || 0} tokens
          </div>
        )}
      </div>
    </div>
  );
}

export default function Chat() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const scrollRef = useRef(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, loading]);

  async function send(question) {
    const userMsg = { role: "user", content: question };
    const history = messages.map(m => ({ role: m.role, content: m.content }));
    setMessages([...messages, userMsg]);
    setInput("");
    setLoading(true);
    setError(null);
    try {
      const result = await api.chat(question, history);
      const assistantMsg = {
        role: "assistant",
        content: result.response,
        sources: result.sources,
        timing: result.timing,
        usage: result.usage,
      };
      setMessages(prev => [...prev, assistantMsg]);
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }

  function onSubmit(e) {
    e.preventDefault();
    if (!input.trim() || loading) return;
    send(input.trim());
  }

  return (
    <div className="max-w-4xl mx-auto">
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-gray-900">Procurement AI Assistant</h1>
        <p className="text-sm text-gray-600">
          Ask questions about vendors, requisitions, and line items. Powered by Azure OpenAI (gpt-4o-mini) plus Cosmos DB vector search.
        </p>
      </div>

      <div ref={scrollRef} className="bg-gray-100 border border-gray-200 rounded-lg p-4 mb-4 h-[60vh] overflow-y-auto">
        {messages.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-500 mb-4">Start a conversation. Try one of these:</div>
            <div className="space-y-2 max-w-md mx-auto">
              {SUGGESTIONS.map((s, i) => (
                <button
                  key={i}
                  onClick={() => send(s)}
                  disabled={loading}
                  className="block w-full text-left px-4 py-2 bg-white border border-gray-200 rounded hover:bg-blue-50 hover:border-blue-300 text-sm text-gray-700 disabled:opacity-50"
                >
                  {s}
                </button>
              ))}
            </div>
          </div>
        ) : (
          <>
            {messages.map((m, i) => <Message key={i} msg={m} />)}
            {loading && (
              <div className="flex justify-start mb-4">
                <div className="bg-white border border-gray-200 shadow-sm rounded-lg px-4 py-3">
                  <div className="text-xs font-medium mb-1 text-gray-500">AI Assistant</div>
                  <div className="text-gray-400">Thinking...</div>
                </div>
              </div>
            )}
          </>
        )}
      </div>

      {error && (
        <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded text-sm text-red-700">
          Error: {error}
        </div>
      )}

      <form onSubmit={onSubmit} className="flex gap-2">
        <input
          type="text"
          value={input}
          onChange={(e) => setInput(e.target.value)}
          disabled={loading}
          placeholder="Ask about vendors, requisitions, line items..."
          className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 disabled:bg-gray-100"
        />
        <button
          type="submit"
          disabled={loading || !input.trim()}
          className="px-6 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
        >
          {loading ? "..." : "Send"}
        </button>
      </form>

      <div className="mt-4 text-xs text-gray-500">
        Conversations are not saved. Refresh to start fresh. AI may make mistakes; verify important data against source records.
      </div>
    </div>
  );
}