import SearchableSelect from './SearchableSelect';
import BinNumberInput from './BinNumberInput';
import { Building2, User, MapPin } from 'lucide-react';
import { useQuery } from '@tanstack/react-query';
import API from '../config/api';

const LBL  = 'block text-sm font-medium text-gray-700 mb-1';
const IN   = 'w-full px-3 py-2 border border-gray-200 rounded-lg text-sm focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 outline-none transition';
const REQ  = <span className="text-red-500 ml-0.5">*</span>;
const SEC  = 'font-medium text-gray-800 mb-4 flex items-center gap-2 text-sm';

const BusinessForm = ({
  mode = 'create',
  formData,
  onChange,
  onSubmit,
  onCancel,
  isSubmitting = false,
  options = {},
  businessId = null,
}) => {
  const barangays   = options?.barangays   || [];
  const haulerTypes = options?.haulerTypes || [];

  /* business lines: fetch from DB-aware public endpoint */
  const { data: businessLines = [] } = useQuery({
    queryKey: ['businessLinesOptions'],
    queryFn:  async () => {
      const res = await API.get('/options/business-lines');
      return res.data.business_lines || [];
    },
    staleTime: 5 * 60 * 1000,
    initialData: options?.businessLines || [],
  });

  return (
    <form onSubmit={onSubmit} className="space-y-0">

      {/* Business Information */}
      <div className="mb-6">
        <h3 className={SEC}>
          <Building2 className="h-4 w-4 text-emerald-600" />
          Business Information
        </h3>

        {/* Application Type */}
        <div className="mb-4">
          <label className={LBL}>Application Type {REQ}</label>
          <div className="flex gap-6">
            {['NEW', 'RENEWAL'].map((type) => (
              <label key={type} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="application_type"
                  value={type}
                  checked={(formData?.application_type || 'NEW') === type}
                  onChange={(e) => onChange('application_type', e.target.value)}
                  className="h-4 w-4 text-emerald-600"
                />
                <span className="text-sm text-gray-700">{type === 'NEW' ? 'New' : 'Renewal'}</span>
              </label>
            ))}
          </div>
        </div>

        {/* Establishment Name & Hauler Type */}
        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LBL}>Establishment Name {REQ}</label>
            <input
              type="text"
              required
              value={formData?.establishment_name || ''}
              onChange={(e) => onChange('establishment_name', e.target.value.toUpperCase())}
              className={IN}
            />
          </div>
          <div>
            <label className={LBL}>Hauler Type {REQ}</label>
            <select
              required
              value={formData?.hauler_type || ''}
              onChange={(e) => onChange('hauler_type', e.target.value)}
              className={IN}
              disabled={haulerTypes.length === 0}
            >
              {haulerTypes.length === 0 && <option value="">Loading…</option>}
              {haulerTypes.map((t) => <option key={t} value={t}>{t}</option>)}
            </select>
          </div>
        </div>

        {/* Business Line & BIN */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LBL}>Business Line {REQ}</label>
            <SearchableSelect
              options={businessLines}
              value={formData?.business_line || ''}
              onChange={(v) => onChange('business_line', v)}
              placeholder={businessLines.length === 0 ? 'Loading…' : 'Select business line'}
              required
            />
          </div>
          <div>
            <label className={LBL}>BIN Number {REQ}</label>
            <BinNumberInput
              value={formData?.bin_number || ''}
              onChange={(v) => onChange('bin_number', v)}
              required
            />
          </div>
        </div>
      </div>

      {/* Owner Information */}
      <div className="mb-6 pt-4 border-t border-gray-100">
        <h3 className={SEC}>
          <User className="h-4 w-4 text-emerald-600" />
          Owner Information
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LBL}>Last Name {REQ}</label>
            <input
              type="text"
              required
              value={formData?.owner_last_name || ''}
              onChange={(e) => onChange('owner_last_name', e.target.value.toUpperCase())}
              className={IN}
            />
          </div>
          <div>
            <label className={LBL}>First Name {REQ}</label>
            <input
              type="text"
              required
              value={formData?.owner_first_name || ''}
              onChange={(e) => onChange('owner_first_name', e.target.value.toUpperCase())}
              className={IN}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LBL}>Middle Name</label>
            <input
              type="text"
              value={formData?.owner_middle_name || ''}
              onChange={(e) => onChange('owner_middle_name', e.target.value.toUpperCase())}
              className={IN}
            />
          </div>
          <div>
            <label className={LBL}>Suffix</label>
            <input
              type="text"
              value={formData?.owner_suffix || ''}
              onChange={(e) => onChange('owner_suffix', e.target.value)}
              placeholder="Jr., Sr., III"
              className={IN}
            />
          </div>
        </div>
      </div>

      {/* Location & Contact */}
      <div className="mb-6 pt-4 border-t border-gray-100">
        <h3 className={SEC}>
          <MapPin className="h-4 w-4 text-emerald-600" />
          Location &amp; Contact
        </h3>

        <div className="mb-4">
          <label className={LBL}>Barangay {REQ}</label>
          <SearchableSelect
            options={barangays}
            value={formData?.location || ''}
            onChange={(v) => onChange('location', v)}
            placeholder={barangays.length === 0 ? 'Loading…' : 'Select barangay'}
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LBL}>Contact Number</label>
            <input
              type="tel"
              value={formData?.contact_number || ''}
              onChange={(e) => onChange('contact_number', e.target.value)}
              placeholder="09XXXXXXXXX"
              className={IN}
            />
          </div>
          <div>
            <label className={LBL}>Email</label>
            <input
              type="email"
              value={formData?.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="owner@example.com"
              className={IN}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData?.has_own_structure || false}
            onChange={(e) => onChange('has_own_structure', e.target.checked)}
            className="h-4 w-4 text-emerald-600 rounded"
          />
          <span className="text-sm text-gray-700">Owns the building / structure</span>
        </label>
      </div>

      {/* Footer */}
      <div className="flex justify-end gap-3 pt-5 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-200 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm font-medium
                     hover:bg-emerald-700 disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isSubmitting && (
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isSubmitting
            ? (mode === 'create' ? 'Creating…' : 'Saving…')
            : (mode === 'create' ? 'Create Record' : 'Save Changes')}
        </button>
      </div>
    </form>
  );
};

export default BusinessForm;