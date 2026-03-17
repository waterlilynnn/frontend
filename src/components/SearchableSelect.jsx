import { useState, useEffect, useRef } from 'react';
import { Search, ChevronDown } from 'lucide-react';

const SearchableSelect = ({ 
  options = [], 
  value, 
  onChange, 
  placeholder = "Select an option",
  label,
  required = false,
  disabled = false,
  className = ""
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const [searchTerm, setSearchTerm] = useState('');
  const dropdownRef = useRef(null);

  // Filter options based on search term
  const filteredOptions = options.filter(option =>
    option.toLowerCase().includes(searchTerm.toLowerCase())
  );

  // Get display value
  const displayValue = value || placeholder;

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  return (
    <div className="relative" ref={dropdownRef}>
      {label && (
        <label className="block text-sm font-medium text-gray-700 mb-1">
          {label} {required && <span className="text-red-500">*</span>}
        </label>
      )}
      
      {/* Dropdown Button */}
      <button
        type="button"
        onClick={() => !disabled && setIsOpen(!isOpen)}
        className={`w-full px-4 py-2 text-left border border-gray-300 rounded-lg bg-white 
          focus:ring-2 focus:ring-emerald-500 focus:border-emerald-500 
          ${disabled ? 'bg-gray-100 cursor-not-allowed' : 'hover:bg-gray-50'}
          ${className}`}
        disabled={disabled}
      >
        <div className="flex items-center justify-between">
          <span className={value ? 'text-gray-900' : 'text-gray-500'}>
            {displayValue}
          </span>
          <ChevronDown className={`h-4 w-4 text-gray-400 transition-transform ${isOpen ? 'rotate-180' : ''}`} />
        </div>
      </button>

      {/* Dropdown Menu */}
      {isOpen && !disabled && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {/* Search Input */}
          <div className="p-2 border-b border-gray-200">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search..."
                className="w-full pl-9 pr-4 py-2 text-sm border border-gray-200 rounded-lg focus:ring-emerald-500 focus:border-emerald-500"
                autoFocus
              />
            </div>
          </div>

          {/* Options List */}
          <div className="max-h-60 overflow-y-auto py-1">
            {filteredOptions.length === 0 ? (
              <div className="px-4 py-3 text-sm text-gray-500 text-center">
                No options found
              </div>
            ) : (
              filteredOptions.map((option) => (
                <button
                  key={option}
                  type="button"
                  onClick={() => {
                    onChange(option);
                    setIsOpen(false);
                    setSearchTerm('');
                  }}
                  className={`w-full px-4 py-2 text-left text-sm hover:bg-emerald-50 
                    ${value === option ? 'bg-emerald-100 text-emerald-700' : 'text-gray-700'}`}
                >
                  {option}
                </button>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
};

export default SearchableSelect;