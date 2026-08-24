import { useState } from "react";
import { motion } from "framer-motion";
import { FiMail, FiPhone, FiMapPin, FiSend, FiInstagram, FiTwitter, FiFacebook, FiYoutube } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import Footer from "@/components/layout/footer";
import api from "@/services/api";

const topics = ["General Enquiry", "Farm Registration", "Creator Program", "Technical Issue", "Partnership", "Other"];

export default function Contact() {
  const [form, setForm] = useState({ name: "", email: "", topic: topics[0], message: "" });
  const [sent, setSent] = useState(false);

  const handleSubmit = (e) => {
    e.preventDefault();
    // send to backend
    api.post("/contact/", form)
      .then(() => {
        setSent(true);
        setTimeout(() => setSent(false), 5000);
        setForm({ name: "", email: "", topic: topics[0], message: "" });
      })
      .catch(() => {
        alert("Failed to send message. Please try again later.");
      });
  };

  return (
    <div className="bg-white min-h-screen">
      <Navbar />

      {/* Hero */}
      <section className="pt-32 pb-16 px-6 bg-slate-50 border-b border-slate-200">
        <div className="max-w-3xl mx-auto text-center">
          <span className="inline-block bg-green-100 text-green-700 text-sm font-semibold px-4 py-2 rounded-full mb-5">💬 Get In Touch</span>
          <h1 className="text-4xl md:text-5xl font-black text-slate-900 mb-3">We're Here to Help</h1>
          <p className="text-slate-500 text-lg">Questions, feedback, partnerships — we read every message.</p>
        </div>
      </section>

      <section className="section-pad bg-white">
        <div className="max-w-5xl mx-auto grid lg:grid-cols-5 gap-12">
          {/* Contact info */}
          <div className="lg:col-span-2 space-y-6">
            {[
              { icon: <FiMail size={20} />, label: "Email", value: "support@nammagig.in", color: "bg-blue-100 text-blue-600" },
              { icon: <FiPhone size={20} />, label: "Phone", value: "+91 98765 43210", color: "bg-green-100 text-green-600" },
              { icon: <FiMapPin size={20} />, label: "Address", value: "Bengaluru, Karnataka, India", color: "bg-amber-100 text-amber-600" },
            ].map(c => (
              <motion.div key={c.label} initial={{ opacity: 0, x: -20 }} whileInView={{ opacity: 1, x: 0 }} viewport={{ once: true }}
                className="flex items-start gap-4 p-5 bg-slate-50 rounded-2xl border border-slate-200"
              >
                <div className={`w-11 h-11 rounded-xl flex items-center justify-center flex-shrink-0 ${c.color}`}>{c.icon}</div>
                <div>
                  <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest">{c.label}</p>
                  <p className="text-slate-800 font-medium mt-0.5">{c.value}</p>
                </div>
              </motion.div>
            ))}

            {/* Socials */}
            <div className="pt-4">
              <p className="text-xs text-slate-400 font-semibold uppercase tracking-widest mb-4">Follow us</p>
              <div className="flex gap-3">
                {[FiInstagram, FiTwitter, FiFacebook, FiYoutube].map((Icon, i) => (
                  <a key={i} href="#" className="w-10 h-10 rounded-xl border border-slate-200 bg-white flex items-center justify-center text-slate-500 hover:text-green-600 hover:border-green-400 hover:shadow-md transition-all">
                    <Icon size={17} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Form */}
          <motion.div initial={{ opacity: 0, y: 20 }} whileInView={{ opacity: 1, y: 0 }} viewport={{ once: true }}
            className="lg:col-span-3 bg-slate-50 rounded-3xl p-8 border border-slate-200 shadow-sm"
          >
            {sent && (
              <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
                className="mb-6 p-4 bg-green-50 border border-green-200 rounded-xl text-green-700 text-sm font-medium"
              >
                ✅ Your message has been sent! We'll respond within 24 hours.
              </motion.div>
            )}
            <h2 className="text-2xl font-black text-slate-900 mb-6">Send a Message</h2>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="grid sm:grid-cols-2 gap-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Full Name *</label>
                  <input required value={form.name} onChange={e => setForm(p => ({ ...p, name: e.target.value }))} placeholder="Your name" className="input-field text-sm" />
                </div>
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5">Email *</label>
                  <input required type="email" value={form.email} onChange={e => setForm(p => ({ ...p, email: e.target.value }))} placeholder="you@example.com" className="input-field text-sm" />
                </div>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">Topic</label>
                <select value={form.topic} onChange={e => setForm(p => ({ ...p, topic: e.target.value }))} className="input-field text-sm">
                  {topics.map(t => <option key={t}>{t}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5">Message *</label>
                <textarea required rows={5} value={form.message} onChange={e => setForm(p => ({ ...p, message: e.target.value }))} placeholder="Tell us how we can help..." className="input-field resize-none text-sm" />
              </div>
              <button type="submit" className="btn-primary w-full flex items-center justify-center gap-2">
                <FiSend size={16} /> Send Message
              </button>
            </form>
          </motion.div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
