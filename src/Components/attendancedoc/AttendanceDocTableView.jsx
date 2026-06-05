import React from 'react';
import { FileText, Calendar, Clock, Eye, Download, Trash2 } from 'lucide-react';
import Card from '../common/Card';
import { formatDate, formatMonth } from '../utils/dateFormatters';

export default function AttendanceDocTableView({ documents, onDelete, canDelete = true }) {
  return (
    <Card padding="p-0" className="overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full">
          <thead className="bg-gradient-to-r from-indigo-50 to-purple-50 border-b border-gray-200">
            <tr>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Document Name
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Month
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Date
              </th>
              <th className="px-6 py-4 text-left text-xs font-bold text-gray-700 uppercase tracking-wider">
                Uploaded At
              </th>
              <th className="px-6 py-4 text-right text-xs font-bold text-gray-700 uppercase tracking-wider">
                Actions
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-200">
            {documents.map((doc) => (
              <tr key={doc.id} className="hover:bg-gray-50 transition-colors">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-indigo-100 rounded-lg flex items-center justify-center flex-shrink-0">
                      <FileText className="w-5 h-5 text-indigo-600" />
                    </div>
                    <span className="font-semibold text-gray-900">{doc.document_name}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-gray-700">
                    <Calendar className="w-4 h-4 text-gray-400" />
                    <span>{formatMonth(doc.month)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-700">
                  {formatDate(doc.date)}
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center gap-2 text-gray-500 text-sm">
                    <Clock className="w-4 h-4" />
                    <span>{formatDate(doc.uploaded_at)}</span>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-right">
                  <div className="flex items-center justify-end gap-2">
                    <a
                      href={doc.file}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="p-2 rounded-lg bg-blue-50 hover:bg-blue-100 text-blue-600 transition-colors"
                      title="View Document"
                    >
                      <Eye className="w-4 h-4" />
                    </a>
                    <a
                      href={doc.file}
                      download
                      className="p-2 rounded-lg bg-green-50 hover:bg-green-100 text-green-600 transition-colors"
                      title="Download"
                    >
                      <Download className="w-4 h-4" />
                    </a>
                    {canDelete && (
                      <button
                        onClick={() => onDelete(doc.id)}
                        className="p-2 rounded-lg bg-red-50 hover:bg-red-100 text-red-600 transition-colors"
                        title="Delete"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}