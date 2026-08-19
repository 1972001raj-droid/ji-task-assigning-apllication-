import { useState } from 'react';
import { Map, Layers } from 'lucide-react';
import { useStore } from '../store';
import { statusLabel, isUuidOrHash } from '../lib/utils';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import type { Issue } from '../types';

export function RoadmapPage() {
  const { epics, issues, users } = useStore();
  const [selectedEpic, setSelectedEpic] = useState<Issue | null>(null);

  const handleOpenEpic = (epicId: string) => {
    const epicIssue = issues.find(i => i.id === epicId) || {
      id: epicId,
      key: epics.find(e => e.id === epicId)?.key || 'EPIC',
      type: 'epic' as const,
      title: epics.find(e => e.id === epicId)?.title || 'Epic',
      description: epics.find(e => e.id === epicId)?.description || '',
      status: 'in-progress' as const,
      priority: 'high' as const,
      reporterId: users[0]?.id || '',
      labels: [],
      commentCount: 0,
      order: 0,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
      version: 1,
    };
    setSelectedEpic(epicIssue);
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <Map className="w-6 h-6 text-violet-500" /> Roadmap
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">High-level strategic roadmap across quarter goals.</p>
      </div>

      <div className="card p-6 space-y-6">
        <div className="hidden md:grid grid-cols-4 gap-4 pb-3 border-b border-slate-100 dark:border-slate-800 text-xs font-bold text-slate-400 uppercase tracking-wider">
          <div>Epic</div>
          <div>Q3 2026 (Jul-Sep)</div>
          <div>Q4 2026 (Oct-Dec)</div>
          <div>Q1 2027 (Jan-Mar)</div>
        </div>

        <div className="space-y-4">
          {epics.map((epic) => {
            const epicStories = issues.filter((i) => i.epicId === epic.id);
            const doneCount = epicStories.filter((i) => i.status === 'done').length;
            const progress = epicStories.length ? Math.round((doneCount / epicStories.length) * 100) : 0;

            return (
              <div
                key={epic.id}
                onClick={() => handleOpenEpic(epic.id)}
                className="flex flex-col md:grid md:grid-cols-4 gap-3 md:gap-4 items-stretch md:items-center cursor-pointer hover:bg-slate-50/50 dark:hover:bg-slate-800/40 p-2 rounded-xl transition-colors"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-7 h-7 rounded-lg flex items-center justify-center shrink-0" style={{ backgroundColor: epic.color + '1a', color: epic.color }}>
                    <Layers className="w-4 h-4" />
                  </div>
                  <div className="min-w-0">
                    <h3 className="font-semibold text-xs text-slate-800 dark:text-slate-200 truncate">{epic.title}</h3>
                    {!isUuidOrHash(epic.key) && (
                      <span className="text-[10px] text-slate-400 font-mono">{epic.key}</span>
                    )}
                  </div>
                </div>

                <div className="md:col-span-3">
                  <div
                    className="h-9 rounded-xl px-3 flex items-center justify-between text-xs font-semibold text-white shadow-sm transition-all hover:scale-[1.01]"
                    style={{ backgroundColor: epic.color, width: `${Math.max(30, progress + 20)}%` }}
                  >
                    <span>{statusLabel(epic.status as any)}</span>
                    <span>{progress}%</span>
                  </div>
                </div>
              </div>
            );
          })}
          {epics.length === 0 && (
            <p className="text-xs text-slate-400 text-center py-6">No epics created yet in this project.</p>
          )}
        </div>
      </div>

      <IssueDrawer issue={selectedEpic} onClose={() => setSelectedEpic(null)} />
    </div>
  );
}
