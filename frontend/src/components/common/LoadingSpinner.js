import React from 'react';

const LoadingSpinner = () => {
  return (
    <div className="flex justify-center items-center py-10">
      <div className="animate-spin rounded-full h-16 w-16 border-t-4 border-b-4 border-indigo-500"></div>
      <span className="ml-4 text-lg text-gray-600">Loading...</span>
    </div>
  );
};

export default LoadingSpinner;