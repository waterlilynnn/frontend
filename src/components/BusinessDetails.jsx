import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useQuery, useMutation } from '@tanstack/react-query';
import { format } from 'date-fns';
import toast from 'react-hot-toast';

import API from '../config/api';
import BusinessForm from './BusinessForm';
import RequirementsChecklist from './RequirementsChecklist';
import {
  ArrowLeft,
  Edit,
  Building2,
  User,
  MapPin,
  AlertTriangle,
  CheckCircle2,
} from 'lucide-react';

const DETAIL_LABEL = 'text-xs text-gray-500 uppercase tracking-wide mb-0.5';
const DETAIL_VALUE = 'text-sm text-gray-900';

const BusinessDetails = ({ rolePrefix = 'staff' }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const [isEditing, setIsEditing] = useState(false);
  const [formData, setFormData] = useState({});

  const { data: business, isLoading, refetch } = useQuery({
    queryKey: ['business', id],
    queryFn: async () => {
      const res = await API.get(`/business-records/${id}`);
      return res.data;
    },
  });

  const { data: options } = useQuery({
    queryKey: ['options'],
    queryFn: async () => {
      const [barangaysRes, businessLinesRes, haulerTypesRes] = await Promise.all([
        API.get('/options/barangays'),
        API.get('/options/business-lines'),
        API.get('/options/hauler-types'),
      ]);
      return {
        barangays: barangaysRes.data.barangays,
        businessLines: businessLinesRes.data.business_lines,
        haulerTypes: haulerTypesRes.data.hauler_types,
      };
    },
  });

  const updateMutation = useMutation({
    mutationFn: async (data) => {
      const res = await API.put(`/business-records/${id}`, data);
      return res.data;
    },
    onSuccess: () => {
      toast.success('Business record updated');
      setIsEditing(false);
      refetch();
    },
    onError: (err) => {
      toast.error(err.response?.data?.detail || 'Update failed');
    },
  });

  useEffect(() => {
    if (business) {
      setFormData({
        establishment_name: business.establishment_name || '',
        business_line: business.business_line || '',
        bin_number: business.bin_number || '',
        owner_last_name: business.owner_last_name || '',
        owner_first_name: business.owner_first_name || '',
        owner_middle_name: business.owner_middle_name || '',
        owner_suffix: business.owner_suffix || '',
        contact_number: business.contact_number || '',
        email: business.email || '',
        location: business.location || '',
        hauler_type: business.hauler_type || '',
        application_type: business.application_type || 'NEW',
        has_own_structure: business.has_own_structure || false,
      });
    }
  }, [business]);

  const handleFieldChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSave = (e) => {
    e.preventDefault();
    updateMutation.mutate(formData);
  };

  const handleCancelEdit = () => {
    setIsEditing(false);
    if (business) {
      setFormData({
        establishment_name: business.establishment_name || '',
        business_line: business.business_line || '',
        bin_number: business.bin_number || '',
        owner_last_name: business.owner_last_name || '',
        owner_first_name: business.owner_first_name || '',
        owner_middle_name: business.owner_middle_name || '',
        owner_suffix: business.owner_suffix || '',
        contact_number: business.contact_number || '',
        email: business.email || '',
        location: business.location || '',
        hauler_type: business.hauler_type || '',
        application_type: business.application_type || 'NEW',
        has_own_structure: business.has_own_structure || false,
      });
    }
  };

  const formatOwnerName = () => {
    if (!business) return '—';
    if (business.owner_last_name && business.owner_first_name) {
      let name = `${business.owner_last_name}, ${business.owner_first_name}`;
      if (business.owner_middle_name) name += ` ${business.owner_middle_name[0]}.`;
      if (business.owner_suffix) name += ` ${business.owner_suffix}`;
      return name;
    }
    return business.owner_name_raw || '—';
  };

  if (isLoading) {
    return (
      <div className="flex justify-center items-center h-64">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-emerald-600" />
      </div>
    );
  }

  if (!business) {
    return (
      <div className="text-center py-12 text-gray-500">Business not found</div>
    );
  }

  return (
    <div className="max-w-5xl mx-auto space-y-6 pb-24">
      {/* Header */}
      <div className="flex items-center justify-between">
        <button
          onClick={() => navigate(`/${rolePrefix}/business`)}
          className="inline-flex items-center gap-1 text-sm text-gray-600 hover:text-gray-900"
        >
          <ArrowLeft className="h-4 w-4" />
          Back to Business Records
        </button>

        {!isEditing ? (
          <button
            onClick={() => setIsEditing(true)}
            className="inline-flex items-center gap-2 px-4 py-2 border border-gray-300
                       rounded-lg text-sm text-gray-700 hover:bg-gray-50 transition-colors"
          >
            <Edit className="h-4 w-4" />
            Edit Record
          </button>
        ) : null}
      </div>

      {/* ------------------------------------------------------------------ */}
      {/* EDIT MODE                                                            */}
      {/* ------------------------------------------------------------------ */}
      {isEditing ? (
        <div className="bg-white rounded-lg shadow-sm p-6">
          <h2 className="text-lg font-bold text-gray-800 mb-6">Edit Business Record</h2>
          <BusinessForm
            mode="edit"
            formData={formData}
            onChange={handleFieldChange}
            onSubmit={handleSave}
            onCancel={handleCancelEdit}
            isSubmitting={updateMutation.isLoading}
            options={options || {}}
            businessId={parseInt(id)}
          />
        </div>
      ) : (
        /* ---------------------------------------------------------------- */
        /* VIEW MODE                                                         */
        /* ---------------------------------------------------------------- */
        <div className="space-y-4">
          {/* Status strip */}
          {business.has_violation && (
            <div className="flex items-center gap-2 bg-red-50 border border-red-200 rounded-lg px-4 py-3">
              <AlertTriangle className="h-4 w-4 text-red-500 shrink-0" />
              <p className="text-sm text-red-700">
                <span className="font-semibold">Violation: </span>
                {business.violation_details || 'Unresolved violation on file'}
              </p>
            </div>
          )}

          {/* Main info card */}
          <div className="bg-white rounded-lg shadow-sm p-6 space-y-6">
            {/* Top summary row */}
            <div>
              <h2 className="text-xl font-bold text-gray-900 mb-1">
                {business.establishment_name}
              </h2>
              <div className="flex flex-wrap gap-4 text-sm text-gray-500">
                <span>
                  Control #:{' '}
                  <span className="font-mono text-gray-800">
                    {business.control_number || '—'}
                  </span>
                </span>
                <span>
                  Type:{' '}
                  <span className="text-gray-800">{business.application_type || 'NEW'}</span>
                </span>
                <span>
                  Status:{' '}
                  <span
                    className={`font-medium ${
                      business.status === 'Approved' ? 'text-emerald-700' : 'text-amber-700'
                    }`}
                  >
                    {business.status}
                  </span>
                </span>
                <span>
                  Inspected:{' '}
                  {business.has_been_inspected ? (
                    <span className="inline-flex items-center gap-1 text-emerald-700 font-medium">
                      <CheckCircle2 className="h-3.5 w-3.5" /> Yes
                    </span>
                  ) : (
                    <span className="text-amber-600 font-medium">Not yet</span>
                  )}
                </span>
              </div>
            </div>

            {/* Business Information */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <Building2 className="h-4 w-4 text-emerald-600" />
                Business Information
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div>
                  <p className={DETAIL_LABEL}>Business Line</p>
                  <p className={DETAIL_VALUE}>{business.business_line || '—'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Hauler Type</p>
                  <p className={DETAIL_VALUE}>{business.hauler_type || '—'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>BIN Number</p>
                  <p className={`${DETAIL_VALUE} font-mono`}>{business.bin_number || '—'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Date Applied</p>
                  <p className={DETAIL_VALUE}>
                    {business.application_date
                      ? format(new Date(business.application_date), 'MMM dd, yyyy')
                      : '—'}
                  </p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Valid Until</p>
                  <p className={DETAIL_VALUE}>
                    {business.validity
                      ? format(new Date(business.validity), 'MMM dd, yyyy')
                      : '—'}
                  </p>
                </div>
              </div>
            </div>

            {/* Owner Information */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <User className="h-4 w-4 text-emerald-600" />
                Owner Information
              </h3>
              <p className={DETAIL_VALUE}>{formatOwnerName()}</p>
            </div>

            {/* Location & Contact */}
            <div className="pt-4 border-t border-gray-100">
              <h3 className="text-sm font-semibold text-gray-700 flex items-center gap-2 mb-3">
                <MapPin className="h-4 w-4 text-emerald-600" />
                Location &amp; Contact
              </h3>
              <div className="grid grid-cols-2 md:grid-cols-3 gap-4">
                <div className="md:col-span-3">
                  <p className={DETAIL_LABEL}>Barangay</p>
                  <p className={DETAIL_VALUE}>{business.location || '—'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Contact Number</p>
                  <p className={DETAIL_VALUE}>{business.contact_number || '—'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Email</p>
                  <p className={DETAIL_VALUE}>{business.email || '—'}</p>
                </div>
                <div>
                  <p className={DETAIL_LABEL}>Own Structure</p>
                  <p className={DETAIL_VALUE}>
                    {business.has_own_structure ? 'Yes' : 'No'}
                  </p>
                </div>
              </div>
            </div>

            {/* Requirements Summary (view-only) */}
            <div className="pt-4 border-t border-gray-100">
              <RequirementsChecklist businessId={parseInt(id)} mode="view" />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default BusinessDetails;