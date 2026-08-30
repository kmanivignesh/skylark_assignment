import { useState, useRef, useEffect } from 'react';
import { api } from '../services/api';
import {
  Send, Loader2, Bot, User, AlertTriangle, BarChart3,
  TrendingUp, Briefcase, ClipboardList, RefreshCcw, Sparkles
} from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const SUGGESTED_PROMPTS = [
  { icon: TrendingUp, text: "How is our pipeline looking this quarter?" },
  { icon: Briefcase, text: "How is Energy performing?" },
  { icon: ClipboardList, text: "Show me operational performance." },
  { icon: BarChart3, text: "Which sectors have the strongest pipeline?" },
  { icon: Sparkles, text: "Prepare a leadership update." },
];

export default function Agent() {
  const [messages, setMessages] = useState([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const messagesEndRef = useRef(null);
  const inputRef = useRef(null);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const sendMessage = async (text) => {
    const userMsg = { role: 'user', content: text, timestamp: new Date() };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setLoading(true);

    try {
      const conversationHistory = messages.map(m => ({
        role: m.role,
        content: m.content
      }));
      const data = await api.chat(text, conversationHistory);
      const aiMsg = {
        role: 'assistant',
        content: data.response,
        dataQuality: data.dataQuality,
        metrics: data.metrics,
        queryPlan: data.queryPlan,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, aiMsg]);
    } catch (err) {
      const errMsg = {
        role: 'assistant',
        content: err.message || 'Something went wrong. Please try again.',
        isError: true,
        timestamp: new Date()
      };
      setMessages(prev => [...prev, errMsg]);
    } finally {
      setLoading(false);
      inputRef.current?.focus();
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    if (!input.trim() || loading) return;
    sendMessage(input.trim());
  };

  const handlePromptClick = (text) => {
    if (loading) return;
    sendMessage(text);
  };

  return (
    <div className="min-h-screen pt-16 flex flex-col">
      <div className="flex-1 overflow-y-auto pb-36">
        {messages.length === 0 ? (
          /* Empty state */
          <div className="max-w-3xl mx-auto px-4 pt-16 sm:pt-24">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-primary-500 to-accent-500 mb-4">
                <Bot className="w-8 h-8 text-white" />
              </div>
              <h1 className="text-2xl font-bold text-white mb-2">Skylark BI Agent</h1>
              <p className="text-white/50">Ask me anything about your business data.</p>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-w-2xl mx-auto">
              {SUGGESTED_PROMPTS.map((p, i) => (
                <button
                  key={i}
                  onClick={() => handlePromptClick(p.text)}
                  className="group flex items-center gap-3 p-4 rounded-xl border border-white/5 bg-white/[0.02] hover:bg-white/[0.05] hover:border-white/10 text-left transition-all"
                >
                  <p.icon className="w-4 h-4 text-primary-400 shrink-0" />
                  <span className="text-sm text-white/60 group-hover:text-white/80 transition-colors">
                    {p.text}
                  </span>
                </button>
              ))}
            </div>
          </div>
        ) : (
          /* Messages */
          <div className="max-w-3xl mx-auto px-4 pt-6 space-y-6">
            {messages.map((msg, i) => (
              <MessageBubble key={i} message={msg} />
            ))}
            {loading && (
              <div className="flex items-start gap-3">
                <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-primary-500 to-accent-500 flex items-center justify-center shrink-0">
                  <Bot className="w-4 h-4 text-white" />
                </div>
                <div className="flex items-center gap-2 px-4 py-3 rounded-2xl bg-white/[0.03] border border-white/5">
                  <Loader2 className="w-4 h-4 animate-spin text-primary-400" />
                  <span className="text-sm text-white/40">Analyzing your data...</span>
                </div>
              </div>
            )}
            <div ref={messagesEndRef} />
          </div>
        )}
      </div>

      {/* Input */}
      <div className="fixed bottom-0 left-0 right-0 bg-gradient-to-t from-surface-950 via-surface-950 to-transparent pt-8 pb-6 px-4">
        <form onSubmit={handleSubmit} className="max-w-3xl mx-auto">
          <div className="relative flex items-center">
            <input
              ref={inputRef}
              type="text"
              value={input}
              onChange={(e) => setInput(e.target.value)}
              placeholder="Ask a business question..."
              disabled={loading}
              className="w-full px-5 py-4 pr-14 rounded-2xl bg-white/[0.05] border border-white/10 text-white placeholder-white/30 focus:outline-none focus:ring-2 focus:ring-primary-500/40 focus:border-primary-500/40 transition-all text-sm disabled:opacity-50"
            />
            <button
              type="submit"
              disabled={!input.trim() || loading}
              className="absolute right-2 w-10 h-10 rounded-xl bg-primary-600 hover:bg-primary-500 disabled:bg-white/5 disabled:text-white/20 text-white flex items-center justify-center transition-all"
            >
              <Send className="w-4 h-4" />
            </button>
          </div>
          <p className="text-center text-xs text-white/20 mt-2">
            Powered by AI • Data from Monday.com
          </p>
        </form>
      </div>
    </div>
  );
}

function MessageBubble({ message }) {
  const isUser = message.role === 'user';

  return (
    <div className={`flex items-start gap-3 ${isUser ? 'flex-row-reverse' : ''}`}>
      <div className={`w-8 h-8 rounded-lg flex items-center justify-center shrink-0 ${
        isUser
          ? 'bg-surface-700'
          : 'bg-gradient-to-br from-primary-500 to-accent-500'
      }`}>
        {isUser ? <User className="w-4 h-4 text-white" /> : <Bot className="w-4 h-4 text-white" />}
      </div>

      <div className={`max-w-[85%] space-y-2 ${isUser ? 'items-end' : ''}`}>
        <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
          isUser
            ? 'bg-primary-600 text-white rounded-tr-md'
            : message.isError
              ? 'bg-red-500/10 border border-red-500/20 text-red-300 rounded-tl-md'
              : 'bg-white/[0.05] border border-white/5 text-white/80 rounded-tl-md'
        }`}>
          <div className="prose prose-invert prose-sm max-w-none
            [&_ul]:list-disc [&_ul]:pl-4 [&_ul]:my-2
            [&_ol]:list-decimal [&_ol]:pl-4 [&_ol]:my-2
            [&_li]:my-1
            [&_p]:my-2 [&_p:first-child]:mt-0 [&_p:last-child]:mb-0
            [&_strong]:text-white [&_strong]:font-semibold
            [&_h3]:text-base [&_h3]:font-semibold [&_h3]:text-white [&_h3]:mt-3 [&_h3]:mb-1
            [&_h4]:text-sm [&_h4]:font-semibold [&_h4]:text-white/90 [&_h4]:mt-2 [&_h4]:mb-1">
            <ReactMarkdown>{message.content}</ReactMarkdown>
          </div>
        </div>

        {/* Data Quality Warnings */}
        {message.dataQuality && message.dataQuality.length > 0 && (
          <div className="px-4 py-3 rounded-xl bg-amber-500/5 border border-amber-500/10">
            <div className="flex items-center gap-2 mb-1.5">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-400" />
              <span className="text-xs font-medium text-amber-400">Data Quality</span>
            </div>
            <ul className="space-y-1">
              {message.dataQuality.map((warning, i) => (
                <li key={i} className="text-xs text-amber-300/70">• {warning}</li>
              ))}
            </ul>
          </div>
        )}
      </div>
    </div>
  );
}
