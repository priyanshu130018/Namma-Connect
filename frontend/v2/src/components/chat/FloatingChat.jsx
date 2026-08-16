import { useEffect, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { FiMessageCircle, FiX, FiMaximize2 } from "react-icons/fi";
import { Link, useLocation } from "@/lib/router-compat";
import TripPlannerChat from "@/components/chat/TripPlannerChat";
import { getStoredUser } from "@/services/userService";

/** Floating AI assistant launcher, bottom-right on every page. */
export default function FloatingChat() {
  const [open, setOpen] = useState(false);
  const location = useLocation();
  const onChatPage = location.pathname === "/AI-trip-planner";
  const user = getStoredUser();

  useEffect(() => {
    setOpen(false);
  }, [location.pathname]);

  if (onChatPage || !user) return null;

  return (
    <>
      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: 12 }}
            transition={{ duration: 0.18 }}
            className="fixed right-4 bottom-20 z-50 flex h-[min(70vh,560px)] w-[calc(100vw-2rem)] max-w-sm flex-col overflow-hidden rounded-2xl border border-border bg-card shadow-lg sm:right-6 sm:bottom-24"
          >
            <div className="flex items-center justify-between gap-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-foreground">
                  AI Trip Planner
                </p>
                <p className="text-xs text-muted-foreground">
                  Find farms, guides and creators
                </p>
              </div>
              <div className="flex shrink-0 items-center gap-1">
                <Link
                  to="/AI-trip-planner"
                  aria-label="Open full trip planner"
                  className="btn-ghost size-8 p-0"
                >
                  <FiMaximize2 size={15} />
                </Link>
                <button
                  onClick={() => setOpen(false)}
                  aria-label="Close chat"
                  className="btn-ghost size-8 p-0"
                >
                  <FiX size={16} />
                </button>
              </div>
            </div>
            <TripPlannerChat compact />
          </motion.div>
        )}
      </AnimatePresence>

      <button
        onClick={() => setOpen((v) => !v)}
        aria-label={open ? "Close AI trip planner" : "Open AI trip planner"}
        className="fixed right-4 bottom-4 z-50 grid size-12 place-items-center rounded-full bg-foreground text-background shadow-lg transition-transform hover:scale-105 sm:right-6 sm:bottom-6"
      >
        {open ? <FiX size={20} /> : <FiMessageCircle size={20} />}
      </button>
    </>
  );
}
