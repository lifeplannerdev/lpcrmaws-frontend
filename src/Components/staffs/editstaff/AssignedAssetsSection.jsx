import React from 'react';
import { Monitor, FileText, CheckCircle } from 'lucide-react';

export default function AssignedAssetsSection({ assets }) {
  if (!assets || assets.length === 0) {
    return (
      <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-500" />
          Assigned Assets
        </h3>
        <p className="text-sm text-gray-500">No assets currently assigned to this staff member.</p>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
        <Monitor className="w-5 h-5 text-indigo-500" />
        Assigned Assets
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {assets.map((asset) => (
          <div key={asset.id} className="border border-gray-100 rounded-xl p-4 bg-gray-50 hover:bg-gray-100 transition-colors">
            <div className="flex justify-between items-start mb-2">
              <div>
                <h4 className="font-bold text-gray-900">{asset.name}</h4>
                <p className="text-xs text-gray-500">{asset.asset_type}</p>
              </div>
              <span className="px-2 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-700 uppercase">
                {asset.status}
              </span>
            </div>
            {asset.serial_number && (
              <p className="text-sm text-gray-600 mt-2">
                <span className="font-medium">{asset.asset_type === 'Mobiles' ? 'IMEI:' : 'S/N:'}</span> {asset.serial_number}
              </p>
            )}
            {asset.attachment_url && (
              <a 
                href={asset.attachment_url} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="mt-3 inline-flex items-center gap-1 text-sm text-indigo-600 hover:text-indigo-800 font-medium"
              >
                <FileText className="w-4 h-4" /> View Document
              </a>
            )}
            
            {asset.attached_assets && asset.attached_assets.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200 space-y-3">
                <h5 className="text-xs font-semibold text-gray-500 uppercase">Attached Items</h5>
                {asset.attached_assets.map(child => (
                  <div key={child.id} className="flex justify-between items-start pl-3 border-l-2 border-indigo-200">
                    <div>
                      <p className="font-semibold text-sm text-gray-800">{child.name}</p>
                      <p className="text-[10px] text-gray-500">{child.asset_type}</p>
                      {child.serial_number && (
                        <p className="text-xs text-gray-600 mt-0.5">
                          <span className="font-medium">{child.asset_type === 'Mobiles' ? 'IMEI:' : 'S/N:'}</span> {child.serial_number}
                        </p>
                      )}
                    </div>
                    <span className="px-1.5 py-0.5 rounded text-[9px] font-bold bg-blue-100 text-blue-700 uppercase">
                      {child.status}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
