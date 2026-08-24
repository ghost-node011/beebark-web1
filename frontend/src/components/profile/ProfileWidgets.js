import React from 'react';

export const StatCard = ({ icon: Icon, value, label }) => (
  <div className="bg-white rounded-xl border border-gray-100 p-4 text-center">
    <Icon className="w-5 h-5 mx-auto text-yellow-500 mb-1" />
    <p className="text-xl font-bold text-black">{value}</p>
    <p className="text-xs text-gray-500">{label}</p>
  </div>
);

export const InfoBlock = ({ icon: Icon, label, values }) => {
  if (!values?.length) return null;
  return (
    <div className="bg-gray-50 rounded-lg p-4">
      <p className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wide text-gray-500 mb-1">
        <Icon className="w-4 h-4" />{label}
      </p>
      <p className="text-sm text-black">{values.join(', ')}</p>
    </div>
  );
};
