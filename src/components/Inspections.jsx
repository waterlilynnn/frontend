import { useState, useMemo } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { format, startOfMonth, endOfMonth } from 'date-fns';
import toast from 'react-hot-toast';
import API from '../config/api';
import {
  Search, CheckCircle, AlertCircle, MinusCircle, X,
  ChevronLeft, ChevronRight, Clock, User, Calendar,
  ClipboardList, Shield, Filter, ShieldCheck,
} from 'lucide-react';

const CURRENT_YEAR = new Date().getFullYear();
const YEARS = Array.from({ length: 5 }, (_, i) => CURRENT_YEAR - i);
const MONTHS = [
  'January','February','March','April','May','June',
  'July','August','September','October','November','December',
];

const PERMIT_OPTIONS = ['EXISTING', 'NO_EXISTING'];
const CITY_PERMIT_OPTIONS = ['TEMPORARY', 'PERMANENT'];

const SWM_ITEMS = [
  { key: 'mrf', label: 'Materials Recovery Facility (MRF)' },
  { key: 'mrs', label: 'Materials Recovery System (MRS)' },
  { key: 'rca', label: 'Residual Containment Area (RCA)' },
  { key: 'na', label: 'N/A' },
];

const SW_HAULING_CATS = [
  { key: 'residuals', label: 'Residuals' },
  { key: 'food_wastes', label: 'Food Wastes' },
  { key: 'biodeg', label: 'Biodegradable Wastes' },
  { key: 'hazardous', label: 'Hazardous Wastes' },
];
const SW_HAULER_OPTS = ['CITY HAULER', 'BARANGAY', 'N/A'];

const WWT_ITEMS = [
  { key: 'septic', label: 'Septic Tank' },
  { key: 'septage', label: 'Septage/Sewage Treatment Facility' },
  { key: 'wwt', label: 'Wastewater Treatment Facility' },
  { key: 'na', label: 'N/A' },
];

const VIOLATIONS = [
  { key: 'littering_public', label: 'Littering in Public Areas' },
  { key: 'open_burning', label: 'Open Burning of Waste' },
  { key: 'mixing_recyclables', label: 'Mixing Recyclables with Solid Wastes' },
  { key: 'prohibited_packaging', label: 'Use of Prohibited Packaging Materials' },
  { key: 'single_use_plastics', label: 'Use of Single-Use Plastics for Food/Drinks' },
  { key: 'polluting_water', label: 'Polluting Water Bodies' },
  { key: 'discharging_without_permit', label: 'Discharging Without Permits' },
  { key: 'refusal_of_inspection', label: 'Refusal of Inspections' },
  { key: 'hazardous_without_compliance', label: 'Use of Hazardous Substances Without Compliance' },
];

const SUMMARIES = [
  'FULLY COMPLIANT WITH ENVIRONMENTAL REQUIREMENTS',
  'GENERALLY COMPLIANT WITH MINOR LAPSES OBSERVED',
  'PARTIALLY COMPLIANT, IMPROVEMENTS NEEDED IN WASTE, WATER, OR AIR MANAGEMENT',
  'NON-COMPLIANT IN KEY ENVIRONMENTAL STANDARDS',
  'HIGH RISK TO PUBLIC HEALTH/ENVIRONMENT, IMMEDIATE INTERVENTION REQUIRED',
  'Other',
];

const RECOMMENDATIONS = [
  'MAINTAIN CURRENT GOOD PRACTICES',
  'SEGREGATE WASTE PROPERLY AND ENSURE TIMELY COLLECTION',
  'PROVIDE ADEQUATE WASTE BINS WITH PROPER LABELING',
  'CONDUCT STAFF ORIENTATION ON RA 9003 AND LOCAL ORDINANCES',
  'IMPROVE WASTEWATER DISPOSAL/IMPLEMENT CORRECTIVE DRAINAGE MEASURES',
  'ENHANCE AIR QUALITY MANAGEMENT',
  'SUBMIT ENVIRONMENTAL MANAGEMENT CLEARANCE (EMC) COMPLIANCE REPORT',
  'IMPLEMENT CORRECTIVE MEASURES WITHIN 15–30 DAYS',
  'SCHEDULE FOLLOW-UP INSPECTION TO VERIFY COMPLIANCE',
  'IMMEDIATE CORRECTIVE ACTION REQUIRED BEFORE OPERATION CONTINUES',
  'Other',
];

const EMPTY_FORM = {
  emb_ecc: null, emb_cnc: null, pamb_clearance: null, discharge_permit: null,
  sanitary_permit: null, business_permit: null,
  swm_facilities: [],
  sw_hauling: {},
  has_iec_materials: null,
  proper_segregation: null,
  wwt_facilities: [],
  desludging: null, desludging_other: '',
  violations: Object.fromEntries(VIOLATIONS.map(v => [v.key, false])),
  summary: null, summary_other: '',
  recommendations: [],
  recommendations_other: '',
};

const fmtDt = (d) => {
  try { return format(new Date(d), 'MMM dd, yyyy hh:mm a'); }
  catch { return '—'; }
};

const StatusBadge = ({ inspections, onClick }) => {
  if (!inspections || inspections.length === 0)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-gray-100 text-gray-500"><MinusCircle className="h-3 w-3" />Not Inspected</span>;
  const latest = inspections[0];
  if (latest.status === 'PASSED')
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-green-100 text-green-700 font-medium"><CheckCircle className="h-3 w-3" />Passed</span>;
  if (latest.is_resolved)
    return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-blue-100 text-blue-700 font-medium"><ShieldCheck className="h-3 w-3" />Resolved</span>;
  return <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs bg-red-100 text-red-700 font-medium"><AlertCircle className="h-3 w-3" />With Violation</span>;
};

const RadioGroup = ({ options, value, onChange, name }) => (
  <div className="flex flex-wrap gap-3 mt-1">
    {options.map(opt => (
      <label key={opt} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
        <input
          type="radio"
          name={name}
          value={opt}
          checked={value === opt}
          onChange={() => onChange(opt)}
          className="h-3.5 w-3.5 text-emerald-600"
        />
        {opt}
      </label>
    ))}
  </div>
);

const CheckboxGroup = ({ items, value = [], onChange }) => {
  const toggle = (key) => {
    const next = value.includes(key) ? value.filter(k => k !== key) : [...value, key];
    onChange(next);
  };
  return (
    <div className="flex flex-wrap gap-3 mt-1">
      {items.map(item => (
        <label key={item.key} className="flex items-center gap-1.5 cursor-pointer text-sm text-gray-700">
          <input
            type="checkbox"
            checked={value.includes(item.key)}
            onChange={() => toggle(item.key)}
            className="h-3.5 w-3.5 text-emerald-600 rounded"
          />
          {item.label}
        </label>
      ))}
    </div>
  );
};

const SectionTitle = ({ children }) => (
  <h4 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mt-5 mb-2 border-b border-gray-100 pb-1">
    {children}
  </h4>
);

const FieldRow = ({ label, required, children }) => (
  <div className="mb-3">
    <span className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
  </div>
);

const InspectionSlideOver = ({ business, onClose, onSubmitSuccess }) => {
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('permits');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const hasAnyViolation = Object.values(form.violations || {}).some(Boolean);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.summary) { toast.error('Please select a Summary/Result'); return; }
    setSubmitting(true);
    try {
      await API.post(`/inspections/business/${business.id}/checklist`, form);
      toast.success('Inspection submitted');
      onSubmitSuccess();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  };

  const sections = [
    { id: 'permits', label: 'Permits' },
    { id: 'solid_waste', label: 'Solid Waste' },
    { id: 'wastewater', label: 'Wastewater' },
    { id: 'violations', label: 'Violations' },
    { id: 'summary', label: 'Summary' },
  ];

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40 transition-opacity" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[560px] max-w-[95vw] bg-white z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0 bg-gradient-to-r from-forest-50 to-water-50">
          <div>
            <h2 className="text-base font-semibold text-forest-800 flex items-center gap-2">
              <ClipboardList className="h-4 w-4 text-forest-600" />
              Environmental Compliance Inspection
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{business.establishment_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex border-b border-gray-200 px-4 gap-1 shrink-0 bg-gray-50">
          {sections.map(section => (
            <button
              key={section.id}
              onClick={() => setActiveSection(section.id)}
              className={`px-3 py-2 text-xs font-medium transition-colors ${
                activeSection === section.id
                  ? 'text-forest-600 border-b-2 border-forest-600'
                  : 'text-gray-500 hover:text-gray-700'
              }`}
            >
              {section.label}
            </button>
          ))}
        </div>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto px-6 py-4 space-y-0">
          <div className="bg-forest-50 rounded-lg p-3 mb-4 text-xs text-gray-700 grid grid-cols-2 gap-2 border border-forest-100">
            <div><span className="text-gray-500">Establishment:</span> {business.establishment_name}</div>
            <div><span className="text-gray-500">BIN:</span> <span className="font-mono">{business.bin_number || '—'}</span></div>
            <div><span className="text-gray-500">Control #:</span> <span className="font-mono">{business.control_number || '—'}</span></div>
            <div><span className="text-gray-500">Hauler:</span> {business.hauler_type || '—'}</div>
            <div><span className="text-gray-500">Date:</span> {format(new Date(), 'MMM dd, yyyy')}</div>
            <div><span className="text-gray-500">Time:</span> {format(new Date(), 'hh:mm a')}</div>
          </div>

          {activeSection === 'permits' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg mb-2">
                <p className="text-xs text-blue-700">DENR / LLDA Permits</p>
              </div>
              {[
                { key: 'emb_ecc', label: 'EMB-ECC' },
                { key: 'emb_cnc', label: 'EMB-CNC' },
                { key: 'pamb_clearance', label: 'PAMB Clearance' },
                { key: 'discharge_permit', label: 'Discharge Permit' },
              ].map(({ key, label }) => (
                <FieldRow key={key} label={label} required>
                  <RadioGroup
                    name={key}
                    options={PERMIT_OPTIONS}
                    value={form[key]}
                    onChange={v => set(key, v)}
                  />
                </FieldRow>
              ))}

              <div className="bg-blue-50 p-3 rounded-lg mt-4 mb-2">
                <p className="text-xs text-blue-700">City Permits</p>
              </div>
              {[
                { key: 'sanitary_permit', label: 'Sanitary Permit' },
                { key: 'business_permit', label: 'Business Permit' },
              ].map(({ key, label }) => (
                <FieldRow key={key} label={label} required>
                  <RadioGroup
                    name={key}
                    options={CITY_PERMIT_OPTIONS}
                    value={form[key]}
                    onChange={v => set(key, v)}
                  />
                </FieldRow>
              ))}
            </div>
          )}

          {activeSection === 'solid_waste' && (
            <div className="space-y-4">
              <FieldRow label="Solid Waste Management Facilities" required>
                <CheckboxGroup
                  items={SWM_ITEMS}
                  value={form.swm_facilities}
                  onChange={v => set('swm_facilities', v)}
                />
              </FieldRow>

              <div className="bg-gray-50 p-3 rounded-lg mt-2">
                <p className="text-xs font-medium text-gray-600 mb-2">Solid Waste Hauling</p>
                {SW_HAULING_CATS.map(cat => (
                  <FieldRow key={cat.key} label={cat.label} required>
                    <RadioGroup
                      name={`sw_${cat.key}`}
                      options={SW_HAULER_OPTS}
                      value={form.sw_hauling?.[cat.key] || null}
                      onChange={v => set('sw_hauling', { ...form.sw_hauling, [cat.key]: v })}
                    />
                  </FieldRow>
                ))}
              </div>

              <FieldRow label="Presence of IEC Materials" required>
                <RadioGroup
                  name="iec"
                  options={['YES', 'NO']}
                  value={form.has_iec_materials === null ? null : form.has_iec_materials ? 'YES' : 'NO'}
                  onChange={v => set('has_iec_materials', v === 'YES')}
                />
              </FieldRow>

              <FieldRow label="Proper Waste Segregation" required>
                <RadioGroup
                  name="seg"
                  options={['YES', 'NO']}
                  value={form.proper_segregation === null ? null : form.proper_segregation ? 'YES' : 'NO'}
                  onChange={v => set('proper_segregation', v === 'YES')}
                />
              </FieldRow>
            </div>
          )}

          {activeSection === 'wastewater' && (
            <div className="space-y-4">
              <FieldRow label="Wastewater Treatment Facilities" required>
                <CheckboxGroup
                  items={WWT_ITEMS}
                  value={form.wwt_facilities}
                  onChange={v => set('wwt_facilities', v)}
                />
              </FieldRow>

              <FieldRow label="Regular Desludging Service Provider" required>
                <RadioGroup
                  name="desludging"
                  options={['TCWD/PRIME', 'N/A', 'Other']}
                  value={form.desludging}
                  onChange={v => set('desludging', v)}
                />
                {form.desludging === 'Other' && (
                  <input
                    type="text"
                    value={form.desludging_other}
                    onChange={e => set('desludging_other', e.target.value)}
                    placeholder="Specify provider..."
                    className="mt-2 w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                )}
              </FieldRow>
            </div>
          )}

          {activeSection === 'violations' && (
            <div className="space-y-3">
              <p className="text-xs font-medium text-gray-700 mb-2">Select all violations observed:</p>
              {VIOLATIONS.map(v => (
                <div key={v.key} className="flex items-center justify-between p-2 hover:bg-gray-50 rounded">
                  <span className="text-sm text-gray-700 flex-1 pr-4">{v.label}</span>
                  <RadioGroup
                    name={`viol_${v.key}`}
                    options={['YES', 'NO']}
                    value={form.violations?.[v.key] ? 'YES' : form.violations?.[v.key] === false ? 'NO' : null}
                    onChange={val => set('violations', { ...form.violations, [v.key]: val === 'YES' })}
                  />
                </div>
              ))}
              {hasAnyViolation && (
                <div className="mt-3 p-2.5 bg-red-50 border border-red-200 rounded-lg text-xs text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-3.5 w-3.5 mt-0.5 shrink-0" />
                  Violations detected — business violation flag will be auto-updated.
                </div>
              )}
            </div>
          )}

          {activeSection === 'summary' && (
            <div className="space-y-5">
              <FieldRow label="Overall Compliance Status" required>
                <div className="space-y-2 mt-1">
                  {SUMMARIES.map(s => (
                    <label key={s} className="flex items-start gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input
                        type="radio"
                        name="summary"
                        value={s}
                        checked={form.summary === s}
                        onChange={() => set('summary', s)}
                        className="mt-0.5 h-3.5 w-3.5 text-forest-600 shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">{s}</span>
                    </label>
                  ))}
                </div>
                {form.summary === 'Other' && (
                  <input
                    type="text"
                    value={form.summary_other}
                    onChange={e => set('summary_other', e.target.value)}
                    placeholder="Specify..."
                    className="mt-2 w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                )}
              </FieldRow>

              <FieldRow label="Recommendations" required>
                <div className="space-y-2 mt-1">
                  {RECOMMENDATIONS.map(r => (
                    <label key={r} className="flex items-start gap-2 cursor-pointer p-2 hover:bg-gray-50 rounded">
                      <input
                        type="checkbox"
                        checked={form.recommendations.includes(r)}
                        onChange={() => {
                          const next = form.recommendations.includes(r)
                            ? form.recommendations.filter(x => x !== r)
                            : [...form.recommendations, r];
                          set('recommendations', next);
                        }}
                        className="mt-0.5 h-3.5 w-3.5 text-forest-600 rounded shrink-0"
                      />
                      <span className="text-sm text-gray-700 leading-snug">{r}</span>
                    </label>
                  ))}
                </div>
                {form.recommendations.includes('Other') && (
                  <input
                    type="text"
                    value={form.recommendations_other}
                    onChange={e => set('recommendations_other', e.target.value)}
                    placeholder="Specify other recommendation..."
                    className="mt-2 w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                  />
                )}
              </FieldRow>
            </div>
          )}
        </form>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-end gap-3 shrink-0 bg-gray-50">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-100"
          >
            Cancel
          </button>
          <button
            onClick={handleSubmit}
            disabled={submitting}
            className="px-5 py-2 bg-forest-600 text-white rounded-lg text-sm hover:bg-forest-700 disabled:opacity-50 flex items-center gap-2"
          >
            {submitting && <span className="h-3.5 w-3.5 border-2 border-white border-t-transparent rounded-full animate-spin" />}
            {submitting ? 'Submitting...' : 'Submit Inspection'}
          </button>
        </div>
      </div>
    </>
  );
};

const HistorySlideOver = ({ business, onClose }) => {
  const qc = useQueryClient();
  const [resolveId, setResolveId] = useState(null);
  const [resolveRemarks, setResolveRemarks] = useState('');

  const { data: inspections = [], isLoading } = useQuery({
    queryKey: ['businessInspections', business.id],
    queryFn: async () => (await API.get(`/inspections/business/${business.id}`)).data,
  });

  const resolveMutation = useMutation({
    mutationFn: async ({ id, remarks }) => {
      const params = new URLSearchParams();
      if (remarks) params.set('resolved_remarks', remarks);
      return API.post(`/inspections/resolve/${id}?${params.toString()}`);
    },
    onSuccess: () => {
      toast.success('Violation resolved');
      qc.invalidateQueries(['businessInspections', business.id]);
      qc.invalidateQueries(['inspectionMap']);
      qc.invalidateQueries(['businessList']);
      setResolveId(null);
      setResolveRemarks('');
    },
    onError: () => toast.error('Failed to resolve'),
  });

  return (
    <>
      <div className="fixed inset-0 bg-black/40 z-40" onClick={onClose} />
      <div className="fixed right-0 top-0 bottom-0 w-[460px] max-w-[95vw] bg-white z-50 flex flex-col shadow-2xl">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 shrink-0">
          <div>
            <h2 className="text-base font-semibold text-gray-900">Inspection History</h2>
            <p className="text-xs text-gray-500 mt-0.5">{business.establishment_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded">
            <X className="h-5 w-5" />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-6 py-4 space-y-4">
          {isLoading ? (
            <div className="flex justify-center py-8"><div className="animate-spin h-6 w-6 border-2 border-emerald-600 border-t-transparent rounded-full" /></div>
          ) : inspections.length === 0 ? (
            <div className="text-center py-12 text-gray-400">
              <Clock className="h-10 w-10 mx-auto mb-3 text-gray-200" />
              <p className="text-sm">No inspections recorded yet</p>
            </div>
          ) : (
            inspections.map(insp => {
              const isViolation = insp.status === 'WITH VIOLATION';
              const isResolved = insp.is_resolved;
              return (
                <div key={insp.id} className={`border rounded-xl p-4 ${
                  isViolation && !isResolved
                    ? 'border-red-200 bg-red-50'
                    : isResolved
                    ? 'border-blue-200 bg-blue-50'
                    : 'border-green-200 bg-green-50'
                }`}>
                  <div className="flex items-center justify-between mb-2">
                    <div className="flex items-center gap-2 text-sm font-medium text-gray-800">
                      <Calendar className="h-3.5 w-3.5 text-gray-400" />
                      {fmtDt(insp.date)}
                    </div>
                    {isViolation && !isResolved ? (
                      <span className="text-xs font-semibold text-red-700 bg-red-100 px-2 py-0.5 rounded-full">With Violation</span>
                    ) : isResolved ? (
                      <span className="text-xs font-semibold text-blue-700 bg-blue-100 px-2 py-0.5 rounded-full">Resolved</span>
                    ) : (
                      <span className="text-xs font-semibold text-green-700 bg-green-100 px-2 py-0.5 rounded-full">Passed</span>
                    )}
                  </div>

                  <div className="text-xs text-gray-600 mb-1 flex items-center gap-1">
                    <User className="h-3 w-3" /> {insp.inspector || 'Unknown'}
                  </div>

                  {insp.remarks && (
                    <p className="text-sm text-gray-700 mt-2 bg-white/60 rounded p-2">{insp.remarks}</p>
                  )}

                  {isResolved && (
                    <div className="mt-2 text-xs text-blue-700">
                      <span className="font-medium">Mark as resolved by:</span> {insp.resolved_by} · {fmtDt(insp.resolved_at)}
                      {insp.resolved_remarks && <p className="mt-0.5">Remark: {insp.resolved_remarks}</p>}
                    </div>
                  )}

                  {isViolation && !isResolved && (
                    <div className="mt-3">
                      {resolveId === insp.id ? (
                        <div className="space-y-2">
                          <textarea
                            rows={2}
                            placeholder="Resolution remarks (optional)"
                            value={resolveRemarks}
                            onChange={e => setResolveRemarks(e.target.value)}
                            className="w-full px-3 py-1.5 border border-gray-300 rounded text-sm"
                          />
                          <div className="flex gap-2">
                            <button
                              onClick={() => { setResolveId(null); setResolveRemarks(''); }}
                              className="px-3 py-1 border border-gray-300 rounded text-xs text-gray-600"
                            >
                              Cancel
                            </button>
                            <button
                              onClick={() => resolveMutation.mutate({ id: insp.id, remarks: resolveRemarks })}
                              disabled={resolveMutation.isLoading}
                              className="px-3 py-1 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:opacity-50"
                            >
                              Confirm
                            </button>
                          </div>
                        </div>
                      ) : (
                        <button
                          onClick={() => setResolveId(insp.id)}
                          className="text-xs text-blue-600 hover:underline flex items-center gap-1"
                        >
                          <ShieldCheck className="h-3 w-3" /> Mark as Resolved
                        </button>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </>
  );
};

const Inspections = ({ rolePrefix = 'staff' }) => {
  const qc = useQueryClient();

  const now = new Date();
  const [selYear, setSelYear] = useState(now.getFullYear());
  const [selMonth, setSelMonth] = useState(now.getMonth());
  const [filterStatus, setFilterStatus] = useState('all');
  const [search, setSearch] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [inspectBusiness, setInspectBusiness] = useState(null);
  const [historyBusiness, setHistoryBusiness] = useState(null);

  const { data: allBiz = [], isLoading: bizLoading } = useQuery({
    queryKey: ['allBizInspections'],
    queryFn: async () => (await API.get('/business-records/all')).data || [],
  });

  const { data: allInspections = [], isLoading: inspLoading } = useQuery({
    queryKey: ['allInspections'],
    queryFn: async () => (await API.get('/inspections/all')).data || [],
  });

  const isLoading = bizLoading || inspLoading;

  const inspectionMap = useMemo(() => {
    const map = {};
    allInspections.forEach(i => {
      if (!map[i.business_record_id]) map[i.business_record_id] = [];
      map[i.business_record_id].push(i);
    });
    return map;
  }, [allInspections]);

  const { dateFrom, dateTo } = useMemo(() => {
    const d = new Date(selYear, selMonth, 1);
    return { dateFrom: startOfMonth(d), dateTo: endOfMonth(d) };
  }, [selMonth, selYear]);

  const filtered = useMemo(() => {
    return allBiz.filter(b => {
      const inspections = inspectionMap[b.id] || [];
      const inPeriod = inspections.some(i => {
        const d = i.date ? new Date(i.date) : null;
        return d && d >= dateFrom && d <= dateTo;
      });

      if (filterStatus === 'inspected' && inspections.length === 0) return false;
      if (filterStatus === 'not_inspected' && inspections.length > 0) return false;
      if (filterStatus === 'violation') {
        const hasOpen = inspections.some(i => i.status === 'WITH VIOLATION' && !i.is_resolved);
        if (!hasOpen) return false;
      }
      if (filterStatus === 'passed') {
        const latestPassed = inspections.length > 0 && inspections[0].status === 'PASSED';
        if (!latestPassed) return false;
      }

      if (search) {
        const q = search.toLowerCase();
        const nameMatch = b.establishment_name?.toLowerCase().includes(q);
        const binMatch = (b.bin_number || '').toLowerCase().includes(q);
        const ctrlMatch = (b.control_number || '').toLowerCase().includes(q);
        if (!nameMatch && !binMatch && !ctrlMatch) return false;
      }

      return true;
    });
  }, [allBiz, inspectionMap, filterStatus, search, dateFrom, dateTo]);

  const PER_PAGE = 10;
  const totalPages = Math.ceil(filtered.length / PER_PAGE);
  const paginated = filtered.slice((currentPage - 1) * PER_PAGE, currentPage * PER_PAGE);

  const handleInspectDone = () => {
    qc.invalidateQueries(['allInspections']);
    qc.invalidateQueries(['allBizInspections']);
  };

  const stats = useMemo(() => ({
    total: allBiz.length,
    inspected: allBiz.filter(b => (inspectionMap[b.id] || []).length > 0).length,
    violations: allBiz.filter(b => b.has_violation).length,
    notInspected: allBiz.filter(b => (inspectionMap[b.id] || []).length === 0).length,
  }), [allBiz, inspectionMap]);

  return (
    <div className="min-h-screen bg-gray-50">
      {inspectBusiness && (
        <InspectionSlideOver
          business={inspectBusiness}
          onClose={() => setInspectBusiness(null)}
          onSubmitSuccess={handleInspectDone}
        />
      )}
      {historyBusiness && (
        <HistorySlideOver
          business={historyBusiness}
          onClose={() => setHistoryBusiness(null)}
        />
      )}

      <div className="pb-28 space-y-4">
        <h1 className="text-2xl font-bold text-gray-800">Inspections</h1>

        <div className="bg-white rounded-xl border border-gray-200 p-4 mb-4">
          <div className="flex flex-wrap gap-6 text-sm">
            <div><span className="text-gray-500">Total:</span> <span className="font-semibold text-gray-800 ml-1">{stats.total}</span></div>
            <div><span className="text-gray-500">Inspected:</span> <span className="font-semibold text-emerald-600 ml-1">{stats.inspected}</span></div>
            <div><span className="text-gray-500">Not Inspected:</span> <span className="font-semibold text-amber-600 ml-1">{stats.notInspected}</span></div>
            <div><span className="text-gray-500">With Violations:</span> <span className="font-semibold text-red-600 ml-1">{stats.violations}</span></div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 p-4">
          <div className="flex flex-wrap items-center gap-3">
            <Filter className="h-4 w-4 text-gray-400" />
            <span className="text-sm font-medium text-gray-700">Filter by:</span>
            
            <div className="flex items-center gap-2">
              <button onClick={() => { setSelYear(prev => prev - 1); setCurrentPage(1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronLeft className="h-4 w-4" />
              </button>
              <span className="text-sm font-semibold text-gray-800 min-w-[80px] text-center">{selYear}</span>
              <button onClick={() => { setSelYear(prev => prev + 1); setCurrentPage(1); }} className="p-1 hover:bg-gray-100 rounded">
                <ChevronRight className="h-4 w-4" />
              </button>
            </div>
            
            <select
              value={selMonth}
              onChange={(e) => { setSelMonth(Number(e.target.value)); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              {MONTHS.map((m, i) => (
                <option key={i} value={i}>{m}</option>
              ))}
            </select>
            
            <select
              value={filterStatus}
              onChange={e => { setFilterStatus(e.target.value); setCurrentPage(1); }}
              className="px-3 py-1.5 border border-gray-300 rounded-lg text-sm"
            >
              <option value="all">All Businesses</option>
              <option value="inspected">Inspected</option>
              <option value="not_inspected">Not Yet Inspected</option>
              <option value="violation">With Violation</option>
              <option value="passed">Latest: Passed</option>
            </select>
            
            <div className="relative flex-1 min-w-[200px]">
              <Search className="absolute left-3 top-2 h-4 w-4 text-gray-400" />
              <input
                type="text"
                placeholder="Search business name or control #…"
                value={search}
                onChange={e => { setSearch(e.target.value); setCurrentPage(1); }}
                className="w-full pl-9 pr-8 py-1.5 border border-gray-300 rounded-lg text-sm"
              />
              {search && (
                <button onClick={() => setSearch('')} className="absolute right-2 top-2 text-gray-400">
                  <X className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>
        </div>

        <div className="bg-white rounded-xl border border-gray-200 shadow-sm">
          {isLoading ? (
            <div className="flex justify-center py-12">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-emerald-600" />
            </div>
          ) : paginated.length === 0 ? (
            <div className="text-center py-12 text-gray-400 text-sm">No businesses match the current filters</div>
          ) : (
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-100">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Business</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Hauler</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Status</th>
                    <th className="px-5 py-3 text-left text-xs font-semibold text-gray-400 uppercase tracking-wider">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-50">
                  {paginated.map(b => {
                    const inspections = inspectionMap[b.id] || [];
                    return (
                      <tr key={b.id} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-3">
                          <div className="text-sm font-medium text-gray-900">{b.establishment_name}</div>
                          <div className="text-xs text-gray-400 mt-0.5">BIN: {b.bin_number || '—'}</div>
                        </td>
                        <td className="px-5 py-3 text-sm text-gray-600">{b.hauler_type || '—'}</td>
                        <td className="px-5 py-3">
                          <button
                            onClick={() => setHistoryBusiness(b)}
                            className="hover:opacity-70 transition-opacity"
                          >
                            <StatusBadge inspections={inspections} />
                          </button>
                        </td>
                        <td className="px-5 py-3 whitespace-nowrap">
                          <button
                            onClick={() => setInspectBusiness(b)}
                            className="px-3 py-1 border border-emerald-600 text-emerald-600 text-xs rounded hover:bg-emerald-50 transition-colors"
                          >
                            Inspect
                          </button>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      </div>

      {!isLoading && totalPages > 1 && (
        <div className="fixed bottom-4 left-72 right-4 z-10">
          <div className="bg-white rounded-xl shadow-lg border border-gray-200 px-6 py-3 flex items-center justify-between">
            <span className="text-sm text-gray-700">
              Page <span className="font-medium">{currentPage}</span> of <span className="font-medium">{totalPages}</span>
              <span className="text-gray-400 ml-2">({filtered.length} records)</span>
            </span>
            <div className="flex gap-3">
              <button
                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                disabled={currentPage === 1}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${currentPage === 1 ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                <ChevronLeft className="h-4 w-4 mr-1" />Previous
              </button>
              <button
                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                disabled={currentPage === totalPages}
                className={`inline-flex items-center px-4 py-2 rounded-lg text-sm ${currentPage === totalPages ? 'bg-gray-100 text-gray-400 cursor-not-allowed' : 'bg-emerald-600 text-white hover:bg-emerald-700'}`}
              >
                Next<ChevronRight className="h-4 w-4 ml-1" />
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Inspections;