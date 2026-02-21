import { useState, useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { FiSend, FiZap, FiArrowRight, FiMapPin } from "react-icons/fi";
import { useNavigate } from "react-router-dom";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import { aiAPI } from "@/services/api";

const suggestions = [
  "Plan a 3-day coffee farm stay in Coorg",
  "Best organic farms near Bangalore",
  "Family-friendly agri-tour in Kerala",
  "Budget farm stay under ₹5,000",
];

export default function AiTripPlanner() {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    { role: "ai", text: "👋 Hello! I'm your NammaGig AI Trip Planner. Tell me where you want to go and I'll design the perfect farm experience for you!" }
  ]);
  const [input, setInput] = useState("");
  const [loading, setLoading] = useState(false);
  const bottomRef = useRef(null);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: "smooth" }); }, [messages]);

  const sendMessage = async (text) => {
    const msg = text || input.trim();
    if (!msg) return;
    setInput("");
    
    // Add user message
    setMessages(p => [...p, { role: "user", text: msg }]);
    setLoading(true);

    try {
      const res = await aiAPI.planTripChat(msg);
      // Backend returns { response: string, suggestions: [] }
      setMessages(p => [...p, { 
        role: "ai", 
        text: res.data.response,
        suggestions: res.data.suggestions 
      }]);
    } catch (err) {
      console.error("AI Planner error:", err);
      setMessages(p => [...p, { role: "ai", text: "Sorry, I'm having trouble connecting to my brain right now. Please try again later!" }]);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar minimal />
      <div className="flex-1 flex flex-col max-w-3xl mx-auto w-full px-4 pt-24 pb-4">
        {/* Header */}
        <motion.div initial={{ opacity: 0, y: -15 }} animate={{ opacity: 1, y: 0 }} className="mb-6 text-center">
          <div className="inline-flex items-center gap-2 bg-green-100 border border-green-300 rounded-full px-4 py-2 text-sm text-green-700 font-semibold mb-3">
            <FiZap className="text-green-600" /> AI-Powered
          </div>
          <h1 className="text-2xl font-black text-slate-900">Farm Trip Planner</h1>
          <p className="text-slate-500 text-sm mt-1">Describe your dream agri-trip and I'll plan it instantly</p>
        </motion.div>

        {/* Chat window */}
        <div className="flex-1 bg-white rounded-3xl border border-slate-200 shadow-sm flex flex-col overflow-hidden" style={{ minHeight: 0 }}>
          <div className="flex-1 overflow-y-auto p-6 space-y-4">
            {messages.map((m, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 12 }} animate={{ opacity: 1, y: 0 }}
                className={`flex gap-3 ${m.role === "user" ? "flex-row-reverse" : ""}`}
              >
                <div className={`w-8 h-8 rounded-full flex items-center justify-center text-xs font-bold flex-shrink-0 shadow-sm ${m.role === "ai" ? "bg-green-600 text-white" : "bg-slate-800 text-white"}`}>
                  {m.role === "ai" ? "NG" : "Me"}
                </div>
                <div className="flex flex-col gap-2 max-w-xs md:max-w-md">
                   <div className={`px-4 py-3 rounded-2xl text-sm leading-relaxed ${
                    m.role === "ai" ? "bg-slate-50 text-slate-800 border border-slate-200" : "bg-green-600 text-white"
                  }`}>
                    {m.text}
                  </div>
                  
                  {/* AI Suggestions rendering */}
                  {m.role === "ai" && m.suggestions && m.suggestions.length > 0 && (
                    <div className="flex flex-col gap-2 mt-1">
                      <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider px-1">Top Matches</p>
                      {m.suggestions.map(s => (
                        <motion.div 
                          key={s.id}
                          whileHover={{ x: 5 }}
                          onClick={() => navigate(`/farmercard/${s.id}`)}
                          className="bg-white border border-slate-200 p-3 rounded-xl flex items-center justify-between cursor-pointer hover:border-green-300 hover:shadow-sm transition-all"
                        >
                          <div className="flex items-center gap-2">
                             <div className="w-8 h-8 rounded-lg bg-green-50 flex items-center justify-center text-green-600">
                                <FiMapPin size={14} />
                             </div>
                             <div>
                               <p className="text-xs font-black text-slate-900">{s.name}</p>
                               <p className="text-[10px] text-slate-400">{s.location}</p>
                             </div>
                          </div>
                          <div className="flex items-center gap-2">
                             <span className="text-[10px] font-bold text-green-600 bg-green-50 px-2 py-0.5 rounded-full">{s.matchScore}% Match</span>
                             <FiArrowRight size={12} className="text-slate-300" />
                          </div>
                        </motion.div>
                      ))}
                    </div>
                  )}
                </div>
              </motion.div>
            ))}
            <AnimatePresence>
              {loading && (
                <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="flex gap-3 items-end">
                  <div className="w-8 h-8 rounded-full bg-green-600 flex items-center justify-center text-white text-xs font-bold">NG</div>
                  <div className="bg-slate-100 border border-slate-200 rounded-2xl px-4 py-3 flex gap-1.5">
                    {[0, 0.2, 0.4].map(d => <motion.span key={d} className="w-2 h-2 bg-slate-400 rounded-full" animate={{ y: [0, -6, 0] }} transition={{ duration: 0.8, repeat: Infinity, delay: d }} />)}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
            <div ref={bottomRef} />
          </div>

          {/* Prompt Suggestions */}
          <div className="px-4 pt-2 pb-3 flex gap-2 overflow-x-auto scrollbar-hide border-t border-slate-100">
            {suggestions.map(s => (
              <button key={s} onClick={() => sendMessage(s)}
                className="flex-shrink-0 text-xs bg-green-50 border border-green-200 text-green-700 hover:bg-green-100 px-3 py-1.5 rounded-full font-medium transition-colors"
              >{s}</button>
            ))}
          </div>

          {/* Input */}
          <div className="p-4 border-t border-slate-100">
            <form onSubmit={e => { e.preventDefault(); sendMessage(); }} className="flex gap-3">
              <input value={input} onChange={e => setInput(e.target.value)} placeholder="Type your dream trip..."
                className="flex-1 bg-slate-100 border border-slate-200 text-slate-900 placeholder-slate-400 px-4 py-3 rounded-xl outline-none focus:ring-2 focus:ring-green-500/30 focus:border-green-400 text-sm transition-all" />
              <button type="submit" disabled={!input.trim() || loading}
                className="btn-primary px-4 py-3 disabled:opacity-50 flex items-center justify-center"><FiSend size={16} /></button>
            </form>
          </div>
        </div>
      </div>
      <Footer />
    </div>
  );
}
