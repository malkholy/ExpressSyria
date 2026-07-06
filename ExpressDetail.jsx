import React, { useState, useEffect } from 'react';
import { apiCall } from '../shared/api.js';

const MONTHS = [
  { value: 1, label: 'January' }, { value: 2, label: 'February' },
  { value: 3, label: 'March' },   { value: 4, label: 'April' },
  { value: 5, label: 'May' },     { value: 6, label: 'June' },
  { value: 7, label: 'July' },    { value: 8, label: 'August' },
  { value: 9, label: 'September' },{ value: 10, label: 'October' },
  { value: 11, label: 'November' },{ value: 12, label: 'December' },
];
const QUARTERS = [
  { value: 1, label: 'Q1 (Jan-Mar)' }, { value: 2, label: 'Q2 (Apr-Jun)' },
  { value: 3, label: 'Q3 (Jul-Sep)' }, { value: 4, label: 'Q4 (Oct-Dec)' },
];
const YEARS = Array.from({ length: 6 }, (_, i) => new Date().getFullYear() - i);

// Helper for large numbers formatting
function fmt(val) {
  if (val == null || val === '') return '—';
  const n = Number(val);
  const abs = Math.abs(n);
  const sign = n < 0 ? '-' : '';
  if (abs >= 1_000_000_000) return sign + (abs / 1_000_000_000).toFixed(1).replace(/\.0$/, '') + 'B';
  if (abs >= 1_000_000) return sign + (abs / 1_000_000).toFixed(1).replace(/\.0$/, '') + 'M';
  if (abs >= 1_000) return sign + (abs / 1_000).toFixed(1).replace(/\.0$/, '') + 'K';
  return n.toFixed(0);
}

// Percent formatter
function pctChange(cy, py) {
  if (cy == null || py == null) return null;
  const c = Number(cy);
  const p = Number(py);
  if (p === 0) return c > 0 ? '+100%' : '0%';
  const diff = ((c - p) / p) * 100;
  const sign = diff >= 0 ? '+' : '';
  return `${sign}${diff.toFixed(1)}%`;
}

function getPeriodLabel(period, months, quarters, year) {
  if (period === 'yearly') return `Year ${year}`;
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    return s.length === 1 ? `Q${s[0]} ${year}` : s.map(q => `Q${q}`).join(', ') + ` ${year}`;
  }
  const s = [...months].sort((a, b) => a - b);
  return s.length === 1 ? `${MONTHS.find(m => m.value === s[0])?.label} ${year}` : s.map(m => MONTHS.find(x => x.value === m)?.label?.slice(0, 3)).join(', ') + ` ${year}`;
}

function buildLineData(period, months, quarters, year) {
  if (period === 'yearly') return { Period: 'yearly', Months: '', Quarter: 0, Year: year };
  if (period === 'quarterly') {
    const s = [...quarters].sort((a, b) => a - b);
    const qm = s.flatMap(q => q === 1 ? [1, 2, 3] : q === 2 ? [4, 5, 6] : q === 3 ? [7, 8, 9] : [10, 11, 12]);
    return { Period: 'quarterly', Months: [...new Set(qm)].join(','), Quarter: s[0], Year: year };
  }
  return { Period: 'monthly', Months: [...months].sort((a, b) => a - b).join(','), Quarter: 0, Year: year };
}

// Helper to aggregate monthly trends into quarterly statistics
function getQuarterlyTrends(trends) {
  const qData = {
    1: { Quarter: 1, CY_ChargingCards: 0, CY_ChargingPoints: 0, PY_ChargingCards: 0, PY_ChargingPoints: 0, CY_ActiveCards: 0, CY_ActivePoints: 0, PY_ActiveCards: 0, PY_ActivePoints: 0, CY_ActiveClients: 0, PY_ActiveClients: 0, CY_JoinedClients: 0, PY_JoinedClients: 0 },
    2: { Quarter: 2, CY_ChargingCards: 0, CY_ChargingPoints: 0, PY_ChargingCards: 0, PY_ChargingPoints: 0, CY_ActiveCards: 0, CY_ActivePoints: 0, PY_ActiveCards: 0, PY_ActivePoints: 0, CY_ActiveClients: 0, PY_ActiveClients: 0, CY_JoinedClients: 0, PY_JoinedClients: 0 },
    3: { Quarter: 3, CY_ChargingCards: 0, CY_ChargingPoints: 0, PY_ChargingCards: 0, PY_ChargingPoints: 0, CY_ActiveCards: 0, CY_ActivePoints: 0, PY_ActiveCards: 0, PY_ActivePoints: 0, CY_ActiveClients: 0, PY_ActiveClients: 0, CY_JoinedClients: 0, PY_JoinedClients: 0 },
    4: { Quarter: 4, CY_ChargingCards: 0, CY_ChargingPoints: 0, PY_ChargingCards: 0, PY_ChargingPoints: 0, CY_ActiveCards: 0, CY_ActivePoints: 0, PY_ActiveCards: 0, PY_ActivePoints: 0, CY_ActiveClients: 0, PY_ActiveClients: 0, CY_JoinedClients: 0, PY_JoinedClients: 0 },
  };

  const presentQuarters = new Set();

  trends.forEach(t => {
    const q = Math.ceil(t.Month / 3);
    presentQuarters.add(q);
    
    qData[q].CY_ChargingCards += Number(t.CY_ChargingCards || 0);
    qData[q].CY_ChargingPoints += Number(t.CY_ChargingPoints || 0);
    qData[q].PY_ChargingCards += Number(t.PY_ChargingCards || 0);
    qData[q].PY_ChargingPoints += Number(t.PY_ChargingPoints || 0);
    
    qData[q].CY_ActiveCards += Number(t.CY_ActiveCards || 0);
    qData[q].CY_ActivePoints += Number(t.CY_ActivePoints || 0);
    qData[q].PY_ActiveCards += Number(t.PY_ActiveCards || 0);
    qData[q].PY_ActivePoints += Number(t.PY_ActivePoints || 0);

    qData[q].CY_ActiveClients += Number(t.CY_ActiveClients || 0);
    qData[q].PY_ActiveClients += Number(t.PY_ActiveClients || 0);

    qData[q].CY_JoinedClients += Number(t.CY_JoinedClients || 0);
    qData[q].PY_JoinedClients += Number(t.PY_JoinedClients || 0);
  });

  return [...presentQuarters].sort((a, b) => a - b).map(q => qData[q]);
}

// Multi-select dropdown
function MultiSelect({ options, selected, onChange, placeholder }) {
  const [open, setOpen] = useState(false);
  const ref = React.useRef(null);
  React.useEffect(() => {
    function handle(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false); }
    document.addEventListener('mousedown', handle);
    return () => document.removeEventListener('mousedown', handle);
  }, []);
  const label = selected.length === 0 ? placeholder
    : selected.length === 1 ? options.find(o => o.value === selected[0])?.label
    : `${selected.length} selected`;
  return (
    <div ref={ref} style={{ position: 'relative' }}>
      <button onClick={() => setOpen(o => !o)} style={{
        height: 30, padding: '0 10px', fontSize: 12, border: '0.5px solid var(--border)',
        borderRadius: 'var(--radius-xs)', background: 'var(--surface)', color: 'var(--text)',
        cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, minWidth: 120, fontFamily: 'var(--font)'
      }}>
        <span style={{ flex: 1, textAlign: 'left', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{label}</span>
        {selected.length > 1 && <span style={{ background: 'var(--orange)', color: '#fff', fontSize: 10, fontWeight: 700, padding: '1px 5px', borderRadius: 999 }}>{selected.length}</span>}
        <span style={{ fontSize: 10 }}>▾</span>
      </button>
      {open && (
        <div style={{
          position: 'absolute', top: 34, right: 0, background: 'var(--surface)',
          border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)',
          zIndex: 100, minWidth: 160, boxShadow: 'var(--shadow-lg)', maxHeight: 240, overflowY: 'auto'
        }}>
          {options.map(o => (
            <div key={o.value} onClick={() => {
              const next = selected.includes(o.value) ? selected.filter(v => v !== o.value) : [...selected, o.value];
              onChange(next.length ? next : [o.value]);
            }} style={{
              display: 'flex', alignItems: 'center', gap: 8, padding: '8px 12px', fontSize: 12,
              cursor: 'pointer', color: selected.includes(o.value) ? 'var(--orange)' : 'var(--text)',
              fontWeight: selected.includes(o.value) ? 600 : 400,
              background: selected.includes(o.value) ? 'var(--orange-soft)' : 'transparent'
            }}>
              <input type="checkbox" checked={selected.includes(o.value)} readOnly style={{ accentColor: 'var(--orange)', width: 13, height: 13 }} />
              {o.label}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

// Side Drawer component for Client Detail
function ClientDrawer({ clientID, clientName, onClose }) {
  const [activeTab, setActiveTab] = useState('charging');
  const [data, setData] = useState({ charging: [], redemption: [] });
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!clientID) return;
    async function fetchClientDetail() {
      setLoading(true);
      setError('');
      try {
        const res = await apiCall('Get Express Client Detail', { ClientID: clientID }, {}, true);
        setData({
          charging: res.List0 || [],
          redemption: res.List1 || []
        });
      } catch (err) {
        console.error(err);
        setError('Failed to load client details.');
      }
      setLoading(false);
    }
    fetchClientDetail();
  }, [clientID]);

  if (!clientID) return null;

  return (
    <div style={{
      position: 'fixed', inset: 0, zIndex: 1000, display: 'flex', justifyContent: 'flex-end'
    }}>
      {/* Backdrop */}
      <div onClick={onClose} style={{
        position: 'absolute', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(2px)'
      }}></div>

      {/* Content Container */}
      <div style={{
        position: 'relative', width: '100%', maxWidth: '600px', height: '100%',
        background: 'var(--surface)', borderLeft: '1px solid var(--border)',
        boxShadow: 'var(--shadow-lg)', display: 'flex', flexDirection: 'column',
        padding: '24px', overflow: 'hidden'
      }}>
        {/* Close Button */}
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: 20 }}>
          <div>
            <div style={{ fontSize: 18, fontWeight: 800 }}>👤 {clientName || `Client #${clientID}`}</div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginTop: 4 }}>Detailed Card Activity & Redemptions</div>
          </div>
          <button onClick={onClose} style={{
            width: 32, height: 32, borderRadius: '50%', border: '1px solid var(--border)',
            background: 'var(--soft)', cursor: 'pointer', display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 14, fontWeight: 700, color: 'var(--text)'
          }}>✕</button>
        </div>

        {/* Mini stats cards inside Drawer */}
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12, marginBottom: 20 }}>
          <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Charged Points</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--orange)', marginTop: 4 }}>
              {fmt(data.charging.reduce((sum, r) => sum + Number(r.TotalPoints || 0), 0))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              From {data.charging.reduce((sum, r) => sum + Number(r.TotalCards || 0), 0)} cards
            </div>
          </div>
          <div style={{ background: 'var(--soft)', border: '1px solid var(--border)', borderRadius: 'var(--radius-sm)', padding: 12 }}>
            <div style={{ fontSize: 11, color: 'var(--muted)' }}>Total Redeemed Points</div>
            <div style={{ fontSize: 16, fontWeight: 800, color: 'var(--green)', marginTop: 4 }}>
              {fmt(data.redemption.reduce((sum, r) => sum + Number(r.TotalPoint || 0), 0))}
            </div>
            <div style={{ fontSize: 11, color: 'var(--muted)', marginTop: 2 }}>
              Across {data.redemption.reduce((sum, r) => sum + Number(r.TotalRequest || 0), 0)} requests
            </div>
          </div>
        </div>

        {/* Tab Buttons */}
        <div style={{ display: 'flex', borderBottom: '1px solid var(--border)', gap: 16, marginBottom: 16 }}>
          <button onClick={() => setActiveTab('charging')} style={{
            background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', color: activeTab === 'charging' ? 'var(--orange)' : 'var(--muted)',
            borderBottom: activeTab === 'charging' ? '2.5px solid var(--orange)' : 'none'
          }}>💳 Card Charging ({data.charging.length})</button>
          <button onClick={() => setActiveTab('redemption')} style={{
            background: 'none', border: 'none', padding: '8px 4px', fontSize: 13, fontWeight: 700,
            cursor: 'pointer', color: activeTab === 'redemption' ? 'var(--orange)' : 'var(--muted)',
            borderBottom: activeTab === 'redemption' ? '2.5px solid var(--orange)' : 'none'
          }}>🎁 Gift Redemptions ({data.redemption.length})</button>
        </div>

        {/* Tab content */}
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {loading ? (
            <div style={{ display: 'flex', justifyContent: 'center', padding: 40 }}><div className="spinner"></div></div>
          ) : error ? (
            <div className="err-page">{error}</div>
          ) : activeTab === 'charging' ? (
            data.charging.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No charging history found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 6px' }}>Period</th>
                    <th style={{ padding: '8px 6px' }}>Card Type</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Cards</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.charging.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>{MONTHS.find(m => m.value === r.ChargingMonth)?.label.slice(0, 3)} {r.ChargingYear}</td>
                      <td style={{ padding: '10px 6px' }}>
                        <span style={{
                          background: 'var(--soft)', border: '1px solid var(--border)',
                          padding: '2px 6px', borderRadius: 4, fontSize: 10, fontWeight: 700
                        }}>{r.CardType || 'Default'}</span>
                      </td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{r.TotalCards}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{fmt(r.TotalPoints)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          ) : (
            data.redemption.length === 0 ? (
              <div style={{ textAlign: 'center', padding: 40, color: 'var(--muted)', fontSize: 13 }}>No redemption history found.</div>
            ) : (
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                <thead>
                  <tr style={{ textAlign: 'left', borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                    <th style={{ padding: '8px 6px' }}>Period</th>
                    <th style={{ padding: '8px 6px' }}>Gift Name</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Qty</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Requests</th>
                    <th style={{ padding: '8px 6px', textAlign: 'right' }}>Points</th>
                  </tr>
                </thead>
                <tbody>
                  {data.redemption.map((r, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                      <td style={{ padding: '10px 6px', fontWeight: 600 }}>{MONTHS.find(m => m.value === r.RedemptionMonth)?.label.slice(0, 3)} {r.RedemptionYear}</td>
                      <td style={{ padding: '10px 6px', maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={r.GiftName}>🎁 {r.GiftName}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{r.GiftAmount}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right' }}>{r.TotalRequest}</td>
                      <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmt(r.TotalPoint)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )
          )}
        </div>
      </div>
    </div>
  );
}

export default function ExpressDetail({ user, lineData: initLineData, periodLabel: initPeriodLabel, onBack, controlData }) {
  const now = new Date();
  const init = initLineData || {};
  const [period, setPeriod] = useState(init.Period || 'monthly');
  const [months, setMonths] = useState(init.Months ? init.Months.split(',').map(Number) : [now.getMonth() + 1]);
  const [quarters, setQuarters] = useState(
    init.Period === 'quarterly' && init.Months
      ? (() => {
          const mList = init.Months.split(',').map(Number);
          const qSet = new Set();
          mList.forEach(m => {
            if (m >= 1 && m <= 3) qSet.add(1);
            if (m >= 4 && m <= 6) qSet.add(2);
            if (m >= 7 && m <= 9) qSet.add(3);
            if (m >= 10 && m <= 12) qSet.add(4);
          });
          return [...qSet].sort((a, b) => a - b);
        })()
      : [init.Quarter || Math.ceil((now.getMonth() + 1) / 3)]
  );
  const [year, setYear] = useState(init.Year || now.getFullYear());
  const [displayMode, setDisplayMode] = useState('monthly'); // 'monthly' or 'quarterly'
  const [activeDashboardTab, setActiveDashboardTab] = useState('cards'); // 'cards', 'card_types', 'clients', 'gifts'
  const [showAllGov, setShowAllGov] = useState(false);
  const [showAllClients, setShowAllClients] = useState(false);
  const [showAllGifts, setShowAllGifts] = useState(false);
  const [showAllNovaGifts, setShowAllNovaGifts] = useState(false);
  const [showAllCashCallGifts, setShowAllCashCallGifts] = useState(false);

  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  // Main KPI stats (CY vs PY)
  const [summary, setSummary] = useState(null);
  // Month-by-month trends
  const [trends, setTrends] = useState([]);
  // Top gifts
  const [gifts, setGifts] = useState([]);
  const [novaGifts, setNovaGifts] = useState([]);
  const [cashCallGifts, setCashCallGifts] = useState([]);
  // Card type performance
  const [cardTypes, setCardTypes] = useState([]);
  // Top clients list
  const [clients, setClients] = useState([]);
  // Governorate statistics
  const [governorates, setGovernorates] = useState([]);

  // Client Drawer state
  const [selectedClientID, setSelectedClientID] = useState(null);
  const [selectedClientName, setSelectedClientName] = useState('');

  const periodLabel = getPeriodLabel(period, months, quarters, year);
  const lineData = buildLineData(period, months, quarters, year);

  async function load() {
    setLoading(true);
    setError('');
    setShowAllGov(false);
    setShowAllClients(false);
    setShowAllGifts(false);
    setShowAllNovaGifts(false);
    setShowAllCashCallGifts(false);
    try {
      const d = await apiCall('Get Express Details By Period', lineData, {}, true);
      setSummary(d.List0?.[0] || null);
      setTrends(d.List1 || []);
      setGifts(d.List2 || []);
      setCardTypes(d.List3 || []);
      setClients(d.List4 || []);
      setGovernorates(d.List5 || []);
      setNovaGifts(d.List6 || []);
      setCashCallGifts(d.List7 || []);
    } catch (e) {
      console.error(e);
      setError(e.message || 'Error loading Express dashboard data');
    }
    setLoading(false);
  }

  useEffect(() => {
    load();
  }, [period, months, quarters, year]);

  // Derived KPI ratios

  const cyChargingAvg = summary && Number(summary.CY_ChargingCards) > 0 ? (Number(summary.CY_ChargingPoints) / Number(summary.CY_ChargingCards)).toFixed(0) : null;
  const pyChargingAvg = summary && Number(summary.PY_ChargingCards) > 0 ? (Number(summary.PY_ChargingPoints) / Number(summary.PY_ChargingCards)).toFixed(0) : null;

  const cyYearActiveRatio = summary && Number(summary.CY_YearChargingCards) > 0 
    ? ((Number(summary.CY_YearActiveCards) / Number(summary.CY_YearChargingCards)) * 100).toFixed(1) 
    : null;
  const pyYearActiveRatio = summary && Number(summary.PY_YearChargingCards) > 0 
    ? ((Number(summary.PY_YearActiveCards) / Number(summary.PY_YearChargingCards)) * 100).toFixed(1) 
    : null;

  // Max points for bar scales in leaderboards
  const maxGiftPoints = gifts.length > 0 ? Math.max(...gifts.map(g => Number(g.TotalPoints || 0))) : 1;
  const maxClientPoints = clients.length > 0 ? Math.max(...clients.map(c => Number(c.TotalChargedPoints || 0))) : 1;
  const maxNovaGiftPoints = novaGifts.length > 0 ? Math.max(...novaGifts.map(g => Number(g.TotalPoints || 0))) : 1;
  const maxCashCallGiftPoints = cashCallGifts.length > 0 ? Math.max(...cashCallGifts.map(g => Number(g.TotalPoints || 0))) : 1;

  const visibleGov = showAllGov ? governorates : governorates.slice(0, 10);
  const visibleClients = showAllClients ? clients : clients.slice(0, 10);
  const visibleGifts = showAllGifts ? gifts : gifts.slice(0, 10);
  const visibleNovaGifts = showAllNovaGifts ? novaGifts : novaGifts.slice(0, 10);
  const visibleCashCallGifts = showAllCashCallGifts ? cashCallGifts : cashCallGifts.slice(0, 10);

  return (
    <div>
      <style>{`
        @media print {
          @page {
            size: A4 landscape;
            margin: 12mm 15mm;
          }
          
          /* Hide non-printable elements */
          .sidebar,
          .topbar,
          .no-print,
          .tab-buttons,
          .client-drawer,
          .client-drawer-backdrop,
          .client-drawer-container {
            display: none !important;
          }
          
          /* Make container full width */
          .main {
            margin-left: 0 !important;
            padding: 0 !important;
            width: 100% !important;
            background: #fff !important;
          }
          
          .page-area {
            padding: 0 !important;
            margin: 0 !important;
            width: 100% !important;
          }

          /* Force browser to print backgrounds like progress bars and badges */
          * {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }

          /* Reset layout styles for header card in print */
          .header-card.sticky-header {
            position: relative !important;
            top: 0 !important;
            margin: 0 0 15px 0 !important;
            padding: 0 !important;
            border: none !important;
            border-radius: 0 !important;
            box-shadow: none !important;
            background: transparent !important;
          }

          .print-title {
            display: block !important;
            margin-bottom: 12px !important;
          }

          /* Optimize layout grid columns for landscape fit */
          .kpi-grid {
            display: grid !important;
            grid-template-columns: repeat(5, 1fr) !important;
            gap: 12px !important;
            margin-bottom: 20px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .kpi-card {
            border: 1px solid var(--border) !important;
            background: var(--surface) !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .cards-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .clients-grid {
            display: grid !important;
            grid-template-columns: 1.2fr 1fr !important;
            gap: 20px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .gifts-grid {
            display: grid !important;
            grid-template-columns: 1fr 1fr !important;
            gap: 20px !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .panel {
            border: 1px solid var(--border) !important;
            background: var(--surface) !important;
            box-shadow: none !important;
            page-break-inside: avoid;
            break-inside: avoid;
          }

          .panel-body {
            overflow: visible !important;
            max-height: none !important;
          }

          table {
            page-break-inside: auto;
          }

          tr {
            page-break-inside: avoid;
            page-break-after: auto;
          }
        }
      `}</style>

      {/* Print-only title */}
      <div className="print-title" style={{ display: 'none' }}>
        <h1 style={{ fontSize: '20px', fontWeight: 800, margin: '0 0 4px 0' }}>💳 Express Loyalty Details</h1>
        <div style={{ fontSize: '13px', fontWeight: 600, color: 'var(--orange)', margin: '0 0 10px 0' }}>
          Section: {
            activeDashboardTab === 'cards' ? 'Cards & Trends' : 
            activeDashboardTab === 'card_types' ? 'Card Type Statistics' : 
            activeDashboardTab === 'clients' ? 'Client & Governorate Statistics' : 
            'Redemption Channels & Gifts'
          }
        </div>
      </div>

      {/* Header Card */}
      <div className="header-card sticky-header" style={{
        position: 'sticky',
        top: '50px',
        zIndex: 9,
        background: 'var(--surface)',
        border: '1px solid var(--border)',
        borderRadius: 'var(--radius)',
        padding: '16px 20px',
        marginTop: '-12px',
        marginBottom: 16,
        boxShadow: 'var(--shadow)'
      }}>
        <div className="no-print" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <div>
            <div style={{ fontSize: 12, color: 'var(--muted)', marginBottom: 4 }}>
              <span style={{ color: 'var(--orange)', cursor: 'pointer' }} onClick={onBack}>Control Page</span>
              <span style={{ margin: '0 6px' }}>›</span><span>Express Details</span>
            </div>
            <div className="page-title">💳 Express Loyalty Details</div>
          </div>
          <button className="btn-primary no-print" onClick={load} style={{ height: 32, fontSize: 12 }}>🔄 Refresh</button>
        </div>
        
        <div className="no-print" style={{ height: '0.5px', background: 'var(--border)', margin: '12px 0' }}></div>
        
        <div className="no-print" style={{ display: 'flex', alignItems: 'center', gap: 8 }} onClick={e => e.stopPropagation()}>
          <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
            {['monthly', 'quarterly', 'yearly'].map(p => (
              <button key={p} onClick={() => setPeriod(p)} style={{
                padding: '5px 14px', fontSize: 12, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                background: period === p ? 'var(--orange)' : 'var(--surface)',
                color: period === p ? '#fff' : 'var(--muted)', fontWeight: period === p ? 600 : 400,
                textTransform: 'capitalize'
              }}>{p}</button>
            ))}
          </div>
          {period === 'monthly' && <MultiSelect options={MONTHS} selected={months} onChange={setMonths} placeholder="Select months" />}
          {period === 'quarterly' && <MultiSelect options={QUARTERS} selected={quarters} onChange={setQuarters} placeholder="Select quarters" />}
          <select className="filter-select" value={year} onChange={e => setYear(Number(e.target.value))} style={{ height: 30, fontSize: 12 }}>
            {YEARS.map(y => <option key={y} value={y}>{y}</option>)}
          </select>
        </div>
        <div style={{ marginTop: 10, display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: 11, color: 'var(--muted)', background: 'var(--soft)', padding: '3px 10px', borderRadius: 999 }}>
          📅 {periodLabel}
        </div>
      </div>

      {error && <div className="err-page">⚠ {error}</div>}

      {/* KPI Cards Grid */}
      <div className="kpi-grid" style={{ marginBottom: 20, gridTemplateColumns: 'repeat(5, 1fr)' }}>
        {/* KPI 1: Charging */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Charged Cards</div>
            <div className="kpi-value" style={{ color: 'var(--orange)' }}>
              {summary ? fmt(summary.CY_ChargingCards) : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Points: {summary ? fmt(summary.CY_ChargingPoints) : '0'}</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_ChargingCards) >= Number(summary.PY_ChargingCards) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_ChargingCards, summary.PY_ChargingCards)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year: {summary ? fmt(summary.PY_ChargingCards) : '—'} cards
            </div>
          </>}
        </div>

        {/* KPI 2: Activation */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Activated Cards</div>
            <div className="kpi-value" style={{ color: 'var(--blue)' }}>
              {summary ? fmt(summary.CY_ActiveCards) : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Points: {summary ? fmt(summary.CY_ActivePoints) : '0'}</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_ActiveCards) >= Number(summary.PY_ActiveCards) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_ActiveCards, summary.PY_ActiveCards)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year: {summary ? fmt(summary.PY_ActiveCards) : '—'} cards
            </div>
          </>}
        </div>

        {/* KPI 3: Redemptions */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Gift Redemptions</div>
            <div className="kpi-value" style={{ color: 'var(--green)' }}>
              {summary ? `${fmt(summary.CY_RedeemAmount)} EGP` : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Points: {summary ? fmt(summary.CY_RedeemPoints) : '0'}</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_RedeemAmount) >= Number(summary.PY_RedeemAmount) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_RedeemAmount, summary.PY_RedeemAmount)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Requests: {summary ? fmt(summary.CY_RedeemRequests) : '—'} requests
            </div>
          </>}
        </div>

        {/* KPI 4: Avg Charged Point */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Avg Charged Point</div>
            <div className="kpi-value" style={{ color: 'var(--text)' }}>
              {cyChargingAvg ? `${fmt(cyChargingAvg)} pts` : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }} title="Activation vs Charging for the whole year">
                Yearly Active: {cyYearActiveRatio ? `${cyYearActiveRatio}%` : '—'}
              </span>
              {pyYearActiveRatio && (
                <span style={{
                  fontWeight: 700,
                  color: Number(cyYearActiveRatio) >= Number(pyYearActiveRatio) ? 'var(--green)' : 'var(--red)'
                }}>
                  {Number(cyYearActiveRatio) >= Number(pyYearActiveRatio) ? '▲' : '▼'} vs PY ({pyYearActiveRatio}%)
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year Avg: {pyChargingAvg ? `${fmt(pyChargingAvg)} pts` : '—'}
            </div>
          </>}
        </div>

        {/* KPI 5: Total Active Clients */}
        <div className="kpi-card">
          {loading ? <div className="kpi-loading"><div className="spinner"></div></div> : <>
            <div className="kpi-label">Active Clients</div>
            <div className="kpi-value" style={{ color: 'var(--amber)' }}>
              {summary ? fmt(summary.CY_ActiveClients) : '—'}
            </div>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 11, marginTop: 4 }}>
              <span style={{ color: 'var(--muted)' }}>Clients in charging</span>
              {summary && (
                <span style={{
                  fontWeight: 700,
                  color: Number(summary.CY_ActiveClients) >= Number(summary.PY_ActiveClients) ? 'var(--green)' : 'var(--red)'
                }}>
                  {pctChange(summary.CY_ActiveClients, summary.PY_ActiveClients)} YoY
                </span>
              )}
            </div>
            <div style={{ fontSize: 10, color: 'var(--hint)', marginTop: 4 }}>
              Prior Year: {summary ? fmt(summary.PY_ActiveClients) : '—'} clients
            </div>
          </>}
        </div>
      </div>

      {/* Tab Buttons for Dashboard Sections */}
      <div className="tab-buttons no-print" style={{
        display: 'flex',
        borderBottom: '1.5px solid var(--border)',
        gap: 24,
        marginBottom: 20,
        paddingBottom: 2,
        marginTop: 10
      }}>
        {[
          { id: 'cards', label: 'Cards', icon: '💳' },
          { id: 'card_types', label: 'Cards Type', icon: '🏷️' },
          { id: 'clients', label: 'Clients', icon: '👥' },
          { id: 'gifts', label: 'Gifts / Redemptions', icon: '🎁' }
        ].map(t => {
          const isActive = activeDashboardTab === t.id;
          return (
            <button
              key={t.id}
              onClick={() => setActiveDashboardTab(t.id)}
              style={{
                background: 'none',
                border: 'none',
                padding: '10px 4px',
                fontSize: 13,
                fontWeight: 700,
                cursor: 'pointer',
                color: isActive ? 'var(--orange)' : 'var(--muted)',
                borderBottom: isActive ? '3.5px solid var(--orange)' : '3.5px solid transparent',
                display: 'flex',
                alignItems: 'center',
                gap: 8,
                transition: 'all 0.15s ease',
                fontFamily: 'var(--font)',
                marginBottom: -3
              }}
            >
              <span>{t.icon}</span>
              <span>{t.label}</span>
            </button>
          );
        })}
      </div>

      {/* Tab 1: Cards & Trends */}
      {activeDashboardTab === 'cards' && (() => {
        const chargingTotals = (displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).reduce((acc, t) => {
          acc.CY_Cards += Number(t.CY_ChargingCards || 0);
          acc.PY_Cards += Number(t.PY_ChargingCards || 0);
          acc.CY_Points += Number(t.CY_ChargingPoints || 0);
          acc.PY_Points += Number(t.PY_ChargingPoints || 0);
          return acc;
        }, { CY_Cards: 0, PY_Cards: 0, CY_Points: 0, PY_Points: 0 });

        const totalChargingGrowth = pctChange(chargingTotals.CY_Cards, chargingTotals.PY_Cards);
        const isTotalChargingUp = !totalChargingGrowth?.startsWith('-');
        const totalCyChargingAvg = chargingTotals.CY_Cards > 0 ? (chargingTotals.CY_Points / chargingTotals.CY_Cards) : 0;
        const totalPyChargingAvg = chargingTotals.PY_Cards > 0 ? (chargingTotals.PY_Points / chargingTotals.PY_Cards) : 0;

        const activeTotals = (displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).reduce((acc, t) => {
          acc.CY_Cards += Number(t.CY_ActiveCards || 0);
          acc.PY_Cards += Number(t.PY_ActiveCards || 0);
          acc.CY_Points += Number(t.CY_ActivePoints || 0);
          acc.PY_Points += Number(t.PY_ActivePoints || 0);
          return acc;
        }, { CY_Cards: 0, PY_Cards: 0, CY_Points: 0, PY_Points: 0 });

        const totalActiveGrowth = pctChange(activeTotals.CY_Cards, activeTotals.PY_Cards);
        const isTotalActiveUp = !totalActiveGrowth?.startsWith('-');
        const totalCyActiveAvg = activeTotals.CY_Cards > 0 ? (activeTotals.CY_Points / activeTotals.CY_Cards) : 0;
        const totalPyActiveAvg = activeTotals.PY_Cards > 0 ? (activeTotals.PY_Points / activeTotals.PY_Cards) : 0;

        return (
          <>
            <div className="section-label" style={{ marginTop: 10, marginBottom: 10 }}>Monthly Cards Statistics</div>
            <div className="cards-grid" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16, marginBottom: 20 }}>
              
              {/* YoY Monthly Charging Grid */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-head">
                  <span className="panel-title">💳 {displayMode === 'monthly' ? 'Monthly' : 'Quarterly'} Cards Charging YoY</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                      {['monthly', 'quarterly'].map(mode => (
                        <button key={mode} onClick={() => setDisplayMode(mode)} style={{
                          padding: '2px 8px', fontSize: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                          background: displayMode === mode ? 'var(--orange)' : 'var(--surface)',
                          color: displayMode === mode ? '#fff' : 'var(--muted)', fontWeight: displayMode === mode ? 600 : 400,
                          textTransform: 'capitalize'
                        }}>{mode === 'monthly' ? 'Month' : 'Quarter'}</button>
                      ))}
                    </div>
                    <span className="badge badge-orange">CY vs PY Compare</span>
                  </div>
                </div>
                <div className="panel-body" style={{ flex: 1, overflow: 'auto' }}>
                  {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                    trends.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No monthly comparative data available.</div> : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>{displayMode === 'monthly' ? 'Month' : 'Quarter'}</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year} Cards</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year - 1} Cards</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>YoY Cards</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year} Avg Pt</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year - 1} Avg Pt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).map((t, i) => {
                            const chargingGrowth = pctChange(t.CY_ChargingCards, t.PY_ChargingCards);
                            const isUp = !chargingGrowth?.startsWith('-');
                            const cyChargingAvg = t.CY_ChargingCards > 0 ? (t.CY_ChargingPoints / t.CY_ChargingCards) : 0;
                            const pyChargingAvg = t.PY_ChargingCards > 0 ? (t.PY_ChargingPoints / t.PY_ChargingCards) : 0;
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px 10px', fontWeight: 700 }}>
                                  {displayMode === 'monthly'
                                    ? MONTHS.find(m => m.value === t.Month)?.label?.slice(0, 3)
                                    : `Q${t.Quarter}`
                                  }
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--orange)' }}>
                                  {fmt(t.CY_ChargingCards)}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                                  {fmt(t.PY_ChargingCards)}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
                                  {chargingGrowth || '0%'}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--text)' }}>
                                  {cyChargingAvg > 0 ? fmt(cyChargingAvg) : '—'}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                                  {pyChargingAvg > 0 ? fmt(pyChargingAvg) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {(displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).length > 1 && (
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', borderBottom: '2px solid var(--border)', background: 'var(--soft)', fontWeight: 'bold' }}>
                              <td style={{ padding: '10px 10px', fontWeight: 800 }}>Total</td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--orange)', fontWeight: 800 }}>
                                {fmt(chargingTotals.CY_Cards)}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)', fontWeight: 800 }}>
                                {fmt(chargingTotals.PY_Cards)}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'center', color: isTotalChargingUp ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                                {totalChargingGrowth || '0%'}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--text)', fontWeight: 800 }}>
                                {totalCyChargingAvg > 0 ? fmt(totalCyChargingAvg) : '—'}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)', fontWeight: 800 }}>
                                {totalPyChargingAvg > 0 ? fmt(totalPyChargingAvg) : '—'}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )
                  }
                </div>
              </div>

              {/* YoY Monthly Activation Grid */}
              <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                <div className="panel-head">
                  <span className="panel-title">⚡ {displayMode === 'monthly' ? 'Monthly' : 'Quarterly'} Cards Activation YoY</span>
                  <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                    <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                      {['monthly', 'quarterly'].map(mode => (
                        <button key={mode} onClick={() => setDisplayMode(mode)} style={{
                          padding: '2px 8px', fontSize: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                          background: displayMode === mode ? 'var(--blue)' : 'var(--surface)',
                          color: displayMode === mode ? '#fff' : 'var(--muted)', fontWeight: displayMode === mode ? 600 : 400,
                          textTransform: 'capitalize'
                        }}>{mode === 'monthly' ? 'Month' : 'Quarter'}</button>
                      ))}
                    </div>
                    <span className="badge badge-blue">CY vs PY Compare</span>
                  </div>
                </div>
                <div className="panel-body" style={{ flex: 1, overflow: 'auto' }}>
                  {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                    trends.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No monthly comparative data available.</div> : (
                      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12.5 }}>
                        <thead>
                          <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                            <th style={{ padding: '8px 10px', textAlign: 'left' }}>{displayMode === 'monthly' ? 'Month' : 'Quarter'}</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year} Cards</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year - 1} Cards</th>
                            <th style={{ padding: '8px 10px', textAlign: 'center' }}>YoY Cards</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year} Avg Pt</th>
                            <th style={{ padding: '8px 10px', textAlign: 'right' }}>{year - 1} Avg Pt</th>
                          </tr>
                        </thead>
                        <tbody>
                          {(displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).map((t, i) => {
                            const activeGrowth = pctChange(t.CY_ActiveCards, t.PY_ActiveCards);
                            const isUp = !activeGrowth?.startsWith('-');
                            const cyActiveAvg = t.CY_ActiveCards > 0 ? (t.CY_ActivePoints / t.CY_ActiveCards) : 0;
                            const pyActiveAvg = t.PY_ActiveCards > 0 ? (t.PY_ActivePoints / t.PY_ActiveCards) : 0;
                            return (
                              <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '10px 10px', fontWeight: 700 }}>
                                  {displayMode === 'monthly'
                                    ? MONTHS.find(m => m.value === t.Month)?.label?.slice(0, 3)
                                    : `Q${t.Quarter}`
                                  }
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>
                                  {fmt(t.CY_ActiveCards)}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                                  {fmt(t.PY_ActiveCards)}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'center', fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
                                  {activeGrowth || '0%'}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--text)' }}>
                                  {cyActiveAvg > 0 ? fmt(cyActiveAvg) : '—'}
                                </td>
                                <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)' }}>
                                  {pyActiveAvg > 0 ? fmt(pyActiveAvg) : '—'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                        {(displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).length > 1 && (
                          <tfoot>
                            <tr style={{ borderTop: '2px solid var(--border)', borderBottom: '2px solid var(--border)', background: 'var(--soft)', fontWeight: 'bold' }}>
                              <td style={{ padding: '10px 10px', fontWeight: 800 }}>Total</td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--blue)', fontWeight: 800 }}>
                                {fmt(activeTotals.CY_Cards)}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)', fontWeight: 800 }}>
                                {fmt(activeTotals.PY_Cards)}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'center', color: isTotalActiveUp ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                                {totalActiveGrowth || '0%'}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--text)', fontWeight: 800 }}>
                                {totalCyActiveAvg > 0 ? fmt(totalCyActiveAvg) : '—'}
                              </td>
                              <td style={{ padding: '10px 10px', textAlign: 'right', color: 'var(--muted)', fontWeight: 800 }}>
                                {totalPyActiveAvg > 0 ? fmt(totalPyActiveAvg) : '—'}
                              </td>
                            </tr>
                          </tfoot>
                        )}
                      </table>
                    )
                  }
                </div>
              </div>

            </div>
          </>
        );
      })()}

      {/* Tab 2: Cards Type */}
      {activeDashboardTab === 'card_types' && (
        <>
          <div className="section-label" style={{ marginTop: 10, marginBottom: 10 }}>Card Type Statistics</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
            
            {/* Card Type Performance Table */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head">
                <span className="panel-title">💳 Card Type Breakdown</span>
                <span className="badge badge-amber">Cards & Points</span>
              </div>
              <div className="panel-body" style={{ flex: 1 }}>
                {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                  cardTypes.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No card type performance data.</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                          <th style={{ padding: '8px 6px', textAlign: 'left' }}>Card Type</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Charged Cards</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Activation Cards</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Card Avg</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cardTypes.map((c, i) => {
                          const avgPoint = c.TotalCardsCharged > 0 ? (c.TotalPointsCharged / c.TotalCardsCharged) : 0;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 6px', fontWeight: 700 }}>
                                <span style={{
                                  background: 'var(--orange-soft)', border: '1px solid var(--border)',
                                  padding: '3px 8px', borderRadius: 6, fontSize: 11
                                }}>
                                  {c.CardType || 'Default'}
                                </span>
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--orange)' }}>
                                {fmt(c.TotalCardsCharged)}
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>
                                {fmt(c.TotalCardsActivated)}
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--text)' }}>
                                {avgPoint > 0 ? fmt(avgPoint) : '—'}
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>

          </div>
        </>
      )}

      {/* Tab 3: Clients & Demographics */}
      {activeDashboardTab === 'clients' && (() => {
        const clientTotals = (displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).reduce((acc, t) => {
          acc.CY_Clients += Number(t.CY_ActiveClients || 0);
          acc.PY_Clients += Number(t.PY_ActiveClients || 0);
          acc.CY_Joined += Number(t.CY_JoinedClients || 0);
          acc.PY_Joined += Number(t.PY_JoinedClients || 0);
          return acc;
        }, { CY_Clients: 0, PY_Clients: 0, CY_Joined: 0, PY_Joined: 0 });

        const totalClientGrowth = pctChange(clientTotals.CY_Clients, clientTotals.PY_Clients);
        const isTotalClientUp = !totalClientGrowth?.startsWith('-');
        const totalJoinedGrowth = pctChange(clientTotals.CY_Joined, clientTotals.PY_Joined);
        const isTotalJoinedUp = !totalJoinedGrowth?.startsWith('-');

        return (
          <>
            <div className="section-label" style={{ marginTop: 10, marginBottom: 10 }}>Client & Governorate Statistics</div>
            <div className="clients-grid" style={{ display: 'grid', gridTemplateColumns: '1.2fr 1fr', gap: 16, marginBottom: 20 }}>
              
              {/* Left Column: YoY Active Clients & Leaderboard */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* YoY Active Clients Grid */}
                <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="panel-head">
                    <span className="panel-title">👥 {displayMode === 'monthly' ? 'Monthly' : 'Quarterly'} Active & Joined Clients YoY</span>
                    <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
                      <div style={{ display: 'flex', border: '0.5px solid var(--border2)', borderRadius: 'var(--radius-xs)', overflow: 'hidden' }}>
                        {['monthly', 'quarterly'].map(mode => (
                          <button key={mode} onClick={() => setDisplayMode(mode)} style={{
                            padding: '2px 8px', fontSize: 10, border: 'none', cursor: 'pointer', fontFamily: 'var(--font)',
                            background: displayMode === mode ? 'var(--orange)' : 'var(--surface)',
                            color: displayMode === mode ? '#fff' : 'var(--muted)', fontWeight: displayMode === mode ? 600 : 400,
                            textTransform: 'capitalize'
                          }}>{mode === 'monthly' ? 'Month' : 'Quarter'}</button>
                        ))}
                      </div>
                      <span className="badge badge-orange">CY vs PY Compare</span>
                    </div>
                  </div>
                  <div className="panel-body" style={{ flex: 1, overflow: 'auto' }}>
                    {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                      trends.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No active client data available.</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid var(--border)', color: 'var(--muted)' }}>
                              <th style={{ padding: '8px 6px', textAlign: 'left' }}>{displayMode === 'monthly' ? 'Month' : 'Quarter'}</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>{year} Active</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>{year - 1} Active</th>
                              <th style={{ padding: '8px 6px', textAlign: 'center' }}>YoY Active</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>{year} Joined</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>{year - 1} Joined</th>
                              <th style={{ padding: '8px 6px', textAlign: 'center' }}>YoY Joined</th>
                            </tr>
                          </thead>
                          <tbody>
                            {(displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).map((t, i) => {
                              const clientGrowth = pctChange(t.CY_ActiveClients, t.PY_ActiveClients);
                              const isUp = !clientGrowth?.startsWith('-');
                              const joinedGrowth = pctChange(t.CY_JoinedClients, t.PY_JoinedClients);
                              const isJoinedUp = !joinedGrowth?.startsWith('-');
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '10px 6px', fontWeight: 700 }}>
                                    {displayMode === 'monthly'
                                      ? MONTHS.find(m => m.value === t.Month)?.label?.slice(0, 3)
                                      : `Q${t.Quarter}`
                                    }
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--orange)' }}>
                                    {fmt(t.CY_ActiveClients)}
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--muted)' }}>
                                    {fmt(t.PY_ActiveClients)}
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: isUp ? 'var(--green)' : 'var(--red)' }}>
                                    {clientGrowth || '0%'}
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--blue)' }}>
                                    {fmt(t.CY_JoinedClients)}
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--muted)' }}>
                                    {fmt(t.PY_JoinedClients)}
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'center', fontWeight: 700, color: isJoinedUp ? 'var(--green)' : 'var(--red)' }}>
                                    {joinedGrowth || '0%'}
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                          {(displayMode === 'monthly' ? trends : getQuarterlyTrends(trends)).length > 1 && (
                            <tfoot>
                              <tr style={{ borderTop: '2px solid var(--border)', borderBottom: '2px solid var(--border)', background: 'var(--soft)', fontWeight: 'bold' }}>
                                <td style={{ padding: '10px 6px', fontWeight: 800 }}>Total</td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--orange)', fontWeight: 800 }}>
                                  {fmt(clientTotals.CY_Clients)}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--muted)', fontWeight: 800 }}>
                                  {fmt(clientTotals.PY_Clients)}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'center', color: isTotalClientUp ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                                  {totalClientGrowth || '0%'}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--blue)', fontWeight: 800 }}>
                                  {fmt(clientTotals.CY_Joined)}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'right', color: 'var(--muted)', fontWeight: 800 }}>
                                  {fmt(clientTotals.PY_Joined)}
                                </td>
                                <td style={{ padding: '10px 6px', textAlign: 'center', color: isTotalJoinedUp ? 'var(--green)' : 'var(--red)', fontWeight: 800 }}>
                                  {totalJoinedGrowth || '0%'}
                                </td>
                              </tr>
                            </tfoot>
                          )}
                        </table>
                      )
                    }
                  </div>
                </div>

                {/* Top Clients Leaderboard */}
                <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="panel-head">
                    <span className="panel-title">👥 Top Loyalty Clients</span>
                    <span className="badge badge-amber">Click to view details</span>
                  </div>
                  <div className="panel-body" style={{ flex: 1 }}>
                    {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                      clients.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No client loyalty records found.</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                              <th style={{ padding: '8px 6px' }}>Client ID & Name</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Charged Pts</th>
                              <th style={{ padding: '8px 6px', textAlign: 'right' }}>Redeemed Pts</th>
                              <th style={{ padding: '8px 6px', minWidth: 80 }}>Charged Activity</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleClients.map((c, i) => {
                              const sharePct = ((Number(c.TotalChargedPoints) / maxClientPoints) * 100);
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)', cursor: 'pointer' }} onClick={() => {
                                  setSelectedClientID(c.ClientID);
                                  setSelectedClientName(c.ClientName);
                                }}>
                                  <td style={{ padding: '10px 6px' }}>
                                    <div style={{ fontWeight: 700, color: 'var(--orange)' }}>#{c.ClientID}</div>
                                    <div style={{ fontSize: 11, color: 'var(--muted)', maxWidth: 140, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>{c.ClientName}</div>
                                  </td>
                                  <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600 }}>{fmt(c.TotalChargedPoints)}</td>
                                  <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmt(c.TotalRedeemedPoints)}</td>
                                  <td style={{ padding: '10px 6px' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                      <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                        <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--orange)', borderRadius: 999 }}></div>
                                      </div>
                                      <span style={{ fontSize: 9, color: 'var(--muted)', width: 24 }}>{sharePct.toFixed(0)}%</span>
                                    </div>
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                    }
                  </div>
                  {clients.length > 10 && (
                    <div className="no-print" style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'var(--soft)' }}>
                      <button 
                        onClick={() => setShowAllClients(!showAllClients)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--orange)', 
                          fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)'
                        }}
                      >
                        {showAllClients ? 'Show Less ▴' : `Show More (${clients.length - 10} more) ▾`}
                      </button>
                    </div>
                  )}
                </div>

              </div>

              {/* Right Column: Governorate Statistics */}
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                
                {/* Governorate Statistics */}
                <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="panel-head">
                    <span className="panel-title">🌍 Governorate Statistics</span>
                    <span className="badge badge-blue">Active client count by location</span>
                  </div>
                  <div className="panel-body" style={{ flex: 1 }}>
                    {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                      governorates.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No governorate statistics available.</div> : (
                        <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                          <thead>
                            <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                              <th style={{ padding: '8px 14px' }}>Governorate</th>
                              <th style={{ padding: '8px 14px', textAlign: 'right' }}>Total Clients</th>
                              <th style={{ padding: '8px 14px', textAlign: 'right' }}>Painters</th>
                              <th style={{ padding: '8px 14px', textAlign: 'right' }}>Non-Painters</th>
                              <th style={{ padding: '8px 14px', textAlign: 'right' }}>Painter Ratio %</th>
                            </tr>
                          </thead>
                          <tbody>
                            {visibleGov.map((g, i) => {
                              const total = Number(g.TotalClients || 0);
                              const painters = Number(g.TotalPainters || 0);
                              const painterRatio = total > 0 ? ((painters / total) * 100).toFixed(1) : '0.0';
                              return (
                                <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                                  <td style={{ padding: '10px 14px', fontWeight: 700 }}>
                                    <span style={{
                                      background: 'var(--blue-soft)', border: '1px solid var(--border)',
                                      padding: '3px 8px', borderRadius: 6, fontSize: 11, color: 'var(--blue)'
                                    }}>
                                      {g.Governorate || 'Unknown'}
                                    </span>
                                  </td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600 }}>{fmt(total)}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 600, color: 'var(--green)' }}>{fmt(painters)}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', color: 'var(--muted)' }}>{fmt(g.TotalNonPainters)}</td>
                                  <td style={{ padding: '10px 14px', textAlign: 'right', fontWeight: 700, color: Number(painterRatio) >= 50 ? 'var(--green)' : 'var(--amber)' }}>
                                    {painterRatio}%
                                  </td>
                                </tr>
                              );
                            })}
                          </tbody>
                        </table>
                      )
                    }
                  </div>
                  {governorates.length > 10 && (
                    <div className="no-print" style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'var(--soft)' }}>
                      <button 
                        onClick={() => setShowAllGov(!showAllGov)}
                        style={{
                          background: 'none', border: 'none', color: 'var(--orange)', 
                          fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)'
                        }}
                      >
                        {showAllGov ? 'Show Less ▴' : `Show More (${governorates.length - 10} more) ▾`}
                      </button>
                    </div>
                  )}
                </div>

              </div>

            </div>
          </>
        );
      })()}

      {/* Tab 4: Gifts & Redemptions */}
      {activeDashboardTab === 'gifts' && (
        <>
          <div className="section-label" style={{ marginTop: 10, marginBottom: 10 }}>Redemption Channels Breakdown</div>
          <div className="gifts-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: 16, marginBottom: 24 }}>
            
            {/* Nova Voucher Redemptions Panel */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head">
                <span className="panel-title">🎟️ Nova Voucher Redemptions</span>
                <span className="badge badge-orange">Nova Vouchers</span>
              </div>
              <div className="panel-body" style={{ flex: 1 }}>
                {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                  novaGifts.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No Nova redemption records.</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                          <th style={{ padding: '8px 6px' }}>Month</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Requests</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Points</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px 6px', minWidth: 80 }}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {novaGifts.map((g, i) => {
                          const sharePct = maxNovaGiftPoints > 0 ? ((Number(g.TotalPoints) / maxNovaGiftPoints) * 100) : 0;
                          const mVal = g.Month ?? g.month ?? g.MonthVal ?? g.monthVal;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 6px', fontWeight: 600 }}>
                                📅 {MONTHS.find(m => m.value === mVal)?.label || `Month ${mVal}`}
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right' }}>{g.TotalRequests}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--orange)' }}>{fmt(g.TotalPoints)}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>{fmt(g.TotalAmount)} EGP</td>
                              <td style={{ padding: '10px 6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--orange)', borderRadius: 999 }}></div>
                                  </div>
                                  <span style={{ fontSize: 9, color: 'var(--muted)', width: 24 }}>{sharePct.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>

            {/* Cash Call Redemptions Panel */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head">
                <span className="panel-title">📞 Cash Call Redemptions</span>
                <span className="badge badge-purple">Cash Call</span>
              </div>
              <div className="panel-body" style={{ flex: 1 }}>
                {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                  cashCallGifts.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No Cash Call redemption records.</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                          <th style={{ padding: '8px 6px' }}>Month</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Requests</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Points</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px 6px', minWidth: 80 }}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {cashCallGifts.map((g, i) => {
                          const sharePct = maxCashCallGiftPoints > 0 ? ((Number(g.TotalPoints) / maxCashCallGiftPoints) * 100) : 0;
                          const mVal = g.Month ?? g.month ?? g.MonthVal ?? g.monthVal;
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 6px', fontWeight: 600 }}>
                                📅 {MONTHS.find(m => m.value === mVal)?.label || `Month ${mVal}`}
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right' }}>{g.TotalRequests}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--purple)' }}>{fmt(g.TotalPoints)}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>{fmt(g.TotalAmount)} EGP</td>
                              <td style={{ padding: '10px 6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--purple)', borderRadius: 999 }}></div>
                                  </div>
                                  <span style={{ fontSize: 9, color: 'var(--muted)', width: 24 }}>{sharePct.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                }
              </div>
            </div>

          </div>

          <div className="section-label" style={{ marginTop: 24, marginBottom: 10 }}>Gift Redemption Leaderboard (Combined)</div>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: 16, marginBottom: 20 }}>
            
            {/* Gift Redemption Leaderboard */}
            <div className="panel" style={{ display: 'flex', flexDirection: 'column' }}>
              <div className="panel-head">
                <span className="panel-title">🎁 Combined Gift Redemption Leaderboard</span>
                <span className="badge badge-green">Top 25 Redeemed</span>
              </div>
              <div className="panel-body" style={{ flex: 1 }}>
                {loading ? <div className="loading-wrap"><div className="spinner"></div></div> :
                  gifts.length === 0 ? <div style={{ padding: 20, color: 'var(--muted)', fontSize: 13 }}>No gift redemption records.</div> : (
                    <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
                      <thead>
                        <tr style={{ borderBottom: '1.5px solid var(--border)', textAlign: 'left', color: 'var(--muted)' }}>
                          <th style={{ padding: '8px 6px' }}>Gift Name</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Requests</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Total Points</th>
                          <th style={{ padding: '8px 6px', textAlign: 'right' }}>Amount</th>
                          <th style={{ padding: '8px 6px', minWidth: 80 }}>Share</th>
                        </tr>
                      </thead>
                      <tbody>
                        {visibleGifts.map((g, i) => {
                          const sharePct = ((Number(g.TotalPoints) / maxGiftPoints) * 100);
                          return (
                            <tr key={i} style={{ borderBottom: '1px solid var(--border)' }}>
                              <td style={{ padding: '10px 6px', fontWeight: 600, maxWidth: 150, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={g.GiftName}>
                                🎁 {g.GiftName}
                              </td>
                              <td style={{ padding: '10px 6px', textAlign: 'right' }}>{g.TotalRequests}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 700, color: 'var(--green)' }}>{fmt(g.TotalPoints)}</td>
                              <td style={{ padding: '10px 6px', textAlign: 'right', fontWeight: 600, color: 'var(--muted)' }}>{fmt(g.TotalGiftAmount)} EGP</td>
                              <td style={{ padding: '10px 6px' }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                                  <div style={{ flex: 1, height: 6, background: 'var(--border)', borderRadius: 999, overflow: 'hidden' }}>
                                    <div style={{ width: `${sharePct}%`, height: '100%', background: 'var(--green)', borderRadius: 999 }}></div>
                                  </div>
                                  <span style={{ fontSize: 9, color: 'var(--muted)', width: 24 }}>{sharePct.toFixed(0)}%</span>
                                </div>
                              </td>
                            </tr>
                          );
                        })}
                      </tbody>
                    </table>
                  )
                }
              </div>
              {gifts.length > 10 && (
                <div className="no-print" style={{ padding: '12px 14px', borderTop: '1px solid var(--border)', textAlign: 'center', background: 'var(--soft)' }}>
                  <button 
                    onClick={() => setShowAllGifts(!showAllGifts)}
                    style={{
                      background: 'none', border: 'none', color: 'var(--orange)', 
                      fontWeight: 700, cursor: 'pointer', fontSize: 12, fontFamily: 'var(--font)'
                    }}
                  >
                    {showAllGifts ? 'Show Less ▴' : `Show More (${gifts.length - 10} more) ▾`}
                  </button>
                </div>
              )}
            </div>

          </div>
        </>
      )}

      {/* Slide-out Client Details Drawer */}
      <ClientDrawer 
        clientID={selectedClientID} 
        clientName={selectedClientName}
        onClose={() => {
          setSelectedClientID(null);
          setSelectedClientName('');
        }}
      />
    </div>
  );
}
