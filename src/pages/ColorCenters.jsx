import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

function exportToExcel(data, fileName = 'Color_Centers.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <style>
        table { border-collapse: collapse; }
        th { background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #c2410c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Shop ID</th>
            <th>Shop Name</th>
            <th>Address</th>
            <th>Government</th>
            <th>City</th>
            <th>Mobile</th>
            <th>Longitude</th>
            <th>Latitude</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    html += `
      <tr>
        <td class="text">${item.ShopId || ''}</td>
        <td>${item.ShopName || ''}</td>
        <td>${item.Address || ''}</td>
        <td>${item.GovermentName || ''}</td>
        <td>${item.CityName || ''}</td>
        <td class="text">${item.Mobile || ''}</td>
        <td>${item.Longitude || ''}</td>
        <td>${item.Latitude || ''}</td>
      </tr>
    `;
  });

  html += `
        </tbody>
      </table>
    </body>
    </html>
  `;

  const blob = new Blob([html], { type: 'application/vnd.ms-excel;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.setAttribute('download', fileName);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
}

export default function ColorCenters({ user, def }) {
  const [centers, setCenters] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('ShopId');
  const [sortAsc, setSortAsc] = useState(true);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('GetColorCenters', null, { User: user?.Username });
      if (d.State !== 0) {
        setError(d.Message || 'Failed to fetch color centers');
        setCenters([]);
      } else {
        setCenters(d.List0 || []);
      }
    } catch (e) {
      setError(e.message);
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  const filteredCenters = centers.filter(item => {
    const s = search.toLowerCase();
    return (
      (item.ShopId || '').toString().toLowerCase().includes(s) ||
      (item.ShopName || '').toString().toLowerCase().includes(s) ||
      (item.Address || '').toString().toLowerCase().includes(s) ||
      (item.GovermentName || '').toString().toLowerCase().includes(s) ||
      (item.CityName || '').toString().toLowerCase().includes(s) ||
      (item.Mobile || '').toString().toLowerCase().includes(s)
    );
  });

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(true);
    }
  }

  const sortedCenters = [...filteredCenters].sort((a, b) => {
    let valA = (a[sortField] || '').toString().toLowerCase();
    let valB = (b[sortField] || '').toString().toLowerCase();
    
    if (sortField === 'ShopId') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  const totalCenters = centers.length;

  return (
    <div>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '🏢'} {def?.label || 'Color Centers'}</div>
          <div className="page-sub">{def?.desc || 'View all color centers and shop locations'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-primary" onClick={() => exportToExcel(sortedCenters)} disabled={!sortedCenters.length}>
            📤 Export Excel
          </button>
        </div>
      </div>

      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="kpi-label">Total Color Centers</div>
          <div className="kpi-value">{totalCenters.toLocaleString()}</div>
        </div>
      </div>

      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search centers by ID, Name, Address, City..."
          value={search}
          onChange={e => setSearch(e.target.value)}
          style={{
            flex: 1,
            height: 40,
            padding: '0 14px',
            border: '1.5px solid var(--border)',
            borderRadius: '10px',
            background: 'var(--surface)',
            color: 'var(--text)',
            outline: 'none',
            fontSize: 14,
            transition: 'border-color 0.2s'
          }}
          onFocus={e => e.target.style.borderColor = 'var(--orange)'}
          onBlur={e => e.target.style.borderColor = 'var(--border)'}
        />
      </div>

      {error && (
        <div className="err-page">
          <strong>Error:</strong> {error}
        </div>
      )}

      {loading ? (
        <div className="loading-wrap">
          <div className="spinner"></div>
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading color centers data...</div>
        </div>
      ) : (
        <div className="table-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="table-wrap" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('ShopId')}>
                    Shop ID {sortField === 'ShopId' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('ShopName')}>
                    Shop Name {sortField === 'ShopName' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Address')}>
                    Address {sortField === 'Address' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('GovermentName')}>
                    Government {sortField === 'GovermentName' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('CityName')}>
                    City {sortField === 'CityName' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Mobile')}>
                    Mobile {sortField === 'Mobile' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)' }}>
                    Coordinates
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedCenters.length === 0 ? (
                  <tr>
                    <td colSpan="7" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                      No color centers found matching search criteria.
                    </td>
                  </tr>
                ) : (
                  sortedCenters.map((center, idx) => (
                    <tr key={center.ShopId || idx}>
                      <td style={{ fontFamily: 'var(--mono)', fontWeight: 600 }}>{center.ShopId}</td>
                      <td style={{ fontWeight: 500, color: 'var(--orange)' }}>{center.ShopName || '—'}</td>
                      <td>{center.Address || '—'}</td>
                      <td>{center.GovermentName || '—'}</td>
                      <td>{center.CityName || '—'}</td>
                      <td>{center.Mobile || '—'}</td>
                      <td style={{ fontSize: 12, color: 'var(--muted)' }}>
                        {center.Latitude && center.Longitude ? `${center.Latitude}, ${center.Longitude}` : '—'}
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
