import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../config/api';
import toast from 'react-hot-toast';
import {
  Plus, Trash2, Edit2, Save, X,
  ChevronDown, ChevronUp, AlertCircle,
  ToggleLeft, ToggleRight
} from 'lucide-react';

const HAULER_TYPES = ['City', 'Barangay', 'Accredited', 'Hazardous', 'Exempted', 'No Contract'];
const SCOPE_ALL = '__ALL__';

const ScopeBadge = ({ haulerType }) => {
  if (!haulerType) {
    return (
      <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-gray-100 text-gray-500 uppercase tracking-wide">
        Global
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold bg-blue-100 text-blue-600">
      {haulerType}
    </span>
  );
};

const uid = () => `fmt_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`;

const BinFormatCard = ({ fmt, index, onToggle, onSegmentsChange, onLabelChange }) => {
  const [editingLabel, setEditingLabel] = useState(false);
  const [labelDraft, setLabelDraft] = useState(fmt.label);
  const [segInput, setSegInput] = useState(fmt.segments.join('-'));
  const [segError, setSegError] = useState('');

  const handleSegmentSave = () => {
    const parts = segInput.split('-').map(Number);
    if (parts.some((n) => isNaN(n) || n <= 0)) {
      setSegError('Each segment must be a positive number');
      return;
    }
    if (parts.length < 2) {
      setSegError('Need at least 2 segments');
      return;
    }
    setSegError('');
    onSegmentsChange(index, parts);
  };

  return (
    <div className={`border rounded-xl p-4 transition-all ${fmt.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <div className="flex-1 min-w-0">
            {editingLabel ? (
              <div className="flex gap-2 mb-2">
                <input
                  value={labelDraft}
                  onChange={(e) => setLabelDraft(e.target.value)}
                  className="flex-1 px-2 py-1 border border-emerald-400 rounded text-sm focus:outline-none"
                  autoFocus
                />
                <button
                  onClick={() => { onLabelChange(index, labelDraft); setEditingLabel(false); }}
                  className="px-2 py-1 bg-emerald-600 text-white rounded text-xs hover:bg-emerald-700"
                >
                  <Save className="h-3.5 w-3.5" />
                </button>
                <button
                  onClick={() => setEditingLabel(false)}
                  className="px-2 py-1 border border-gray-300 rounded text-xs hover:bg-gray-50"
                >
                  <X className="h-3.5 w-3.5" />
                </button>
              </div>
            ) : (
              <div className="flex items-center gap-2 mb-2">
                <span className="text-sm font-medium text-gray-800 truncate">{fmt.label}</span>
                <button
                  onClick={() => { setLabelDraft(fmt.label); setEditingLabel(true); }}
                  className="text-gray-400 hover:text-emerald-600 shrink-0"
                >
                  <Edit2 className="h-3.5 w-3.5" />
                </button>
              </div>
            )}
            <div className="flex flex-wrap items-center gap-2 mb-2">
              <span className="text-xs text-gray-500">Segments:</span>
              <input
                value={segInput}
                onChange={(e) => setSegInput(e.target.value)}
                onBlur={handleSegmentSave}
                placeholder="e.g. 7-4-7"
                className="px-2 py-0.5 border border-gray-300 rounded text-xs font-mono w-28 focus:outline-none focus:border-emerald-400"
              />
              {segError && <span className="text-xs text-red-500">{segError}</span>}
            </div>
            <div className="text-xs text-gray-500">
              Example: <code className="font-mono bg-gray-100 px-1 rounded">{fmt.segments.map(n => '0'.repeat(n)).join('-')}</code>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button 
            onClick={() => onToggle(index)} 
            className={`px-3 py-1 text-xs border rounded transition-colors ${
              fmt.is_active 
                ? ' border-emerald-700 text-emerald-700 hover:bg-emerald-50' 
                : ' border-red-700 text-red-700 hover:bg-red-50'
            }`}
          >
            {fmt.is_active ? 'Activate' : 'Deactivate'}
          </button>
        </div>
      </div>
    </div>
  );
};

const RequirementsTab = () => {
  const qc = useQueryClient();
  const [activeScope, setActiveScope] = useState(SCOPE_ALL);
  const [showAdd, setShowAdd] = useState(false);
  const [newLabel, setNewLabel] = useState('');
  const [newDesc, setNewDesc] = useState('');
  const [newHauler, setNewHauler] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['reqTemplates'],
    queryFn: async () => {
      const res = await API.get('/admin/settings/requirements?include_inactive=true');
      return res.data;
    },
  });

  const createMutation = useMutation({
    mutationFn: (body) => API.post('/admin/settings/requirements', body),
    onSuccess: () => {
      toast.success('Requirement added');
      qc.invalidateQueries({ queryKey: ['reqTemplates'] });
      setShowAdd(false);
      setNewLabel('');
      setNewDesc('');
      setNewHauler('');
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to add'),
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, body }) => API.put(`/admin/settings/requirements/${id}`, body),
    onSuccess: () => {
      toast.success('Updated');
      qc.invalidateQueries({ queryKey: ['reqTemplates'] });
      setEditingId(null);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/admin/settings/requirements/${id}`),
    onSuccess: () => {
      toast.success('Removed');
      qc.invalidateQueries({ queryKey: ['reqTemplates'] });
    },
    onError: () => toast.error('Failed to remove'),
  });

  const visible = templates.filter((t) => {
    if (activeScope === SCOPE_ALL) return true;
    if (activeScope === 'global') return !t.hauler_type;
    return t.hauler_type === activeScope;
  });

  const activeList = visible.filter(t => t.is_active);
  const inactiveList = visible.filter(t => !t.is_active);

  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <p className="text-sm text-gray-500">
          Define required documents per hauler type.
        </p>
        <button
          onClick={() => setShowAdd(true)}
          disabled={createMutation.isLoading}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Requirement
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
            <button
              key={scope}
              onClick={() => setActiveScope(scope)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeScope === scope
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}
            >
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeScope === scope ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
              }`}>
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {showAdd && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-800">New Requirement Item</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">
                Label <span className="text-red-500">*</span>
              </label>
              <input
                value={newLabel}
                onChange={(e) => setNewLabel(e.target.value)}
                placeholder="e.g., DENR Certificate"
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Scope (Hauler Type)</label>
              <select
                value={newHauler}
                onChange={(e) => setNewHauler(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:outline-none"
              >
                <option value="">Global (all hauler types)</option>
                {HAULER_TYPES.map((h) => (
                  <option key={h} value={h}>{h}</option>
                ))}
              </select>
              <p className="text-xs text-gray-400 mt-1">
                {newHauler
                  ? `Only applies to "${newHauler}" businesses`
                  : 'Applies to ALL businesses'}
              </p>
            </div>
          </div>
          <div>
            <label className="block text-xs font-medium text-gray-700 mb-1">Description</label>
            <input
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              placeholder="Optional short description"
              className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:border-emerald-500 focus:outline-none"
            />
          </div>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => { setShowAdd(false); setNewLabel(''); setNewDesc(''); setNewHauler(''); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => {
                if (!newLabel.trim() || createMutation.isLoading) return;
                createMutation.mutate({
                  label: newLabel.trim(),
                  description: newDesc,
                  is_required: true,
                  sort_order: templates.length + 1,
                  hauler_type: newHauler || null,
                });
              }}
              disabled={!newLabel.trim() || createMutation.isLoading}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Adding...' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No requirements for this scope yet.
        </div>
      ) : (
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
                          <input
                            value={editDraft.label}
                            onChange={(e) => setEditDraft((d) => ({ ...d, label: e.target.value }))}
                            className="px-3 py-2 border border-emerald-400 rounded-lg text-sm focus:outline-none"
                          />
                          <select
                            value={editDraft.hauler_type || ''}
                            onChange={(e) => setEditDraft((d) => ({ ...d, hauler_type: e.target.value || null }))}
                            className="px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                          >
                            <option value="">Global</option>
                            {HAULER_TYPES.map((h) => <option key={h} value={h}>{h}</option>)}
                          </select>
                        </div>
                        <input
                          value={editDraft.description}
                          onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                          placeholder="Description (optional)"
                          className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                        />
                        <div className="flex justify-end gap-2">
                          <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">
                            Cancel
                          </button>
                          <button
                            onClick={() => updateMutation.mutate({ id: t.id, body: editDraft })}
                            disabled={updateMutation.isLoading}
                            className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
                          >
                            Save
                          </button>
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
                          <button onClick={() => {
                            setEditDraft({
                              label: t.label,
                              description: t.description || '',
                              is_required: t.is_required,
                              hauler_type: t.hauler_type || '',
                            });
                            setEditingId(t.id);
                          }} className="p-1 text-sm text-emerald-600 hover:text-emerald-700">
                            Edit
                          </button>
                          <button 
                            onClick={() => updateMutation.mutate({ id: t.id, body: { is_active: false } })}
                            className="px-3 py-1 text-xs border border-red-700 text-red-700 rounded hover:bg-red-50"
                          >
                            Deactivate
                          </button>
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
                          <span className="px-1.5 py-0.5 bg-gray-200 text-gray-500 rounded text-xs">Required</span>
                        </div>
                        {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        <button 
                          onClick={() => updateMutation.mutate({ id: t.id, body: { is_active: true } })}
                          className="px-3 py-1 text-xs border border-emerald-700 text-emerald-700 rounded hover:bg-emerald-50"
                        >
                          Activate
                        </button>
                      </div>
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
  const [dirty, setDirty] = useState(false);

  if (!isLoading && formats === null && serverFormats.length > 0) setFormats(serverFormats);

  const saveMutation = useMutation({
    mutationFn: (fmts) => API.put('/admin/settings/bin-formats', { formats: fmts }),
    onSuccess: () => {
      toast.success('BIN formats saved');
      setDirty(false);
      qc.invalidateQueries(['binFormats']);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Save failed'),
  });

  const set = (updater) => { setFormats(updater); setDirty(true); };

  if (isLoading || formats === null) {
    return (
      <div className="flex justify-center py-12">
        <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
      </div>
    );
  }

  const activeCount = formats.filter((f) => f.is_active).length;
  const activeFormats = formats.filter(f => f.is_active);
  const inactiveFormats = formats.filter(f => !f.is_active);

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">Define the accepted BIN number patterns.</p>
          {activeCount === 0 && (
            <div className="flex items-center gap-1.5 mt-2 text-amber-600 text-xs">
              <AlertCircle className="h-4 w-4" />
              At least one format must be active for BIN validation to work.
            </div>
          )}
        </div>
        <button
          onClick={() => set((f) => [...f, { id: uid(), segments: [7, 4, 7], label: 'New Format', is_active: true }])}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700"
        >
          <Plus className="h-4 w-4" />
          Add Format
        </button>
      </div>

      {formats.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No BIN formats defined</div>
      ) : (
        <div className="space-y-4">
          {activeFormats.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2">Active Formats</h4>
              <div className="space-y-3">
                {activeFormats.map((fmt, idx) => (
                  <BinFormatCard
                    key={fmt.id}
                    fmt={fmt}
                    index={formats.findIndex(f => f.id === fmt.id)}
                    onToggle={(i) => set((f) => f.map((x, j) => j === i ? { ...x, is_active: !x.is_active } : x))}
                    onSegmentsChange={(i, seg) => set((f) => f.map((x, j) => j === i ? { ...x, segments: seg } : x))}
                    onLabelChange={(i, lbl) => set((f) => f.map((x, j) => j === i ? { ...x, label: lbl } : x))}
                  />
                ))}
              </div>
            </div>
          )}
          
          {inactiveFormats.length > 0 && (
            <div>
              <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-2 mt-4">Inactive Formats</h4>
              <div className="space-y-3">
                {inactiveFormats.map((fmt, idx) => (
                  <BinFormatCard
                    key={fmt.id}
                    fmt={fmt}
                    index={formats.findIndex(f => f.id === fmt.id)}
                    onToggle={(i) => set((f) => f.map((x, j) => j === i ? { ...x, is_active: !x.is_active } : x))}
                    onSegmentsChange={(i, seg) => set((f) => f.map((x, j) => j === i ? { ...x, segments: seg } : x))}
                    onLabelChange={(i, lbl) => set((f) => f.map((x, j) => j === i ? { ...x, label: lbl } : x))}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> Unsaved changes
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => { setFormats(serverFormats); setDirty(false); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50"
            >
              Discard
            </button>
            <button
              onClick={() => saveMutation.mutate(formats)}
              disabled={saveMutation.isLoading || activeCount === 0}
              className="px-4 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
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
  const [lines, setLines] = useState([]);
  const [newLine, setNewLine] = useState('');
  const [exempted, setExempted] = useState([]);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    const fetchLines = async () => {
      try {
        const [linesRes, exemptedRes] = await Promise.all([
          API.get('/admin/settings/business-lines'),
          API.get('/admin/settings/exempted-lines')
        ]);
        const sortedLines = (linesRes.data.business_lines || []).sort((a, b) => a.localeCompare(b));
        setLines(sortedLines);
        setExempted(exemptedRes.data.exempted_lines || []);
      } catch (err) {
        console.error('Failed to fetch business lines');
      } finally {
        setLoading(false);
      }
    };
    fetchLines();
  }, []);

  const addLine = () => {
    setError('');
    const trimmed = newLine.trim();
    if (!trimmed) {
      setError('Please enter a business line');
      return;
    }
    if (lines.includes(trimmed)) {
      setError('This business line already exists');
      return;
    }
    const newLines = [...lines, trimmed].sort((a, b) => a.localeCompare(b));
    setLines(newLines);
    setNewLine('');
  };

  const removeLine = (lineToRemove) => {
    setLines(lines.filter(l => l !== lineToRemove));
    setExempted(exempted.filter(e => e !== lineToRemove));
    setError('');
  };

  const toggleExempted = (line) => {
    if (exempted.includes(line)) {
      setExempted(exempted.filter(e => e !== line));
    } else {
      setExempted([...exempted, line]);
    }
    setError('');
  };

  const saveChanges = async () => {
    setSaving(true);
    try {
      await API.put('/admin/settings/business-lines', { business_lines: lines });
      await API.put('/admin/settings/exempted-lines', { exempted_lines: exempted });
      toast.success('Business lines saved');
      qc.invalidateQueries(['options']);
      qc.invalidateQueries(['businessLinesOptions']);
      setError('');
    } catch (err) {
      toast.error('Failed to save');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-600" /></div>;

  return (
    <div className="space-y-6">
      <div className="bg-white rounded-xl border border-gray-200 p-5">
        <div className="flex justify-between items-start mb-4">
          <div>
            <h3 className="text-sm font-semibold text-gray-800">Business Lines</h3>
            <p className="text-xs text-gray-500 mt-1">Add or remove business line options</p>
          </div>
        </div>

        <div className="flex gap-2 mb-4">
          <input
            type="text"
            value={newLine}
            onChange={(e) => { setNewLine(e.target.value); setError(''); }}
            onKeyPress={(e) => e.key === 'Enter' && addLine()}
            placeholder="Add new business line..."
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-500"
          />
          <button
            onClick={addLine}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700"
          >
            Add
          </button>
        </div>

        {error && (
          <div className="mb-4 p-2 bg-red-50 border border-red-200 rounded-lg text-xs text-red-600">
            {error}
          </div>
        )}

        <div className="space-y-2 max-h-96 overflow-y-auto">
          {lines.map(line => (
            <div key={line} className="flex items-center justify-between p-3 bg-gray-50 rounded-lg">
              <div className="flex items-center gap-3">
                <input
                  type="checkbox"
                  checked={exempted.includes(line)}
                  onChange={() => toggleExempted(line)}
                  className="h-4 w-4 text-emerald-600 rounded"
                />
                <span className="text-sm text-gray-700">{line}</span>
                {exempted.includes(line) && (
                  <span className="text-xs px-2 py-0.5 bg-amber-100 text-amber-700 rounded-full">
                    Exempted
                  </span>
                )}
              </div>
              <button
                onClick={() => removeLine(line)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          ))}
        </div>

        {exempted.length > 0 && (
          <div className="mt-4 p-3 bg-amber-50 rounded-lg">
            <p className="text-xs text-amber-700">
              <strong>Note:</strong> Exempted business lines will not require requirements documents.
            </p>
          </div>
        )}

        <div className="flex justify-end pt-4 mt-4 border-t border-gray-200">
          <button
            onClick={saveChanges}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const SignatoriesTab = () => {
  const qc = useQueryClient();
  const [signatories, setSignatories] = useState({
    recommending_name: '',
    recommending_title: '',
    approving_name: '',
    approving_title: ''
  });
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const fetchSignatories = async () => {
      try {
        const res = await API.get('/admin/settings/signatories');
        setSignatories(res.data);
      } catch (err) {
        console.error('Failed to fetch signatories');
      } finally {
        setLoading(false);
      }
    };
    fetchSignatories();
  }, []);

  const handleChange = (field, value) => {
    setSignatories(prev => ({ ...prev, [field]: value }));
  };

  const saveSignatories = async () => {
    setSaving(true);
    try {
      await API.put('/admin/settings/signatories', signatories);
      toast.success('Signatories updated');
      qc.invalidateQueries();
    } catch (err) {
      toast.error('Failed to update signatories');
    } finally {
      setSaving(false);
    }
  };

  if (loading) return <div className="flex justify-center py-12"><div className="animate-spin h-8 w-8 border-b-2 border-emerald-600" /></div>;

  return (
    <div className="bg-white rounded-xl border border-gray-200 p-6">
      <h3 className="text-sm font-semibold text-gray-800 mb-4">Clearance Signatories</h3>
      
      <div className="space-y-5">
        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recommending Approval - Name
          </label>
          <input
            type="text"
            value={signatories.recommending_name}
            onChange={(e) => handleChange('recommending_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Recommending Approval - Position
          </label>
          <input
            type="text"
            value={signatories.recommending_title}
            onChange={(e) => handleChange('recommending_title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="border-t border-gray-200 pt-4">
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Approving - Name
          </label>
          <input
            type="text"
            value={signatories.approving_name}
            onChange={(e) => handleChange('approving_name', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div>
          <label className="block text-sm font-medium text-gray-700 mb-1">
            Approving - Position
          </label>
          <input
            type="text"
            value={signatories.approving_title}
            onChange={(e) => handleChange('approving_title', e.target.value)}
            className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm"
          />
        </div>

        <div className="flex justify-end pt-4">
          <button
            onClick={saveSignatories}
            disabled={saving}
            className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
          >
            {saving ? 'Saving...' : 'Save Changes'}
          </button>
        </div>
      </div>
    </div>
  );
};

const TABS = [
  { key: 'requirements', label: 'Requirements Template' },
  { key: 'bin', label: 'BIN Formats' },
  { key: 'businessLines', label: 'Business Lines' },
  { key: 'signatories', label: 'Signatories' },
];

const AdminSettings = () => {
  const [tab, setTab] = useState('requirements');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <h1 className="text-2xl font-bold text-gray-800">Settings</h1>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6 overflow-x-auto">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors whitespace-nowrap ${
                tab === key
                  ? 'border-emerald-600 text-emerald-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700'
              }`}
            >
              {label}
            </button>
          ))}
        </nav>
      </div>

      <div>
        {tab === 'requirements' && <RequirementsTab />}
        {tab === 'bin' && <BinFormatsTab />}
        {tab === 'businessLines' && <BusinessLinesTab />}
        {tab === 'signatories' && <SignatoriesTab />}
      </div>
    </div>
  );
};

export default AdminSettings;