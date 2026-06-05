import React from 'react';
import AttendanceDocTableView from './AttendanceDocTableView';
import AttendanceDocMobileView from './AttendanceDocMobileView';

export default function AttendanceDocumentsList({ documents, onDelete, canDelete = true }) {
  return (
    <>
      {/* Desktop Table View */}
      <div className="hidden lg:block">
        <AttendanceDocTableView documents={documents} onDelete={onDelete} canDelete={canDelete} />
      </div>

      {/* Mobile Card View */}
      <div className="lg:hidden">
        <AttendanceDocMobileView documents={documents} onDelete={onDelete} canDelete={canDelete} />
      </div>
    </>
  );
}