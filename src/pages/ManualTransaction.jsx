import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';
import ClientDrawer from './ClientDrawer.jsx';

function fmtDate(val) {
  if (!val) return '—';
  try {
    const d = new Date(val);
    if (isNaN(d.getTime())) return val;
    if (d.getFullYear() <= 1900) return '—';
    return d.toLocaleString(undefined, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit'
    });
  } catch (e) {
    return '—';
  }
}

function formatMobile(val) {
  if (!val) return '—';
  let s = val.toString().trim();
  if (s.startsWith('963')) {
    return '0' + s.slice(3);
  }
  return s;
}

function fmtNum(val) {
  if (val == null || val === '') return '0';
  const n = Number(val);
  return n.toLocaleString(undefined, { maximumFractionDigits: 2 });
}

function exportToExcel(data, fileName = 'Manual_Transactions.xls') {
  let html = `
    <html xmlns:o="urn:schemas-microsoft-com:office:office" xmlns:x="urn:schemas-microsoft-com:office:excel" xmlns="http://www.w3.org/TR/REC-html40">
    <head>
      <meta charset="utf-8" />
      <!--[if gte mso 9]>
      <xml>
        <x:ExcelWorkbook>
          <x:ExcelWorksheets>
            <x:ExcelWorksheet>
              <x:Name>Manual Transactions</x:Name>
              <x:WorksheetOptions>
                <x:DisplayGridlines/>
              </x:WorksheetOptions>
            </x:ExcelWorksheet>
          </x:ExcelWorksheets>
        </x:ExcelWorkbook>
      </xml>
      <![endif]-->
      <style>
        table { border-collapse: collapse; }
        th { background-color: #ea580c; color: #ffffff; font-weight: bold; border: 1px solid #c2410c; padding: 10px 12px; font-family: sans-serif; font-size: 11pt; }
        td { border: 1px solid #e5e7eb; padding: 8px 10px; font-family: sans-serif; font-size: 10pt; }
        .text { mso-number-format: "\\@"; text-align: left; }
        .center { text-align: center; }
        .number { mso-number-format: "#,##0"; text-align: right; }
        .date { mso-number-format: "YYYY\\-MM\\-DD HH\\:MM"; text-align: center; }
      </style>
    </head>
    <body>
      <table>
        <thead>
          <tr>
            <th>Transaction Date</th>
            <th>Client ID</th>
            <th>Client Name</th>
            <th>Mobile</th>
            <th>Point</th>
          </tr>
        </thead>
        <tbody>
  `;

  data.forEach(item => {
    const pts = Number(item.Point || 0);
    const dateStr = item.TransactionDate ? fmtDate(item.TransactionDate) : '';

    html += `
      <tr>
        <td class="date">${dateStr}</td>
        <td class="text">${item.ClientID || ''}</td>
        <td>${item.Name || ''}</td>
        <td class="text">${formatMobile(item.mobile || item.Mobile)}</td>
        <td class="number">${pts}</td>
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

export default function ManualTransaction({ user, def }) {
  const [transactions, setTransactions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [sortField, setSortField] = useState('TransactionDate');
  const [sortAsc, setSortAsc] = useState(false);
  const [selectedClientID, setSelectedClientID] = useState(null);

  // Add Point Modal & Lookup State
  const [showAddModal, setShowAddModal] = useState(false);
  const [addClientID, setAddClientID] = useState('');
  const [addPointVal, setAddPointVal] = useState('');
  const [addLoading, setAddLoading] = useState(false);
  const [addError, setAddError] = useState('');
  const [addSuccess, setAddSuccess] = useState('');

  // Client Lookup list & search states
  const [clientMasterList, setClientMasterList] = useState([]);
  const [clientSearchQuery, setClientSearchQuery] = useState('');
  const [selectedLookupClient, setSelectedLookupClient] = useState(null);
  const [showDropdown, setShowDropdown] = useState(false);
  const [fetchingClients, setFetchingClients] = useState(false);

  async function load() {
    setLoading(true);
    setError('');
    try {
      const d = await apiCall('Get Manual Transaction', null, { User: user?.Username });
      if (d.State !== 0 && d.State !== undefined && d.State !== null && d.Message) {
        setError(d.Message || 'Failed to fetch manual transactions');
        setTransactions([]);
      } else {
        setTransactions(d.List0 || []);
      }
    } catch (e) {
      setError(e.message || 'Error communicating with server');
    }
    setLoading(false);
  }

  async function fetchClientsForLookup() {
    setFetchingClients(true);
    try {
      const res = await apiCall('GetClientMaster', null, { User: user?.Username });
      if (res && res.List0) {
        setClientMasterList(res.List0);
      }
    } catch (e) {
      console.error('Failed to load client master for lookup', e);
    }
    setFetchingClients(false);
  }

  useEffect(() => {
    load();
  }, [user]);

  function handleOpenAddModal() {
    setShowAddModal(true);
    setAddError('');
    setAddSuccess('');
    setAddClientID('');
    setAddPointVal('');
    setSelectedLookupClient(null);
    setClientSearchQuery('');
    setShowDropdown(false);
    if (!clientMasterList.length) {
      fetchClientsForLookup();
    }
  }

  function handleSelectLookupClient(client) {
    setSelectedLookupClient(client);
    setAddClientID(client.GLCID);
    setClientSearchQuery(`${client.Name} (ID: ${client.GLCID})`);
    setShowDropdown(false);
  }

  function handleClearLookupClient() {
    setSelectedLookupClient(null);
    setAddClientID('');
    setClientSearchQuery('');
    setShowDropdown(true);
  }

  async function handleAddPointSubmit(e) {
    e?.preventDefault();
    const finalClientID = selectedLookupClient ? selectedLookupClient.GLCID : addClientID;

    if (!finalClientID || !addPointVal) {
      setAddError('Please select a client and enter a point amount.');
      return;
    }

    const ptsNum = Number(addPointVal);
    if (isNaN(ptsNum) || ptsNum <= 0) {
      setAddError('Point amount must be greater than 0.');
      return;
    }

    if (ptsNum > 5000) {
      setAddError('Maximum allowed point is 5000.');
      return;
    }

    setAddLoading(true);
    setAddError('');
    setAddSuccess('');

    try {
      const res = await apiCall('Add Point', {
        ClientID: Number(finalClientID),
        Point: Number(addPointVal)
      }, { User: user?.Username });

      if (res.State !== 0 && res.State !== undefined && res.State !== null && res.Message) {
        setAddError(res.Message || 'Failed to add point bonus');
      } else {
        const clientDisplayName = selectedLookupClient ? selectedLookupClient.Name : `ID ${finalClientID}`;
        setAddSuccess(`Successfully added ${addPointVal} points to ${clientDisplayName}!`);
        setAddClientID('');
        setAddPointVal('');
        setSelectedLookupClient(null);
        setClientSearchQuery('');
        setTimeout(() => {
          setShowAddModal(false);
          setAddSuccess('');
          load();
        }, 1200);
      }
    } catch (err) {
      setAddError(err.message || 'Server error adding point');
    }
    setAddLoading(false);
  }

  const filteredTransactions = transactions.filter(item => {
    const s = search.toLowerCase();
    const clientName = (item.Name || '').toString().toLowerCase();
    const clientID = (item.ClientID || '').toString().toLowerCase();
    const mobile = (item.mobile || item.Mobile || '').toString().toLowerCase();
    const dateStr = (item.TransactionDate || '').toString().toLowerCase();
    const points = (item.Point || '').toString().toLowerCase();

    return (
      clientID.includes(s) ||
      clientName.includes(s) ||
      mobile.includes(s) ||
      dateStr.includes(s) ||
      points.includes(s)
    );
  });

  function handleSort(field) {
    if (sortField === field) {
      setSortAsc(!sortAsc);
    } else {
      setSortField(field);
      setSortAsc(field === 'TransactionDate' ? false : true);
    }
  }

  const sortedTransactions = [...filteredTransactions].sort((a, b) => {
    let valA = a[sortField];
    let valB = b[sortField];

    if (sortField === 'mobile') {
      valA = a.mobile || a.Mobile || '';
      valB = b.mobile || b.Mobile || '';
    }

    if (sortField === 'ClientID' || sortField === 'Point') {
      valA = Number(valA || 0);
      valB = Number(valB || 0);
    } else if (sortField === 'TransactionDate') {
      valA = valA ? new Date(valA).getTime() : 0;
      valB = valB ? new Date(valB).getTime() : 0;
    } else {
      valA = (valA || '').toString().toLowerCase();
      valB = (valB || '').toString().toLowerCase();
    }

    if (valA < valB) return sortAsc ? -1 : 1;
    if (valA > valB) return sortAsc ? 1 : -1;
    return 0;
  });

  // Calculate KPI metrics
  const totalCount = transactions.length;
  const totalPoints = transactions.reduce((acc, curr) => acc + (Number(curr.Point) || 0), 0);
  const uniqueClients = new Set(transactions.map(t => t.ClientID).filter(Boolean)).size;
  const avgPoints = totalCount > 0 ? (totalPoints / totalCount).toFixed(1) : '0';

  // Filter client lookup items
  const matchingLookupClients = clientMasterList.filter(c => {
    if (!clientSearchQuery || selectedLookupClient) return true;
    const q = clientSearchQuery.toLowerCase().trim();
    const nameStr = (c.Name || '').toLowerCase();
    const idStr = (c.GLCID || '').toString().toLowerCase();
    const mobileStr = (c.Mobile || '').toString().toLowerCase();
    return nameStr.includes(q) || idStr.includes(q) || mobileStr.includes(q);
  }).slice(0, 10);

  return (
    <div style={{ display: 'flex', flexDirection: 'column', flex: 1, height: '100%', minHeight: 0 }}>
      <div className="page-header">
        <div>
          <div className="page-title">{def?.icon || '📝'} {def?.label || 'Manual Transaction'}</div>
          <div className="page-sub">{def?.desc || 'View and issue manual point transactions'}</div>
        </div>
        <div className="page-actions">
          <button className="btn-primary" onClick={handleOpenAddModal}>
            ➕ Add Point
          </button>
          <button className="btn-secondary" onClick={load} disabled={loading}>
            {loading ? 'Refreshing…' : '🔄 Refresh'}
          </button>
          <button className="btn-secondary" onClick={() => exportToExcel(sortedTransactions)} disabled={!sortedTransactions.length}>
            📤 Export Excel
          </button>
        </div>
      </div>

      {/* KPI Cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 16, marginBottom: 20 }}>
        <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Transactions</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--text)', marginTop: 4 }}>{fmtNum(totalCount)}</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Total Manual Points</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>{fmtNum(totalPoints)}</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Unique Clients</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--blue, #2563eb)', marginTop: 4 }}>{fmtNum(uniqueClients)}</div>
        </div>
        <div style={{ background: 'var(--surface)', padding: '16px 20px', borderRadius: 'var(--radius)', border: '1px solid var(--border)', boxShadow: 'var(--shadow)' }}>
          <div style={{ fontSize: 12, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', letterSpacing: '.05em' }}>Avg Points / Txn</div>
          <div style={{ fontSize: 24, fontWeight: 800, color: 'var(--green, #16a34a)', marginTop: 4 }}>{fmtNum(avgPoints)}</div>
        </div>
      </div>

      {/* Filter / Search Bar */}
      <div style={{ marginBottom: 16, display: 'flex', gap: 12 }}>
        <input
          type="text"
          placeholder="🔍 Search by Client ID, Client Name, Mobile, Date, or Points..."
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
          <div style={{ color: 'var(--muted)', fontSize: 13 }}>Loading manual transactions...</div>
        </div>
      ) : (
        <div className="table-panel" style={{ display: 'flex', flexDirection: 'column', flex: 1, minHeight: 0, overflow: 'hidden' }}>
          <div className="table-wrap" style={{ overflow: 'auto', flex: 1, minHeight: 0 }}>
            <table style={{ width: '100%', borderCollapse: 'collapse' }}>
              <thead>
                <tr>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('TransactionDate')}>
                    Transaction Date {sortField === 'TransactionDate' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('ClientID')}>
                    Client ID {sortField === 'ClientID' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('Name')}>
                    Client Name {sortField === 'Name' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer' }} onClick={() => handleSort('mobile')}>
                    Mobile {sortField === 'mobile' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                  <th style={{ position: 'sticky', top: 0, zIndex: 1, background: 'var(--soft)', cursor: 'pointer', textAlign: 'right' }} onClick={() => handleSort('Point')}>
                    Point {sortField === 'Point' ? (sortAsc ? '▲' : '▼') : ''}
                  </th>
                </tr>
              </thead>
              <tbody>
                {sortedTransactions.length === 0 ? (
                  <tr>
                    <td colSpan="5" style={{ textAlign: 'center', color: 'var(--muted)', padding: '24px 0' }}>
                      {search ? 'No manual transactions match your search.' : 'No manual transactions found.'}
                    </td>
                  </tr>
                ) : (
                  sortedTransactions.map((item, idx) => (
                    <tr key={idx}>
                      <td style={{ fontSize: 13 }}>{fmtDate(item.TransactionDate)}</td>
                      <td>
                        <button
                          onClick={() => setSelectedClientID(item.ClientID)}
                          style={{
                            background: 'none',
                            border: 'none',
                            color: 'var(--orange)',
                            fontWeight: 700,
                            fontFamily: 'var(--mono)',
                            cursor: 'pointer',
                            padding: 0,
                            textDecoration: 'underline'
                          }}
                          title="Click to view client details"
                        >
                          {item.ClientID}
                        </button>
                      </td>
                      <td style={{ fontWeight: 600 }}>
                        <span
                          onClick={() => setSelectedClientID(item.ClientID)}
                          style={{ cursor: 'pointer', color: 'var(--text)' }}
                          title="Click to view client details"
                        >
                          {item.Name || '—'}
                        </span>
                      </td>
                      <td style={{ fontFamily: 'var(--mono)', fontSize: 13 }}>{formatMobile(item.mobile || item.Mobile)}</td>
                      <td style={{ textAlign: 'right' }}>
                        <span style={{
                          display: 'inline-block',
                          padding: '3px 10px',
                          borderRadius: '12px',
                          fontSize: 13,
                          fontWeight: 700,
                          background: 'var(--orange-soft)',
                          color: 'var(--orange2)'
                        }}>
                          +{fmtNum(item.Point)}
                        </span>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Add Point Modal */}
      {showAddModal && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.5)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
          backdropFilter: 'blur(4px)'
        }}>
          <div style={{
            background: 'var(--surface)',
            borderRadius: 'var(--radius)',
            border: '1px solid var(--border)',
            boxShadow: 'var(--shadow-lg)',
            width: '100%',
            maxWidth: '460px',
            padding: '24px'
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 16 }}>
              <div style={{ fontSize: 18, fontWeight: 800 }}>➕ Add Bonus Point</div>
              <button
                onClick={() => setShowAddModal(false)}
                style={{ background: 'none', border: 'none', fontSize: 18, cursor: 'pointer', color: 'var(--muted)' }}
              >
                ✕
              </button>
            </div>

            {addError && <div className="err-box">{addError}</div>}
            {addSuccess && <div style={{ background: 'var(--green-soft)', color: 'var(--green)', padding: '10px 14px', borderRadius: 'var(--radius-xs)', fontSize: 13, marginBottom: 14, border: '1px solid rgba(22,163,74,0.2)' }}>{addSuccess}</div>}

            <form onSubmit={handleAddPointSubmit}>
              {/* Client Lookup Search Field */}
              <div className="field" style={{ marginBottom: 16, position: 'relative' }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Client Search / Lookup</span>
                  {fetchingClients && <span style={{ color: 'var(--orange)', textTransform: 'none' }}>Loading client list...</span>}
                </label>

                {selectedLookupClient ? (
                  /* Selected Client Card */
                  <div style={{
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '8px 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--orange)',
                    background: 'var(--orange-soft)',
                    marginTop: 4
                  }}>
                    <div>
                      <div style={{ fontWeight: 700, color: 'var(--text)', fontSize: 13.5 }}>
                        👤 {selectedLookupClient.Name}
                      </div>
                      <div style={{ fontSize: 12, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                        ID: {selectedLookupClient.GLCID} · Mobile: {formatMobile(selectedLookupClient.Mobile)} · Bal: {fmtNum(selectedLookupClient.Balance)} pts
                      </div>
                    </div>
                    <button
                      type="button"
                      onClick={handleClearLookupClient}
                      style={{
                        background: 'rgba(0,0,0,0.06)',
                        border: 'none',
                        borderRadius: '50%',
                        width: 24,
                        height: 24,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        cursor: 'pointer',
                        color: 'var(--muted)',
                        fontSize: 12
                      }}
                      title="Clear selection to search again"
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  /* Search Input & Dropdown */
                  <div>
                    <input
                      type="text"
                      placeholder="🔍 Search client by Name, ID, or Mobile..."
                      value={clientSearchQuery}
                      onChange={e => {
                        setClientSearchQuery(e.target.value);
                        setAddClientID(e.target.value);
                        setShowDropdown(true);
                      }}
                      onFocus={() => setShowDropdown(true)}
                      disabled={addLoading}
                      autoFocus
                      style={{
                        width: '100%',
                        height: 42,
                        padding: '0 12px',
                        borderRadius: '8px',
                        border: '1.5px solid var(--border)',
                        background: 'var(--soft)',
                        color: 'var(--text)',
                        fontSize: 14,
                        outline: 'none'
                      }}
                    />

                    {showDropdown && matchingLookupClients.length > 0 && (
                      <div style={{
                        position: 'absolute',
                        top: '100%',
                        left: 0,
                        right: 0,
                        background: 'var(--surface)',
                        border: '1px solid var(--border)',
                        borderRadius: '8px',
                        boxShadow: 'var(--shadow-lg)',
                        maxHeight: '210px',
                        overflowY: 'auto',
                        zIndex: 1050,
                        marginTop: 4
                      }}>
                        {matchingLookupClients.map((client, i) => (
                          <div
                            key={client.GLCID || i}
                            onClick={() => handleSelectLookupClient(client)}
                            style={{
                              padding: '9px 12px',
                              borderBottom: '1px solid var(--border2, #f1f5f9)',
                              cursor: 'pointer',
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center',
                              transition: 'background 0.15s'
                            }}
                            onMouseEnter={e => e.currentTarget.style.background = 'var(--soft)'}
                            onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                          >
                            <div>
                              <div style={{ fontWeight: 700, fontSize: 13, color: 'var(--text)' }}>
                                {client.Name || 'Unnamed Client'}
                              </div>
                              <div style={{ fontSize: 11.5, color: 'var(--muted)', fontFamily: 'var(--mono)' }}>
                                ID: <span style={{ color: 'var(--orange)', fontWeight: 600 }}>{client.GLCID}</span> · {formatMobile(client.Mobile)}
                              </div>
                            </div>
                            <div style={{ fontSize: 11.5, fontWeight: 700, color: 'var(--green, #16a34a)', background: 'var(--green-soft)', padding: '2px 8px', borderRadius: '10px' }}>
                              {fmtNum(client.Balance)} pts
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>

              <div className="field" style={{ marginBottom: 20 }}>
                <label style={{ fontSize: 11, fontWeight: 700, color: 'var(--muted)', textTransform: 'uppercase', display: 'flex', justifyContent: 'space-between' }}>
                  <span>Point Amount</span>
                  <span style={{ color: 'var(--orange)', textTransform: 'none', fontWeight: 600 }}>Max: 5,000 pts</span>
                </label>
                <input
                  type="number"
                  placeholder="Enter Point amount (1 to 5000)"
                  min={1}
                  max={5000}
                  value={addPointVal}
                  onChange={e => setAddPointVal(e.target.value)}
                  disabled={addLoading}
                  style={{
                    width: '100%',
                    height: 42,
                    padding: '0 12px',
                    borderRadius: '8px',
                    border: '1.5px solid var(--border)',
                    background: 'var(--soft)',
                    color: 'var(--text)',
                    fontSize: 14,
                    outline: 'none'
                  }}
                />
                <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 4 }}>
                  Maximum allowed points per transaction is <strong>5,000</strong>.
                </div>
              </div>

              <div style={{ display: 'flex', gap: 10, justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  className="btn-secondary"
                  onClick={() => setShowAddModal(false)}
                  disabled={addLoading}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="btn-primary"
                  disabled={addLoading || (!selectedLookupClient && !addClientID)}
                >
                  {addLoading ? 'Adding Points...' : 'Confirm Add Point'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Client Detail Drawer Modal */}
      {selectedClientID && (
        <ClientDrawer
          clientID={selectedClientID}
          onClose={() => setSelectedClientID(null)}
        />
      )}
    </div>
  );
}
