'use client';
import { useState, useRef, useEffect } from 'react';
import { MessageSquare, X, Send, Loader2, Bot, CornerDownLeft } from 'lucide-react';
import { assistantAPI } from '@/lib/api';

interface MessageItem {
  sender: 'user' | 'assistant';
  text: string;
  timestamp: Date;
}

const CHIPS = [
  'Trains to Delhi',
  'Check delay of Rajdhani',
  'Vegetarian food options',
  'What is the refund policy?'
];

export default function AIAssistant() {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<MessageItem[]>([
    {
      sender: 'assistant',
      text: 'Hello! I am your Railway Knowledge Assistant. I can check train routes, delay predictions, food recommendations, and ticketing guidelines. How can I help you?',
      timestamp: new Date()
    }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const chatEndRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (chatEndRef.current) {
      chatEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages, isOpen]);

  const handleSend = async (textToSend: string) => {
    if (!textToSend.trim() || loading) return;

    const userMessage: MessageItem = {
      sender: 'user',
      text: textToSend,
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setInput('');
    setLoading(true);

    try {
      const res = await assistantAPI.chat(textToSend);
      const assistantMessage: MessageItem = {
        sender: 'assistant',
        text: res.data.reply || 'Sorry, I could not process that request.',
        timestamp: new Date()
      };
      setMessages(prev => [...prev, assistantMessage]);
    } catch {
      setMessages(prev => [...prev, {
        sender: 'assistant',
        text: 'Connection error. Please try again later.',
        timestamp: new Date()
      }]);
    } finally {
      setLoading(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter') {
      handleSend(input);
    }
  };

  return (
    <div className="fixed bottom-6 right-6 z-50 flex flex-col items-end">
      
      {/* Expanded Chat Container */}
      {isOpen && (
        <div className="w-[360px] h-[480px] rounded-3xl overflow-hidden shadow-2xl flex flex-col border border-slate-800/70 mb-4 animate-fade-in-up"
          style={{
            background: 'rgba(8,13,36,0.96)',
            backdropFilter: 'blur(20px)',
          }}>
          
          {/* Header */}
          <div className="px-5 py-4 border-b border-slate-800/60 flex items-center justify-between"
            style={{ background: 'rgba(13,19,53,0.8)' }}>
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg flex items-center justify-center bg-indigo-500/10 border border-indigo-500/30">
                <Bot className="w-4.5 h-4.5 text-indigo-400" />
              </div>
              <div>
                <h3 className="text-white text-xs font-extrabold uppercase tracking-wider">Railway Assistant</h3>
                <span className="text-[9px] text-slate-500 font-semibold tracking-widest uppercase">Knowledge base active</span>
              </div>
            </div>
            <button onClick={() => setIsOpen(false)}
              className="p-1 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 transition-colors">
              <X className="w-4 h-4" />
            </button>
          </div>

          {/* Messages list */}
          <div className="flex-1 overflow-y-auto p-4 space-y-3">
            {messages.map((m, i) => {
              const isUser = m.sender === 'user';
              return (
                <div key={i} className={`flex ${isUser ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-xs ${
                    isUser 
                      ? 'bg-indigo-600 text-white font-medium rounded-tr-none' 
                      : 'bg-slate-900/60 text-slate-200 border border-slate-800/40 rounded-tl-none leading-relaxed font-normal'
                  }`}>
                    {/* Parse markdown very simply for standard bold headings or list dots */}
                    <div className="space-y-1.5 whitespace-pre-wrap">
                      {m.text.split('\n').map((line, idx) => {
                        if (line.startsWith('* ')) {
                          return <div key={idx} className="pl-3 relative before:content-['•'] before:absolute before:left-0 before:text-indigo-400">{line.substring(2)}</div>;
                        }
                        if (line.startsWith('|')) {
                          // Simple markdown table skip/format
                          return <div key={idx} className="font-mono text-[10px] text-slate-400">{line}</div>;
                        }
                        if (line.startsWith('###')) {
                          return <h4 key={idx} className="font-bold text-white uppercase text-[10px] tracking-wider mt-2 mb-1">{line.substring(3).trim()}</h4>;
                        }
                        return <p key={idx}>{line}</p>;
                      })}
                    </div>
                  </div>
                </div>
              );
            })}
            {loading && (
              <div className="flex justify-start">
                <div className="bg-slate-900/60 text-slate-400 border border-slate-800/40 rounded-2xl rounded-tl-none px-4 py-3 text-xs flex items-center gap-2">
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-indigo-400" />
                  <span>Assistant is thinking...</span>
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Suggestion Chips */}
          <div className="px-4 py-2 flex gap-1.5 overflow-x-auto border-t border-slate-800/30 whitespace-nowrap scrollbar-none">
            {CHIPS.map(chip => (
              <button key={chip} onClick={() => handleSend(chip)}
                className="px-2.5 py-1 rounded-lg bg-slate-900/50 hover:bg-slate-800 text-[10px] font-semibold text-slate-400 hover:text-slate-200 border border-slate-800/40 transition-colors">
                {chip}
              </button>
            ))}
          </div>

          {/* Input field */}
          <div className="p-3 border-t border-slate-800/60 flex items-center gap-2 bg-slate-900/20">
            <input
              id="assistant-input"
              className="input-field flex-1 text-xs py-2 px-3.5 rounded-xl border border-slate-800/60"
              placeholder="Ask anything about train travel..."
              value={input}
              onChange={e => setInput(e.target.value)}
              onKeyDown={handleKeyDown}
            />
            <button onClick={() => handleSend(input)}
              className="w-8 h-8 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white flex items-center justify-center transition-colors shrink-0">
              <Send className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      )}

      {/* Trigger Bubble Button */}
      <button onClick={() => setIsOpen(o => !o)}
        className="w-12 h-12 rounded-full flex items-center justify-center text-white shadow-2xl transition-all duration-300 transform hover:scale-105 active:scale-95 border border-indigo-500/20 hover:border-indigo-500/40"
        style={{
          background: isOpen 
            ? 'linear-gradient(135deg, #1e293b, #0f172a)' 
            : 'linear-gradient(135deg, #6366f1, #a855f7)',
          boxShadow: isOpen ? '0 10px 30px rgba(0,0,0,0.5)' : '0 10px 30px rgba(99,102,241,0.4)'
        }}>
        {isOpen ? <X className="w-5 h-5" /> : <MessageSquare className="w-5 h-5" />}
      </button>

    </div>
  );
}
