import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import API from '../config/api';
import SearchableSelect from './SearchableSelect';
import { RequirementsStatusBanner, RequirementsModal } from './RequirementsSection';
import {
  ArrowLeft, User, MapPin, Edit, Building2, ClipboardList,
} from 'lucide-react';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

const BusinessDetails = ({ backPath = '/staff/business' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [showRequirementsModal, setShowRequirementsModal] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: business, isLoading, refetch } = useQuery({
    queryKey: ['business', id],
    queryFn: async () => (await API.get(`/business-records/${id}`)).data,
  });

  const { data: options } = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const [barangays, businessLines, haulerTypes] = await Promise.all([
        API.get('/options/barangays'),
        API.get('/options/business-lines'),
        API.get('/options/hauler-types'),
      ]);
      return {
        barangays:     barangays.data.barangays          || [],
        businessLines: businessLines.data.business_lines || [],
        haulerTypes:   haulerTypes.data.hauler_types     || [],
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const updateData = {
        ...data,
        owner_last_name:   data.owner_last_name?.toUpperCase(),
        owner_first_name:  data.owner_first_name?.toUpperCase(),
        owner_middle_name: data.owner_middle_name?.toUpperCase() || null,
      };
      return (await API.put(`/business-records/${id}`, updateData)).data;
    },
    onSuccess: () => { toast.success('Business record updated'); setIsEditing(false); refetch(); },
    onError:   (error) => toast.error(error.response?.data?.detail || 'Update failed'),
  });

  useEffect(() => {
    if (business) {
      setFormData({
        establishment_name: business.establishment_name || '',
        business_line:      business.business_line      || '',
        bin_number:         business.bin_number         || '',
        owner_last_name:    business.owner_last_name    || '',
        owner_first_name:   business.owner_first_name   || '',
        owner_middle_name:  business.owner_middle_name  || '',
        owner_suffix:       business.owner_suffix        || '',
        contact_number:     business.contact_number      || '',
        email:              business.email               || '',
        location:           business.location            || '',
        hauler_type:        business.hauler_type         || '',
        application_type:   business.application_type   || 'NEW',
        has_own_structure:  business.has_own_structure   || false,
      });
    }
  }, [business]);

  const handleSave = () => updateMutation.mutate(formData);
  const handleInputChange = (field, value) => setFormData(prev => ({ ...prev, [field]: value }));

  const cancelEdit = () => {
    setIsEditing(false);
    if (business) setFormData({
      establishment_name: business.establishment_name || '',
      business_line:      business.business_line      || '',
      bin_number:         business.bin_number         || '',
      owner_last_name:    business.owner_last_name    || '',
      owner_first_name:   business.owner_first_name   || '',
      owner_middle_name:  business.owner_middle_name  || '',
      owner_suffix:       business.owner_suffix       || '',
      contact_number:     business.contact_number     || '',
      email:              business.email              || '',
      location:           business.location           || '',
      hauler_type:        business.hauler_type        || '',
      application_type:   business.application_type  || 'NEW',
      has_own_structure:  business.has_own_structure  || false,
    });
  };

  if (isLoading) return <div className="flex justify-center items-center h-64"><div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-700" /></div>;
  if (!business) return <div className="text-center py-12"><p className="text-gray-500">Business not found</p></div>;

  const getDisplayOwnerName = () => {
    if (business.owner_last_name && business.owner_first_name) {
      let name = `${business.owner_last_name}, ${business.owner_first_name}`;
      if (business.owner_middle_name) name += ` ${business.owner_middle_name[0]}.`;
      if (business.owner_suffix)      name += ` ${business.owner_suffix}`;
      return name;
    }
    return business.owner_name_raw || '—';
  };

  const IN = 'w-full px-3 py-2 border border-gray-300 rounded-lg text-sm focus:ring-emerald-500 focus:border-emerald-500 outline-none';
  const LBL = 'block text-sm font-medium text-gray-700 mb-1';

  return (
    <div className="max-w-5xl mx-auto space-y-4 pb-24">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <button onClick={() => navigate(backPath)} className="inline-flex items-center text-gray-600 hover:text-gray-900 text-sm">
          <ArrowLeft className="h-4 w-4 mr-1" />Back to Business Records
        </button>
        <div className="flex flex-wrap gap-2">
          <button onClick={() => setShowRequirementsModal(true)}
            className="inline-flex items-center px-3 py-2 border border-emerald-700 text-emerald-700 rounded-lg hover:bg-forest-50 text-sm">
            <ClipboardList className="h-4 w-4 mr-1.5" />Requirements
          </button>
          {!isEditing ? (
            <button onClick={() => setIsEditing(true)}
              className="inline-flex items-center px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">
              <Edit className="h-4 w-4 mr-1.5" />Edit Record
            </button>
          ) : (
            <>
              <button onClick={cancelEdit} className="px-3 py-2 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 text-sm">Cancel</button>
              <button onClick={handleSave} disabled={updateMutation.isLoading}
                className="px-3 py-2 bg-emerald-700 text-white rounded-lg hover:bg-emerald-800 disabled:opacity-50 text-sm flex items-center gap-1.5">
                {updateMutation.isLoading && <span className="animate-spin h-4 w-4 border-2 border-white border-t-transparent rounded-full" />}
                {updateMutation.isLoading ? 'Saving...' : 'Save Changes'}
              </button>
            </>
          )}
        </div>
      </div>

      {/* Requirements banner */}
      <RequirementsStatusBanner businessId={id} />

      {/* Main card */}
      <div className="bg-white rounded-lg shadow-sm p-4 sm:p-6">
        {!isEditing ? (
          // VIEW MODE
          <>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">{business.establishment_name}</h2>

            {/* Key info grid */}
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 mb-6">
              {[
                { label: 'Control Number',   value: business.control_number || '—', mono: true },
                { label: 'Application Type', value: business.application_type || 'NEW' },
                { label: 'Hauler Type',      value: business.hauler_type || '—' },
                { label: 'Business Line',    value: business.business_line || '—' },
                { label: 'Date Applied',     value: business.application_date ? format(new Date(business.application_date), 'MMM dd, yyyy') : '—' },
                { label: 'Valid Until',      value: business.validity ? format(new Date(business.validity), 'MMM dd, yyyy') : '—' },
              ].map(({ label, value, mono }) => (
                <div key={label}>
                  <p className="text-xs text-gray-500 uppercase mb-1">{label}</p>
                  <p className={`text-sm ${mono ? 'font-mono' : ''}`}>{value}</p>
                </div>
              ))}
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm"><Building2 className="h-4 w-4 text-emerald-700" />Business Information</h3>
              <div className="grid grid-cols-2 gap-3">
                <div><p className="text-xs text-gray-500 mb-0.5">BIN Number</p><p className="text-sm font-mono">{business.bin_number || '—'}</p></div>
                <div><p className="text-xs text-gray-500 mb-0.5">Hauler Type</p><p className="text-sm">{business.hauler_type || '—'}</p></div>
              </div>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm"><User className="h-4 w-4 text-emerald-700" />Owner Information</h3>
              <p className="text-sm text-gray-900">{getDisplayOwnerName()}</p>
            </div>

            <div className="border-t border-gray-200 pt-4 mt-4">
              <h3 className="font-medium text-gray-900 mb-3 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-emerald-700" />Location & Contact</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div className="sm:col-span-2"><p className="text-xs text-gray-500 mb-0.5">Barangay</p><p className="text-sm">{business.location || '—'}</p></div>
                <div><p className="text-xs text-gray-500 mb-0.5">Contact Number</p><p className="text-sm">{business.contact_number || '—'}</p></div>
                <div><p className="text-xs text-gray-500 mb-0.5">Email</p><p className="text-sm break-all">{business.email || '—'}</p></div>
                <div><p className="text-xs text-gray-500 mb-0.5">Own Structure</p><p className="text-sm">{business.has_own_structure ? 'Yes' : 'No'}</p></div>
              </div>
            </div>
          </>
        ) : (
          // EDIT MODE
          <>
            <h2 className="text-lg sm:text-xl font-bold text-gray-800 mb-4">Edit Business Record</h2>

            {/* Application Type */}
            <div className="mb-4">
              <label className={LBL}>Application Type <span className="text-red-500">*</span></label>
              <div className="flex gap-6">
                {['NEW', 'RENEWAL'].map(type => (
                  <label key={type} className="inline-flex items-center gap-2 cursor-pointer">
                    <input type="radio" name="application_type" value={type}
                      checked={formData.application_type === type}
                      onChange={(e) => handleInputChange('application_type', e.target.value)}
                      className="h-4 w-4 text-emerald-700" />
                    <span className="text-sm text-gray-700">{type === 'NEW' ? 'New' : 'Renewal'}</span>
                  </label>
                ))}
              </div>
            </div>

            {/* Business info */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
              <div>
                <label className={LBL}>Establishment Name <span className="text-red-500">*</span></label>
                <input type="text" value={formData.establishment_name || ''} onChange={(e) => handleInputChange('establishment_name', e.target.value)} className={IN} required />
              </div>
              <div>
                <label className={LBL}>Hauler Type <span className="text-red-500">*</span></label>
                <select value={formData.hauler_type || ''} onChange={(e) => handleInputChange('hauler_type', e.target.value)} className={IN} required>
                  {options?.haulerTypes?.map(t => <option key={t} value={t}>{t}</option>)}
                </select>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-6">
              <div>
                <label className={LBL}>Business Line <span className="text-red-500">*</span></label>
                <SearchableSelect options={options?.businessLines || []} value={formData.business_line || ''} onChange={(v) => handleInputChange('business_line', v)} placeholder="Select business line" required />
              </div>
              <div>
                <label className={LBL}>BIN Number</label>
                <input type="text" value={formData.bin_number || ''} onChange={(e) => handleInputChange('bin_number', e.target.value)} className={IN} placeholder="e.g., 0402119-2011-0000466" />
              </div>
            </div>

            {/* Owner info */}
            <div className="border-t border-gray-200 pt-4 mb-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2 text-sm"><User className="h-4 w-4 text-emerald-700" />Owner Information</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={LBL}>Last Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.owner_last_name || ''} onChange={(e) => handleInputChange('owner_last_name', e.target.value.toUpperCase())} className={IN} required />
                </div>
                <div>
                  <label className={LBL}>First Name <span className="text-red-500">*</span></label>
                  <input type="text" value={formData.owner_first_name || ''} onChange={(e) => handleInputChange('owner_first_name', e.target.value.toUpperCase())} className={IN} required />
                </div>
                <div>
                  <label className={LBL}>Middle Name</label>
                  <input type="text" value={formData.owner_middle_name || ''} onChange={(e) => handleInputChange('owner_middle_name', e.target.value.toUpperCase())} className={IN} />
                </div>
                <div>
                  <label className={LBL}>Suffix</label>
                  <input type="text" value={formData.owner_suffix || ''} onChange={(e) => handleInputChange('owner_suffix', e.target.value)} className={IN} placeholder="Jr., Sr., III" />
                </div>
              </div>
            </div>

            {/* Location & Contact */}
            <div className="border-t border-gray-200 pt-4">
              <h3 className="font-medium text-gray-900 mb-4 flex items-center gap-2 text-sm"><MapPin className="h-4 w-4 text-emerald-700" />Location & Contact</h3>
              <div className="mb-4">
                <label className={LBL}>Barangay <span className="text-red-500">*</span></label>
                <SearchableSelect options={options?.barangays || []} value={formData.location || ''} onChange={(v) => handleInputChange('location', v)} placeholder="Select barangay" required />
              </div>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 mb-4">
                <div>
                  <label className={LBL}>Contact Number</label>
                  <input type="text" value={formData.contact_number || ''} onChange={(e) => handleInputChange('contact_number', e.target.value)} className={IN} placeholder="09171234567" />
                </div>
                <div>
                  <label className={LBL}>Email</label>
                  <input type="email" value={formData.email || ''} onChange={(e) => handleInputChange('email', e.target.value)} className={IN} placeholder="business@email.com" />
                </div>
              </div>
              <label className="flex items-center gap-2 cursor-pointer">
                <input type="checkbox" checked={formData.has_own_structure || false} onChange={(e) => handleInputChange('has_own_structure', e.target.checked)} className="h-4 w-4 text-emerald-700 rounded" />
                <span className="text-sm text-gray-700">Owns the building/structure</span>
              </label>
            </div>
          </>
        )}
      </div>

      <RequirementsModal businessId={id} isOpen={showRequirementsModal} onClose={() => setShowRequirementsModal(false)} />
    </div>
  );
};

export default BusinessDetails;