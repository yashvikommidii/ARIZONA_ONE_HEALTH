"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { SymptomAnalysis, SymptomAnalysisPanel } from "@/components/SymptomAnalysisPanel";
import { useLanguage } from "@/components/LanguageProvider";

type Msg = { role: "user" | "assistant"; text: string; analysis?: SymptomAnalysis };
type BrowserSpeechRecognition = {
  lang: string;
  continuous: boolean;
  interimResults: boolean;
  onresult: ((event: SpeechRecognitionEvent) => void) | null;
  onerror: (() => void) | null;
  onend: (() => void) | null;
  start: () => void;
};

declare global {
  interface Window {
    webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
    SpeechRecognition?: new () => BrowserSpeechRecognition;
  }
}

const CHAT_STORAGE_KEY = "az-one-health-live-chat";
const INITIAL_MESSAGES: Msg[] = [
  {
    role: "assistant",
    text: "Hello! Hola! You can chat with me in English or Spanish about this website, its pages, and components.",
  },
];

const symptomKeywords = [
  "fever",
  "cough",
  "sore throat",
  "rash",
  "vomit",
  "nausea",
  "fatigue",
  "headache",
  "diarrhea",
  "shortness of breath",
  "i feel",
  "i have",
  "my child",
  "symptoms",
  "sick",
  "ill",
];

export default function LiveChatPage() {
  const { tx } = useLanguage();
  const [messages, setMessages] = useState<Msg[]>(INITIAL_MESSAGES);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const [recording, setRecording] = useState(false);
  const [voiceReply, setVoiceReply] = useState(true);
  const [speechStatus, setSpeechStatus] = useState("");
  const listRef = useRef<HTMLDivElement>(null);

  const canUseSpeech = useMemo(() => {
    if (typeof window === "undefined") return false;
    return Boolean(window.SpeechRecognition || window.webkitSpeechRecognition);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(CHAT_STORAGE_KEY);
      if (!saved) return;
      const parsed = JSON.parse(saved) as Msg[];
      const validMessages = parsed.filter(
        (msg) =>
          (msg.role === "user" || msg.role === "assistant") &&
          typeof msg.text === "string" &&
          msg.text.trim()
      );
      if (validMessages.length) setMessages(validMessages);
    } catch {
      localStorage.removeItem(CHAT_STORAGE_KEY);
    }
  }, []);

  useEffect(() => {
    localStorage.setItem(CHAT_STORAGE_KEY, JSON.stringify(messages.slice(-40)));
  }, [messages]);

  const scrollToBottom = () => {
    requestAnimationFrame(() => {
      listRef.current?.scrollTo({ top: listRef.current.scrollHeight, behavior: "smooth" });
    });
  };

  const speak = (text: string) => {
    if (!voiceReply || typeof window === "undefined" || !window.speechSynthesis) return;
    const speechText = text
      .replace(/[!?¡¿]/g, "")
      .replace(/[()[\]{}"']/g, "")
      .replace(/[,:;]+/g, " ")
      .replace(/\s{2,}/g, " ")
      .trim();
    const utter = new SpeechSynthesisUtterance(speechText || text);
    utter.rate = 1;
    utter.pitch = 1;
    window.speechSynthesis.cancel();
    window.speechSynthesis.speak(utter);
  };

  const toPlainText = (text: string) =>
    text
      .replace(/[*_`#>-]+/g, "")
      .replace(/\[(.*?)\]\((.*?)\)/g, "$1")
      .replace(/\s{2,}/g, " ")
      .trim();

  const isSymptomMessage = (text: string) =>
    symptomKeywords.some((keyword) => text.toLowerCase().includes(keyword));

  const send = async (value?: string) => {
    const text = (value ?? input).trim();
    if (!text || loading) return;

    const next = [...messages, { role: "user" as const, text }];
    setMessages(next);
    setInput("");
    setLoading(true);
    scrollToBottom();

    const apiMessages = next.map((m) => ({ role: m.role, content: m.text }));

    try {
      const username = localStorage.getItem("username") ?? undefined;
      const county = localStorage.getItem("riskCounty") ?? undefined;
      const zipCode = localStorage.getItem("riskZipCode") ?? undefined;
      if (isSymptomMessage(text)) {
        const analysisRes = await fetch("/api/analyze-symptoms", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ message: text, county, zipCode }),
        });
        const analysisData = await analysisRes.json();
        if (analysisRes.ok && analysisData.analysis) {
          setMessages((prev) => [
            ...prev,
            {
              role: "assistant",
              text: tx.whatThisMightMean,
              analysis: analysisData.analysis,
            },
          ]);
        }
      }
      const res = await fetch("/api/live-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ messages: apiMessages, username, county, zipCode }),
      });
      const data = await res.json();
      const replyRaw = res.ok ? data.reply : data.message || "Something went wrong.";
      const reply = toPlainText(replyRaw);
      setMessages((prev) => [...prev, { role: "assistant", text: reply }]);
      if (data?.warning) {
        setMessages((prev) => [
          ...prev,
          { role: "assistant", text: `System status: ${toPlainText(String(data.warning))}` },
        ]);
      }
      speak(reply);
    } catch {
      setMessages((prev) => [
        ...prev,
        { role: "assistant", text: tx.unableToConnectChat },
      ]);
    } finally {
      setLoading(false);
      scrollToBottom();
    }
  };

  const clearChat = () => {
    setMessages(INITIAL_MESSAGES);
    localStorage.removeItem(CHAT_STORAGE_KEY);
  };

  const startVoiceInput = () => {
    const SpeechRec = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SpeechRec || recording) {
      setSpeechStatus(tx.voiceUnsupported);
      return;
    }
    const recog = new SpeechRec();
    const lang = localStorage.getItem("lang") === "es" ? "es-ES" : "en-US";
    recog.lang = lang;
    recog.continuous = false;
    recog.interimResults = false;
    setRecording(true);
    setSpeechStatus(`${tx.listening} (${lang})...`);
    recog.onresult = (e: SpeechRecognitionEvent) => {
      const text = e.results?.[0]?.[0]?.transcript ?? "";
      if (text) {
        setInput(text);
        void send(text);
      }
    };
    recog.onerror = () => {
      setRecording(false);
      setSpeechStatus(
        tx.micPermissionError
      );
    };
    recog.onend = () => {
      setRecording(false);
      setSpeechStatus("");
    };
    recog.start();
  };

  return (
    <main className="container live-shell">
      <section className="card live-card">
        <div className="live-head">
          <h2>{tx.liveChatTitle}</h2>
          <button type="button" onClick={clearChat}>
            {tx.clearChat}
          </button>
          <label className="live-voice-toggle">
            <input
              type="checkbox"
              checked={voiceReply}
              onChange={(e) => setVoiceReply(e.target.checked)}
            />
            {tx.voiceReply}
          </label>
        </div>
        <div className="live-messages" ref={listRef}>
          {messages.map((m, i) => (
            <div key={`${m.role}-${i}`} className={`live-msg ${m.role}`}>
              {m.text}
              {m.analysis ? <SymptomAnalysisPanel analysis={m.analysis} compact /> : null}
            </div>
          ))}
          {loading ? <div className="live-msg assistant">{tx.thinking}</div> : null}
        </div>
        <div className="live-input-row">
          <input
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") void send();
            }}
            placeholder={tx.chatPlaceholder}
          />
          {canUseSpeech ? (
            <button type="button" onClick={startVoiceInput} className={recording ? "recording" : ""}>
              {recording ? `${tx.listening}...` : tx.voice}
            </button>
          ) : null}
          <button type="button" onClick={() => void send()} disabled={loading || !input.trim()}>
            Send
          </button>
        </div>
        {speechStatus ? <p className="dashboard-subline">{speechStatus}</p> : null}
      </section>
    </main>
  );
}
