import { useState, useEffect, useRef, useCallback } from "react";
import { useLocation, useParams } from "wouter";
import {
  Plus, Search, Settings, Trash2, MessageSquare, Paperclip, Send, X, ChevronLeft, Loader2, Sparkles, ArrowRight
} from "lucide-react";
import { trpc } from "@/lib/trpc";
import { useAuth } from "@/_core/hooks/useAuth";
import { getLoginUrl } from "@/const";
import { toast } from "sonner";
import SimulationWorkflow, { WorkflowState, createInitialWorkflow } from "@/components/SimulationWorkflow";
import PredictionCard from "@/components/PredictionCard";
import { LocationPermissionUI, type LocationData } from "@/components/LocationPermissionUI";
import type { SimulationResult } from "../../../drizzle/schema";

interface AttachmentFile {
  name: string;
  url: string;
  type: string;
}

interface ChatMessage {
  id: number;
  role: "user" | "assistant";
  content: string;
  attachments?: AttachmentFile[];
  simulationResult?: SimulationResult | null;
  workflow?: WorkflowState;
  isStreaming?: boolean;
  error?: string;
}

const SAMPLE_QUESTIONS = [
  "If a brand suddenly changes its spokesperson, how might public opinion move?",
  "If a product raises its price, how will customer sentiment and narrative spread change?",
  "If a policy enters public debate, what positions are likely to split first?",
];

export default function Chat() {
  const params = useParams<{ id: string }>();
  const [, navigate] = useLocation();
  const { isAuthenticated, loading: authLoading } = useAuth();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [input, setInput] = useState("");
  const [attachments, setAttachments] = useState<AttachmentFile[]>([]);
  const [uploadingFile, setUploadingFile] = useState(false);
  const [sending, setSending] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [userLocation, setUserLocation] = useState<LocationData | null>(null);
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const conversationId = params.id && params.id !== "new" ? parseInt(params.id) : null;

  const utils = trpc.useUtils();
  const saveLocation = trpc.location.saveLocation.useMutation();

  const { data: conversations, refetch: refetchConversations } = trpc.conversations.list.useQuery(undefined, {
    enabled: isAuthenticated,
  });

  const { data: conversationData } = trpc.conversations.get.useQuery(
    { id: conversationId! },
    { enabled: !!conversationId && isAuthenticated }
  );

  const createConversation = trpc.conversations.create.useMutation();
  const deleteConversation = trpc.conversations.delete.useMutation({
    onSuccess: () => {
      refetchConversations();
      navigate("/chat/new");
    },
  });

  const sendMessage = trpc.messages.sendAndSimulate.useMutation();

  // Redirect to login if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      window.location.href = getLoginUrl();
    }
  }, [isAuthenticated, authLoading]);

  // Load conversation messages
  useEffect(() => {
    if (conversationData?.messages) {
      const loaded: ChatMessage[] = conversationData.messages.map(m => ({
        id: m.id,
        role: m.role,
        content: m.content,
        attachments: (m.attachments as AttachmentFile[] | null) ?? [],
        simulationResult: m.simulationResult as SimulationResult | null,
      }));
      setMessages(loaded);
    }
  }, [conversationData]);

  // Handle initial question from URL param
  useEffect(() => {
    const url = new URL(window.location.href);
    const q = url.searchParams.get("q");
    if (q && conversationId && messages.length === 0 && !sending) {
      setInput(q);
      // Clear the URL param
      url.searchParams.delete("q");
      window.history.replaceState({}, "", url.toString());
      // Auto-send after a brief delay
      setTimeout(() => {
        handleSendWithQuestion(q, conversationId);
      }, 300);
    }
  }, [conversationId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleLocationGranted = async (location: LocationData) => {
    setUserLocation(location);
    await saveLocation.mutateAsync({
      latitude: location.latitude,
      longitude: location.longitude,
      city: location.city,
      region: location.region,
      country: location.country,
      timezone: location.timezone,
      conversationId: conversationId || undefined,
    });
  };

  const handleSendWithQuestion = useCallback(async (question: string, convId: number) => {
    if (!question.trim() || sending) return;
    setSending(true);
    setInput("");

    const tempUserMsgId = Date.now();
    const tempAssistantMsgId = Date.now() + 1;

    // Add user message optimistically
    setMessages(prev => [
      ...prev,
      {
        id: tempUserMsgId,
        role: "user",
        content: question,
        attachments: [...attachments],
      },
      {
        id: tempAssistantMsgId,
        role: "assistant",
        content: "",
        isStreaming: true,
        workflow: createInitialWorkflow(),
      },
    ]);
    setAttachments([]);

    try {
      const { assistantMessageId } = await sendMessage.mutateAsync({
        conversationId: convId,
        content: question,
        attachments,
      });

      // Start SSE stream
      await streamSimulation(question, assistantMessageId, tempAssistantMsgId);
    } catch (err: any) {
      setMessages(prev =>
        prev.map(m =>
          m.id === tempAssistantMsgId
            ? { ...m, isStreaming: false, error: err?.message ?? "Simulation failed" }
            : m
        )
      );
      toast.error("Simulation failed");
    } finally {
      setSending(false);
      refetchConversations();
    }
  }, [sending, attachments, sendMessage]);

  const streamSimulation = async (question: string, messageId: number, tempMsgId: number) => {
    const response = await fetch("/api/simulate/stream", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ question, messageId }),
    });

    if (!response.ok) throw new Error("Stream request failed");

    const reader = response.body?.getReader();
    if (!reader) throw new Error("No response body");

    const decoder = new TextDecoder();
    let buffer = "";

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;

      buffer += decoder.decode(value, { stream: true });
      const lines = buffer.split("\n");
      buffer = lines.pop() ?? "";

      for (const line of lines) {
        if (!line.startsWith("data: ")) continue;
        const data = line.slice(6).trim();
        if (!data) continue;

        try {
          const event = JSON.parse(data);

          if (event.type === "stage") {
            setMessages(prev =>
              prev.map(m =>
                m.id === tempMsgId
                  ? {
                      ...m,
                      workflow: {
                        ...m.workflow!,
                        [event.stage]: event.status,
                        progress: event.progress,
                      },
                    }
                  : m
              )
            );
          } else if (event.type === "complete") {
            setMessages(prev =>
              prev.map(m =>
                m.id === tempMsgId
                  ? {
                      ...m,
                      id: event.messageId,
                      isStreaming: false,
                      simulationResult: event.result,
                      workflow: {
                        graph: "complete",
                        prepare: "complete",
                        simulate: "complete",
                        report: "complete",
                        progress: 100,
                      },
                    }
                  : m
              )
            );
          } else if (event.type === "error") {
            setMessages(prev =>
              prev.map(m =>
                m.id === tempMsgId
                  ? { ...m, isStreaming: false, error: event.message }
                  : m
              )
            );
          }
        } catch {
          // ignore parse errors
        }
      }
    }
  };

  const handleSend = async () => {
    const question = input.trim();
    if (!question || sending) return;

    let convId = conversationId;

    if (!convId) {
      const conv = await createConversation.mutateAsync({ title: question.slice(0, 100) });
      convId = conv.id;
      navigate(`/chat/${convId}`);
      await new Promise(r => setTimeout(r, 100));
    }

    await handleSendWithQuestion(question, convId);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if ((e.metaKey || e.ctrlKey) && e.key === "Enter") {
      e.preventDefault();
      handleSend();
    }
  };

  const handleFileUpload = async (file: File) => {
    const allowed = [".pdf", ".md", ".txt"];
    const ext = "." + file.name.split(".").pop()?.toLowerCase();
    if (!allowed.includes(ext)) {
      toast.error("Only PDF, MD, and TXT files are allowed");
      return;
    }

    setUploadingFile(true);
    try {
      const formData = new FormData();
      formData.append("file", file);
      const res = await fetch("/api/upload", { method: "POST", body: formData });
      if (!res.ok) throw new Error("Upload failed");
      const data = await res.json();
      setAttachments(prev => [...prev, { name: data.name, url: data.url, type: data.type }]);
      toast.success(`${file.name} attached`);
    } catch (err: any) {
      toast.error(err?.message ?? "Upload failed");
    } finally {
      setUploadingFile(false);
    }
  };

  const handleFollowUp = async (question: string) => {
    setInput(question);
    textareaRef.current?.focus();
  };

  const filteredConversations = conversations?.filter(c =>
    c.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const todayConvs = filteredConversations?.filter(c => new Date(c.createdAt) >= today) ?? [];
  const recentConvs = filteredConversations?.filter(c => new Date(c.createdAt) < today) ?? [];

  if (authLoading) {
    return (
      <div className="min-h-screen flex items-center justify-center" style={{ background: "var(--miro-cream)" }}>
        <Loader2 className="animate-spin text-muted-foreground" size={24} />
      </div>
    );
  }

  return (
    <div className="h-screen flex overflow-hidden" style={{ background: "var(--miro-cream)", fontFamily: "'Inter', sans-serif" }}>
      {/* Sidebar */}
      <aside
        className={`flex flex-col border-r border-border/60 transition-all duration-300 flex-shrink-0 ${
          sidebarOpen ? "w-72" : "w-0 overflow-hidden"
        }`}
        style={{ background: "oklch(0.97 0.008 85)" }}
      >
        {/* New Chat */}
        <div className="p-3">
          <button
            onClick={() => navigate("/chat/new")}
            className="w-full flex items-center gap-2.5 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 hover:opacity-90"
            style={{ background: "var(--miro-teal)", color: "oklch(0.93 0.03 185)" }}
          >
            <Plus size={15} />
            New Chat
            <ArrowRight size={13} className="ml-auto" />
          </button>
        </div>

        {/* Search */}
        <div className="px-3 pb-2">
          <div className="flex items-center gap-2 px-3 py-2 rounded-xl border border-border/60 bg-white/60">
            <Search size={13} className="text-muted-foreground flex-shrink-0" />
            <input
              type="text"
              placeholder="Search conversations..."
              value={searchQuery}
              onChange={e => setSearchQuery(e.target.value)}
              className="flex-1 bg-transparent text-xs text-foreground placeholder:text-muted-foreground/60 outline-none"
            />
          </div>
        </div>

        {/* Conversation list */}
        <div className="flex-1 overflow-y-auto px-2 py-1">
          {todayConvs.length > 0 && (
            <div className="mb-2">
              <p className="px-2 py-1 font-mono-label text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase">Today</p>
              {todayConvs.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === conversationId}
                  onSelect={() => navigate(`/chat/${conv.id}`)}
                  onDelete={() => deleteConversation.mutate({ id: conv.id })}
                />
              ))}
            </div>
          )}
          {recentConvs.length > 0 && (
            <div>
              <p className="px-2 py-1 font-mono-label text-xs font-semibold tracking-widest text-muted-foreground/60 uppercase">Recent</p>
              {recentConvs.map(conv => (
                <ConversationItem
                  key={conv.id}
                  conv={conv}
                  active={conv.id === conversationId}
                  onSelect={() => navigate(`/chat/${conv.id}`)}
                  onDelete={() => deleteConversation.mutate({ id: conv.id })}
                />
              ))}
            </div>
          )}
          {!todayConvs.length && !recentConvs.length && (
            <div className="px-3 py-6 text-center">
              <p className="text-xs text-muted-foreground/60">No conversations yet</p>
            </div>
          )}
        </div>

        {/* Bottom nav */}
        <div className="p-3 border-t border-border/60 flex gap-2">
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <Search size={13} />
            Search
          </button>
          <button className="flex-1 flex items-center justify-center gap-2 py-2 rounded-xl text-xs font-medium text-muted-foreground hover:bg-muted/50 transition-colors">
            <Settings size={13} />
            Settings
          </button>
        </div>
      </aside>

      {/* Main chat area */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Header */}
        <header className="flex items-center justify-between px-4 py-3 border-b border-border/60 bg-white/60 backdrop-blur-sm flex-shrink-0">
          <div className="flex items-center gap-3">
            <button
              onClick={() => setSidebarOpen(!sidebarOpen)}
              className="p-1.5 rounded-lg hover:bg-muted/50 transition-colors text-muted-foreground"
            >
              {sidebarOpen ? <ChevronLeft size={16} /> : <Sparkles size={16} />}
            </button>
            <span className="font-mono-label font-bold text-sm tracking-widest" style={{ color: "var(--miro-teal)" }}>
              PROJECT 26
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => navigate("/")}
              className="text-xs text-muted-foreground hover:text-foreground transition-colors px-3 py-1.5 rounded-lg hover:bg-muted/50"
            >
              ← Home
            </button>
          </div>
        </header>

        {/* Messages */}
        <div className="flex-1 overflow-y-auto px-4 py-6">
          <div className="max-w-2xl mx-auto flex flex-col gap-6">
            {messages.length === 0 && (
              <EmptyState onSample={q => { setInput(q); textareaRef.current?.focus(); }} />
            )}

            {messages.map((msg, idx) => (
              <MessageBubble
                key={`${msg.id}-${idx}`}
                message={msg}
                onFollowUp={handleFollowUp}
              />
            ))}
            <div ref={messagesEndRef} />
          </div>
        </div>

        {/* Location Permission */}
        {!userLocation && (
          <div className="flex-shrink-0 px-4 py-3 border-t border-border/60">
            <div className="max-w-2xl mx-auto">
              <LocationPermissionUI
                onLocationGranted={handleLocationGranted}
                compact={false}
              />
            </div>
          </div>
        )}

        {/* Input area */}
        <div className="flex-shrink-0 px-4 py-4 border-t border-border/60 bg-white/60 backdrop-blur-sm">
          <div className="max-w-2xl mx-auto">
            {/* Attachments preview */}
            {attachments.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-2">
                {attachments.map((att, i) => (
                  <div
                    key={i}
                    className="flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs border"
                    style={{ borderColor: "oklch(0.22 0.06 185 / 0.3)", background: "oklch(0.22 0.06 185 / 0.06)", color: "var(--miro-teal)" }}
                  >
                    <Paperclip size={10} />
                    {att.name}
                    <button onClick={() => setAttachments(prev => prev.filter((_, j) => j !== i))}>
                      <X size={10} className="hover:opacity-70" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="dashed-input-border bg-white/80 flex items-end gap-2 p-3">
              <button
                onClick={() => fileInputRef.current?.click()}
                disabled={uploadingFile}
                className="p-2 rounded-lg text-muted-foreground hover:text-foreground hover:bg-muted/50 transition-colors flex-shrink-0"
                title="Attach PDF, MD, or TXT file"
              >
                {uploadingFile ? <Loader2 size={16} className="animate-spin" /> : <Paperclip size={16} />}
              </button>
              <textarea
                ref={textareaRef}
                value={input}
                onChange={e => setInput(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Type your question..."
                rows={1}
                className="flex-1 bg-transparent text-sm text-foreground placeholder:text-muted-foreground/60 outline-none resize-none leading-relaxed"
                style={{ maxHeight: "120px", fontFamily: "'Inter', sans-serif" }}
                onInput={e => {
                  const t = e.currentTarget;
                  t.style.height = "auto";
                  t.style.height = Math.min(t.scrollHeight, 120) + "px";
                }}
              />
              <button
                onClick={handleSend}
                disabled={sending || !input.trim()}
                className="p-2 rounded-lg transition-all duration-200 flex-shrink-0 disabled:opacity-40"
                style={{ background: "var(--miro-teal)", color: "oklch(0.93 0.03 185)" }}
              >
                {sending ? <Loader2 size={16} className="animate-spin" /> : <Send size={16} />}
              </button>
            </div>
            <p className="text-xs text-muted-foreground/50 text-center mt-2">
              Attachments are only used as seed material for the first turn. · Cmd/Ctrl + Enter to send.
            </p>
          </div>
        </div>
      </div>

      {/* Hidden file input */}
      <input
        ref={fileInputRef}
        type="file"
        accept=".pdf,.md,.txt"
        className="hidden"
        onChange={e => {
          const file = e.target.files?.[0];
          if (file) handleFileUpload(file);
          e.target.value = "";
        }}
      />
    </div>
  );
}

function ConversationItem({
  conv,
  active,
  onSelect,
  onDelete,
}: {
  conv: { id: number; title: string; updatedAt: Date };
  active: boolean;
  onSelect: () => void;
  onDelete: () => void;
}) {
  const [hovered, setHovered] = useState(false);

  return (
    <div
      className={`sidebar-item group ${active ? "sidebar-item-active" : ""}`}
      onClick={onSelect}
      onMouseEnter={() => setHovered(true)}
      onMouseLeave={() => setHovered(false)}
    >
      <MessageSquare size={13} className="flex-shrink-0 mt-0.5 text-muted-foreground" />
      <div className="flex-1 min-w-0">
        <p className="text-xs font-medium text-foreground truncate leading-snug">{conv.title}</p>
      </div>
      {hovered && (
        <button
          onClick={e => { e.stopPropagation(); onDelete(); }}
          className="p-1 rounded-md hover:bg-destructive/10 text-muted-foreground hover:text-destructive transition-colors flex-shrink-0"
        >
          <Trash2 size={11} />
        </button>
      )}
    </div>
  );
}

function MessageBubble({
  message,
  onFollowUp,
}: {
  message: ChatMessage;
  onFollowUp: (q: string) => void;
}) {
  if (message.role === "user") {
    return (
      <div className="flex justify-end animate-fade-in-up">
        <div className="max-w-[80%]">
          {message.attachments && message.attachments.length > 0 && (
            <div className="flex flex-wrap gap-1.5 mb-1.5 justify-end">
              {message.attachments.map((att, i) => (
                <span
                  key={i}
                  className="text-xs px-2 py-0.5 rounded-full"
                  style={{ background: "oklch(0.22 0.06 185 / 0.12)", color: "var(--miro-teal)" }}
                >
                  <Paperclip size={9} className="inline mr-1" />
                  {att.name}
                </span>
              ))}
            </div>
          )}
          <div className="user-bubble">
            <p className="text-sm leading-relaxed">{message.content}</p>
          </div>
          <p className="font-mono-label text-xs text-muted-foreground/50 text-right mt-1">USER</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex flex-col gap-3 animate-fade-in-up">
      <p className="font-mono-label text-xs text-muted-foreground/60">ASSISTANT</p>

      {/* Workflow visualization */}
      {(message.workflow || message.isStreaming) && (
        <div className="assistant-bubble">
          {message.error ? (
            <p className="text-sm text-destructive">{message.error}</p>
          ) : (
            <SimulationWorkflow workflow={message.workflow ?? createInitialWorkflow()} />
          )}
        </div>
      )}

      {/* Prediction result card */}
      {message.simulationResult && (
        <PredictionCard result={message.simulationResult} onFollowUp={onFollowUp} />
      )}
    </div>
  );
}

function EmptyState({ onSample }: { onSample: (q: string) => void }) {
  return (
    <div className="flex flex-col items-center justify-center py-16 gap-6 animate-fade-in-up">
      <div className="text-center">
        <div className="w-12 h-12 rounded-2xl flex items-center justify-center mx-auto mb-4" style={{ background: "oklch(0.22 0.06 185 / 0.1)" }}>
          <Sparkles size={22} style={{ color: "var(--miro-teal)" }} />
        </div>
        <h2 className="font-serif-display text-xl font-semibold text-foreground mb-2">TEXT-FIRST ORCHESTRATION</h2>
        <p className="text-sm text-muted-foreground max-w-sm leading-relaxed">
          Ask directly and let MiroFish turn it into a full simulation run.
        </p>
      </div>
      <div className="w-full max-w-md flex flex-col gap-2">
        {SAMPLE_QUESTIONS.map((q, i) => (
          <button
            key={i}
            onClick={() => onSample(q)}
            className="text-left px-4 py-3 rounded-xl border text-sm transition-all duration-200 hover:shadow-sm"
            style={{
              borderColor: "oklch(0.22 0.06 185 / 0.2)",
              background: "oklch(0.22 0.06 185 / 0.03)",
              color: "oklch(0.3 0.04 185)",
            }}
          >
            {q}
          </button>
        ))}
      </div>
    </div>
  );
}


