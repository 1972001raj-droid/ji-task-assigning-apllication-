import { motion } from 'framer-motion';
import { AlertTriangle } from 'lucide-react';

interface Props {
  open: boolean;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  onCancel: () => void;
  danger?: boolean;
}

export function ConfirmDialog({ open, title, message, confirmLabel = 'Confirm', onConfirm, onCancel, danger }: Props) {
  if (!open) return null;
  return (
    <div className="fixed inset-0 z-[60] flex items-center justify-center p-4">
      <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="absolute inset-0 bg-slate-900/50 backdrop-blur-none sm:backdrop-blur-sm md:backdrop-blur-md" onClick={onCancel} />
      <motion.div
        initial={{ opacity: 0, scale: 0.95 }}
        animate={{ opacity: 1, scale: 1 }}
        className="relative card p-6 w-full max-w-sm z-10"
      >
        <div className="flex items-start gap-3 mb-4">
          {danger && <div className="w-10 h-10 rounded-xl bg-rose-100 dark:bg-rose-950/50 flex items-center justify-center shrink-0"><AlertTriangle className="w-5 h-5 text-rose-600" /></div>}
          <div>
            <h3 className="font-semibold text-slate-900 dark:text-white">{title}</h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 mt-1">{message}</p>
          </div>
        </div>
        <div className="flex gap-3 justify-end">
          <button onClick={onCancel} className="btn-secondary">Cancel</button>
          <button onClick={onConfirm} className={danger ? 'btn-danger' : 'btn-primary'}>{confirmLabel}</button>
        </div>
      </motion.div>
    </div>
  );
}
