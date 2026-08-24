import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import { FiLock, FiEye, FiEyeOff, FiArrowRight, FiCheckCircle, FiAlertCircle, FiShield, FiUser } from "react-icons/fi";
import Navbar from "@/components/layout/navbar";
import { authAPI } from "@/services/api";

const getUser = () => {
    try { return JSON.parse(localStorage.getItem("ng_user") || "null"); } catch { return null; }
};

export default function ChangePassword() {
  const navigate = useNavigate();
  const [showPw, setShowPw] = useState({ current: false, next: false, confirm: false });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState(false);
  
  const [form, setForm] = useState({
    identifier: "",
    new_password: "",
    confirm_password: ""
  });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (form.new_password !== form.confirm_password) {
      setError("New passwords do not match");
      return;
    }

    setLoading(true);
    setError("");

    try {
      await authAPI.changePassword({
        identifier: form.identifier,
        new_password: form.new_password
      });
      setSuccess(true);
      setTimeout(() => navigate("/login"), 2000);
    } catch (err) {
      setError(err.response?.data?.detail || "Failed to update password. Please check your email/mobile.");
    } finally {
      setLoading(false);
    }
  };

  const toggleShow = (key) => setShowPw(p => ({ ...p, [key]: !p[key] }));

  return (
    <div className="min-h-screen bg-slate-50">
      <Navbar minimal />
      
      <div className="pt-32 pb-20 flex flex-col items-center px-4">
        {/* Brand Header */}
        <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="text-center mb-10">
          <div className="w-16 h-16 bg-amber-500 rounded-2xl flex items-center justify-center mx-auto mb-4 shadow-lg shadow-amber-200">
            <FiShield className="text-white" size={32} />
          </div>
          <h1 className="text-3xl font-black text-slate-900">Security</h1>
          <p className="text-slate-500 text-sm mt-1 font-medium">Reset your account password</p>
        </motion.div>

        <motion.div 
          initial={{ opacity: 0, scale: 0.95 }} 
          animate={{ opacity: 1, scale: 1 }}
          className="w-full max-w-[400px] bg-white rounded-[32px] p-8 border border-slate-200 shadow-xl shadow-slate-200/50"
        >
          {success ? (
            <div className="text-center py-8">
              <div className="w-20 h-20 bg-green-100 text-green-600 rounded-full flex items-center justify-center mx-auto mb-6">
                <FiCheckCircle size={40} />
              </div>
              <h2 className="text-2xl font-black text-slate-900 mb-2">Password Updated!</h2>
              <p className="text-slate-500 text-sm">Your password has been changed successfully. Please login with your new password.</p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              {/* Identifier */}
              <div>
                <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">Email or Mobile Number</label>
                <div className="relative">
                  <FiUser className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                  <input
                    required
                    type="text"
                    value={form.identifier}
                    onChange={e => setForm(p => ({ ...p, identifier: e.target.value }))}
                    placeholder="example@mail.com"
                    className="input-field pl-9 text-sm"
                  />
                </div>
              </div>

              {/* New Password */}
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type={showPw.next ? "text" : "password"}
                      value={form.new_password}
                      onChange={e => setForm(p => ({ ...p, new_password: e.target.value }))}
                      placeholder="••••••••"
                      className="input-field pl-9 pr-10 text-sm"
                    />
                    <button type="button" onClick={() => toggleShow("next")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw.next ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>

                <div>
                  <label className="text-xs font-semibold text-slate-500 block mb-1.5 uppercase tracking-wider">Confirm New Password</label>
                  <div className="relative">
                    <FiLock className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-400" size={16} />
                    <input
                      required
                      type={showPw.confirm ? "text" : "password"}
                      value={form.confirm_password}
                      onChange={e => setForm(p => ({ ...p, confirm_password: e.target.value }))}
                      placeholder="••••••••"
                      className="input-field pl-9 pr-10 text-sm"
                    />
                    <button type="button" onClick={() => toggleShow("confirm")} className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400">
                      {showPw.confirm ? <FiEyeOff size={16} /> : <FiEye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              {error && (
                <motion.div initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }}
                  className="p-3 bg-red-50 border border-red-100 rounded-xl text-red-600 text-xs flex items-center gap-2"
                >
                  <FiAlertCircle className="flex-shrink-0" /> {error}
                </motion.div>
              )}

              <button
                type="submit"
                disabled={loading}
                className="w-full bg-slate-900 hover:bg-slate-800 disabled:bg-slate-400 text-white font-bold px-8 py-4 rounded-2xl transition-all flex items-center justify-center gap-3 text-base shadow-xl shadow-slate-200 mt-2"
              >
                {loading ? (
                  <span className="w-5 h-5 border-3 border-white/40 border-t-white rounded-full animate-spin" />
                ) : (
                  <>Update Password <FiArrowRight /></>
                )}
              </button>
              
              <button 
                type="button" 
                onClick={() => navigate(-1)}
                className="w-full text-slate-400 text-xs font-bold py-2 hover:text-slate-600 transition-colors"
                disabled={loading}
              >
                Cancel and Go Back
              </button>
            </form>
          )}
        </motion.div>
      </div>
    </div>
  );
}
