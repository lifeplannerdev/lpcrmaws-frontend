import React from 'react';
import { FileText, Eye, Download, Trash2 } from 'lucide-react';
import Card from '../common/Card';
import { formatDate, formatMonth } from '../utils/dateFormatters';

export default function AttendanceDocMobileView({ documents, onDelete, canDelete = true }) {
  return (
    <div className="grid grid-cols-1 gap-4">
      {documents.map((doc) => (
        <Card
          key={doc.id}
          padding="p-5"
          className="hover:shadow-xl hover:border-indigo-200 transition-all"
        >
          <div className="flex items-start gap-3 mb-4">
            <div className="w-12 h-12 bg-indigo-100 rounded-xl flex items-center justify-center flex-shrink-0">
              <FileText className="w-6 h-6 text-indigo-600" />
            </div>
            <div className="flex-1 min-w-0">
              <h3 className="font-bold text-gray-900 mb-1 truncate">
                {doc.document_name}
              </h3>
              <p className="text-sm text-gray-500">
                {formatMonth(doc.month)}
              </p>
            </div>
          </div>

          <div className="space-y-2 mb-4">
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Date:</span>
              <span className="font-medium text-gray-700">{formatDate(doc.date)}</span>
            </div>
            <div className="flex items-center justify-between text-sm">
              <span className="text-gray-500">Uploaded:</span>
              <span className="font-medium text-gray-700">{formatDate(doc.uploaded_at)}</span>
            </div>
          </div>

          <div className="flex gap-2">
            <a
              href={doc.file}
              target="_blank"
              rel="noopener noreferrer"
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-blue-50 hover:bg-blue-100 text-blue-600 rounded-lg font-semibold transition-colors"
            >
              <Eye className="w-4 h-4" />
              View
            </a>
            <a
              href={doc.file}
              download
              className="flex-1 flex items-center justify-center gap-2 px-4 py-2.5 bg-green-50 hover:bg-green-100 text-green-600 rounded-lg font-semibold transition-colors"
            >
              <Download className="w-4 h-4" />
              Download
            </a>
            {canDelete && (
              <button
                onClick={() => onDelete(doc.id)}
                className="px-4 py-2.5 bg-red-50 hover:bg-red-100 text-red-600 rounded-lg transition-colors"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </Card>
      ))}
    </div>
  );
}