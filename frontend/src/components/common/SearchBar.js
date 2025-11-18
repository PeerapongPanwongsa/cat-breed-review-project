import React, { useState } from 'react';
import { MagnifyingGlassIcon } from '@heroicons/react/24/outline';

const SearchBar = ({ onSearch, placeholder = 'ค้นหา...', className = '' }) => {
  const [searchTerm, setSearchTerm] = useState('');

  const handleSubmit = (e) => {
    e.preventDefault();
    onSearch(searchTerm.trim());
  };

  return (
    <form onSubmit={handleSubmit} className={`flex gap-4 ${className}`}>
      <input
        type="text"
        placeholder={placeholder}
        className="flex-grow border rounded-lg px-4 py-2 focus:outline-none focus:ring-2 focus:ring-indigo-300"
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
      />
      <button
        type="submit"
        className="bg-indigo-600 text-white px-6 py-2 rounded-lg hover:bg-indigo-700 font-semibold flex items-center transition-colors"
      >
        <MagnifyingGlassIcon className="w-5 h-5 md:mr-2" />
        <span className="hidden md:inline">ค้นหา</span>
      </button>
    </form>
  );
};

export default SearchBar;