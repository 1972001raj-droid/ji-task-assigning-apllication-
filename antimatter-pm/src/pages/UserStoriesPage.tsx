import { useState } from 'react';
import { BookOpen } from 'lucide-react';
import { useStore } from '../store';
import { IssueCard } from '../components/kanban/IssueCard';
import { IssueDrawer } from '../components/drawer/IssueDrawer';
import type { Issue } from '../types';

export function UserStoriesPage() {
  const { issues } = useStore();
  const [selectedIssue, setSelectedIssue] = useState<Issue | null>(null);

  const stories = issues.filter((i) => i.type === 'story');

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      <div>
        <h1 className="text-2xl font-bold text-slate-900 dark:text-white flex items-center gap-2">
          <BookOpen className="w-6 h-6 text-emerald-500" /> User Stories
        </h1>
        <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">
          {stories.length} user stories across all active sprints and backlog.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {stories.map((story) => (
          <IssueCard key={story.id} issue={story} onClick={() => setSelectedIssue(story)} />
        ))}
      </div>

      <IssueDrawer issue={selectedIssue} onClose={() => setSelectedIssue(null)} />
    </div>
  );
}
