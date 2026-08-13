import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Mail, ArrowRight, Code2, TestTube2, Briefcase, ShieldCheck, Users } from 'lucide-react';
import { useStore } from '../store';
import { UserAvatar } from '../components/common/UserAvatar';
import { getUserRoleLabel } from '../lib/utils';

export function Team() {
  const { users, issues } = useStore();
  const navigate = useNavigate();
  const [roleFilter, setRoleFilter] = useState<'ALL' | 'DEVELOPER' | 'TESTER' | 'MANAGER'>('ALL');

  const filteredUsers = users.filter(user => {
    if (roleFilter === 'ALL') return true;
    const label = getUserRoleLabel(user).toUpperCase();
    if (roleFilter === 'DEVELOPER') return label.includes('DEVELOPER');
    if (roleFilter === 'TESTER') return label.includes('TESTER');
    if (roleFilter === 'MANAGER') return label.includes('MANAGER');
    return true;
  });

  const getRoleBadge = (user: any) => {
    const label = getUserRoleLabel(user);
    if (label === 'Admin') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/70 dark:text-amber-300 border border-amber-200 dark:border-amber-800">
          <ShieldCheck className="w-3 h-3" /> Admin
        </span>
      );
    }
    if (label === 'Manager') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 dark:bg-purple-950/70 dark:text-purple-300 border border-purple-200 dark:border-purple-800">
          <Briefcase className="w-3 h-3" /> Manager
        </span>
      );
    }
    if (label === 'Developer') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/70 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
          <Code2 className="w-3 h-3" /> Developer
        </span>
      );
    }
    if (label === 'Tester') {
      return (
        <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/70 dark:text-emerald-300 border border-emerald-200 dark:border-emerald-800">
          <TestTube2 className="w-3 h-3" /> Tester
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300 border border-slate-200 dark:border-slate-700">
        <Users className="w-3 h-3" /> Dev / Tester
      </span>
    );
  };

  return (
    <div className="space-y-6 max-w-7xl mx-auto">
      {/* Header & Filter Tabs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold text-slate-900 dark:text-white">Team Members</h1>
          <p className="text-sm text-slate-500 dark:text-slate-400 mt-0.5">{users.length} active teammates</p>
        </div>

        {/* Role Filters */}
        <div className="flex items-center gap-1 p-1 rounded-xl bg-slate-100 dark:bg-slate-800/80 border border-slate-200 dark:border-slate-700/60 self-start">
          <button
            onClick={() => setRoleFilter('ALL')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all ${
              roleFilter === 'ALL'
                ? 'bg-white dark:bg-slate-700 text-slate-900 dark:text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white'
            }`}
          >
            All ({users.length})
          </button>
          <button
            onClick={() => setRoleFilter('DEVELOPER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              roleFilter === 'DEVELOPER'
                ? 'bg-indigo-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-indigo-500'
            }`}
          >
            <Code2 className="w-3.5 h-3.5" /> Developers
          </button>
          <button
            onClick={() => setRoleFilter('TESTER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              roleFilter === 'TESTER'
                ? 'bg-emerald-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-emerald-500'
            }`}
          >
            <TestTube2 className="w-3.5 h-3.5" /> Testers
          </button>
          <button
            onClick={() => setRoleFilter('MANAGER')}
            className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all flex items-center gap-1 ${
              roleFilter === 'MANAGER'
                ? 'bg-purple-600 text-white shadow-sm'
                : 'text-slate-600 dark:text-slate-400 hover:text-purple-500'
            }`}
          >
            <Briefcase className="w-3.5 h-3.5" /> Managers
          </button>
        </div>
      </div>

      {/* Team grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredUsers.map((member) => {
          const memberIssues = issues.filter((i) => i.assigneeId === member.id);
          const openCount = memberIssues.filter((i) => i.status !== 'done').length;
          const completedCount = memberIssues.filter((i) => i.status === 'done').length;

          return (
            <div key={member.id} className="card p-6 space-y-4 hover:border-indigo-500/30 transition-all">
              <div className="flex items-start gap-4">
                <UserAvatar user={member} size="lg" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <h3 className="font-bold text-slate-900 dark:text-white text-base truncate">{member.name}</h3>
                  </div>
                  <div className="mt-1">
                    {getRoleBadge(member)}
                  </div>
                  <p className="text-xs text-slate-400 flex items-center gap-1 mt-2.5 truncate">
                    <Mail className="w-3.5 h-3.5 text-slate-400" /> {member.email}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 pt-2">
                <div
                  onClick={() => navigate('/backlog')}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Assigned Tasks</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{openCount}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>

                <div
                  onClick={() => navigate('/backlog')}
                  className="p-3 bg-slate-50 dark:bg-slate-800/60 rounded-xl cursor-pointer hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors flex items-center justify-between"
                >
                  <div>
                    <p className="text-xs text-slate-400 font-medium">Completed</p>
                    <p className="text-lg font-bold text-slate-900 dark:text-white mt-0.5">{completedCount}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-slate-400" />
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

