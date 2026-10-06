import React from 'react';
import { Monitor, FileText, Smartphone, Laptop, Package, Tv, Printer, Layers } from 'lucide-react';

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

  const CLASSIFICATION_ORDER = [
    'Communication Systems',
    'System Classification',
    'Office Furniture',
    'Electronics & Appliances',
    'Office Equipment & Utilities',
    'General Assets'
  ];

  const getAssetClassification = (asset) => {
    const rawCls = asset.classification || asset.category_details?.classification;
    if (rawCls && String(rawCls).trim().toLowerCase() !== 'general assets') {
      const canonical = CLASSIFICATION_ORDER.find(c => c.toLowerCase() === String(rawCls).trim().toLowerCase());
      if (canonical) return canonical;
      return String(rawCls);
    }
    if (asset.provider) {
      return 'Communication Systems';
    }
    const cat = String(asset.category_details?.name || (typeof asset.category === 'string' ? asset.category : '') || asset.asset_type || asset.name || '').toLowerCase().trim();
    if (['mobiles', 'mobile', 'mobile phone', 'mobile phones', 'sim', 'sims', 'sim card', 'sim cards', 'phone', 'phones', 'telephone', 'telephones', 'smartphone', 'smartphones', 'tablet', 'tablets', 'iphone', 'iphones', 'ipad', 'ipads', 'cellphone', 'cellphones', 'handset', 'handsets', 'voip', 'intercom'].includes(cat) || /(?:iphone|ipad|smartphone|mobile|sim card|cellphone)/i.test(cat)) {
      return 'Communication Systems';
    }
    if (['cpu', 'cpus', 'keyboard', 'keyboards', 'mouse', 'mice', 'pc', 'pcs', 'laptop', 'laptops', 'macbook', 'macbooks', 'thinkpad', 'thinkpads', 'imac', 'imacs', 'chromebook', 'chromebooks', 'workstation', 'workstations', 'server', 'servers', 'lap charger', 'laptop charger', 'moniter', 'monitors', 'monitor', 'screen', 'screens', 'display', 'displays', 'wify adaptor', 'wifi adaptor', 'wifi adapter', 'wifi adapters', 'hard disk', 'hard disks', 'hard drive', 'hard drives', 'ram', 'desktop', 'desktops', 'router', 'routers', 'switch', 'switches', 'hub', 'hubs', 'webcam', 'webcams', 'headphone', 'headphones', 'headset', 'headsets', 'earphone', 'earphones', 'mic', 'mics', 'microphone', 'microphones', 'dock', 'docks'].includes(cat) || cat.includes('wifi router') || cat.includes('network switch') || /(?:macbook|thinkpad|laptop|keyboard|mouse|monitor|desktop|router|webcam|headset)/i.test(cat)) {
      return 'System Classification';
    }
    if (['chair', 'chairs', 'office chair', 'office chairs', 'table', 'tables', 'teapoy', 'teapoys', 'sofa', 'sofas', 'shelf', 'shelves', 'stand', 'stands', 'desk', 'desks', 'cupboard', 'cupboards'].includes(cat)) {
      return 'Office Furniture';
    }
    if (['ac', 'air conditioner', 'fan', 'fans', 'tv & remote', 'tv', 'television', 'home theatre', 'speaker', 'speakers', 'ups', 'projector', 'projectors', 'cooler', 'coolers', 'refrigerator', 'refrigerators', 'fridge', 'fridges', 'dispenser', 'dispensers', 'microwave', 'microwaves'].includes(cat) || cat.includes('air condition') || cat.includes('water dispenser')) {
      return 'Electronics & Appliances';
    }
    if (['printer', 'printers', 'camera', 'cameras', 'white board', 'whiteboard', 'whiteboards', 'id card', 'id cards', 'key set box', 'waste in', 'waste bin', 'waste bins', 'wastebin', 'wastebins', 'scanner', 'scanners', 'shredder', 'shredders', 'extinguisher', 'extinguishers'].includes(cat) || cat.includes('paper shredder') || cat.includes('fire extinguisher')) {
      return 'Office Equipment & Utilities';
    }
    return 'General Assets';
  };

  const getClassificationIcon = (classification) => {
    switch (classification) {
      case 'Communication Systems':
        return <Smartphone className="w-4 h-4 text-blue-500" />;
      case 'System Classification':
        return <Laptop className="w-4 h-4 text-indigo-500" />;
      case 'Office Furniture':
        return <Package className="w-4 h-4 text-amber-500" />;
      case 'Electronics & Appliances':
        return <Tv className="w-4 h-4 text-rose-500" />;
      case 'Office Equipment & Utilities':
        return <Printer className="w-4 h-4 text-emerald-500" />;
      default:
        return <Layers className="w-4 h-4 text-purple-500" />;
    }
  };

  const groupedAssets = assets.reduce((acc, asset) => {
    const group = getAssetClassification(asset);
    if (!acc[group]) acc[group] = [];
    acc[group].push(asset);
    return acc;
  }, {});

  const sortedGroups = Object.keys(groupedAssets).sort((a, b) => {
    const idxA = CLASSIFICATION_ORDER.indexOf(a);
    const idxB = CLASSIFICATION_ORDER.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  return (
    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 mb-6">
      <div className="flex items-center justify-between mb-5">
        <h3 className="text-lg font-semibold text-gray-900 flex items-center gap-2">
          <Monitor className="w-5 h-5 text-indigo-500" />
          Assigned Assets
        </h3>
        <span className="bg-indigo-50 text-indigo-700 text-xs font-bold px-2.5 py-1 rounded-full">
          {assets.length} Total
        </span>
      </div>

      <div className="space-y-6">
        {sortedGroups.map(classification => (
          <div key={classification} className="border border-gray-100 rounded-xl p-4 bg-gray-50/50">
            <div className="flex items-center justify-between mb-3 pb-2 border-b border-gray-200/60">
              <div className="flex items-center gap-2 font-semibold text-sm text-gray-800">
                {getClassificationIcon(classification)}
                <span>{classification}</span>
              </div>
              <span className="text-xs text-gray-500 font-medium">
                {groupedAssets[classification].length} items
              </span>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              {groupedAssets[classification].map(asset => (
                <div key={asset.id} className="border border-gray-200 rounded-lg p-3 bg-white shadow-xs">
                  <div className="flex justify-between items-start mb-1.5">
                    <div>
                      <h4 className="font-bold text-sm text-gray-900">{asset.name}</h4>
                      <p className="text-xs text-gray-500">{asset.category_details?.name || asset.asset_type || 'Asset'}</p>
                    </div>
                    {asset.status && (
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-blue-50 text-blue-700 uppercase">
                        {asset.status}
                      </span>
                    )}
                  </div>

                  {asset.serial_number && (
                    <p className="text-xs text-gray-600 mt-1">
                      <span className="font-medium text-gray-400">S/N:</span> {asset.serial_number}
                    </p>
                  )}

                  {asset.provider && (
                    <p className="text-xs text-gray-600 mt-0.5">
                      <span className="font-medium text-gray-400">Provider:</span> {asset.provider}
                    </p>
                  )}

                  {asset.attachment_url && (
                    <a 
                      href={asset.attachment_url} 
                      target="_blank" 
                      rel="noopener noreferrer" 
                      className="mt-2 inline-flex items-center gap-1 text-xs text-indigo-600 hover:text-indigo-800 font-medium"
                    >
                      <FileText className="w-3.5 h-3.5" /> View Document
                    </a>
                  )}
                </div>
              ))}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
