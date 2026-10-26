import React, { useState } from 'react';
import Navbar from '../../Components/layouts/Navbar';
import CompanySwitcher from '../../Components/common/CompanySwitcher';
import ReceiptsWorkspace from '../../Components/fees/ReceiptsWorkspace';
import { useAuth } from '../../context/AuthContext';
import { usePermissions } from '../../context/PermissionsContext';
import { Receipt } from 'lucide-react';

export default function ReceiptsMasterPage() {
  const { accessToken, refreshAccessToken, user } = useAuth();
  const { hasPermission } = usePermissions();

  const isExecutive =
    user?.is_superuser === true ||
    (Array.isArray(user?.role_names) && (
      user.role_names.includes('ADMIN') ||
      user.role_names.includes('MANAGING_DIRECTOR') ||
      user.role_names.includes('CEO') ||
      user.role_names.includes('DIRECTOR') ||
      user.role_names.includes('BUSINESS_HEAD') ||
      user.role_names.includes('ACCOUNTANT')
    ));

  const [activeCompany, setActiveCompany] = useState(() => {
    if (user?.company === 'FDS') return 'FDS';
    if (user?.company === 'FLAG') return 'FLAG';
    if (user?.company === 'LP') return 'LP';
    if (hasPermission('fees:fds') && !hasPermission('fees:accounts') && !isExecutive) return 'FDS';
    if (hasPermission('fees:lp') && !hasPermission('fees:accounts') && !isExecutive) return 'LP';
    if (hasPermission('fees:flag') && !hasPermission('fees:accounts') && !isExecutive) return 'FLAG';
    return '';
  });

  const getToken = async () => accessToken || (await refreshAccessToken());

  const canManageFees =
    isExecutive ||
    hasPermission('fees:accounts') ||
    hasPermission('fees:manage') ||
    hasPermission('fees:flag') ||
    hasPermission('fees:fds') ||
    hasPermission('fees:lp') ||
    hasPermission('fds_fees:manage') ||
    hasPermission('processing_students:manage_fees') ||
    hasPermission('flag:admin') ||
    hasPermission('fds:admin');

  const canCreateReceipts =
    canManageFees ||
    hasPermission('fees:partial_payment') ||
    hasPermission('flag:fees');

  const canManageSettings =
    isExecutive ||
    hasPermission('fees:accounts') ||
    hasPermission('fees:manage') ||
    hasPermission('fees:flag') ||
    hasPermission('fees:fds') ||
    hasPermission('fees:lp') ||
    hasPermission('fds_fees:manage') ||
    hasPermission('processing_students:manage_fees') ||
    hasPermission('flag:admin') ||
    hasPermission('fds:admin');

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />
      <main className="flex-1 max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-8 space-y-6">
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-slate-200 pb-5">
          <div>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white shadow-md shadow-indigo-100">
                <Receipt size={22} />
              </div>
              <div>
                <h1 className="text-2xl font-black text-slate-900 tracking-tight">
                  Receipts & Invoices
                </h1>
                <p className="text-xs font-medium text-slate-500">
                  Centralized multi-company digital receipts, tax invoices, and verification studio
                </p>
              </div>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <CompanySwitcher
              activeCompany={activeCompany}
              onChange={setActiveCompany}
              showAll={true}
            />
          </div>
        </div>

        <ReceiptsWorkspace
          getToken={getToken}
          company={activeCompany}
          canManageFees={canManageFees}
          canCreateReceipts={canCreateReceipts}
          canManageSettings={canManageSettings}
        />
      </main>
    </div>
  );
}
