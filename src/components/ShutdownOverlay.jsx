import React from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Loader2 } from "lucide-react";

export default function ShutdownOverlay({ isVisible }) {
  return (
    <AnimatePresence>
      {isVisible && (
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          className="fixed inset-0 z-[9999] flex flex-col items-center justify-center bg-[#0f0f14]/95 backdrop-blur-md text-white"
        >
          <motion.div
            initial={{ scale: 0.9, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.1 }}
            className="flex flex-col items-center gap-6"
          >
            <div className="relative">
              <div className="absolute inset-0 blur-2xl bg-primary/20 rounded-full" />
              <Loader2 className="w-16 h-16 animate-spin text-primary relative" />
            </div>

            <div className="space-y-2 text-center">
              <h2 className="text-2xl font-bold tracking-tight">
                Shutting Down
              </h2>
              <p className="text-muted-foreground max-w-[280px]">
                Please wait while we gracefully stop your projects and save
                their data...
              </p>
            </div>

            <div className="mt-8 flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  animate={{
                    opacity: [0.3, 1, 0.3],
                    scale: [1, 1.2, 1],
                  }}
                  transition={{
                    duration: 1,
                    repeat: Infinity,
                    delay: i * 0.2,
                  }}
                  className="w-2 h-2 rounded-full bg-primary"
                />
              ))}
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
