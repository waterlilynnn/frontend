import { useState, useEffect, useRef } from 'react';
import { Hash, ChevronDown, CheckCircle, AlertCircle } from 'lucide-react';
import API from '../config/api';

// Build a masked placeholder string for a format
const buildPlaceholder = (segments) =>
  segments.map((n) => '0'.repeat(n)).join('-');

// Validate a value against one format
const matchesFormat = (value, segments) => {
  const pattern = new RegExp(
    '^' + segments.map((n) => `\\d{${n}}`).join('-') + '$'
  );
  return pattern.test(value);
};

// Auto-insert hyphens as user types, guided by selected format
const applyMask = (rawDigits, segments) => {
  if (!rawDigits || !segments) return rawDigits;
  const digits = rawDigits.replace(/\D/g, '');
  if (!digits) return '';

  let result = '';
  let used = 0;
  for (let si = 0; si < segments.length; si++) {
    const segLen = segments[si];
    if (used >= digits.length) break;
    const chunk = digits.slice(used, used + segLen);
    if (si > 0) result += '-';
    result += chunk;
    used += segLen;
  }
  return result;
};

const BinNumberInput = ({
  value = '',
  onChange,
  required = false,
  disabled = false,
  className = '',
}) => {
  const [formats, setFormats]           = useState([]);
  const [selectedFormat, setSelectedFormat] = useState(null);
  const [showPicker, setShowPicker]     = useState(false);
  const [touched, setTouched]           = useState(false);
  const pickerRef                       = useRef(null);

  // Load formats once
  useEffect(() => {
    API.get('/admin/settings/bin-formats/public')
      .then((res) => {
        const active = (res.data || []).filter((f) => f.is_active !== false);
        setFormats(active);
        // Auto-select first format
        if (active.length > 0 && !selectedFormat) {
          setSelectedFormat(active[0]);
        }
      })
      .catch(() => {});
  }, []);

  // Close picker on outside click
  useEffect(() => {
    const handler = (e) => {
      if (pickerRef.current && !pickerRef.current.contains(e.target)) {
        setShowPicker(false);
      }
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const handleChange = (e) => {
    const raw = e.target.value.replace(/[^\d-]/g, '');

    const prevDigits = value.replace(/-/g, '').length;
    const newDigits  = raw.replace(/-/g, '').length;
    if (newDigits < prevDigits) {
      onChange(raw);
      return;
    }

    const formatted = selectedFormat
      ? applyMask(raw, selectedFormat.segments)
      : raw;
    onChange(formatted);
  };

  const handleFormatSelect = (fmt) => {
    setSelectedFormat(fmt);
    setShowPicker(false);
    if (value) onChange('');
  };

  // Validation state
  const isEmpty   = !value || !value.trim();
  const isValid   = isEmpty || (selectedFormat && matchesFormat(value, selectedFormat.segments));
  const showError = touched && !isEmpty && !isValid;
  const showOk    = touched && !isEmpty && isValid;
  const showRequiredError = required && touched && isEmpty && !disabled;

  const maxLen = selectedFormat
    ? selectedFormat.segments.reduce((s, n) => s + n, 0) + selectedFormat.segments.length - 1
    : 25;

  return (
    <div className="space-y-1">
      <div className="flex gap-2">

        {/* Format picker button */}
        {formats.length > 1 && (
          <div className="relative shrink-0" ref={pickerRef}>
            <button
              type="button"
              onClick={() => setShowPicker((v) => !v)}
              disabled={disabled}
              className="h-full px-3 py-2 border border-gray-300 rounded-lg text-xs text-gray-600
                         hover:bg-gray-50 flex items-center gap-1 whitespace-nowrap
                         disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {selectedFormat
                ? selectedFormat.segments.join('-')
                : 'Format'}
              <ChevronDown className="h-3 w-3" />
            </button>

            {showPicker && (
              <div className="absolute top-full left-0 mt-1 z-50 bg-white border border-gray-200 rounded-lg shadow-lg min-w-[180px]">
                <div className="p-1.5">
                  <p className="text-xs text-gray-400 px-2 py-1 font-medium uppercase tracking-wide">
                    Select BIN Format
                  </p>
                  {formats.map((fmt) => (
                    <button
                      key={fmt.id}
                      type="button"
                      onClick={() => handleFormatSelect(fmt)}
                      className={`w-full text-left px-3 py-2 rounded text-sm hover:bg-emerald-50
                        ${selectedFormat?.id === fmt.id ? 'bg-emerald-50 text-emerald-700 font-medium' : 'text-gray-700'}`}
                    >
                      <div className="font-mono text-xs font-semibold">
                        {buildPlaceholder(fmt.segments)}
                      </div>
                      <div className="text-[10px] text-gray-400 mt-0.5">
                        {fmt.label}
                      </div>
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Text input */}
        <div className="relative flex-1">
          <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
            <Hash className="h-4 w-4 text-gray-400" />
          </div>
          <input
            type="text"
            value={value}
            onChange={handleChange}
            onBlur={() => setTouched(true)}
            disabled={disabled || formats.length === 0}
            placeholder={
              selectedFormat
                ? buildPlaceholder(selectedFormat.segments)
                : formats.length === 0
                ? 'Loading formats…'
                : 'Enter BIN number'
            }
            maxLength={maxLen}
            className={`w-full pl-9 pr-9 py-2 border rounded-lg font-mono text-sm
              focus:ring-emerald-500 focus:border-emerald-500 outline-none transition-colors
              ${showError ? 'border-red-400 bg-red-50'      : ''}
              ${showOk    ? 'border-emerald-400'             : ''}
              ${!showError && !showOk ? 'border-gray-300'    : ''}
              ${disabled  ? 'bg-gray-100 cursor-not-allowed' : ''}
              ${className}`}
          />
          {showError && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <AlertCircle className="h-4 w-4 text-red-400" />
            </div>
          )}
          {showOk && (
            <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none">
              <CheckCircle className="h-4 w-4 text-emerald-500" />
            </div>
          )}
        </div>
      </div>

      {/* Helper text */}
      {showError ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          Expected format: {selectedFormat ? buildPlaceholder(selectedFormat.segments) : '—'}
        </p>
      ) : showRequiredError ? (
        <p className="text-xs text-red-500 flex items-center gap-1">
          <AlertCircle className="h-3 w-3 shrink-0" />
          BIN number is required
        </p>
      ) : (
        <p className="text-xs text-gray-400">
          {required ? 'Required' : 'Optional'} — enter BIN 
        </p>
      )}
    </div>
  );
};

export default BinNumberInput;