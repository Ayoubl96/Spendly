import React, { useState, useRef, useEffect } from "react";
import { IconRenderer } from "../../utils/iconRenderer";

interface Category {
  id: string;
  name: string;
  icon?: string;
}

interface CategoryMultiSelectProps {
  categories: Category[];
  selectedCategoryIds: string[];
  onSelectionChange: (categoryIds: string[]) => void;
  loading?: boolean;
}

export const CategoryMultiSelect: React.FC<CategoryMultiSelectProps> = ({
  categories,
  selectedCategoryIds,
  onSelectionChange,
  loading = false,
}) => {
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  const handleToggleCategory = (categoryId: string) => {
    if (selectedCategoryIds.includes(categoryId)) {
      onSelectionChange(selectedCategoryIds.filter((id) => id !== categoryId));
    } else {
      onSelectionChange([...selectedCategoryIds, categoryId]);
    }
  };

  const handleSelectAll = () => {
    if (selectedCategoryIds.length === categories.length) {
      onSelectionChange([]);
    } else {
      onSelectionChange(categories.map((c) => c.id));
    }
  };

  const getSelectedLabel = () => {
    if (selectedCategoryIds.length === 0) {
      return "All Categories";
    } else if (selectedCategoryIds.length === 1) {
      const category = categories.find((c) => c.id === selectedCategoryIds[0]);
      return category?.name || "Unknown";
    } else {
      return `${selectedCategoryIds.length} Categories`;
    }
  };

  if (loading) {
    return (
      <div className="w-64 px-4 py-2 border border-gray-300 rounded-lg bg-gray-50">
        Loading categories...
      </div>
    );
  }

  return (
    <div className="relative" ref={dropdownRef}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        className="w-64 px-4 py-2 text-left bg-white border border-gray-300 rounded-lg hover:border-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 flex items-center justify-between"
      >
        <span className="truncate">{getSelectedLabel()}</span>
        <svg
          className={`w-5 h-5 transition-transform ${isOpen ? "rotate-180" : ""}`}
          fill="none"
          stroke="currentColor"
          viewBox="0 0 24 24"
        >
          <path
            strokeLinecap="round"
            strokeLinejoin="round"
            strokeWidth={2}
            d="M19 9l-7 7-7-7"
          />
        </svg>
      </button>

      {isOpen && (
        <div className="absolute z-10 w-full mt-2 bg-white border border-gray-200 rounded-lg shadow-lg max-h-64 overflow-auto">
          <div className="p-2 border-b border-gray-200">
            <button
              onClick={handleSelectAll}
              className="w-full px-3 py-2 text-left text-sm font-medium text-blue-600 hover:bg-blue-50 rounded"
            >
              {selectedCategoryIds.length === categories.length
                ? "Deselect All"
                : "Select All"}
            </button>
          </div>

          <div className="p-2">
            {categories.map((category) => (
              <label
                key={category.id}
                className="flex items-center px-3 py-2 hover:bg-gray-50 rounded cursor-pointer"
              >
                <input
                  type="checkbox"
                  checked={selectedCategoryIds.includes(category.id)}
                  onChange={() => handleToggleCategory(category.id)}
                  className="w-4 h-4 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
                />
                <span className="ml-3 text-sm text-gray-700">
                  {category.icon && (
                    <IconRenderer
                      icon={category.icon}
                      size={16}
                      className="text-dark drop-shadow-sm"
                    />
                  )}
                  {category.name}
                </span>
              </label>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
