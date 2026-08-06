import React, { useState, useEffect } from 'react';
import { useProject } from '../../context/ProjectContext';
import { useAuth } from '../../context/AuthContext';
import { projectApi } from '../../api/projectApi';
import { auditApi } from '../../api/auditApi';
import { extractErrorMessage } from '../../api/client';
import { Organization, ProjectEstimationSettings, EstimationScheme } from '../../types/project';
import { AuditLogResponse } from '../../types/audit';
import { ShieldCheck, Plus, Building, FolderPlus, Settings, ScrollText, AlertCircle, CheckCircle2, Info } from 'lucide-react';

export const AdminView: React.FC = () => {
  const { user } = useAuth();
  const { activeProject, refreshProjects, refreshEstimationSettings } = useProject();

  const [orgs, setOrgs] = useState<Organization[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogResponse[]>([]);

  // Create Org Form
  const [orgName, setOrgName] = useState('');
  const [orgSlug, setOrgSlug] = useState('');

  // Create Project Form
  const [selectedOrgId, setSelectedOrgId] = useState('');
  const [projName, setProjName] = useState('');
  const [projKey, setProjKey] = useState('');
  const [projDesc, setProjDesc] = useState('');

  // Estimation Settings Form
  const [estimationSettings, setEstimationSettings] = useState<ProjectEstimationSettings | null>(null);
  const [scheme, setScheme] = useState<EstimationScheme>('FIBONACCI');
  const [allowedValuesStr, setAllowedValuesStr] = useState('1, 2, 3, 5, 8, 13, 21');

  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const loadData = async () => {
    setLoading(true);
    setError(null);
    try {
      const orgList = await projectApi.listOrganizations();
      setOrgs(orgList);
      if (orgList.length > 0 && !selectedOrgId) setSelectedOrgId(orgList[0].id);

      if (user?.is_superuser) {
        try {
          const logs = await auditApi.listAuditLogs(undefined, activeProject?.id);
          setAuditLogs(logs);
        } catch {
          // non-admin guard
        }
      }

      if (activeProject) {
        const est = await projectApi.getEstimationSettings(activeProject.id);
        setEstimationSettings(est);
        setScheme(est.scheme);
        setAllowedValuesStr(est.allowed_values?.join(', ') || '');
      }
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [activeProject?.id, user?.id]);

  const handleCreateOrg = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!orgName.trim() || !orgSlug.trim()) return;
    setError(null);
    setMessage(null);
    try {
      const newOrg = await projectApi.createOrganization({
        name: orgName.trim(),
        slug: orgSlug.trim().toLowerCase(),
      });
      setOrgs((prev) => [...prev, newOrg]);
      setSelectedOrgId(newOrg.id);
      setOrgName('');
      setOrgSlug('');
      setMessage(`Organization "${newOrg.name}" created successfully!`);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedOrgId || !projName.trim() || !projKey.trim()) return;
    setError(null);
    setMessage(null);
    try {
      const p = await projectApi.createProject({
        org_id: selectedOrgId,
        name: projName.trim(),
        key: projKey.trim().toUpperCase(),
        description: projDesc.trim() || undefined,
      });
      await refreshProjects();
      setProjName('');
      setProjKey('');
      setProjDesc('');
      setMessage(`Project "${p.name}" (${p.key}) created successfully!`);
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  const handleUpdateEstimation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeProject) return;
    setError(null);
    setMessage(null);

    const values = allowedValuesStr
      .split(',')
      .map((v) => v.trim())
      .filter(Boolean);

    try {
      const updated = await projectApi.updateEstimationSettings(activeProject.id, {
        scheme,
        allowed_values: values,
      });
      setEstimationSettings(updated);
      await refreshEstimationSettings();
      setMessage('Project estimation settings updated successfully!');
    } catch (err: unknown) {
      setError(extractErrorMessage(err));
    }
  };

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-2xl font-bold text-[var(--text-primary)] flex items-center gap-2">
          <ShieldCheck size={24} className="text-[var(--accent-primary)]" />
          Admin & Governance Center
        </h1>
        <p className="text-xs text-[var(--text-muted)]">
          Manage Organizations, Projects, Estimation Settings, and System Audit Logs
        </p>
      </div>

      {message && (
        <div className="p-3.5 rounded-xl bg-green-500/10 border border-green-500/20 text-green-400 text-xs flex items-center gap-2.5">
          <CheckCircle2 size={16} className="flex-shrink-0" />
          <span>{message}</span>
        </div>
      )}

      {error && (
        <div className="p-3.5 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs flex items-center gap-2.5">
          <AlertCircle size={16} className="flex-shrink-0" />
          <span>{error}</span>
        </div>
      )}

      {/* Grid: Create Org & Create Project */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Create Organization */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <Building size={20} className="text-[var(--accent-orange)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Create Organization</h2>
          </div>

          <form onSubmit={handleCreateOrg} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                Organization Name
              </label>
              <input
                type="text"
                required
                placeholder="Acme Corp, Tech Global..."
                value={orgName}
                onChange={(e) => setOrgName(e.target.value)}
                className="input-field"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                Slug (URL Identifier)
              </label>
              <input
                type="text"
                required
                placeholder="acme-corp"
                value={orgSlug}
                onChange={(e) => setOrgSlug(e.target.value)}
                className="input-field"
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5">
              <Plus size={16} />
              <span>Create Organization</span>
            </button>
          </form>
        </div>

        {/* Create Project */}
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <FolderPlus size={20} className="text-[var(--accent-blue)]" />
            <h2 className="text-base font-bold text-[var(--text-primary)]">Create Project Workspace</h2>
          </div>

          <form onSubmit={handleCreateProject} className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                Target Organization
              </label>
              <select
                value={selectedOrgId}
                onChange={(e) => setSelectedOrgId(e.target.value)}
                className="input-field"
                required
              >
                <option value="" disabled>
                  Select Organization...
                </option>
                {orgs.map((o) => (
                  <option key={o.id} value={o.id}>
                    {o.name} ({o.slug})
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                  Project Name
                </label>
                <input
                  type="text"
                  required
                  placeholder="Project Alpha..."
                  value={projName}
                  onChange={(e) => setProjName(e.target.value)}
                  className="input-field"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                  Project Key (Max 10)
                </label>
                <input
                  type="text"
                  required
                  maxLength={10}
                  placeholder="ALPHA"
                  value={projKey}
                  onChange={(e) => setProjKey(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <div>
              <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                Description
              </label>
              <textarea
                rows={2}
                placeholder="Workspace description..."
                value={projDesc}
                onChange={(e) => setProjDesc(e.target.value)}
                className="input-field"
              />
            </div>

            <button type="submit" className="btn-primary w-full py-2.5">
              <Plus size={16} />
              <span>Create Project</span>
            </button>
          </form>
        </div>
      </div>

      {/* Project Estimation Settings Form */}
      {activeProject && (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center gap-2 border-b border-[var(--border-color)] pb-3">
            <Settings size={20} className="text-cyan-400" />
            <div>
              <h2 className="text-base font-bold text-[var(--text-primary)]">
                Estimation Scheme: {activeProject.name} ({activeProject.key})
              </h2>
              <p className="text-xs text-[var(--text-muted)]">
                Configure estimation allowed values used for story sizing across issue forms.
              </p>
            </div>
          </div>

          <form onSubmit={handleUpdateEstimation} className="space-y-4 max-w-xl">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                  Estimation Scheme
                </label>
                <select
                  value={scheme}
                  onChange={(e) => setScheme(e.target.value as EstimationScheme)}
                  className="input-field"
                >
                  <option value="FIBONACCI">Fibonacci (1, 2, 3, 5, 8, 13, 21)</option>
                  <option value="TSHIRT">T-Shirt (XS, S, M, L, XL)</option>
                  <option value="HOURS">Hours / Custom</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-[var(--text-muted)] uppercase mb-1.5">
                  Allowed Values (Comma-Separated)
                </label>
                <input
                  type="text"
                  required
                  placeholder="1, 2, 3, 5, 8, 13"
                  value={allowedValuesStr}
                  onChange={(e) => setAllowedValuesStr(e.target.value)}
                  className="input-field"
                />
              </div>
            </div>

            <button type="submit" className="btn-primary py-2 px-4 text-xs">
              Save Estimation Settings
            </button>
          </form>
        </div>
      )}

      {/* Admin Audit Logs Table */}
      {user?.is_superuser ? (
        <div className="glass-panel p-6 space-y-4">
          <div className="flex items-center justify-between border-b border-[var(--border-color)] pb-3">
            <div className="flex items-center gap-2">
              <ScrollText size={20} className="text-green-400" />
              <h2 className="text-base font-bold text-[var(--text-primary)]">System Audit Logs ({auditLogs.length})</h2>
            </div>
          </div>

          {auditLogs.length === 0 ? (
            <div className="py-8 text-center text-xs text-[var(--text-muted)] italic">
              No audit logs recorded yet.
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="border-b border-[var(--border-color)] text-[var(--text-muted)] uppercase font-semibold">
                    <th className="py-2.5 px-3">Timestamp</th>
                    <th className="py-2.5 px-3">Action</th>
                    <th className="py-2.5 px-3">Resource</th>
                    <th className="py-2.5 px-3">Resource ID</th>
                    <th className="py-2.5 px-3">IP Address</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[var(--border-color)]">
                  {auditLogs.map((log) => (
                    <tr key={log.id} className="hover:bg-[var(--card-bg)] transition-colors">
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">{new Date(log.created_at).toLocaleString()}</td>
                      <td className="py-2.5 px-3 font-semibold text-[var(--accent-primary)]">{log.action}</td>
                      <td className="py-2.5 px-3 text-[var(--text-secondary)]">{log.resource_type}</td>
                      <td className="py-2.5 px-3 font-mono text-[var(--text-muted)]">{log.resource_id || '-'}</td>
                      <td className="py-2.5 px-3 text-[var(--text-muted)]">{log.ip_address || '-'}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>
      ) : (
        <div className="p-4 rounded-xl bg-[var(--accent-blue-light)] border border-blue-500/20 text-xs text-[var(--accent-blue)] flex items-start gap-2.5">
          <Info size={16} className="flex-shrink-0 mt-0.5" />
          <span>
            System Audit Log viewing is restricted to superuser administrators.
          </span>
        </div>
      )}
    </div>
  );
};
