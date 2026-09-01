import React, { useMemo } from 'react';

export function DataTable({ rows, empty }: { rows: Record<string, string>[]; empty: string }) {
  const headers = useMemo(() => Object.keys(rows[0] || {}), [rows]);
  if (rows.length === 0) {
    return <p className="text-muted" style={{ margin: 0, fontSize: 13 }}>{empty}</p>;
  }
  return (
    <div style={{ overflowX: 'auto' }}>
      <table className="services-table">
        <thead>
          <tr>
            {headers.map((header) => <th key={header}>{header}</th>)}
          </tr>
        </thead>
        <tbody>
          {rows.map((row, index) => (
            <tr key={`${index}-${Object.values(row).join('-')}`}>
              {headers.map((header) => <td key={header}>{row[header] || '—'}</td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
