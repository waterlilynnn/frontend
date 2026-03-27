import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import API from '../../config/api';
import toast from 'react-hot-toast';
import {
  Hash, ClipboardList, Plus, Trash2, Edit2, Save, X,
  GripVertical, ToggleLeft, ToggleRight,
  ChevronDown, ChevronUp, AlertCircle, ChevronRight,
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

const BinFormatCard = ({ fmt, index, onToggle, onRemove, onSegmentsChange, onLabelChange, total }) => {
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
    <div className={`border rounded-xl p-4 transition-all ${fmt.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}>
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-3 flex-1 min-w-0">
          <GripVertical className="h-5 w-5 text-gray-300 mt-0.5 shrink-0" />
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
                  onClick={() => {
                    onLabelChange(index, labelDraft);
                    setEditingLabel(false);
                  }}
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
                  onClick={() => {
                    setLabelDraft(fmt.label);
                    setEditingLabel(true);
                  }}
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
            <div className="flex flex-wrap gap-4 text-xs text-gray-500">
              <span>Placeholder: <code className="font-mono bg-gray-100 px-1 rounded">{fmt.segments.map(n => '0'.repeat(n)).join('-')}</code></span>
            </div>
          </div>
        </div>
        <div className="flex items-center gap-2 shrink-0">
          <button onClick={() => onToggle(index)} title={fmt.is_active ? 'Deactivate' : 'Activate'}>
            {fmt.is_active ? <ToggleRight className="h-6 w-6 text-emerald-500" /> : <ToggleLeft className="h-6 w-6 text-gray-400" />}
          </button>
          <button onClick={() => onRemove(index)} disabled={total <= 1}
            className="text-gray-300 hover:text-red-500 disabled:cursor-not-allowed disabled:opacity-30">
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
  const [newReq, setNewReq] = useState(true);
  const [newHauler, setNewHauler] = useState('');
  const [editingId, setEditingId] = useState(null);
  const [editDraft, setEditDraft] = useState({});

  const { data: templates = [], isLoading } = useQuery({
    queryKey: ['reqTemplates'],
    queryFn: async () => (await API.get('/admin/settings/requirements?include_inactive=true')).data,
  });

  const createMutation = useMutation({
    mutationFn: (body) => API.post('/admin/settings/requirements', body),
    onSuccess: () => {
      toast.success('Requirement added');
      qc.invalidateQueries(['reqTemplates']);
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
      qc.invalidateQueries(['reqTemplates']);
      setEditingId(null);
    },
    onError: (e) => toast.error(e.response?.data?.detail || 'Failed to update'),
  });

  const deleteMutation = useMutation({
    mutationFn: (id) => API.delete(`/admin/settings/requirements/${id}`),
    onSuccess: () => {
      toast.success('Removed');
      qc.invalidateQueries(['reqTemplates']);
    },
    onError: () => toast.error('Failed to remove'),
  });

  const reorderMutation = useMutation({
    mutationFn: (order) => API.post('/admin/settings/requirements/reorder', order),
    onSuccess: () => qc.invalidateQueries(['reqTemplates']),
  });

  const handleMoveUp = (idx, list) => {
    if (idx === 0) return;
    const ids = list.map((t) => t.id);
    [ids[idx - 1], ids[idx]] = [ids[idx], ids[idx - 1]];
    reorderMutation.mutate(ids);
  };

  const handleMoveDown = (idx, list) => {
    if (idx === list.length - 1) return;
    const ids = list.map((t) => t.id);
    [ids[idx], ids[idx + 1]] = [ids[idx + 1], ids[idx]];
    reorderMutation.mutate(ids);
  };

  const startEdit = (t) => {
    setEditingId(t.id);
    setEditDraft({
      label: t.label,
      description: t.description || '',
      is_required: t.is_required,
      hauler_type: t.hauler_type || '',
    });
  };

  const visible = templates.filter((t) => {
    if (activeScope === SCOPE_ALL) return true;
    if (activeScope === 'global') return !t.hauler_type;
    return t.hauler_type === activeScope;
  });

  const countFor = (scope) => {
    if (scope === SCOPE_ALL) return templates.filter(t => t.is_active).length;
    if (scope === 'global') return templates.filter(t => !t.hauler_type && t.is_active).length;
    return templates.filter(t => t.hauler_type === scope && t.is_active).length;
  };

  if (isLoading) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            Define required documents per hauler type. 
          </p>
        </div>
        <button onClick={() => setShowAdd(true)}
          className="shrink-0 inline-flex items-center gap-2 px-4 py-2 bg-emerald-600 text-white text-sm rounded-lg hover:bg-emerald-700">
          Add Item
        </button>
      </div>

      <div className="flex flex-wrap gap-1.5">
        {[SCOPE_ALL, 'global', ...HAULER_TYPES].map((scope) => {
          const label = scope === SCOPE_ALL ? 'All' : scope === 'global' ? 'Global' : scope;
          const count = countFor(scope);
          return (
            <button key={scope} onClick={() => setActiveScope(scope)}
              className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                activeScope === scope
                  ? 'bg-emerald-600 text-white'
                  : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
              }`}>
              {label}
              <span className={`rounded-full px-1.5 py-0.5 text-[10px] font-bold ${
                activeScope === scope ? 'bg-white/20 text-white' : 'bg-gray-200 text-gray-500'
              }`}>{count}</span>
            </button>
          );
        })}
      </div>

      {showAdd && (
        <div className="border border-emerald-200 bg-emerald-50 rounded-xl p-4 space-y-3">
          <h4 className="text-sm font-semibold text-emerald-800">New Requirement Item</h4>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 mb-1">Label <span className="text-red-500">*</span></label>
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
                {newHauler ? `This requirement will only apply to "${newHauler}" businesses` : 'This requirement applies to ALL businesses'}
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
          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={newReq}
              onChange={(e) => setNewReq(e.target.checked)}
              className="h-4 w-4 text-emerald-600 rounded"
            />
            <span className="text-sm text-gray-700">Required document</span>
          </label>
          <div className="flex justify-end gap-2">
            <button
              onClick={() => {
                setShowAdd(false);
                setNewLabel('');
                setNewDesc('');
                setNewHauler('');
              }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-white"
            >
              Cancel
            </button>
            <button
              onClick={() => createMutation.mutate({
                label: newLabel,
                description: newDesc,
                is_required: newReq,
                sort_order: templates.length + 1,
                hauler_type: newHauler || null,
              })}
              disabled={!newLabel.trim() || createMutation.isLoading}
              className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
            >
              {createMutation.isLoading ? 'Adding…' : 'Add'}
            </button>
          </div>
        </div>
      )}

      {visible.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">
          No requirements for this scope yet.
          {activeScope !== SCOPE_ALL && (
            <button onClick={() => setShowAdd(true)} className="ml-2 text-emerald-600 hover:underline text-sm">Add one</button>
          )}
        </div>
      ) : (
        <div className="space-y-2">
          {visible.map((t, idx) => (
            <div
              key={t.id}
              className={`border rounded-xl p-4 transition-all ${t.is_active ? 'border-gray-200 bg-white' : 'border-gray-100 bg-gray-50 opacity-60'}`}
            >
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
                      {HAULER_TYPES.map((h) => (
                        <option key={h} value={h}>{h}</option>
                      ))}
                    </select>
                  </div>
                  <input
                    value={editDraft.description}
                    onChange={(e) => setEditDraft((d) => ({ ...d, description: e.target.value }))}
                    placeholder="Description (optional)"
                    className="w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:outline-none focus:border-emerald-400"
                  />
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={editDraft.is_required}
                      onChange={(e) => setEditDraft((d) => ({ ...d, is_required: e.target.checked }))}
                      className="h-4 w-4 text-emerald-600 rounded"
                    />
                    <span className="text-sm text-gray-700">Required</span>
                  </label>
                  <div className="flex justify-end gap-2">
                    <button onClick={() => setEditingId(null)} className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm">Cancel</button>
                    <button
                      onClick={() => updateMutation.mutate({ id: t.id, body: editDraft })}
                      disabled={updateMutation.isLoading}
                      className="px-3 py-1.5 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700 disabled:opacity-50"
                    >
                      Save
                    </button>
                  </div>
                </div>
              ) : (
                <div className="flex items-start justify-between gap-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className={`text-sm font-medium ${t.is_active ? 'text-gray-900' : 'text-gray-400 line-through'}`}>
                        {t.label}
                      </span>
                      <ScopeBadge haulerType={t.hauler_type} />
                      {t.is_required ? (
                        <span className="px-1.5 py-0.5 bg-red-100 text-red-600 rounded text-xs font-medium">Required</span>
                      ) : (
                        <span className="px-1.5 py-0.5 bg-gray-100 text-gray-500 rounded text-xs">Optional</span>
                      )}
                      {!t.is_active && (
                        <span className="px-1.5 py-0.5 bg-yellow-100 text-yellow-600 rounded text-xs">Inactive</span>
                      )}
                    </div>
                    {t.description && <p className="text-xs text-gray-400 mt-0.5">{t.description}</p>}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <button onClick={() => handleMoveUp(idx, visible)} disabled={idx === 0} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                      <ChevronUp className="h-4 w-4" />
                    </button>
                    <button onClick={() => handleMoveDown(idx, visible)} disabled={idx === visible.length - 1} className="p-1 text-gray-400 hover:text-gray-600 disabled:opacity-20">
                      <ChevronDown className="h-4 w-4" />
                    </button>
                    <button onClick={() => startEdit(t)} className="p-1 text-gray-400 hover:text-emerald-600">
                      <Edit2 className="h-4 w-4" />
                    </button>
                    <button onClick={() => updateMutation.mutate({ id: t.id, body: { is_active: !t.is_active } })}>
                      {t.is_active ? <ToggleRight className="h-5 w-5 text-emerald-500" /> : <ToggleLeft className="h-5 w-5 text-gray-400" />}
                    </button>
                    <button
                      onClick={() => {
                        if (window.confirm(`Remove "${t.label}"? Existing records will keep their data.`))
                          deleteMutation.mutate(t.id);
                      }}
                      className="p-1 text-gray-300 hover:text-red-500"
                    >
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))}
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

  const set = (updater) => {
    setFormats(updater);
    setDirty(true);
  };

  if (isLoading || formats === null) return <div className="flex justify-center py-12"><div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" /></div>;

  const activeCount = formats.filter((f) => f.is_active).length;

  return (
    <div className="space-y-3">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm text-gray-500">
            Define the accepted Business Identification Number patterns.
          </p>
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
        >Add Format
        </button>
      </div>

      {formats.length === 0 ? (
        <div className="text-center py-12 text-gray-400 text-sm">No BIN formats defined</div>
      ) : (
        <div className="space-y-3">
          {formats.map((fmt, idx) => (
            <BinFormatCard
              key={fmt.id}
              fmt={fmt}
              index={idx}
              total={formats.length}
              onToggle={(i) => set((f) => f.map((x, j) => j === i ? { ...x, is_active: !x.is_active } : x))}
              onRemove={(i) => set((f) => f.filter((_, j) => j !== i))}
              onSegmentsChange={(i, seg) => set((f) => f.map((x, j) => j === i ? { ...x, segments: seg } : x))}
              onLabelChange={(i, lbl) => set((f) => f.map((x, j) => j === i ? { ...x, label: lbl } : x))}
            />
          ))}
        </div>
      )}

      {dirty && (
        <div className="sticky bottom-0 bg-white border-t border-gray-200 rounded-b-xl px-4 py-3 flex items-center justify-between shadow-lg">
          <span className="text-sm text-amber-600 flex items-center gap-1.5">
            <AlertCircle className="h-4 w-4" /> Unsaved changes
          </span>
          <div className="flex gap-2">
            <button
              onClick={() => {
                setFormats(serverFormats);
                setDirty(false);
              }}
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

const TABS = [
  { key: 'requirements', label: 'Requirements Template' },
  { key: 'bin', label: 'BIN Formats' },
];

const AdminSettings = () => {
  const [tab, setTab] = useState('requirements');

  return (
    <div className="max-w-6xl mx-auto space-y-6 pb-16">
      <div>
        <h1 className="text-2xl font-bold text-gray-800">Settings</h1>
      </div>

      <div className="border-b border-gray-200">
        <nav className="flex gap-6">
          {TABS.map(({ key, label }) => (
            <button
              key={key}
              onClick={() => setTab(key)}
              className={`flex items-center gap-2 pb-3 text-sm font-medium border-b-2 transition-colors ${
                tab === key ? 'border-emerald-600 text-emerald-600' : 'border-transparent text-gray-500 hover:text-gray-700'
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
      </div>
    </div>
  );
};

export default AdminSettings;