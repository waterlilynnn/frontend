import SearchableSelect from './SearchableSelect';
import BinNumberInput from './BinNumberInput';
import RequirementsChecklist from './RequirementsChecklist';
import { Building2, User, MapPin, ClipboardList } from 'lucide-react';

const SECTION_HEADER = 'font-medium text-gray-900 mb-4 flex items-center gap-2 text-sm';
const LABEL = 'block text-sm font-medium text-gray-700 mb-1';
const INPUT =
  'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none';
const REQUIRED = <span className="text-red-500 ml-0.5">*</span>;

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
  const { barangays = [], businessLines = [], haulerTypes = [] } = options;

  return (
    <form onSubmit={onSubmit} className="space-y-0">
      <div className="mb-6">
        <h3 className={SECTION_HEADER}>
          <Building2 className="h-4 w-4 text-emerald-600" />
          Business Information
        </h3>

        {/* Application Type */}
        <div className="mb-4">
          <label className={LABEL}>
            Application Type {REQUIRED}
          </label>
          <div className="flex gap-6">
            {['NEW', 'RENEWAL'].map((type) => (
              <label key={type} className="inline-flex items-center gap-2 cursor-pointer">
                <input
                  type="radio"
                  name="application_type"
                  value={type}
                  checked={formData.application_type === type}
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
            <label className={LABEL}>Establishment Name {REQUIRED}</label>
            <input
              type="text"
              required
              value={formData.establishment_name || ''}
              onChange={(e) => onChange('establishment_name', e.target.value)}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Hauler Type {REQUIRED}</label>
            <select
              required
              value={formData.hauler_type || ''}
              onChange={(e) => onChange('hauler_type', e.target.value)}
              className={INPUT}
            >
              {haulerTypes.map((type) => (
                <option key={type} value={type}>
                  {type}
                </option>
              ))}
            </select>
          </div>
        </div>

        {/* Business Line & BIN Number */}
        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Business Line {REQUIRED}</label>
            <SearchableSelect
              options={businessLines}
              value={formData.business_line || ''}
              onChange={(value) => onChange('business_line', value)}
              placeholder="Select business line"
              required
            />
          </div>
          <div>
            <label className={LABEL}>
              BIN Number <span className="text-red-500">*</span>
            </label>
            <BinNumberInput
              value={formData.bin_number || ''}
              onChange={(value) => onChange('bin_number', value)}
              required={true}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 pt-4 border-t border-gray-100">
        <h3 className={SECTION_HEADER}>
          <User className="h-4 w-4 text-emerald-600" />
          Owner Information
        </h3>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Last Name {REQUIRED}</label>
            <input
              type="text"
              required
              value={formData.owner_last_name || ''}
              onChange={(e) => onChange('owner_last_name', e.target.value.toUpperCase())}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>First Name {REQUIRED}</label>
            <input
              type="text"
              required
              value={formData.owner_first_name || ''}
              onChange={(e) => onChange('owner_first_name', e.target.value.toUpperCase())}
              className={INPUT}
            />
          </div>
        </div>

        <div className="grid grid-cols-2 gap-4">
          <div>
            <label className={LABEL}>Middle Name</label>
            <input
              type="text"
              value={formData.owner_middle_name || ''}
              onChange={(e) => onChange('owner_middle_name', e.target.value.toUpperCase())}
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Suffix</label>
            <input
              type="text"
              value={formData.owner_suffix || ''}
              onChange={(e) => onChange('owner_suffix', e.target.value)}
              placeholder="Jr., Sr., III"
              className={INPUT}
            />
          </div>
        </div>
      </div>

      <div className="mb-6 pt-4 border-t border-gray-100">
        <h3 className={SECTION_HEADER}>
          <MapPin className="h-4 w-4 text-emerald-600" />
          Location &amp; Contact
        </h3>

        <div className="mb-4">
          <label className={LABEL}>Barangay {REQUIRED}</label>
          <SearchableSelect
            options={barangays}
            value={formData.location || ''}
            onChange={(value) => onChange('location', value)}
            placeholder="Select barangay"
            required
          />
        </div>

        <div className="grid grid-cols-2 gap-4 mb-4">
          <div>
            <label className={LABEL}>Contact Number {REQUIRED}</label>
            <input
              type="tel"
              required
              value={formData.contact_number || ''}
              onChange={(e) => onChange('contact_number', e.target.value)}
              placeholder="09XXXXXXXXX"
              className={INPUT}
            />
          </div>
          <div>
            <label className={LABEL}>Email {REQUIRED}</label>
            <input
              type="email"
              required
              value={formData.email || ''}
              onChange={(e) => onChange('email', e.target.value)}
              placeholder="owner@example.com"
              className={INPUT}
            />
          </div>
        </div>

        <label className="flex items-center gap-2 cursor-pointer">
          <input
            type="checkbox"
            checked={formData.has_own_structure || false}
            onChange={(e) => onChange('has_own_structure', e.target.checked)}
            className="h-4 w-4 text-emerald-600 rounded"
          />
          <span className="text-sm text-gray-700">Owns the building / structure</span>
        </label>
      </div>

      {mode === 'edit' && businessId && (
        <div className="mb-6 pt-4 border-t border-gray-100">
          <RequirementsChecklist businessId={businessId} mode="edit" />
        </div>
      )}

      <div className="flex justify-end gap-3 pt-6 border-t border-gray-100">
        <button
          type="button"
          onClick={onCancel}
          className="px-4 py-2 border border-gray-300 rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
        >
          Cancel
        </button>
        <button
          type="submit"
          disabled={isSubmitting}
          className="px-4 py-2 bg-emerald-600 text-white rounded-lg text-sm hover:bg-emerald-700
                     disabled:opacity-50 flex items-center gap-2 transition-colors"
        >
          {isSubmitting && (
            <span className="h-4 w-4 border-2 border-white border-t-transparent rounded-full animate-spin" />
          )}
          {isSubmitting
            ? mode === 'create'
              ? 'Creating…'
              : 'Saving…'
            : mode === 'create'
            ? 'Create Record'
            : 'Save Changes'}
        </button>
      </div>
    </form>
  );
};

export default BusinessForm;