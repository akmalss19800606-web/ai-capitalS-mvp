"use client";
/**
 * AI-ассистент — страница мультипровайдерного ИИ-чата.
 * Этап 3, Сессия 3.1.
 *
 * Функционал:
 *   - Чат с AI через Gateway (автоматический fallback)
 *   - Выбор провайдера (Groq/Gemini/Ollama/HuggingFace/Авто)
 *   - Панель статусов провайдеров в реальном времени
 *   - История чата в рамках сессии
 *   - Системный промпт для контекста
 */
import React, { useState, useEffect, useRef, useCallback } from "react";
import { useLocale } from "@/lib/i18n";
import { aiGateway } from "@/lib/api";

/* ─── SVG-иконки ─────────────────────────────────────────── */
const IconSend = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M22 2L11 13M22 2l-7 20-4-9-9-4 20-7z" />
  </svg>
);
const IconBot = () => (
  <svg width="22" height="22" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.75 3.104v5.714a2.25 2.25 0 01-.659 1.591L5 14.5M9.75 3.104c-.251.023-.501.05-.75.082m.75-.082a24.301 24.301 0 014.5 0m0 0v5.714a2.25 2.25 0 00.659 1.591L19 14.5m-4.75-11.396c.251.023.501.05.75.082M12 21a8.966 8.966 0 01-5.982-2.275M12 21a8.966 8.966 0 005.982-2.275" />
  </svg>
);
const IconUser = () => (
  <svg width="20" height="20" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={1.5}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M15.75 6a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.501 20.118a7.5 7.5 0 0114.998 0" />
  </svg>
);
const IconRefresh = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M16.023 9.348h4.992v-.001M2.985 19.644v-4.992m0 0h4.992m-4.993 0l3.181 3.183a8.25 8.25 0 0013.803-3.7M4.031 9.865a8.25 8.25 0 0113.803-3.7l3.181 3.182" />
  </svg>
);
const IconSettings = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M9.594 3.94c.09-.542.56-.94 1.11-.94h2.593c.55 0 1.02.398 1.11.94l.213 1.281c.063.374.313.686.645.87.074.04.147.083.22.127.324.196.72.257 1.075.124l1.217-.456a1.125 1.125 0 011.37.49l1.296 2.247a1.125 1.125 0 01-.26 1.431l-1.003.827c-.293.24-.438.613-.431.992a6.759 6.759 0 010 .255c-.007.378.138.75.43.99l1.005.828c.424.35.534.954.26 1.43l-1.298 2.247a1.125 1.125 0 01-1.369.491l-1.217-.456c-.355-.133-.75-.072-1.076.124a6.57 6.57 0 01-.22.128c-.331.183-.581.495-.644.869l-.213 1.28c-.09.543-.56.941-1.11.941h-2.594c-.55 0-1.02-.398-1.11-.94l-.213-1.281c-.062-.374-.312-.686-.644-.87a6.52 6.52 0 01-.22-.127c-.325-.196-.72-.257-1.076-.124l-1.217.456a1.125 1.125 0 01-1.369-.49l-1.297-2.247a1.125 1.125 0 01.26-1.431l1.004-.827c.292-.24.437-.613.43-.992a6.932 6.932 0 010-.255c.007-.378-.138-.75-.43-.99l-1.004-.828a1.125 1.125 0 01-.26-1.43l1.297-2.247a1.125 1.125 0 011.37-.491l1.216.456c.356.133.751.072 1.076-.124.072-.044.146-.087.22-.128.332-.183.582-.495.644-.869l.214-1.281z" />
    <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
  </svg>
);
const IconClear = () => (
  <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
    <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
  </svg>
);

/* ─── Типы ─────────────────────────────────────────── */
interface ChatMsg {
  role: "user" | "assistant";
  content: string;
  provider?: string;
  model?: string;
  responseMs?: number;
  cached?: boolean;
  timestamp: string;
}

interface ProviderInfo {
  name: string;
  display_name: string;
  provider_type: string;
  priority: string;
  specialization: string;
  model_name: string;
  max_tokens: number;
  rate_limit_rpm: number | null;
  rate_limit_rpd: number | null;
  description: string;
  current_status: string;
  response_time_ms: number | null;
  health_error: string | null;
}

/* ─── Стили ──────────────────────────────────────────── */
const styles = {
  page: {
    padding: "24px 32px",
    fontFamily: "'Inter', -apple-system, BlinkMacSystemFont, sans-serif",
    minHeight: "100vh",
    backgroundColor: "#f8fafc",
  } as React.CSSProperties,
  header: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 24,
  } as React.CSSProperties,
  title: {
    fontSize: 22,
    fontWeight: 700,
    color: "#0f172a",
    display: "flex",
    alignItems: "center",
    gap: 10,
  } as React.CSSProperties,
  grid: {
    display: "grid",
    gridTemplateColumns: "1fr 340px",
    gap: 24,
    height: "calc(100vh - 140px)",
  } as React.CSSProperties,
  /* Chat panel */
  chatPanel: {
    display: "flex",
    flexDirection: "column" as const,
    background: "#ffffff",
    borderRadius: 16,
    border: "1px solid #e2e8f0",
    overflow: "hidden",
  } as React.CSSProperties,
  chatMessages: {
    flex: 1,
    overflowY: "auto" as const,
    padding: "20px 24px",
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  } as React.CSSProperties,
  msgRow: (isUser: boolean) => ({
    display: "flex",
    justifyContent: isUser ? "flex-end" : "flex-start",
    gap: 10,
  }),
  msgBubble: (isUser: boolean) => ({
    maxWidth: "75%",
    padding: "12px 16px",
    borderRadius: isUser ? "16px 16px 4px 16px" : "16px 16px 16px 4px",
    background: isUser ? "#0ea5e9" : "#f1f5f9",
    color: isUser ? "#fff" : "#1e293b",
    fontSize: 14,
    lineHeight: 1.6,
    whiteSpace: "pre-wrap" as const,
    wordBreak: "break-word" as const,
  }),
  msgMeta: {
    fontSize: 11,
    color: "#94a3b8",
    marginTop: 4,
  } as React.CSSProperties,
  avatar: (isUser: boolean) => ({
    width: 32,
    height: 32,
    borderRadius: "50%",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: isUser ? "#0ea5e9" : "#e0f2fe",
    color: isUser ? "#fff" : "#0284c7",
    flexShrink: 0,
    marginTop: 2,
  }),
  /* Input bar */
  inputBar: {
    display: "flex",
    alignItems: "center",
    gap: 10,
    padding: "12px 16px",
    borderTop: "1px solid #e2e8f0",
    background: "#fafbfc",
  } as React.CSSProperties,
  input: {
    flex: 1,
    border: "1px solid #e2e8f0",
    borderRadius: 12,
    padding: "10px 14px",
    fontSize: 14,
    outline: "none",
    fontFamily: "inherit",
    resize: "none" as const,
    minHeight: 42,
    maxHeight: 120,
  } as React.CSSProperties,
  sendBtn: (disabled: boolean) => ({
    width: 42,
    height: 42,
    borderRadius: 12,
    border: "none",
    background: disabled ? "#cbd5e1" : "#0ea5e9",
    color: "#fff",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    cursor: disabled ? "not-allowed" : "pointer",
    transition: "background 0.2s",
    flexShrink: 0,
  }),
  /* Provider select */
  providerSelect: {
    padding: "6px 10px",
    borderRadius: 8,
    border: "1px solid #e2e8f0",
    fontSize: 13,
    background: "#fff",
    cursor: "pointer",
    outline: "none",
  } as React.CSSProperties,
  /* Right panel */
  rightPanel: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
  } as React.CSSProperties,
  card: {
    background: "#ffffff",
    borderRadius: 14,
    border: "1px solid #e2e8f0",
    padding: "18px 20px",
  } as React.CSSProperties,
  cardTitle: {
    fontSize: 14,
    fontWeight: 600,
    color: "#0f172a",
    marginBottom: 12,
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
  } as React.CSSProperties,
  providerItem: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    padding: "8px 0",
    borderBottom: "1px solid #f1f5f9",
  } as React.CSSProperties,
  statusDot: (status: string) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background:
      status === "available" ? "#22c55e" :
      status === "rate_limited" ? "#f59e0b" :
      status === "not_configured" ? "#94a3b8" :
      "#ef4444",
    flexShrink: 0,
  }),
  badge: (color: string) => ({
    padding: "2px 8px",
    borderRadius: 6,
    fontSize: 11,
    fontWeight: 500,
    background: color + "15",
    color: color,
  }),
  smallBtn: {
    padding: "4px 8px",
    borderRadius: 6,
    border: "1px solid #e2e8f0",
    background: "#fff",
    cursor: "pointer",
    fontSize: 12,
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "#64748b",
  } as React.CSSProperties,
  toolbarRow: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    padding: "8px 16px",
    borderBottom: "1px solid #f1f5f9",
    background: "#fafbfc",
  } as React.CSSProperties,
  emptyChat: {
    flex: 1,
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    color: "#94a3b8",
    gap: 12,
  } as React.CSSProperties,
  typing: {
    display: "flex",
    gap: 4,
    padding: "14px 18px",
  } as React.CSSProperties,
  dot: (i: number) => ({
    width: 8,
    height: 8,
    borderRadius: "50%",
    background: "#94a3b8",
    animation: `typing-bounce 1.4s ease-in-out ${i * 0.16}s infinite`,
  }),
};

const STATUS_LABELS: Record<string, string> = {
  available: "Доступен",
  rate_limited: "Лимит",
  unavailable: "Недоступен",
  not_configured: "Не настроен",
  error: "Ошибка",
};

const SPEC_LABELS: Record<string, string> = {
  fast_inference: "Быстрый анализ",
  multimodal: "Мультимодальный",
  private_data: "Приватные данные",
  specialized_nlp: "NLP-задачи",
};

const PRIORITY_COLORS: Record<string, string> = {
  primary: "#0ea5e9",
  secondary: "#8b5cf6",
  supplementary: "#f59e0b",
};

const DEFAULT_SYSTEM_PROMPT =
  "Ты — финансовый аналитик AI Capital Management, помогаешь предпринимателям Узбекистана с инвестиционным анализом, оценкой компаний и финансовым планированием. Отвечай на русском языке, кратко и по делу.";

export default function AIAssistantPage() {
  const { t } = useLocale();
  const [messages, setMessages] = useState<ChatMsg[]>([]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [selectedProvider, setSelectedProvider] = useState("auto");
  const [providers, setProviders] = useState<ProviderInfo[]>([]);
  const [healthLoading, setHealthLoading] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [systemPrompt, setSystemPrompt] = useState(DEFAULT_SYSTEM_PROMPT);
  const [temperature, setTemperature] = useState(0.7);
  const [stats, setStats] = useState<any>(null);
  const chatEndRef = useRef<HTMLDivElement>(null);

  /* Загрузка провайдеров */
  const loadProviders = useCallback(async () => {
    setHealthLoading(true);
    try {
      const data = await aiGateway.providers();
      setProviders(data);
    } catch (e) {
      console.error("Ошибка загрузки провайдеров:", e);
    } finally {
      setHealthLoading(false);
    }
  }, []);

  const loadStats = useCallback(async () => {
    try {
      const data = await aiGateway.stats();
      setStats(data);
    } catch (e) { /* ignore */ }
  }, []);

  useEffect(() => {
    loadProviders();
    loadStats();
  }, [loadProviders, loadStats]);

  /* Автоскролл */
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, loading]);

  /* Отправка сообщения */
  const handleSend = async () => {
    const text = input.trim();
    if (!text || loading) return;

    const userMsg: ChatMsg = {
      role: "user",
      content: text,
      timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
    };
    setMessages((prev) => [...prev, userMsg]);
    setInput("");
    setLoading(true);

    try {
      const apiMessages = messages
        .concat(userMsg)
        .map((m) => ({ role: m.role, content: m.content }));

      const resp = await aiGateway.chat({
        messages: apiMessages,
        provider: selectedProvider === "auto" ? undefined : selectedProvider,
        temperature,
        system_prompt: systemPrompt,
        use_cache: true,
      });

      const assistantMsg: ChatMsg = {
        role: "assistant",
        content: resp.content,
        provider: resp.provider,
        model: resp.model,
        responseMs: resp.response_time_ms,
        cached: resp.cached,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, assistantMsg]);
      loadStats();
    } catch (e: any) {
      const errMsg: ChatMsg = {
        role: "assistant",
        content: `Ошибка: ${e?.message || "Не удалось получить ответ от ИИ. Проверьте настройки провайдеров."}`,
        timestamp: new Date().toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" }),
      };
      setMessages((prev) => [...prev, errMsg]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const clearChat = () => {
    setMessages([]);
  };

  return (
    <div style={styles.page}>
      {/* CSS анимация */}
      <style>{`
        @keyframes typing-bounce {
          0%, 80%, 100% { transform: translateY(0); }
          40% { transform: translateY(-6px); }
        }
      `}</style>

      <div style={styles.header}>
        <div style={styles.title}>
          <IconBot />
          {t.aiAssistant.title || "AI-ассистент"}
        </div>
        <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
          <span style={{ fontSize: 12, color: "#64748b" }}>
            {t.aiAssistant.availableProviders || "Доступно провайдеров"}:{" "}
            {providers.filter((p) => p.current_status === "available").length}/{providers.length}
          </span>
        </div>
      </div>

      <div style={styles.grid}>
        {/* ─── Левая панель: чат ─── */}
        <div style={styles.chatPanel}>
          {/* Toolbar */}
          <div style={styles.toolbarRow}>
            <select
              style={styles.providerSelect}
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
            >
              <option value="auto">{t.aiAssistant.autoProvider || "Авто (fallback)"}</option>
              {providers.map((p) => (
                <option key={p.name} value={p.name} disabled={p.current_status !== "available"}>
                  {p.display_name} {p.current_status !== "available" ? `(${STATUS_LABELS[p.current_status] || p.current_status})` : ""}
                </option>
              ))}
            </select>
            <button style={styles.smallBtn} onClick={() => setShowSettings(!showSettings)} title={t.aiAssistant.settings || "Настройки"}>
              <IconSettings /> {t.aiAssistant.settings || "Настройки"}
            </button>
            <button style={styles.smallBtn} onClick={clearChat} title={t.aiAssistant.clearChat || "Очистить чат"}>
              <IconClear /> {t.aiAssistant.clearChat || "Очистить"}
            </button>
          </div>

          {/* Settings panel */}
          {showSettings && (
            <div style={{ padding: "12px 16px", borderBottom: "1px solid #f1f5f9", background: "#fefefe" }}>
              <div style={{ marginBottom: 8 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>
                  {t.aiAssistant.systemPrompt || "Системный промпт"}:
                </label>
                <textarea
                  style={{ ...styles.input, width: "100%", minHeight: 60, marginTop: 4 }}
                  value={systemPrompt}
                  onChange={(e) => setSystemPrompt(e.target.value)}
                />
              </div>
              <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                <label style={{ fontSize: 12, fontWeight: 500, color: "#475569" }}>
                  Temperature: {temperature}
                </label>
                <input
                  type="range"
                  min="0"
                  max="2"
                  step="0.1"
                  value={temperature}
                  onChange={(e) => setTemperature(Number(e.target.value))}
                  style={{ flex: 1 }}
                />
              </div>
            </div>
          )}

          {/* Messages */}
          <div style={styles.chatMessages}>
            {messages.length === 0 && !loading && (
              <div style={styles.emptyChat}>
                <IconBot />
                <div style={{ fontSize: 16, fontWeight: 500 }}>
                  {t.aiAssistant.emptyTitle || "AI Capital Assistant"}
                </div>
                <div style={{ fontSize: 13, maxWidth: 400, textAlign: "center", lineHeight: 1.5 }}>
                  {t.aiAssistant.emptyHint || "Задайте вопрос о финансовом анализе, оценке компаний или инвестиционном планировании в Узбекистане."}
                </div>
              </div>
            )}

            {messages.map((msg, i) => {
              const isUser = msg.role === "user";
              return (
                <div key={i} style={styles.msgRow(isUser)}>
                  {!isUser && <div style={styles.avatar(false)}><IconBot /></div>}
                  <div>
                    <div style={styles.msgBubble(isUser)}>{msg.content}</div>
                    <div style={{ ...styles.msgMeta, textAlign: isUser ? "right" : "left" }}>
                      {msg.timestamp}
                      {msg.provider && (
                        <span style={{ marginLeft: 8 }}>
                          {msg.provider} / {msg.model}
                          {msg.cached && " (кэш)"}
                          {msg.responseMs != null && ` · ${Math.round(msg.responseMs)}ms`}
                        </span>
                      )}
                    </div>
                  </div>
                  {isUser && <div style={styles.avatar(true)}><IconUser /></div>}
                </div>
              );
            })}

            {loading && (
              <div style={styles.msgRow(false)}>
                <div style={styles.avatar(false)}><IconBot /></div>
                <div style={{ ...styles.msgBubble(false), ...styles.typing }}>
                  <div style={styles.dot(0)} />
                  <div style={styles.dot(1)} />
                  <div style={styles.dot(2)} />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div style={styles.inputBar}>
            <textarea
              style={styles.input}
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
              placeholder={t.aiAssistant.inputPlaceholder || "Введите сообщение..."}
              rows={1}
            />
            <button
              style={styles.sendBtn(loading || !input.trim())}
              onClick={handleSend}
              disabled={loading || !input.trim()}
            >
              <IconSend />
            </button>
          </div>
        </div>

        {/* ─── Правая панель: статусы ─── */}
        <div style={styles.rightPanel}>
          {/* Провайдеры */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              <span>{t.aiAssistant.providersTitle || "ИИ-провайдеры"}</span>
              <button style={styles.smallBtn} onClick={loadProviders} disabled={healthLoading}>
                <IconRefresh /> {healthLoading ? "..." : ""}
              </button>
            </div>
            {providers.map((p) => (
              <div key={p.name} style={styles.providerItem}>
                <div>
                  <div style={{ fontSize: 13, fontWeight: 500, color: "#1e293b", display: "flex", alignItems: "center", gap: 6 }}>
                    <div style={styles.statusDot(p.current_status)} />
                    {p.display_name}
                  </div>
                  <div style={{ fontSize: 11, color: "#94a3b8", marginTop: 2 }}>
                    {SPEC_LABELS[p.specialization] || p.specialization}
                    {p.response_time_ms != null && ` · ${Math.round(p.response_time_ms)}ms`}
                  </div>
                  {p.health_error && (
                    <div style={{ fontSize: 10, color: "#ef4444", marginTop: 2 }}>{p.health_error}</div>
                  )}
                </div>
                <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-end", gap: 2 }}>
                  <span style={styles.badge(PRIORITY_COLORS[p.priority] || "#64748b")}>
                    {p.priority === "primary" ? "Основной" : p.priority === "secondary" ? "Резервный" : "Доп."}
                  </span>
                  <span style={{ fontSize: 10, color: "#94a3b8" }}>
                    {p.model_name}
                  </span>
                </div>
              </div>
            ))}
            {providers.length === 0 && (
              <div style={{ fontSize: 13, color: "#94a3b8", textAlign: "center", padding: 16 }}>
                {t.aiAssistant.noProviders || "Загрузка..."}
              </div>
            )}
          </div>

          {/* Статистика */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              {t.aiAssistant.statsTitle || "Статистика"}
            </div>
            {stats ? (
              <div style={{ fontSize: 13, color: "#475569", lineHeight: 1.8 }}>
                <div>{t.aiAssistant.totalRequests || "Всего запросов"}: <strong>{stats.total_requests}</strong></div>
                {Object.entries(stats.by_provider || {}).map(([k, v]) => (
                  <div key={k} style={{ paddingLeft: 12 }}>• {k}: {v as number}</div>
                ))}
                <div style={{ marginTop: 6 }}>
                  {t.aiAssistant.cacheHitRate || "Кэш (попадания)"}: <strong>{((stats.cache?.hit_rate || 0) * 100).toFixed(0)}%</strong>
                  <span style={{ marginLeft: 8, color: "#94a3b8" }}>({stats.cache?.size || 0} / {stats.cache?.max_size || 200})</span>
                </div>
              </div>
            ) : (
              <div style={{ fontSize: 13, color: "#94a3b8" }}>
                {t.aiAssistant.noStats || "Нет данных"}
              </div>
            )}
          </div>

          {/* Подсказки */}
          <div style={styles.card}>
            <div style={styles.cardTitle}>
              {t.aiAssistant.suggestionsTitle || "Примеры запросов"}
            </div>
            {[
              t.aiAssistant.suggestion1 || "Проанализируй курс USD/UZS за последний месяц",
              t.aiAssistant.suggestion2 || "Оцени инвестиционную привлекательность текстильной отрасли",
              t.aiAssistant.suggestion3 || "Сравни доходность депозитов в UZS и USD",
            ].map((hint, i) => (
              <div
                key={i}
                style={{
                  fontSize: 12,
                  color: "#0ea5e9",
                  cursor: "pointer",
                  padding: "6px 0",
                  borderBottom: i < 2 ? "1px solid #f8fafc" : undefined,
                }}
                onClick={() => setInput(hint)}
              >
                {hint}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
