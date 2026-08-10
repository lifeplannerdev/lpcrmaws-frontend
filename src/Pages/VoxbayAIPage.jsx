import React, { useState, useEffect, useRef } from 'react';
import api from '../api';
import './VoxbayAIPage.css';

export default function VoxbayAIPage() {
  const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');
  
  const [activeEmpChip, setActiveEmpChip] = useState('All');
  const [leadsSearch, setLeadsSearch] = useState('');
  const [activeLeadCat, setActiveLeadCat] = useState('All');
  
  const [playerState, setPlayerState] = useState({ open: false, url: '', lead: '', emp: '' });
  const audioRef = useRef(null);

  const isToday = date === new Date().toISOString().split('T')[0];

  const fetchData = async (targetDate) => {
    try {
      const res = await api.get(`/api/telephony/voxbay-ai/report/?date=${targetDate}`);
      setData(res.data);
      setLoading(false);
    } catch (err) {
      console.error(err);
      setLoading(false);
    }
  };

  useEffect(() => {
    setLoading(true);
    fetchData(date);
    
    let interval;
    if (isToday) {
      interval = setInterval(() => fetchData(date), 15000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [date, isToday]);

  const handlePlay = (lead, emp, url) => {
    if (!url) return;
    setPlayerState({ open: true, url, lead, emp });
    setTimeout(() => {
      if (audioRef.current) {
        audioRef.current.play();
      }
    }, 100);
  };

  if (loading && !data) return <div style={{ color: '#fff', padding: 20 }}>Loading Voxbay AI Report...</div>;
  if (!data) return <div style={{ color: '#fff', padding: 20 }}>Error loading data.</div>;

  const employees = data.employees || {};
  let totalCalls = 0;
  let totalAnswered = 0;
  let totalDurationSec = 0;
  let leadsSet = new Set();
  
  const categoryCounts = {};
  const leadStatusCounts = {};
  
  let allCalls = [];

  Object.entries(employees).forEach(([empName, calls]) => {
    calls.forEach(c => {
      totalCalls++;
      allCalls.push({ ...c, empName });
      
      if (c.call_status === 'ANSWER' || c.call_status === 'ANSWERED') {
        totalAnswered++;
        totalDurationSec += (c.duration_sec || 0);
      }
      if (c.lead_name) {
        leadsSet.add(c.lead_name);
      }
      
      const cat = c.category || 'Unknown';
      categoryCounts[cat] = (categoryCounts[cat] || 0) + 1;
      
      const stat = c.lead_status || 'UNKNOWN';
      leadStatusCounts[stat] = (leadStatusCounts[stat] || 0) + 1;
    });
  });

  const connectRate = totalCalls > 0 ? Math.round((totalAnswered / totalCalls) * 100) : 0;
  const totalTalkTimeMins = Math.round(totalDurationSec / 60);
  const avgTalkTime = totalAnswered > 0 ? Math.round(totalDurationSec / totalAnswered) : 0;

  // Gauge
  const gaugeDash = (connectRate / 100) * 326.72; // 2 * pi * 52

  // Agents list
  const agents = Object.keys(employees);
  
  // Leads for the leads tab
  let filteredLeads = allCalls;
  if (activeLeadCat !== 'All') {
    filteredLeads = filteredLeads.filter(c => c.category === activeLeadCat);
  }
  if (leadsSearch) {
    const s = leadsSearch.toLowerCase();
    filteredLeads = filteredLeads.filter(c => 
      c.lead_name.toLowerCase().includes(s) || 
      (c.last_msg || '').toLowerCase().includes(s)
    );
  }

  const renderOverview = () => (
    <section className={`panel ${activeTab === 'overview' ? 'active' : ''}`}>
      <h2 className="sec-title">Key numbers<span className="line"></span></h2>
      <div className="kpi-grid">
        <div className="kpi-card">
          <div className="bar" style={{background: 'var(--cyan)'}}></div>
          <div className="kpi-num">{totalCalls}</div>
          <div className="kpi-lbl">Total Attempts</div>
        </div>
        <div className="kpi-card">
          <div className="bar" style={{background: 'var(--rose)'}}></div>
          <div className="kpi-num">{leadsSet.size}</div>
          <div className="kpi-lbl">Unique Leads</div>
        </div>
        <div className="kpi-card">
          <div className="bar" style={{background: 'var(--violet)'}}></div>
          <div className="kpi-num">{avgTalkTime}s</div>
          <div className="kpi-lbl">Avg Talk Time</div>
        </div>
        <div className="kpi-card">
          <div className="bar" style={{background: 'var(--amber)'}}></div>
          <div className="kpi-num">{Math.round((totalAnswered / (leadsSet.size || 1))*100)/100}</div>
          <div className="kpi-lbl">Calls / Lead</div>
        </div>
      </div>

      <h2 className="sec-title">Agent comparison<span className="line"></span></h2>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Calls handled &amp; connect rate</div>
        </div>
        <div>
          {agents.map(emp => {
            const eCalls = employees[emp];
            const eAns = eCalls.filter(c => c.call_status === 'ANSWER' || c.call_status === 'ANSWERED').length;
            const eRate = eCalls.length > 0 ? Math.round((eAns / eCalls.length) * 100) : 0;
            return (
              <div key={emp} className="hbar-item">
                <div className="hbar-top">
                  <div className="hbar-name">{emp}</div>
                  <div className="hbar-val">{eCalls.length} calls · {eRate}% c.rate</div>
                </div>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{width: `${eRate}%`, background: 'var(--blue)'}}></div>
                </div>
              </div>
            );
          })}
        </div>
      </div>
      
      <h2 className="sec-title">Lead outcome categories<span className="line"></span></h2>
      <div className="card">
        <div className="card-head">
          <div className="card-title">Across all agents</div>
          <div className="card-note">from remarks</div>
        </div>
        <div>
          {Object.entries(categoryCounts).map(([cat, count]) => {
            const pct = Math.round((count / (totalCalls || 1)) * 100);
            return (
              <div key={cat} className="hbar-item">
                <div className="hbar-top">
                  <div className="hbar-name">{cat}</div>
                  <div className="hbar-val">{count}</div>
                </div>
                <div className="hbar-track">
                  <div className="hbar-fill" style={{width: `${pct}%`, background: 'var(--amber)'}}></div>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </section>
  );

  const renderEmployees = () => {
    let empCalls = allCalls;
    if (activeEmpChip !== 'All') {
      empCalls = employees[activeEmpChip] || [];
    }
    
    return (
      <section className={`panel ${activeTab === 'employees' ? 'active' : ''}`}>
        <div className="chip-row">
          <div className={`chip ${activeEmpChip === 'All' ? 'active' : ''}`} onClick={() => setActiveEmpChip('All')}>
            <div className="chip-name">All Agents</div>
          </div>
          {agents.map(emp => (
            <div key={emp} className={`chip ${activeEmpChip === emp ? 'active' : ''}`} onClick={() => setActiveEmpChip(emp)}>
              <div className="chip-name">{emp}</div>
            </div>
          ))}
        </div>
        <div className="call-list">
          {empCalls.map((c, i) => (
            <div key={i} className="call-item">
              <div className="call-top">
                <div className="call-lead">{c.lead_name}</div>
                <div className="call-time">{c.call_time}</div>
              </div>
              <div className="badge-row">
                <span className="badge" style={{background: c.call_status === 'ANSWER' || c.call_status === 'ANSWERED' ? 'var(--cyan-dim)' : 'var(--rose-dim)', color: c.call_status === 'ANSWER' || c.call_status === 'ANSWERED' ? 'var(--cyan)' : 'var(--rose)'}}>{c.call_status}</span>
                <span className="badge" style={{background: 'var(--surface-2)', color: 'var(--text-dim)'}}>{c.category}</span>
              </div>
              {c.last_msg && <div className="call-remark"><b>Remark:</b> {c.last_msg}</div>}
              {c.call_status === 'ANSWER' || c.call_status === 'ANSWERED' ? (
                 <div className="play-row">
                   <button className={`play-btn ${!c.recording ? 'no-rec' : ''}`} onClick={() => handlePlay(c.lead_name, c.empName, c.recording)}>
                     <svg viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z"/></svg>
                     {c.recording ? 'Play Recording' : 'No Recording'}
                   </button>
                   <span className="rec-dur">{c.duration_sec}s</span>
                 </div>
              ) : null}
            </div>
          ))}
        </div>
      </section>
    );
  };

  const renderLeads = () => {
    return (
      <section className={`panel ${activeTab === 'leads' ? 'active' : ''}`}>
        <h2 className="sec-title" style={{marginTop:4}}>Tap a category to inspect leads<span className="line"></span></h2>
        <div className="cat-grid">
          <div className={`cat-card ${activeLeadCat === 'All' ? 'active' : ''}`} onClick={() => setActiveLeadCat('All')}>
            <div className="cat-num">{allCalls.length}</div>
            <div className="cat-name">All Categories</div>
          </div>
          {Object.entries(categoryCounts).map(([cat, count]) => (
            <div key={cat} className={`cat-card ${activeLeadCat === cat ? 'active' : ''}`} onClick={() => setActiveLeadCat(cat)}>
              <div className="cat-num">{count}</div>
              <div className="cat-name">{cat}</div>
            </div>
          ))}
        </div>

        <div className="lead-list-wrap">
          <div className="searchbox">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none"><circle cx="11" cy="11" r="7" stroke="#93a5c2" strokeWidth="2"/><path d="M21 21l-4.3-4.3" stroke="#93a5c2" strokeWidth="2" strokeLinecap="round"/></svg>
            <input placeholder="Search lead name or remark…" value={leadsSearch} onChange={e => setLeadsSearch(e.target.value)} />
          </div>
          <div className="call-list">
            {filteredLeads.map((c, i) => (
              <div key={i} className="lead-item">
                <div className="lead-item-top">
                  <div className="lead-name">{c.lead_name}</div>
                  <div className="lead-emp">{c.empName}</div>
                </div>
                {c.last_msg && <div className="lead-remark">{c.last_msg}</div>}
              </div>
            ))}
          </div>
        </div>
      </section>
    );
  };

  return (
    <div className={`voxbay-page-wrap ${playerState.open ? 'player-active' : ''}`}>
      <header className="top">
        <div className="brand-row">
          <div className="brand">
            <div className="brand-mark">
              <svg viewBox="0 0 24 24" fill="none"><path d="M3 12c0-3 1-5 2-6M21 12c0-3-1-5-2-6M7 12a5 5 0 0110 0v3a2 2 0 01-2 2h-1v-4h3M7 12v3a2 2 0 002 2h1v-4H7" stroke="#04140f" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/></svg>
            </div>
            <div>
              <div className="brand-name">VOXBAY</div>
              <div className="brand-sub">Telecalling Ops</div>
            </div>
          </div>
          <div className="date-picker-wrap">
            {isToday && <span className="live-dot"></span>}
            <input type="date" value={date} onChange={e => setDate(e.target.value)} max={new Date().toISOString().split('T')[0]} />
          </div>
        </div>

        <div className="hero">
          <div className="hero-title">Daily performance snapshot for <span className="accent">{agents.length}</span> agents on the floor</div>
          <div className="hero-date">{date}</div>
          <div className="eq"><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span><span></span></div>
        </div>

        <div className="gauge-row">
          <div className="gauge-wrap">
            <svg viewBox="0 0 120 120">
              <circle cx="60" cy="60" r="52" fill="none" stroke="rgba(148,178,220,0.12)" strokeWidth="10"/>
              <circle cx="60" cy="60" r="52" fill="none" stroke="#38e8c6" strokeWidth="10" strokeLinecap="round" strokeDasharray={`${gaugeDash} 1000`}/>
            </svg>
            <div className="gauge-center">
              <div className="gauge-num">{connectRate}%</div>
              <div className="gauge-lbl">Connect</div>
            </div>
          </div>
          <div className="gauge-stats">
            <div className="gstat"><div className="gstat-num">{totalCalls}</div><div className="gstat-lbl">Total Calls</div></div>
            <div className="gstat"><div className="gstat-num">{totalAnswered}</div><div className="gstat-lbl">Answered</div></div>
            <div className="gstat"><div className="gstat-num">{leadsSet.size}</div><div className="gstat-lbl">Leads Worked</div></div>
            <div className="gstat"><div className="gstat-num">{totalTalkTimeMins}m</div><div className="gstat-lbl">Talk Time</div></div>
          </div>
        </div>
      </header>

      <nav className="tabs">
        <button className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`} onClick={() => setActiveTab('overview')}>Overview</button>
        <button className={`tab-btn ${activeTab === 'employees' ? 'active' : ''}`} onClick={() => setActiveTab('employees')}>Employees</button>
        <button className={`tab-btn ${activeTab === 'leads' ? 'active' : ''}`} onClick={() => setActiveTab('leads')}>Leads</button>
      </nav>

      <main>
        {renderOverview()}
        {renderEmployees()}
        {renderLeads()}
      </main>

      <footer className="foot">
        Generated from Voxbay call center export · <span className="fmark">For internal MD review</span><br/>
        All figures derived from outgoing call logs matched to leads.
      </footer>

      <div id="miniPlayer" className={playerState.open ? 'open' : ''}>
        <div className="mp-top">
          <div className="mp-info">
            <div className="mp-lead">{playerState.lead}</div>
            <div className="mp-emp">{playerState.emp}</div>
          </div>
          <div className="mp-close" onClick={() => { setPlayerState({...playerState, open: false}); if(audioRef.current) audioRef.current.pause(); }}>✕</div>
        </div>
        <audio ref={audioRef} src={playerState.url} controls></audio>
      </div>
    </div>
  );
}
