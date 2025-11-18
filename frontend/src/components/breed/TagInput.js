import React, { useState } from 'react';
import { PlusIcon, XCircleIcon } from '@heroicons/react/20/solid';

const COMMON_TAGS = ['#เลี้ยงง่าย', '#มือใหม่หัดเลี้ยง', '#ขี้อ้อน', '#เสียงดัง', '#ขนร่วงน้อย', '#พลังงานสูง'];

const TagInput = ({ selectedTags, onChange }) => {
  const [customTagInput, setCustomTagInput] = useState('');

  const handleToggleTag = (tag) => {
    if (selectedTags.includes(tag)) {
      onChange(selectedTags.filter((t) => t !== tag));
    } else {
      onChange([...selectedTags, tag]);
    }
  };

  const handleAddCustomTag = () => {
    let newTag = customTagInput.trim();
    if (!newTag) return;

    if (!newTag.startsWith('#')) {
      newTag = `#${newTag}`;
    }

    if (!selectedTags.includes(newTag)) {
      onChange([...selectedTags, newTag]);
    }
    setCustomTagInput('');
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-2">
          เลือกแท็กยอดนิยม:
        </label>
        <div className="flex flex-wrap gap-2">
          {COMMON_TAGS.map((tag) => {
            const isSelected = selectedTags.includes(tag);
            return (
              <button
                key={tag}
                type="button"
                onClick={() => handleToggleTag(tag)}
                className={`px-3 py-1 rounded-full text-sm font-medium transition-colors ${
                  isSelected
                    ? 'bg-indigo-600 text-white'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
              >
                {tag}
              </button>
            );
          })}
        </div>
      </div>

      <div>
        <label htmlFor="customTag" className="block text-sm font-medium text-gray-700 mb-2">
          หรือเพิ่มแท็กของคุณเอง:
        </label>
        <div className="flex gap-2">
          <input
            type="text"
            id="customTag"
            value={customTagInput}
            onChange={(e) => setCustomTagInput(e.target.value)}
            className="flex-grow border rounded-lg p-2 focus:outline-none focus:ring-2 focus:ring-indigo-300 text-base"
            placeholder="เช่น: #ตาสองสี"
          />
          <button
            type="button"
            onClick={handleAddCustomTag}
            className="bg-green-500 text-white p-2 rounded-lg hover:bg-green-600 flex items-center"
          >
            <PlusIcon className="w-5 h-5" />
          </button>
        </div>
      </div>

      {selectedTags.length > 0 && (
        <div className="border-t pt-3">
          <span className="text-sm font-medium text-gray-700">แท็กของคุณ:</span>
          <div className="flex flex-wrap gap-2 mt-2">
            {selectedTags.map((tag) => (
              <span
                key={tag}
                className="inline-flex items-center bg-indigo-100 text-indigo-700 text-sm font-medium px-2.5 py-1 rounded-full"
              >
                {tag}
                <button
                  type="button"
                  onClick={() => handleToggleTag(tag)}
                  className="ml-1.5 text-indigo-400 hover:text-indigo-600"
                >
                  <XCircleIcon className="w-5 h-5" />
                </button>
              </span>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default TagInput;