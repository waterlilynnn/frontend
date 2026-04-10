import { useState, useEffect, useRef } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { useAuth } from '../../hooks/useAuth';
import API from '../../config/api';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit2, Save, X,
  AlertCircle, Upload, Eye,
  Archive, ArchiveRestore,
  UserPlus, ShieldCheck, Mail,
  CheckCircle, Info, Shield, UserCog,
} from 'lucide-react';

const HAULER_TYPES = ['City', 'Barangay', 'Accredited', 'Hazardous', 'Exempted', 'No Contract'];
const SCOPE_ALL   = '__ALL__';
const uid = () => `fmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const ScopeBadge = ({ haulerType }) =>
  haulerType
    ? <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-600">{haulerType}</span>
    : <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 uppercase tracking-wide">Global</span>;

const BinFormatCard = ({ fmt, index, onToggle, onSegmentsChange, onLabelChange }) => {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft]     = useState(fmt.label);
  const [segInput, setSegInput]         = useState(fmt.segments.join('-'));
  const [segError, setSegError]         = useState('');

  const handleSegmentSave = () => {
    const parts = segInput.split('-').map(Number);
    if (parts.some((n) => isNaN(n) || n <= 0)) { setSegError('Each segment must be a positive number'); return; }
    if (parts.length < 2)                       { setSegError('Need at least 2 segments'); return; }
    setSegError('');
    onSegmentsChange(index, parts);
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${fmt.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          {editingLabel ? (
            <div className="flex gap-2 mb-2">
              <input value={labelDraft} onChange={(e) => setLabelDraft(e.target.value)}
                className="flex-1 px-2 py-1 border border-forest-400 rounded text-sm focus:outline-none" autoFocus />
              <button onClick={() => { onLabelChange(index, labelDraft); setEditingLabel(false); }}
                className="px-2 py-1 bg-emerald-700 text-white rounded text-xs hover:bg-emerald-800"><Save className="h-3.5 w-3.5" /></button>
              <button onClick={() => setEditingLabel(false)}
                className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"><X className="h-3.5 w-3.5" /></button>
            </div>
          ) : (
            <div className="flex items-center gap-2 mb-2">
              <span className="text-sm font-medium text-gray-800 truncate">{fmt.label}</span>
              <button onClick={() => { setLabelDraft(fmt.label); setEditingLabel(true); }} className="text-gray-400 hover:text-emerald-700 shrink-0">
                <Edit2 className="h-3.5 w-3.5" />
              </button>
            </div>
          )}
          <div className="flex flex-wrap items-center gap-2 mb-2">
            <span className="text-xs text-gray-500">Segments:</span>
            <input value={segInput} onChange={(e) => setSegInput(e.target.value)} onBlur={handleSegmentSave}
              placeholder="e.g. 7-4-7"
              className="px-2 py-0.5 border border-gray-300 rounded text-xs font-mono w-28 focus:outline-none focus:border-forest-400" />
            {segError && <span className="text-xs text-red-500">{segError}</span>}
          </div>
          <div className="text-xs text-gray-500">Example: <code className="font-mono bg-gray-100 px-1 rounded">{fmt.segments.map(n => '0'.repeat(n)).join('-')}</code></div>
        </div>
        <button onClick={() => onToggle(index)}
          className={`shrink-0 px-3 py-1 text-xs border rounded transition-colors ${fmt.is_active ? 'border-emerald-800 text-emerald-800 hover:bg-forest-50' : 'border-red-700 text-red-700 hover:bg-red-50'}`}>
          {fmt.is_active ? 'Active' : 'Inactive'}
        </button>
      </div>
    </div>
  );
};

const RequirementsTab = () => {
  const qc = useQueryClient();
  const [activeScope, setActiveScope] = useState(SCOPE_ALL);
  const [showAdd, setShowAdd]         = useState(false);
  const [newLabel, setNewLabel]       = useState('');
  const [newDesc, setNewDesc]         = useState('');
  const [newHauler, setNewHauler]     = useState('');
  const [editingId, setEditingId]     = useState(null);
  const [editDraft, setEditDraft]     = useState({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['reqTemplates'],
    queryFn: async () => (await API.get('/admin/settings/requirements?include_inactive=true')).data,
  });
  const createMutation = useMutation({
    mutationFn: (body) => API.post('/admin/settings/requirements', body),
    onSuccess: () => { toast.success('Requirement added'); qc.invalidateQueries({ queryKey: ['reqTemplates'] }); setShowAdd(false); setNewLabel(''); setNewDesc(''); setNewHauler(''); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to add'),
  });
  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => API.put(`/admin/settings/requirements/${id}`, body),
    onSuccess: () => { toast.success('Updated'); qc.invalidateQueries({ queryKey: ['reqTemplates'] }); setEditingId(null); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update'),
  });

  const visible      = templates.filter((t) => {
    if (activeScope === SCOPE_ALL) return true;
    if (activeScope === 'global')  return !t.hauler_type;
    return t.hauler_type === activeScope;
  });
  const activeList   = visible.filter(t => t.is_active);
  const inactiveList = visible.filter(t => !t.is_active);

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">Define required documents per hauler type.</p>
        <button onClick={() => setShowAdd(true)} disabled={createMutation.isLoading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-800">
          <Plus className="h-4 w-4" />Add Requirement
        </button>
      </div>
      <div className="flex flex-wrap gap-1.5">
        {[SCOPE_ALL, 'global', ...HAULER_TYPES].map((scope) => {
          const label = scope === SCOPE_ALL ? 'All' : scope === 'global' ? 'Global' : scope;
          const count = templates.filter(t => {
            if (scope === SCOPE_ALL) return t.is_active;
            if (scope === 'global') return !t.hauler_type && t.is_active;
            return t.hauler_type === scope && t.is_active;
          }).length;
          return (
            <button key={scope} onClick={() => setActiveScope(scope)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${activeScope === scope ? 'bg-emerald-700 text-white' : 'bg-gray-100 text-gray-600 hover:bg-gray-200'}`}>
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${activeScope === scope ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'}`}>{count}</span>
            </button>
          );
        })}
      </div>
      {showAdd && (
        <div className="border border-forest-200 bg-forest-50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-forest-800">New Requirement Item</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
              <input value={newLabel} onChange={(e) => setNewLabel(e.target.value)} placeholder="e.g., DENR Certificate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-forest-500 focus:outline-none" />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Scope (Hauler Type)</label>
              <select value={newHauler} onChange={(e) => setNewHauler(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-forest-500 focus:outline-none">
                <option value="">Global (all hauler types)</option>
                {HAULER_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
              </select>
            </div>
          </div>
          <input value={newDesc} onChange={(e) => setNewDesc(e.target.value)} placeholder="Description (optional)"
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-forest-500 focus:outline-none" />
          <div className="flex justify-end gap-2">
            <button onClick={() => { setShowAdd(false); setNewLabel(''); setNewDesc(''); setNewHauler(''); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white">Cancel</button>
            <button onClick={() => {
              if (!newLabel.trim() || createMutation.isLoading) return;
              createMutation.mutate({ label: newLabel.trim(), description: newDesc, is_required: true, sort_order: templates.length + 1, hauler_type: newHauler || null });
            }} disabled={!newLabel.trim() || createMutation.isLoading}
              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50">
              {createMutation.isLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}
      {visible.length === 0
        ? <div className="text-center py-12 text-gray-400 text-sm">No requirements for this scope yet.</div>
        : (
          <div className="space-y-4">
            {activeList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Requirements</h4>
                <div className="space-y-2">
                  {activeList.map((t) => (
                    <div key={t.id} className="border border-gray-200 bg-white rounded-xl p-4">
                      {editingId === t.id ? (
                        <div className="space-y-3">
                          <div className="grid grid-cols-2 gap-3">
                            <input value={editDraft.label} onChange={(e) => setEditDraft(d => ({ ...d, label: e.target.value }))}
                              className="px-3 py-2 border border-forest-400 rounded-lg text-sm focus:outline-none" />
                            <select value={editDraft.hauler_type || ''} onChange={(e) => setEditDraft(d => ({ ...d, hauler_type: e.target.value || null }))}
                              className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-forest-400">
                              <option value="">Global</option>
                              {HAULER_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                            </select>
                          </div>
                          <input value={editDraft.description} onChange={(e) => setEditDraft(d => ({ ...d, description: e.target.value }))}
                            placeholder="Description (optional)" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-forest-400" />
                          <div className="flex justify-end gap-2">
                            <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
                            <button onClick={() => updateMutation.mutate({ id: t.id, body: editDraft })} disabled={updateMutation.isLoading}
                              className="px-3 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800">Save</button>
                          </div>
                        </div>
                      ) : (
                        <div className="flex items-start justify-between gap-3">
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 flex-wrap">
                              <span className="text-sm font-medium text-gray-900">{t.label}</span>
                              <ScopeBadge haulerType={t.hauler_type} />
                            </div>
                            {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                          </div>
                          <div className="flex items-center gap-2 shrink-0">
                            <button onClick={() => { setEditDraft({ label: t.label, description: t.description || '', is_required: t.is_required, hauler_type: t.hauler_type || '' }); setEditingId(t.id); }}
                              className="p-1 text-sm text-emerald-700 hover:text-emerald-800">Edit</button>
                            <button onClick={() => updateMutation.mutate({ id: t.id, body: { is_active: false } })}
                              className="px-3 py-1 text-xs border border-red-700 text-red-700 rounded hover:bg-red-50">Deactivate</button>
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            )}
            {inactiveList.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Inactive Requirements</h4>
                <div className="space-y-2">
                  {inactiveList.map((t) => (
                    <div key={t.id} className="border border-gray-100 bg-gray-50 rounded-xl p-4 opacity-70">
                      <div className="flex items-start justify-between gap-3">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-2 flex-wrap">
                            <span className="text-sm font-medium text-gray-500 line-through">{t.label}</span>
                            <ScopeBadge haulerType={t.hauler_type} />
                          </div>
                        </div>
                        <button onClick={() => updateMutation.mutate({ id: t.id, body: { is_active: true } })}
                          className="px-3 py-1 text-xs border border-emerald-800 text-emerald-800 rounded hover:bg-forest-50">Activate</button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
    </div>
  );
};

const BinFormatsTab = () => {
  const qc = useQueryClient();
  const { data: serverFormats = [], isLoading } = useQuery({
    queryKey: ['binFormats'],
    queryFn: async () => (await API.get('/admin/settings/bin-formats')).data,
  });
  const [formats, setFormats] = useState(null);
  const [dirty, setDirty]     = useState(false);

  if (!isLoading && formats === null && serverFormats.length > 0) setFormats(serverFormats);

  const saveMutation = useMutation({
    mutationFn: (fmts) => API.put('/admin/settings/bin-formats', { formats: fmts }),
    onSuccess: () => { toast.success('BIN formats saved'); setDirty(false); qc.invalidateQueries(['binFormats']); },
    onError: (e) => toast.error(e.response?.data?.detail || 'Save failed'),
  });

  const set = (updater) => { setFormats(updater); setDirty(true); };

  if (isLoading || formats === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" /></div>;

  const activeCount   = formats.filter(f => f.is_active).length;
  const activeFormats = formats.filter(f => f.is_active);
  const inactiveFmts  = formats.filter(f => !f.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Define accepted BIN number patterns.</p>
          {activeCount === 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
              <AlertCircle className="h-4 w-4" />At least one format must be active.
            </div>
          )}
        </div>
        <button onClick={() => set(f => [...f, { id: uid(), segments: [7, 4, 7], label: 'New Format', is_active: true }])}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-800">
          <Plus className="h-4 w-4" />Add Format
        </button>
      </div>
      {formats.length === 0
        ? <div className="text-center py-12 text-gray-400 text-sm">No BIN formats defined</div>
        : (
          <div className="space-y-4">
            {activeFormats.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Formats</h4>
                <div className="space-y-3">
                  {activeFormats.map(fmt => (
                    <BinFormatCard key={fmt.id} fmt={fmt}
                      index={formats.findIndex(f => f.id === fmt.id)}
                      onToggle={i => set(f => f.map((x, j) => j === i ? { ...x, is_active: !x.is_active } : x))}
                      onSegmentsChange={(i, seg) => set(f => f.map((x, j) => j === i ? { ...x, segments: seg } : x))}
                      onLabelChange={(i, lbl) => set(f => f.map((x, j) => j === i ? { ...x, label: lbl } : x))} />
                  ))}
                </div>
              </div>
            )}
            {inactiveFmts.length > 0 && (
              <div>
                <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Inactive Formats</h4>
                <div className="space-y-3">
                  {inactiveFmts.map(fmt => (
                    <BinFormatCard key={fmt.id} fmt={fmt}
                      index={formats.findIndex(f => f.id === fmt.id)}
                      onToggle={i => set(f => f.map((x, j) => j === i ? { ...x, is_active: !x.is_active } : x))}
                      onSegmentsChange={(i, seg) => set(f => f.map((x, j) => j === i ? { ...x, segments: seg } : x))}
                      onLabelChange={(i, lbl) => set(f => f.map((x, j) => j === i ? { ...x, label: lbl } : x))} />
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      {dirty && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-amber-600 flex items-center gap-1.5"><AlertCircle className="h-4 w-4" />Unsaved changes</span>
          <div className="flex gap-2">
            <button onClick={() => { setFormats(serverFormats); setDirty(false); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Discard</button>
            <button onClick={() => saveMutation.mutate(formats)} disabled={saveMutation.isLoading || activeCount === 0}
              className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50">
              {saveMutation.isLoading ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const BusinessLinesTab = () => {
  const qc = useQueryClient();
  const [lines, setLines]       = useState([]);
  const [newLine, setNewLine]   = useState('');
  const [exempted, setExempted] = useState([]);
  const [loading, setLoading]   = useState(true);
  const [saving, setSaving]     = useState(false);
  const [error, setError]       = useState('');

  useEffect(() => {
    (async () => {
      try {
        const [lRes, eRes] = await Promise.all([
          API.get('/admin/settings/business-lines'),
          API.get('/admin/settings/exempted-lines'),
        ]);
        setLines((lRes.data.business_lines || []).sort((a, b) => a.localeCompare(b)));
        setExempted(eRes.data.exempted_lines || []);
      } catch {}
      finally { setLoading(false); }
    })();
  }, []);

  const addLine = () => {
    setError('');
    const trimmed = newLine.trim();
    if (!trimmed) { setError('Please enter a business line'); return; }
    if (lines.some(l => l.trim().toLowerCase() === trimmed.toLowerCase())) { setError('This business line already exists'); return; }
    setLines([...lines, trimmed].sort((a, b) => a.localeCompare(b)));
    setNewLine('');
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await Promise.all([
        API.put('/admin/settings/business-lines', { business_lines: lines }),
        API.put('/admin/settings/exempted-lines', { exempted_lines: exempted }),
      ]);
      toast.success('Business lines saved');
      qc.invalidateQueries(['options']);
      setError('');
    } catch { toast.error('Failed to save'); }
    finally { setSaving(false); }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-700 rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="flex gap-2 mb-4">
        <input type="text" value={newLine} onChange={(e) => { setNewLine(e.target.value); setError(''); }}
          onKeyDown={(e) => e.key === 'Enter' && (e.preventDefault(), addLine())}
          placeholder="Add new business line..." className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-forest-500" />
        <button onClick={addLine} className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800">Add</button>
      </div>
      {error && <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">{error}</div>}
      <div className="space-y-2 max-h-96 overflow-y-auto">
        {lines.map(line => (
          <div key={line} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
            <div className="flex items-center gap-3">
              <input type="checkbox" checked={exempted.includes(line)} onChange={() => setExempted(prev => prev.includes(line) ? prev.filter(e => e !== line) : [...prev, line])}
                className="h-4 w-4 text-emerald-700 rounded" title="Exempt from requirements" />
              <span className="text-sm text-gray-700">{line}</span>
              {exempted.includes(line) && <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">Exempted</span>}
            </div>
            <button onClick={() => { setLines(lines.filter(l => l !== line)); setExempted(exempted.filter(e => e !== line)); }} className="text-red-500 hover:text-red-700"><Trash2 className="h-4 w-4" /></button>
          </div>
        ))}
      </div>
      {exempted.length > 0 && <div className="p-3 bg-amber-50 rounded-lg text-xs text-amber-700"><strong>Note:</strong> Exempted business lines skip the requirements checklist.</div>}
      <div className="flex justify-end pt-4 border-t border-gray-200">
        <button onClick={saveChanges} disabled={saving}
          className="px-4 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50">
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>
    </div>
  );
};

const removeBackground = (file) =>
  new Promise((resolve) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const canvas = document.createElement('canvas');
      canvas.width  = img.width;
      canvas.height = img.height;
      const ctx = canvas.getContext('2d');
      ctx.drawImage(img, 0, 0);
      const d = ctx.getImageData(0, 0, canvas.width, canvas.height);
      for (let i = 0; i < d.data.length; i += 4) {
        if (d.data[i] > 200 && d.data[i+1] > 200 && d.data[i+2] > 200) d.data[i+3] = 0;
      }
      ctx.putImageData(d, 0, 0);
      URL.revokeObjectURL(url);
      canvas.toBlob((blob) => {
        const f = new File([blob], file.name.replace(/\.[^.]+$/, '.png'), { type: 'image/png' });
        resolve({ file: f, preview: canvas.toDataURL('image/png') });
      }, 'image/png');
    };
    img.src = url;
  });

const SignatoryRow = ({ label, nameKey, titleKey, sigKey, data, onFieldChange, onSignatureUpload, uploading }) => {
  const inputRef                      = useRef(null);
  const [showPreview, setShowPreview] = useState(false);
  const [processing, setProcessing]   = useState(false);
  const currentSig = data[sigKey] || null;

  const handleFile = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/png') && !file.name.endsWith('.png')) {
      toast.error('Only PNG files are accepted'); return;
    }
    setProcessing(true);
    try {
      const { file: processed } = await removeBackground(file);
      onSignatureUpload(processed, null, sigKey);
    } catch { toast.error('Failed to process image'); }
    finally { setProcessing(false); e.target.value = ''; }
  };

  return (
    <div className="py-4 border-b border-gray-100 last:border-0">
      <div className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{label}</div>
      <div className="flex items-center gap-4">
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Full Name</label>
          <input type="text" value={data[nameKey] || ''} onChange={(e) => onFieldChange(nameKey, e.target.value)}
            placeholder="Enter full name" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="flex-1">
          <label className="block text-xs text-gray-500 mb-1">Position / Title</label>
          <input type="text" value={data[titleKey] || ''} onChange={(e) => onFieldChange(titleKey, e.target.value)}
            placeholder="e.g. OIC-CENRO" className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500" />
        </div>
        <div className="shrink-0 flex items-center gap-2">
          {currentSig && (
            <button type="button" onClick={() => setShowPreview(v => !v)}
              className="inline-flex items-center gap-1 px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600 hover:bg-gray-50">
              <Eye className="h-3.5 w-3.5" />{showPreview ? 'Hide' : 'Preview'}
            </button>
          )}
          <button type="button" onClick={() => inputRef.current?.click()} disabled={processing || uploading}
            className="inline-flex items-center gap-1 px-3 py-2 border border-emerald-700 text-emerald-700 rounded-lg text-xs hover:bg-forest-50 disabled:opacity-50">
            <Upload className="h-3.5 w-3.5" />{currentSig ? 'Replace' : 'Upload'} Signature
          </button>
          <input ref={inputRef} type="file" accept=".png,image/png" onChange={handleFile} className="hidden" />
        </div>
      </div>
      {showPreview && currentSig && (
        <div className="mt-3 p-3 bg-gray-50 rounded-lg border border-gray-200 inline-block">
          <img src={currentSig} alt="Signature preview" className="h-12 object-contain" style={{ mixBlendMode: 'multiply' }} />
        </div>
      )}
    </div>
  );
};

const SignatoriesTab = () => {
  const [clrData, setClrData]           = useState(null);
  const [rptData, setRptData]           = useState(null);
  const [loading, setLoading]           = useState(true);
  const [saving, setSaving]             = useState(false);
  const [uploadingKey, setUploadingKey] = useState(null);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [c, r] = await Promise.all([
        API.get('/admin/settings/signatories'),
        API.get('/admin/settings/report-signatories').catch(() => ({ data: {} })),
      ]);
      setClrData(c.data);
      setRptData(r.data);
    } catch { toast.error('Failed to load signatories'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchData(); }, []);

  const handleFieldChange = (section, key, value) => {
    if (section === 'clearance') setClrData(d => ({ ...d, [key]: value }));
    else setRptData(d => ({ ...d, [key]: value }));
  };

  const handleSignatureUpload = async (file, _preview, sigKey) => {
    const type = ['recommending_signature', 'approving_signature'].includes(sigKey) ? 'clearance' : 'report';
    const role = sigKey.replace('_signature', '');
    setUploadingKey(sigKey);
    try {
      const form = new FormData();
      form.append('file', file);
      form.append('type', type);
      form.append('role', role);
      const res = await API.post('/admin/settings/upload-signature', form, { headers: { 'Content-Type': 'multipart/form-data' } });
      if (type === 'clearance') setClrData(d => ({ ...d, [sigKey]: res.data.url }));
      else setRptData(d => ({ ...d, [sigKey]: res.data.url }));
      toast.success('Signature uploaded');
    } catch { toast.error('Failed to upload signature'); }
    finally { setUploadingKey(null); }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await Promise.all([
        API.put('/admin/settings/signatories', clrData),
        API.put('/admin/settings/report-signatories', rptData),
      ]);
      toast.success('Signatories saved');
    } catch { toast.error('Failed to save signatories'); }
    finally { setSaving(false); }
  };

  if (loading || !clrData || !rptData) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-700 rounded-full" /></div>;

  return (
    <div className="space-y-8">
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-0.5 h-4 bg-forest-500 rounded" />
          <h3 className="text-sm font-semibold text-gray-800">Clearance Signatories</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-2">These names appear on generated clearance PDFs.</p>
        <div className="bg-white border border-gray-200 rounded-xl px-5">
          <SignatoryRow label="Recommending Approval" nameKey="recommending_name" titleKey="recommending_title"
            sigKey="recommending_signature" data={clrData}
            onFieldChange={(k, v) => handleFieldChange('clearance', k, v)}
            onSignatureUpload={handleSignatureUpload} uploading={uploadingKey === 'recommending_signature'} />
          <SignatoryRow label="Approval" nameKey="approving_name" titleKey="approving_title"
            sigKey="approving_signature" data={clrData}
            onFieldChange={(k, v) => handleFieldChange('clearance', k, v)}
            onSignatureUpload={handleSignatureUpload} uploading={uploadingKey === 'approving_signature'} />
        </div>
      </div>
      <div>
        <div className="flex items-center gap-2 mb-1">
          <div className="w-0.5 h-4 bg-forest-500 rounded" />
          <h3 className="text-sm font-semibold text-gray-800">Report Signatories</h3>
        </div>
        <p className="text-xs text-gray-400 mb-3 ml-2">These names appear on downloaded PDF reports.</p>
        <div className="bg-white border border-gray-200 rounded-xl px-5">
          <SignatoryRow label="Certified By" nameKey="certified_by_name" titleKey="certified_by_title"
            sigKey="certified_by_signature" data={rptData}
            onFieldChange={(k, v) => handleFieldChange('report', k, v)}
            onSignatureUpload={handleSignatureUpload} uploading={uploadingKey === 'certified_by_signature'} />
        </div>
      </div>
      <div className="flex justify-end">
        <button onClick={handleSave} disabled={saving}
          className="px-5 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2">
          {saving && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
          {saving ? 'Saving…' : 'Save Signatories'}
        </button>
      </div>
    </div>
  );
};

const ArchiveTab = () => {
  const qc = useQueryClient();
  const [confirmYear, setConfirmYear] = useState(null);
  const [action, setAction]           = useState(null);

  const { data: years = [], isLoading, refetch } = useQuery({
    queryKey: ['archiveYears'],
    queryFn: async () => (await API.get('/admin/settings/archive/years')).data,
  });

  const archiveMutation = useMutation({
    mutationFn: (year) => API.post(`/admin/settings/archive/${year}`),
    onSuccess: (res) => { toast.success(res.data.message); setConfirmYear(null); refetch(); },
    onError:   (e)   => toast.error(e.response?.data?.detail || 'Archive failed'),
  });
  const unarchiveMutation = useMutation({
    mutationFn: (year) => API.post(`/admin/settings/unarchive/${year}`),
    onSuccess: (res) => { toast.success(res.data.message); setConfirmYear(null); refetch(); },
    onError:   (e)   => toast.error(e.response?.data?.detail || 'Restore failed'),
  });

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-700 rounded-full" /></div>;

  return (
    <div className="space-y-4">
      <div className="p-4 bg-amber-50 border border-amber-200 rounded-xl text-sm text-amber-800">
        <p className="font-semibold mb-1">About archiving</p>
        <p className="text-xs leading-relaxed">
          Archiving hides past-year business records from the main list. Records are <strong>not deleted</strong> — they remain in the database and can be restored at any time.
        </p>
      </div>
      {years.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No past-year records found to archive.</div>
      ) : (
        <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
          <table className="min-w-full divide-y divide-gray-100">
            <thead className="bg-gray-50">
              <tr>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Year</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Records</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Status</th>
                <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-50">
              {years.map(item => (
                <tr key={item.year} className="hover:bg-gray-50">
                  <td className="px-5 py-3 font-semibold text-gray-800">{item.year}</td>
                  <td className="px-5 py-3 text-sm text-gray-600">{item.record_count.toLocaleString()} records</td>
                  <td className="px-5 py-3">
                    {item.already_archived
                      ? <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-gray-100 text-gray-600"><Archive className="h-3 w-3" />Archived</span>
                      : <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-green-100 text-green-700">Active</span>}
                   </td>
                  <td className="px-5 py-3">
                    {item.already_archived ? (
                      <button onClick={() => { setConfirmYear(item.year); setAction('unarchive'); }}
                        className="inline-flex items-center gap-1 px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50">
                        <ArchiveRestore className="h-3.5 w-3.5" />Restore
                      </button>
                    ) : (
                      <button onClick={() => { setConfirmYear(item.year); setAction('archive'); }}
                        className="inline-flex items-center gap-1 px-3 py-1 border border-amber-600 text-amber-600 text-xs rounded hover:bg-amber-50">
                        <Archive className="h-3.5 w-3.5" />Archive
                      </button>
                    )}
                   </td>
                 </tr>
              ))}
            </tbody>
           </table>
        </div>
      )}
      {confirmYear && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
          <div className="bg-white rounded-xl shadow-xl max-w-sm w-full mx-4 p-6">
            <h3 className="text-lg font-bold text-gray-900 mb-2">
              {action === 'archive' ? `Archive ${confirmYear} records?` : `Restore ${confirmYear} records?`}
            </h3>
            <p className="text-sm text-gray-600 mb-5">
              {action === 'archive'
                ? `All business records from ${confirmYear} will be hidden from the main list. They can be restored at any time.`
                : `All archived records from ${confirmYear} will be restored to active status.`}
            </p>
            <div className="flex justify-end gap-3">
              <button onClick={() => setConfirmYear(null)} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">Cancel</button>
              <button
                onClick={() => action === 'archive' ? archiveMutation.mutate(confirmYear) : unarchiveMutation.mutate(confirmYear)}
                disabled={archiveMutation.isLoading || unarchiveMutation.isLoading}
                className={`px-4 py-2 rounded-lg text-sm text-white disabled:opacity-50 ${action === 'archive' ? 'bg-amber-600 hover:bg-amber-700' : 'bg-emerald-700 hover:bg-emerald-800'}`}>
                {(archiveMutation.isLoading || unarchiveMutation.isLoading) ? 'Processing…' : action === 'archive' ? 'Archive' : 'Restore'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

const AdminAccountTab = () => {
  const [currentAdmin, setCurrentAdmin] = useState(null);
  const [deactivatedAdmins, setDeactivatedAdmins] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showForm, setShowForm] = useState(false);
  const [email, setEmail] = useState('');
  const [fullName, setFullName] = useState('');
  const [creating, setCreating] = useState(false);
  const [confirmed, setConfirmed] = useState(false);
  const [done, setDone] = useState(false);
  const [countdown, setCountdown] = useState(3);
  const [result, setResult] = useState(null);
  const [restoringId, setRestoringId] = useState(null);
  const [activating, setActivating] = useState(false);

  useEffect(() => {
    fetchData();
  }, []);

  const fetchData = async () => {
    setLoading(true);
    try {
      const [adminRes, deactivatedRes] = await Promise.all([
        API.get('/admin/settings/admin-account'),
        API.get('/admin/settings/admin-account/deactivated').catch(() => ({ data: { admins: [] } })),
      ]);
      setCurrentAdmin(adminRes.data.admin);
      setDeactivatedAdmins(deactivatedRes.data.admins || []);
    } catch (err) {
      console.error('Failed to fetch admin data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (!done) return;
    if (countdown === 0) {
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      window.location.href = '/login';
      return;
    }
    const t = setTimeout(() => setCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [done, countdown]);

  const handleCreate = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast.error('Email and name are required');
      return;
    }
    if (!confirmed) {
      toast.error('Please confirm you understand the consequences');
      return;
    }
    setCreating(true);
    try {
      const r = await API.post('/admin/settings/admin-account', {
        email: email.trim(),
        full_name: fullName.trim(),
      });
      setResult(r.data);
      setDone(true);
      toast.success(r.data.is_restore 
        ? 'Admin account restored successfully!' 
        : 'New admin account created successfully!');
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to create account');
    } finally {
      setCreating(false);
    }
  };

  const handleRestore = async (adminId, adminEmail) => {
    if (!window.confirm(`Restore ${adminEmail} as active admin?\n\nThis will deactivate the current admin account.`)) {
      return;
    }
    setRestoringId(adminId);
    setActivating(true);
    try {
      const r = await API.post(`/admin/settings/admin-account/activate/${adminId}`);
      setResult({
        message: r.data.message,
        email: r.data.activated.email,
        full_name: r.data.activated.full_name,
        email_sent: false,
        old_admin_notified: false,
        is_restore: true,
        temporary_password: null,
      });
      setDone(true);
      toast.success(`Admin account ${adminEmail} restored!`);
      fetchData();
    } catch (e) {
      toast.error(e.response?.data?.detail || 'Failed to restore admin account');
    } finally {
      setRestoringId(null);
      setActivating(false);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin h-8 w-8 border-b-2 border-emerald-600 rounded-full" />
      </div>
    );
  }

  if (done) {
    return (
      <div className="max-w-md mx-auto space-y-5 py-8">
        <div className="text-center">
          <div className="inline-flex items-center justify-center h-16 w-16 rounded-full bg-emerald-100 mb-4">
            <CheckCircle className="h-8 w-8 text-emerald-600" />
          </div>
          <h3 className="text-lg font-bold text-gray-800 mb-1">
            {result?.is_restore ? 'Admin Account Restored' : 'Admin Access Transferred'}
          </h3>
          <p className="text-sm text-gray-500">
            {result?.is_restore 
              ? 'The admin account has been restored and is now active.'
              : 'The new admin account has been created and the previous admin has been notified.'}
          </p>
        </div>

        <div className="bg-gray-50 border border-gray-200 rounded-xl p-4 space-y-2 text-sm">
          <div className="flex items-center gap-2">
            {result?.email_sent !== false && result?.email_sent !== undefined
              ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
            <span className="text-gray-700">
              Admin credentials email —{' '}
              <span className={result?.email_sent !== false && result?.email_sent !== undefined ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {result?.email_sent !== false && result?.email_sent !== undefined ? 'Sent' : 'Not sent (restored account)'}
              </span>
            </span>
          </div>
          <div className="flex items-center gap-2">
            {result?.old_admin_notified
              ? <CheckCircle className="h-4 w-4 text-emerald-500 shrink-0" />
              : <AlertCircle className="h-4 w-4 text-amber-500 shrink-0" />}
            <span className="text-gray-700">
              Previous admin notification —{' '}
              <span className={result?.old_admin_notified ? 'text-emerald-600 font-medium' : 'text-amber-600 font-medium'}>
                {result?.old_admin_notified ? 'Sent' : 'Not sent / Not applicable'}
              </span>
            </span>
          </div>
          {!result?.email_sent && result?.temporary_password && (
            <div className="mt-3 p-3 bg-amber-50 border border-amber-200 rounded-lg">
              <p className="text-xs text-amber-700 font-medium mb-1">
                ⚠ Email failed — provide this password manually:
              </p>
              <p className="font-mono text-base tracking-widest text-amber-900 select-all">
                {result.temporary_password}
              </p>
            </div>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 py-4 bg-red-50 border border-red-200 rounded-xl">
          <div className="flex items-center justify-center h-10 w-10 rounded-full bg-red-100 text-red-700 font-bold text-lg tabular-nums">
            {countdown}
          </div>
          <p className="text-sm text-red-700 font-medium">
            Logging you out in {countdown} second{countdown !== 1 ? 's' : ''}…
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6 max-w-full">
      <div className="bg-amber-50 border border-amber-200 rounded-xl p-4 flex gap-3">
        <Info className="h-5 w-5 text-amber-600 shrink-0 mt-0.5" />
        <div className="text-sm text-amber-800">
          <p className="font-semibold mb-1">Single Admin Policy</p>
          <p>
            Only one admin account can be active at a time. Creating a new admin or restoring a previous
            admin will immediately deactivate the current admin account.
          </p>
        </div>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl p-5">
        <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
          <Shield className="h-4 w-4 text-emerald-600" />
          Current Active Admin
        </h4>
        {currentAdmin ? (
          <div className="space-y-1">
            <p className="text-sm text-gray-900">Full Name: <strong>{currentAdmin.full_name}</strong></p>
            <p className="text-sm text-gray-900">Email: <strong>{currentAdmin.email}</strong></p>
            {currentAdmin.created_at && (
              <p className="text-xs text-gray-400">
                Account created {new Date(currentAdmin.created_at).toLocaleDateString()}
              </p>
            )}
          </div>
        ) : (
          <p className="text-sm text-gray-400 italic">No active admin found</p>
        )}
      </div>

      {deactivatedAdmins.length > 0 && (
        <div className="bg-white border border-gray-200 rounded-xl p-5">
          <h4 className="text-sm font-semibold text-gray-700 mb-3 flex items-center gap-2">
            <ArchiveRestore className="h-4 w-4 text-amber-600" />
            Previous Admin Accounts (Inactive)
          </h4>
          <div className="space-y-3">
            {deactivatedAdmins.map(admin => (
              <div key={admin.id} className="flex items-center justify-between py-2 border-b border-gray-100 last:border-0">
                <div>
                  <p className="text-sm font-medium text-gray-800">{admin.full_name}</p>
                  <p className="text-xs text-gray-500">{admin.email}</p>
                  {admin.deactivated_at && (
                    <p className="text-xs text-gray-400 mt-0.5">
                      Deactivated: {new Date(admin.deactivated_at).toLocaleDateString()}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => handleRestore(admin.id, admin.email)}
                  disabled={activating && restoringId === admin.id}
                  className="inline-flex items-center gap-1 px-3 py-1 border border-emerald-700 text-emerald-700 text-xs rounded hover:bg-forest-50 disabled:opacity-50"
                >
                  {activating && restoringId === admin.id ? (
                    <><span className="h-3 w-3 border-2 border-emerald-700 border-t-transparent rounded-full animate-spin mr-1" />Restoring...</>
                  ) : (
                    <><ArchiveRestore className="h-3.5 w-3.5" />Restore</>
                  )}
                </button>
              </div>
            ))}
          </div>
          <p className="text-xs text-gray-400 mt-3">
            Restoring a previous admin will deactivate the current admin and restore access to the selected account.
          </p>
        </div>
      )}

      {!showForm ? (
        <div className="flex gap-3">
          <button
            onClick={() => setShowForm(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-red-300 text-red-700 rounded-lg text-sm hover:bg-red-50 transition-colors"
          >
            <UserCog className="h-4 w-4" />
            Create New Admin Account
          </button>
        </div>
      ) : (
        <div className="bg-white border border-red-200 rounded-xl p-5 space-y-4">
          <div className="flex items-center gap-2 mb-1">
            <UserCog className="h-4 w-4 text-red-600" />
            <h4 className="text-sm font-semibold text-red-800">Create New Admin Account</h4>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Full Name <span className="text-red-500">*</span>
            </label>
            <input
              value={fullName}
              onChange={e => setFullName(e.target.value)}
              placeholder="e.g. Juan Dela Cruz"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">
              Email <span className="text-red-500">*</span>
            </label>
            <input
              type="email"
              value={email}
              onChange={e => setEmail(e.target.value)}
              placeholder="newadmin@example.com"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
            />
            <p className="text-xs text-gray-400 mt-1">
              A generated password will be sent to this email. If an admin account with this email already exists (even if deactivated), it will be restored.
            </p>
          </div>
          <label className="flex items-start gap-2.5 cursor-pointer">
            <input
              type="checkbox"
              checked={confirmed}
              onChange={e => setConfirmed(e.target.checked)}
              className="h-4 w-4 text-red-600 rounded mt-0.5"
            />
            <span className="text-xs text-red-700">
              I understand that creating or restoring an admin account will{' '}
              <strong>immediately deactivate the current admin account</strong> and
              log out the current session.
            </span>
          </label>
          <div className="flex justify-end gap-2 pt-2 border-t border-gray-100">
            <button
              onClick={() => { setShowForm(false); setEmail(''); setFullName(''); setConfirmed(false); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              onClick={handleCreate}
              disabled={creating || !confirmed || !email.trim() || !fullName.trim()}
              className="inline-flex items-center gap-1.5 px-4 py-1.5 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700 disabled:opacity-50 transition-colors"
            >
              {creating ? (
                <><span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />Creating…</>
              ) : (
                <><UserCog className="h-3.5 w-3.5" />Create & Transfer</>
              )}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const InspectionFrequencyTab = () => {
  const qc = useQueryClient();
  const [frequency, setFrequency] = useState(1);
  const [period, setPeriod] = useState('year');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [dirty, setDirty] = useState(false);

  useEffect(() => {
    API.get('/admin/settings/inspection-frequency')
      .then(res => {
        setFrequency(res.data.frequency || 1);
        setPeriod(res.data.period || 'year');
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      await API.put('/admin/settings/inspection-frequency', { frequency, period });
      toast.success('Inspection frequency saved');
      setDirty(false);
      qc.invalidateQueries(['inspectionFrequency']);
    } catch {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return (
    <div className="flex justify-center py-12">
      <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-700" />
    </div>
  );

  return (
    <div className="space-y-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            Set how many times a business can be inspected per period. Once the limit is reached, 
            the Inspect button will be disabled until the next period.
          </p>
        </div>
        <button 
          onClick={handleSave} 
          disabled={saving || !dirty}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-700 text-white text-sm rounded-lg hover:bg-emerald-800 disabled:opacity-50"
        >
          {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </div>

      <div className="bg-white border border-gray-200 rounded-xl overflow-hidden">
        <div className="p-5 space-y-5">
          {/* Maximum Inspections */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Maximum Inspections per Period
            </label>
            <select
              value={frequency}
              onChange={(e) => { setFrequency(Number(e.target.value)); setDirty(true); }}
              className="px-3 py-2 border border-gray-300 rounded-lg text-sm w-32 focus:outline-none focus:border-emerald-500"
            >
              <option value={1}>1 time</option>
              <option value={2}>2 times</option>
              <option value={3}>3 times</option>
              <option value={4}>4 times</option>
              <option value={6}>6 times</option>
              <option value={12}>12 times</option>
            </select>
          </div>

          {/* Period Options */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Period
            </label>
            <div className="flex flex-wrap gap-4">
              {[
                { value: 'month', label: 'Per Month' },
                { value: 'quarter', label: 'Per Quarter (3 months)' },
                { value: 'half_year', label: 'Per Half Year (6 months)' },
                { value: 'year', label: 'Per Year' },
              ].map(opt => (
                <label key={opt.value} className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    value={opt.value}
                    checked={period === opt.value}
                    onChange={() => { setPeriod(opt.value); setDirty(true); }}
                    className="h-4 w-4 text-emerald-700 focus:ring-emerald-500"
                  />
                  <span className="text-sm text-gray-700">{opt.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* Example / Info */}
          <div className="mt-4 p-3 bg-gray-50 rounded-lg border border-gray-100">
            <p className="text-xs text-gray-500">
              <span className="font-medium">Example:</span> If set to <strong>{frequency}</strong> time(s) per <strong>{period === 'month' ? 'month' : period === 'quarter' ? 'quarter' : period === 'half_year' ? 'half year' : 'year'}</strong>, 
              a business cannot be inspected more than {frequency} time(s) within that period.
            </p>
          </div>
        </div>
      </div>

      {/* Unsaved changes bar */}
      {dirty && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" />
            Unsaved changes
          </span>
          <div className="flex gap-2">
            <button 
              onClick={() => {
                setFrequency(1);
                setPeriod('year');
                setDirty(false);
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Discard
            </button>
            <button 
              onClick={handleSave} 
              disabled={saving}
              className="px-4 py-1.5 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50"
            >
              {saving ? 'Saving…' : 'Save Changes'}
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

const TABS = [
  { key: 'requirements',  label: 'Requirements'  },
  { key: 'bin',           label: 'BIN Formats'   },
  { key: 'businessLines', label: 'Business Lines' },
  { key: 'signatories',   label: 'Signatories'   },
  { key: 'archive',       label: 'Archive'        },
  { key: 'adminAccount',  label: 'Admin Account'  },
  { key: 'inspectionFreq', label: 'Inspection Frequency' },
];

const AdminSettings = () => {
  const [tab, setTab] = useState('requirements');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button key={key} onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${tab === key ? 'border-emerald-700 text-emerald-700' : 'border-transparent text-gray-500 hover:text-gray-700'}`}>
              {label}
            </button>
          ))}
        </nav>
      </div>
      <div>
        {tab === 'requirements'  && <RequirementsTab />}
        {tab === 'bin'           && <BinFormatsTab />}
        {tab === 'businessLines' && <BusinessLinesTab />}
        {tab === 'signatories'   && <SignatoriesTab />}
        {tab === 'archive'       && <ArchiveTab />}
        {tab === 'adminAccount'  && <AdminAccountTab />}
        {tab === 'inspectionFreq' && <InspectionFrequencyTab />}
      </div>
    </div>
  );
};

export default AdminSettings;