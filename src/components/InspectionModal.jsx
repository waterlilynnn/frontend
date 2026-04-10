import { useState, useEffect } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import { X, AlertTriangle, CheckCircle, ShieldCheck, AlertCircle } from 'lucide-react';
import toast from 'react-hot-toast';
import API from '../config/api';

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

function validateForm(form) {
  const errors = [];

  ['emb_ecc', 'emb_cnc', 'pamb_clearance', 'discharge_permit'].forEach(k => {
    if (!form[k]) errors.push(`DENR/LLDA: "${k.replace(/_/g, ' ').toUpperCase()}" is required`);
  });
  ['sanitary_permit', 'business_permit'].forEach(k => {
    if (!form[k]) errors.push(`City Permits: "${k.replace(/_/g, ' ').toUpperCase()}" is required`);
  });

  if (!form.swm_facilities || form.swm_facilities.length === 0)
    errors.push('Solid Waste: SWM Facilities selection is required');

  SW_HAULING_CATS.forEach(cat => {
    if (!form.sw_hauling?.[cat.key])
      errors.push(`Solid Waste: Hauling category "${cat.label}" is required`);
  });

  if (form.has_iec_materials === null)
    errors.push('Solid Waste: IEC Materials presence is required');

  if (form.proper_segregation === null)
    errors.push('Solid Waste: Proper Waste Segregation answer is required');

  if (!form.wwt_facilities || form.wwt_facilities.length === 0)
    errors.push('Wastewater: WWT Facilities selection is required');

  if (!form.desludging)
    errors.push('Wastewater: Regular Desludging Service Provider is required');
  if (form.desludging === 'Other' && !form.desludging_other?.trim())
    errors.push('Wastewater: Please specify the desludging provider');

  VIOLATIONS.forEach(v => {
    if (form.violations?.[v.key] === undefined || form.violations?.[v.key] === null)
      errors.push(`Violations: "${v.label}" must be answered`);
  });

  if (!form.summary) errors.push('Summary: Overall Compliance Status is required');
  if (form.summary === 'Other' && !form.summary_other?.trim())
    errors.push('Summary: Please specify the compliance status');

  if (!form.recommendations || form.recommendations.length === 0)
    errors.push('Summary: At least one Recommendation is required');
  if (form.recommendations.includes('Other') && !form.recommendations_other?.trim())
    errors.push('Summary: Please specify the other recommendation');

  return errors;
}

const RadioGroup = ({ options, value, onChange, name, hasError }) => (
  <div className={`flex flex-wrap gap-4 mt-1 ${hasError ? 'p-2 rounded border border-red-300 bg-red-50' : ''}`}>
    {options.map(opt => (
      <label key={opt} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
        <input type="radio" name={name} value={opt} checked={value === opt} onChange={() => onChange(opt)} className="h-4 w-4 text-emerald-700" />
        {opt}
      </label>
    ))}
  </div>
);

const CheckboxGroup = ({ items, value = [], onChange, hasError }) => {
  const toggle = (key) => {
    const next = value.includes(key) ? value.filter(k => k !== key) : [...value, key];
    onChange(next);
  };
  return (
    <div className={`flex flex-wrap gap-3 mt-1 ${hasError ? 'p-2 rounded border border-red-300 bg-red-50' : ''}`}>
      {items.map(item => (
        <label key={item.key} className="flex items-center gap-2 cursor-pointer text-sm text-gray-700">
          <input type="checkbox" checked={value.includes(item.key)} onChange={() => toggle(item.key)} className="h-4 w-4 text-emerald-700 rounded" />
          {item.label}
        </label>
      ))}
    </div>
  );
};

const FieldRow = ({ label, required, children, error }) => (
  <div className="mb-4">
    <span className="text-sm font-medium text-gray-700">
      {label}{required && <span className="text-red-500 ml-0.5">*</span>}
    </span>
    {children}
    {error && <p className="text-xs text-red-500 mt-1 flex items-center gap-1"><AlertTriangle className="h-3 w-3" />{error}</p>}
  </div>
);

const SectionNav = ({ sections, activeSection, onSectionChange, validationErrors }) => (
  <div className="flex border-b border-gray-200 bg-gray-50 rounded-t-lg">
    {sections.map(section => {
      const hasError = validationErrors.some(e => e.includes(section.errorKeyword));
      return (
        <button
          key={section.id}
          onClick={() => onSectionChange(section.id)}
          className={`relative px-5 py-3 text-sm font-medium transition-colors ${
            activeSection === section.id
              ? 'text-emerald-700 border-b-2 border-emerald-700 bg-white'
              : 'text-gray-500 hover:text-gray-700 hover:bg-gray-100'
          }`}
        >
          {section.label}
          {hasError && <span className="absolute -top-1 -right-1 h-3 w-3 rounded-full bg-red-500" />}
        </button>
      );
    })}
  </div>
);

const InspectionModal = ({ business, isOpen, onClose, onSubmitSuccess }) => {
  const qc = useQueryClient();
  const [form, setForm] = useState(EMPTY_FORM);
  const [submitting, setSubmitting] = useState(false);
  const [activeSection, setActiveSection] = useState('permits');
  const [validationErrors, setValidationErrors] = useState([]);
  const [showValidation, setShowValidation] = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));
  const hasAnyViolation = Object.values(form.violations || {}).some(Boolean);

  const sections = [
    { id: 'permits', label: 'Permits', errorKeyword: 'DENR/LLDA|City Permits' },
    { id: 'solid_waste', label: 'Solid Waste', errorKeyword: 'Solid Waste' },
    { id: 'wastewater', label: 'Wastewater', errorKeyword: 'Wastewater' },
    { id: 'violations', label: 'Violations', errorKeyword: 'Violations' },
    { id: 'summary', label: 'Summary', errorKeyword: 'Summary' },
  ];

  useEffect(() => {
    if (!isOpen) {
      setForm(EMPTY_FORM);
      setActiveSection('permits');
      setValidationErrors([]);
      setShowValidation(false);
    }
  }, [isOpen]);

  const handleSubmit = async () => {
    const errors = validateForm(form);
    if (errors.length > 0) {
      setValidationErrors(errors);
      setShowValidation(true);
      const sectionOrder = ['permits', 'solid_waste', 'wastewater', 'violations', 'summary'];
      for (const sec of sectionOrder) {
        const secErrors = errors.filter(e => sections.find(s => s.id === sec)?.errorKeyword.split('|').some(kw => e.includes(kw)));
        if (secErrors.length > 0) {
          setActiveSection(sec);
          break;
        }
      }
      return;
    }

    setSubmitting(true);
    try {
      await API.post(`/inspections/business/${business.id}/checklist`, form);
      toast.success('Inspection submitted successfully');
      qc.invalidateQueries(['allInspections']);
      qc.invalidateQueries(['allBizInspections']);
      qc.invalidateQueries(['businessInspections', business.id]);
      onSubmitSuccess?.();
      onClose();
    } catch (err) {
      toast.error(err.response?.data?.detail || 'Failed to submit inspection');
    } finally {
      setSubmitting(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-xl w-full max-w-3xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between px-6 py-4 border-b border-gray-200 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-t-xl">
          <div>
            <h2 className="text-lg font-semibold text-emerald-800 flex items-center gap-2">
              <ShieldCheck className="h-5 w-5" />
              Environmental Compliance Inspection
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">{business?.establishment_name}</p>
          </div>
          <button onClick={onClose} className="p-1.5 text-gray-400 hover:text-gray-600 rounded-lg hover:bg-gray-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        {showValidation && validationErrors.length > 0 && (
          <div className="mx-6 mt-4 p-3 bg-red-50 border border-red-200 rounded-lg">
            <div className="flex items-center gap-2 mb-1">
              <AlertTriangle className="h-4 w-4 text-red-600" />
              <span className="text-sm font-semibold text-red-700">
                {validationErrors.length} field{validationErrors.length > 1 ? 's' : ''} need attention
              </span>
            </div>
            <ul className="text-xs text-red-600 space-y-0.5 max-h-20 overflow-y-auto">
              {validationErrors.slice(0, 5).map((e, i) => <li key={i}>• {e}</li>)}
              {validationErrors.length > 5 && <li>• and {validationErrors.length - 5} more...</li>}
            </ul>
          </div>
        )}

        <div className="bg-gray-50 px-6 py-3 border-b border-gray-200">
          <div className="grid grid-cols-3 gap-3 text-xs">
            <div><span className="text-gray-500">Establishment:</span> <span className="font-medium">{business?.establishment_name}</span></div>
            <div><span className="text-gray-500">BIN:</span> <span className="font-mono">{business?.bin_number || '—'}</span></div>
            <div><span className="text-gray-500">Hauler:</span> <span className="font-medium">{business?.hauler_type || '—'}</span></div>
            <div><span className="text-gray-500">Control #:</span> <span className="font-mono">{business?.control_number || '—'}</span></div>
            <div><span className="text-gray-500">Date:</span> <span className="font-medium">{new Date().toLocaleDateString()}</span></div>
            <div><span className="text-gray-500">Inspector:</span> <span className="font-medium">{JSON.parse(localStorage.getItem('user') || '{}').full_name || 'Current User'}</span></div>
          </div>
        </div>

        <SectionNav sections={sections} activeSection={activeSection} onSectionChange={setActiveSection} validationErrors={validationErrors} />

        <div className="flex-1 overflow-y-auto px-6 py-5 space-y-5">
          {activeSection === 'permits' && (
            <div className="space-y-4">
              <div className="bg-blue-50 p-3 rounded-lg">
                <p className="text-sm font-medium text-blue-800">DENR / LLDA Permits <span className="text-red-500">— all required</span></p>
              </div>
              {[
                { key: 'emb_ecc', label: 'EMB-ECC' },
                { key: 'emb_cnc', label: 'EMB-CNC' },
                { key: 'pamb_clearance', label: 'PAMB Clearance' },
                { key: 'discharge_permit', label: 'Discharge Permit' },
              ].map(({ key, label }) => (
                <FieldRow key={key} label={label} required error={showValidation && !form[key] ? 'Selection required' : null}>
                  <RadioGroup options={PERMIT_OPTIONS} value={form[key]} onChange={v => set(key, v)} hasError={showValidation && !form[key]} />
                </FieldRow>
              ))}

              <div className="bg-blue-50 p-3 rounded-lg mt-4">
                <p className="text-sm font-medium text-blue-800">City Permits <span className="text-red-500">— all required</span></p>
              </div>
              {[
                { key: 'sanitary_permit', label: 'Sanitary Permit' },
                { key: 'business_permit', label: 'Business Permit' },
              ].map(({ key, label }) => (
                <FieldRow key={key} label={label} required error={showValidation && !form[key] ? 'Selection required' : null}>
                  <RadioGroup options={CITY_PERMIT_OPTIONS} value={form[key]} onChange={v => set(key, v)} hasError={showValidation && !form[key]} />
                </FieldRow>
              ))}
            </div>
          )}

          {activeSection === 'solid_waste' && (
            <div className="space-y-4">
              <FieldRow label="Solid Waste Management Facilities" required error={showValidation && (!form.swm_facilities || form.swm_facilities.length === 0) ? 'Select at least one option' : null}>
                <CheckboxGroup items={SWM_ITEMS} value={form.swm_facilities} onChange={v => set('swm_facilities', v)} hasError={showValidation && (!form.swm_facilities || form.swm_facilities.length === 0)} />
              </FieldRow>

              <div className="bg-gray-50 p-4 rounded-lg">
                <p className="text-sm font-medium text-gray-700 mb-3">Solid Waste Hauling <span className="text-red-500">— all required</span></p>
                {SW_HAULING_CATS.map(cat => (
                  <FieldRow key={cat.key} label={cat.label} required error={showValidation && !form.sw_hauling?.[cat.key] ? 'Selection required' : null}>
                    <RadioGroup options={SW_HAULER_OPTS} value={form.sw_hauling?.[cat.key] || null} onChange={v => set('sw_hauling', { ...form.sw_hauling, [cat.key]: v })} hasError={showValidation && !form.sw_hauling?.[cat.key]} />
                  </FieldRow>
                ))}
              </div>

              <FieldRow label="Presence of IEC Materials" required error={showValidation && form.has_iec_materials === null ? 'Selection required' : null}>
                <RadioGroup options={['YES', 'NO']} value={form.has_iec_materials === null ? null : form.has_iec_materials ? 'YES' : 'NO'} onChange={v => set('has_iec_materials', v === 'YES')} hasError={showValidation && form.has_iec_materials === null} />
              </FieldRow>

              <FieldRow label="Proper Waste Segregation" required error={showValidation && form.proper_segregation === null ? 'Selection required' : null}>
                <RadioGroup options={['YES', 'NO']} value={form.proper_segregation === null ? null : form.proper_segregation ? 'YES' : 'NO'} onChange={v => set('proper_segregation', v === 'YES')} hasError={showValidation && form.proper_segregation === null} />
              </FieldRow>
            </div>
          )}

          {activeSection === 'wastewater' && (
            <div className="space-y-4">
              <FieldRow label="Wastewater Treatment Facilities" required error={showValidation && (!form.wwt_facilities || form.wwt_facilities.length === 0) ? 'Select at least one option' : null}>
                <CheckboxGroup items={WWT_ITEMS} value={form.wwt_facilities} onChange={v => set('wwt_facilities', v)} hasError={showValidation && (!form.wwt_facilities || form.wwt_facilities.length === 0)} />
              </FieldRow>

              <FieldRow label="Regular Desludging Service Provider" required error={showValidation && !form.desludging ? 'Selection required' : null}>
                <RadioGroup options={['TCWD/PRIME', 'N/A', 'Other']} value={form.desludging} onChange={v => set('desludging', v)} hasError={showValidation && !form.desludging} />
                {form.desludging === 'Other' && (
                  <input type="text" value={form.desludging_other} onChange={e => set('desludging_other', e.target.value)} placeholder="Specify provider..." className={`mt-2 w-full px-3 py-2 border rounded-lg text-sm ${showValidation && !form.desludging_other?.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                )}
              </FieldRow>
            </div>
          )}

          {activeSection === 'violations' && (
            <div className="space-y-3">
              <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
                <p className="text-sm text-amber-800 font-medium flex items-center gap-2">
                  <AlertTriangle className="h-4 w-4" />
                  All violations must be answered YES or NO
                </p>
              </div>
              {VIOLATIONS.map(v => {
                const val = form.violations?.[v.key];
                const missing = showValidation && (val === undefined || val === null);
                return (
                  <div key={v.key} className={`flex items-center justify-between p-3 rounded-lg ${missing ? 'bg-red-50 border border-red-200' : 'hover:bg-gray-50'}`}>
                    <span className="text-sm text-gray-700 flex-1 pr-4">{v.label}</span>
                    <RadioGroup options={['YES', 'NO']} value={val ? 'YES' : val === false ? 'NO' : null} onChange={val2 => set('violations', { ...form.violations, [v.key]: val2 === 'YES' })} hasError={missing} />
                  </div>
                );
              })}
              {hasAnyViolation && (
                <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-sm text-red-700 flex items-start gap-2">
                  <AlertCircle className="h-4 w-4 mt-0.5 shrink-0" />
                  Violations detected — business violation flag will be auto-updated.
                </div>
              )}
            </div>
          )}

          {activeSection === 'summary' && (
            <div className="space-y-5">
              <FieldRow label="Overall Compliance Status" required error={showValidation && !form.summary ? 'Selection required' : null}>
                <div className="space-y-2">
                  {SUMMARIES.map(s => (
                    <label key={s} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input type="radio" name="summary" value={s} checked={form.summary === s} onChange={() => set('summary', s)} className="mt-0.5 h-4 w-4 text-emerald-700 shrink-0" />
                      <span className="text-sm text-gray-700">{s}</span>
                    </label>
                  ))}
                </div>
                {form.summary === 'Other' && (
                  <input type="text" value={form.summary_other} onChange={e => set('summary_other', e.target.value)} placeholder="Specify..." className={`mt-2 w-full px-3 py-2 border rounded-lg text-sm ${showValidation && !form.summary_other?.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                )}
              </FieldRow>

              <FieldRow label="Recommendations" required error={showValidation && (!form.recommendations || form.recommendations.length === 0) ? 'Select at least one recommendation' : null}>
                <div className="space-y-2">
                  {RECOMMENDATIONS.map(r => (
                    <label key={r} className="flex items-start gap-3 cursor-pointer p-2 rounded-lg hover:bg-gray-50">
                      <input type="checkbox" checked={form.recommendations.includes(r)} onChange={() => {
                        const next = form.recommendations.includes(r) ? form.recommendations.filter(x => x !== r) : [...form.recommendations, r];
                        set('recommendations', next);
                      }} className="mt-0.5 h-4 w-4 text-emerald-700 rounded shrink-0" />
                      <span className="text-sm text-gray-700">{r}</span>
                    </label>
                  ))}
                </div>
                {form.recommendations.includes('Other') && (
                  <input type="text" value={form.recommendations_other} onChange={e => set('recommendations_other', e.target.value)} placeholder="Specify other recommendation..." className={`mt-2 w-full px-3 py-2 border rounded-lg text-sm ${showValidation && !form.recommendations_other?.trim() ? 'border-red-400 bg-red-50' : 'border-gray-300'}`} />
                )}
              </FieldRow>
            </div>
          )}
        </div>

        <div className="px-6 py-4 border-t border-gray-200 flex justify-between items-center bg-gray-50 rounded-b-xl">
          <div className="text-xs text-gray-400">
            {showValidation && validationErrors.length > 0
              ? <span className="text-red-500 font-medium">{validationErrors.length} field{validationErrors.length > 1 ? 's' : ''} incomplete</span>
              : 'All fields marked * are required'}
          </div>
          <div className="flex gap-3">
            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50">
              Cancel
            </button>
            <button onClick={handleSubmit} disabled={submitting} className="px-5 py-2 bg-emerald-700 text-white rounded-lg text-sm hover:bg-emerald-800 disabled:opacity-50 flex items-center gap-2">
              {submitting && <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />}
              {submitting ? 'Submitting...' : 'Submit Inspection'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InspectionModal;