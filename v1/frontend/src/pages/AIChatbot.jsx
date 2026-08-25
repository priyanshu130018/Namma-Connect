import React, { useState, useEffect, useRef } from 'react';
import { motion } from 'framer-motion';
import { 
  FiSend, FiCpu, FiArrowRight, FiMapPin, FiStar 
} from 'react-icons/fi';
import { useNavigate } from 'react-router-dom';
import { aiAPI } from '@/services/api';
import { slugify } from '@/components/ui/card';
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";

const AIChatbot = () => {
  const [messages, setMessages] = useState([
    { role: 'ai', text: 'Hello! I am your AI Trip Planner. I can help you find farms or professional creators for your journey. What are you looking for?' }
  ]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [sessionState, setSessionState] = useState(null);
  const chatEndRef = useRef(null);
  const navigate = useNavigate();

  const scrollToBottom = () => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSend = async (e) => {
    e?.preventDefault();
    if (!input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', text: userMsg }]);
    setLoading(true);

    try {
      const res = await aiAPI.chat(userMsg, sessionState);
      const data = res.data;
      
      setMessages(prev => [...prev, { 
        role: 'ai', 
        text: data.response,
        suggestions: data.suggestions 
      }]);
      setSessionState(data.state);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'ai', text: 'Sorry, I encountered an error. Please try again later.' }]);
    } finally {
      setLoading(false);
    }
  };

  const handleSuggestClick = (s) => {
    const name = s.name || "listing";
    if (s.type === 'farm') {
      navigate(`/farmercard/${slugify(name, s.id)}`);
    } else {
      navigate(`/creatorcard/${slugify(name, s.id)}`);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      
      <main className="flex-1 flex flex-col pt-24 pb-12 px-6">
        <div className="max-w-4xl mx-auto w-full flex-1 flex flex-col bg-white border border-slate-200 rounded-[32px] shadow-2xl overflow-hidden shadow-slate-200/50">
          {/* Header */}
          <div className="p-8 bg-slate-900 text-white flex items-center justify-between border-b border-slate-800">
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-2xl bg-indigo-500 flex items-center justify-center shadow-lg shadow-indigo-500/30">
                <FiCpu size={24} />
              </div>
              <div>
                <h3 className="font-black text-lg tracking-tight text-white m-0">AI Trip Planner</h3>
                <div className="flex items-center gap-1.5 mt-0.5">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
                  <span className="text-[11px] font-bold uppercase tracking-widest text-slate-400">Intelligent Assistant Online</span>
                </div>
              </div>
            </div>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-8 space-y-8 scrollbar-hide bg-slate-50/30">
            {messages.map((m, i) => (
              <div key={i} className={`flex flex-col ${m.role === 'user' ? 'items-end' : 'items-start'}`}>
                <div className={`p-5 rounded-3xl max-w-[80%] text-[15px] font-medium leading-relaxed ${
                  m.role === 'user' 
                    ? 'bg-indigo-600 text-white rounded-tr-none shadow-lg shadow-indigo-200' 
                    : 'bg-white border border-slate-100 text-slate-700 rounded-tl-none shadow-sm'
                }`}>
                  {m.text}
                </div>
                
                {m.suggestions?.length > 0 && (
                  <div className="mt-6 w-full grid grid-cols-1 md:grid-cols-3 gap-4">
                    {m.suggestions.map((s, idx) => (
                      <motion.div
                        key={idx}
                        initial={{ opacity: 0, y: 10 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: idx * 0.1 }}
                        onClick={() => handleSuggestClick(s)}
                        className="bg-white border border-slate-100 rounded-2xl p-5 cursor-pointer hover:border-indigo-200 hover:shadow-xl transition-all group relative overflow-hidden"
                      >
                        <div className="flex items-center justify-between mb-3">
                           <div className="flex items-center gap-2">
                              <span className="text-2xl">{s.emoji}</span>
                              <span className="text-[10px] font-black uppercase tracking-widest text-indigo-500">{s.type}</span>
                           </div>
                           <div className="flex items-center gap-1 bg-amber-50 text-amber-600 px-2 py-0.5 rounded-full text-[9px] font-bold">
                             <FiStar size={10} className="fill-amber-600" /> {s.score}% Match
                           </div>
                        </div>
                        <h4 className="font-black text-slate-900 text-base group-hover:text-indigo-600 transition-colors uppercase tracking-tight line-clamp-1">{s.name}</h4>
                        <div className="flex items-center gap-1.5 mt-1.5 text-[11px] text-slate-400 font-bold uppercase">
                          <FiMapPin size={10} /> {s.location}
                        </div>
                        <div className="mt-4 pt-4 border-t border-slate-50 flex items-center justify-between">
                          <span className="font-black text-emerald-600 text-sm">{s.price}</span>
                          <div className="flex items-center gap-1 text-[10px] font-black text-slate-400 uppercase tracking-widest group-hover:text-indigo-600">
                            View Details <FiArrowRight size={10} />
                          </div>
                        </div>
                      </motion.div>
                    ))}
                    <button 
                       onClick={() => { setInput('Show more'); handleSend(); }}
                       className="md:col-span-3 py-4 rounded-2xl border-2 border-dashed border-slate-200 text-[11px] font-black uppercase tracking-widest text-slate-400 hover:bg-white hover:border-indigo-300 hover:text-indigo-500 transition-all bg-slate-50/50 mt-2"
                    >
                       Discover More Incredible Options
                    </button>
                  </div>
                )}
              </div>
            ))}
            {loading && (
              <div className="flex items-start">
                <div className="bg-white p-5 rounded-3xl rounded-tl-none border border-slate-100 flex gap-1.5 shadow-sm">
                  <span className="w-2 h-2 rounded-full bg-slate-200 animate-bounce" />
                  <span className="w-2 h-2 rounded-full bg-slate-300 animate-bounce [animation-delay:0.2s]" />
                  <span className="w-2 h-2 rounded-full bg-slate-400 animate-bounce [animation-delay:0.4s]" />
                </div>
              </div>
            )}
            <div ref={chatEndRef} />
          </div>

          {/* Input */}
          <div className="p-8 bg-white border-t border-slate-100">
            <form onSubmit={handleSend} className="max-w-3xl mx-auto flex gap-4">
              <input
                type="text"
                value={input}
                onChange={(e) => setInput(e.target.value)}
                placeholder="Ex: 'I want a peaceful coffee farm in Coorg' or 'Photographer in Kerala'..."
                className="flex-1 bg-slate-50 border border-slate-200 rounded-2xl px-6 py-4 text-base font-medium focus:outline-none focus:ring-4 focus:ring-indigo-500/10 focus:border-indigo-500 focus:bg-white transition-all shadow-inner"
              />
              <button 
                type="submit" 
                disabled={!input.trim() || loading} 
                className="w-14 h-14 rounded-2xl bg-slate-900 text-white flex items-center justify-center hover:bg-indigo-600 hover:scale-105 active:scale-95 transition-all disabled:opacity-50 disabled:scale-100 shadow-xl shadow-slate-900/10"
              >
                <FiSend size={24} />
              </button>
            </form>
            <p className="text-center text-[10px] text-slate-400 font-bold uppercase tracking-[0.2em] mt-6">
              Powered by NammaGig Smart Logic • 100% Secure Agri-Tourism
            </p>
          </div>
        </div>
      </main>

      <Footer />
    </div>
  );
};

export default AIChatbot;
