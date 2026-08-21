import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, FolderPlus, UserCheck } from 'lucide-react';
import { useStore } from '../../store';
import { toast } from 'sonner';

interface CreateProjectDialogProps {
  open: boolean;
  onClose: () => void;
  onCreated?: () => void;
}

export function CreateProjectDialog({ open, onClose, onCreated }: CreateProjectDialogProps) {
  const { createProject } = useStore();
  const [client, setClient] = useState('');
  const [name, setName] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateKey = (projName: string, clientName: string) => {
    const raw = (clientName || projName).trim();
    const words = raw.split(/\s+/).filter(Boolean);
    let k = '';
    if (words.length >= 2) {
      k = words.map(w => w[0]).join('').substring(0, 5);
    } else {
      k = raw.replace(/[^a-zA-Z0-9]/g, '').substring(0, 4);
    }
    if (k.length < 2) {
      k = (raw + 'PRJ').substring(0, 4);
    }
    return k.toUpperCase();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      toast.error('Project name is required');
      return;
    }
    if (!client.trim()) {
      toast.error('Client name is required');
      return;
    }

    const autoKey = generateKey(name, client);

    setIsSubmitting(true);
    try {
      await createProject({
        name: name.trim(),
        key: autoKey,
        description: `Client: ${client.trim()}`,
      });
      onClose();
      setClient('');
      setName('');
      if (onCreated) {
        onCreated();
      }
    } catch (err) {
      // Error handled by store toast
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!open) return null;

  return (
    <AnimatePresence>
      <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
        {/* Backdrop */}
        <motion.div
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onClick={onClose}
          className="fixed inset-0 bg-slate-950/70 backdrop-blur-none sm:backdrop-blur-sm md:backdrop-blur-md"
        />

        {/* Dialog Panel */}
        <motion.div
          initial={{ opacity: 0, scale: 0.95, y: 10 }}
          animate={{ opacity: 1, scale: 1, y: 0 }}
          exit={{ opacity: 0, scale: 0.95, y: 10 }}
          className="relative w-full max-w-lg rounded-2xl border border-slate-200 dark:border-slate-800 bg-white/95 dark:bg-slate-900/95 shadow-2xl backdrop-blur-xl px-10 py-6 overflow-hidden z-10"
        >
          {/* Header */}
          <div className="flex items-center justify-between pb-4 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-indigo-500/10 text-indigo-500 flex items-center justify-center">
                <FolderPlus className="w-5 h-5" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-slate-900 dark:text-white">Create new project</h2>
                <p className="text-xs text-slate-500 dark:text-slate-400">Specify client details to set up your workspace</p>
              </div>
            </div>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition-colors"
            >
              <X className="w-5 h-5" />
            </button>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="mt-5 space-y-4">
            {/* Client Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Client / Company Name
              </label>
              <div className="relative">
                <input
                  type="text"
                  placeholder="e.g. Acme Corporation"
                  value={client}
                  onChange={(e) => setClient(e.target.value)}
                  className="w-full h-10 px-3 pl-9 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                  required
                />
                <UserCheck className="absolute left-3 top-3 w-4 h-4 text-slate-400 pointer-events-none" />
              </div>
            </div>

            {/* Project Name */}
            <div>
              <label className="block text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider mb-1.5">
                Project Name
              </label>
              <input
                type="text"
                placeholder="e.g. E-Commerce Redesign"
                value={name}
                onChange={(e) => setName(e.target.value)}
                className="w-full h-10 px-3 rounded-xl border border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-800/60 text-slate-900 dark:text-slate-100 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500/40 placeholder:text-slate-400"
                required
              />
            </div>

            {/* Footer */}
            <div className="flex items-center justify-end gap-3 pt-4 border-t border-slate-100 dark:border-slate-800">
              <button
                type="button"
                onClick={onClose}
                className="px-4 py-2 rounded-xl border border-slate-200 dark:border-slate-800 text-slate-700 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 text-sm font-medium transition-colors"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={isSubmitting}
                className="px-5 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-sm font-medium transition-colors disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-indigo-500/25"
              >
                {isSubmitting ? 'Creating...' : 'Create Project'}
              </button>
            </div>
          </form>
        </motion.div>
      </div>
    </AnimatePresence>
  );
}
