import { useEffect, useRef, useState } from 'react';
import {
  Activity,
  ArrowDownRight,
  ArrowRight,
  ArrowUpRight,
  Bell,
  Building2,
  CalendarDays,
  Check,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  CircleHelp,
  CloudSun,
  FileImage,
  FileText,
  House,
  MapPin,
  Menu,
  Plus,
  Search,
  ShieldCheck,
  Sparkles,
  X,
} from 'lucide-react';

const activityItems = [
  { address: '1842 Valencia St', detail: '3 bd · 2 ba · 1,840 sq ft', value: '$1,248,000', change: '+4.2%', tone: 'up', date: 'Today, 9:41 am', image: 'photo-1600596542815-ffad4c1539a9' },
  { address: '76 Vermont Ave', detail: '2 bd · 1 ba · 1,160 sq ft', value: '$824,000', change: '+1.8%', tone: 'up', date: 'Yesterday', image: 'photo-1600607687939-ce8a6c25118c' },
  { address: '2901 Harrison St', detail: '4 bd · 3 ba · 2,410 sq ft', value: '$1,690,000', change: '-0.6%', tone: 'down', date: 'Oct 22', image: 'photo-1600566753086-00f18fb6b3ea' },
];

const marketPoints = [18, 26, 22, 38, 34, 41, 37, 52, 48, 57, 55, 66, 62, 70, 67, 82, 77, 89];

function dollars(value) {
  return new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);
}

function Photo({ id, className = '', alt = '' }) {
  return <img className={className} src={`https://images.unsplash.com/${id}?auto=format&fit=crop&w=1100&q=85`} alt={alt} />;
}

function App() {
  const [dialogOpen, setDialogOpen] = useState(false);
  const [mobileNavOpen, setMobileNavOpen] = useState(false);
  const [activeNav, setActiveNav] = useState('Overview');
  const [notice, setNotice] = useState('');
  const [valuation, setValuation] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [photo, setPhoto] = useState(null);
  const formRef = useRef(null);

  useEffect(() => {
    const saved = window.localStorage.getItem('groundwork-latest-valuation');
    if (saved) setValuation(JSON.parse(saved));
  }, []);

  const openNewValuation = () => {
    setError('');
    setValuation(null);
    setPhoto(null);
    setDialogOpen(true);
  };

  const handlePhoto = (event) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setError('Choose an image file to continue.');
      return;
    }
    if (file.size > 5 * 1024 * 1024) {
      setError('Images must be smaller than 5 MB.');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => setPhoto({ name: file.name, dataUrl: reader.result });
    reader.readAsDataURL(file);
  };

  const submitValuation = async (event) => {
    event.preventDefault();
    setError('');
    setLoading(true);
    const form = new FormData(event.currentTarget);
    const payload = {
      address: form.get('address'),
      property_type: form.get('property_type'),
      bedrooms: Number(form.get('bedrooms')),
      bathrooms: Number(form.get('bathrooms')),
      area_sqft: Number(form.get('area_sqft')),
      year_built: Number(form.get('year_built')),
      condition: form.get('condition'),
      asking_price: form.get('asking_price') ? Number(form.get('asking_price')) : null,
      image: photo ? { name: photo.name, data_url: photo.dataUrl } : null,
    };

    try {
      const response = await fetch('/api/valuations', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      const result = await response.json();
      if (!response.ok) throw new Error(result.detail || 'The valuation could not be completed.');
      setValuation(result);
      window.localStorage.setItem('groundwork-latest-valuation', JSON.stringify(result));
    } catch (requestError) {
      setError(requestError.message.includes('Failed to fetch')
        ? 'The analysis service is offline. Start the FastAPI server on port 8000 and try again.'
        : requestError.message);
    } finally {
      setLoading(false);
    }
  };

  const navItems = [
    { label: 'Overview', icon: House },
    { label: 'Valuations', icon: Activity },
    { label: 'Saved properties', icon: Building2 },
  ];

  const selectNav = (label) => {
    setActiveNav(label);
    setMobileNavOpen(false);
    if (label !== 'Overview') setNotice(`${label} is ready for your next property.`);
    else setNotice('');
  };

  return (
    <div className="app-shell">
      <aside className={`sidebar ${mobileNavOpen ? 'sidebar-open' : ''}`}>
        <a className="brand" href="#overview" aria-label="Groundwork home" onClick={() => selectNav('Overview')}>
          <span className="brand-mark"><span /></span>
          <span>groundwork<span className="brand-period">.</span></span>
        </a>
        <div className="workspace-switcher">
          <span className="workspace-avatar">A</span>
          <span className="workspace-copy"><strong>Alex Morgan</strong><small>Personal workspace</small></span>
          <ChevronDown size={15} />
        </div>
        <div className="nav-label">WORKSPACE</div>
        <nav className="side-nav" aria-label="Main navigation">
          {navItems.map(({ label, icon: Icon }) => (
            <button key={label} className={`nav-item ${activeNav === label ? 'active' : ''}`} onClick={() => selectNav(label)}>
              <Icon size={17} strokeWidth={1.8} /><span>{label}</span>
              {label === 'Valuations' && <span className="nav-count">3</span>}
            </button>
          ))}
        </nav>
        <div className="sidebar-bottom">
          <div className="sidebar-note"><span className="note-icon"><Sparkles size={15} /></span><strong>Better decisions, grounded.</strong><p>Your property intelligence workspace.</p></div>
          <button className="nav-item help-link" onClick={() => setNotice('Contact hello@groundwork.ai for product support.')}><CircleHelp size={17} /><span>Help & support</span></button>
          <div className="sidebar-profile"><span className="profile-photo">AM</span><span className="workspace-copy"><strong>Alex Morgan</strong><small>Free plan</small></span><ChevronDown size={15} /></div>
        </div>
      </aside>

      {mobileNavOpen && <button className="nav-scrim" aria-label="Close navigation" onClick={() => setMobileNavOpen(false)} />}

      <main className="main-content" id="overview">
        <header className="topbar">
          <button className="icon-button mobile-menu" aria-label="Open navigation" onClick={() => setMobileNavOpen(true)}><Menu size={19} /></button>
          <div className="breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeNav}</strong></div>
          <div className="topbar-actions">
            <button className="search-button" onClick={() => setNotice('Search your saved properties and valuation reports.')}><Search size={16} /><span>Search</span><kbd>⌘ K</kbd></button>
            <button className="icon-button notification-button" aria-label="Notifications" onClick={() => setNotice('You’re all caught up.')}><Bell size={18} /><i /></button>
            <span className="top-avatar">AM</span>
          </div>
        </header>

        {notice && <div className="notice" role="status">{notice}<button aria-label="Dismiss" onClick={() => setNotice('')}><X size={15} /></button></div>}

        <div className="page-wrap">
          <section className="welcome-row">
            <div>
              <div className="eyebrow"><span className="live-dot" /> YOUR PROPERTY DESK <span className="eyebrow-divider">/</span> SAN FRANCISCO, CA</div>
              <h1>Good morning, Alex<span className="heading-period">.</span></h1>
              <p className="welcome-copy">A clearer picture of the places that matter.</p>
            </div>
            <button className="primary-button" onClick={openNewValuation}><Plus size={17} /> New valuation</button>
          </section>

          <section className="market-strip" aria-label="Market summary">
            <div className="market-summary">
              <div className="metric-label">SAN FRANCISCO MARKET <span className="metric-live"><span /> LIVE</span></div>
              <div className="market-value-row"><strong>$1.24M</strong><span className="market-change"><ArrowUpRight size={15} /> 3.8%</span></div>
              <div className="metric-foot">Median sale price <span>·</span> <b>↑ 3.8%</b> vs. last quarter</div>
            </div>
            <div className="market-chart" aria-label="Market prices trending upward over the last 12 months">
              <div className="chart-periods"><span>12 MONTHS</span><span>OCT 2026</span></div>
              <svg viewBox="0 0 480 96" preserveAspectRatio="none" role="img" aria-label="Upward market trend">
                <defs><linearGradient id="chartFill" x1="0" x2="0" y1="0" y2="1"><stop offset="0%" stopColor="#b9d1c3" stopOpacity=".42" /><stop offset="100%" stopColor="#b9d1c3" stopOpacity="0" /></linearGradient></defs>
                <path d={`M 0 96 ${marketPoints.map((point, index) => `L ${(index / (marketPoints.length - 1)) * 480} ${96 - point}`).join(' ')} L 480 96 Z`} fill="url(#chartFill)" />
                <path d={marketPoints.map((point, index) => `${index ? 'L' : 'M'} ${(index / (marketPoints.length - 1)) * 480} ${96 - point}`).join(' ')} fill="none" stroke="#47765c" strokeWidth="2.5" vectorEffect="non-scaling-stroke" />
                <circle cx="480" cy={96 - marketPoints[marketPoints.length - 1]} r="4" fill="#47765c" />
              </svg>
            </div>
            <div className="market-context"><span className="context-icon"><MapPin size={16} /></span><div><span>MARKET PULSE</span><strong>Inventory is tightening</strong><small>12% fewer active listings</small></div><ArrowRight size={15} /></div>
          </section>

          <section className="featured-section">
            <div className="section-heading"><div><span className="section-kicker">YOUR LATEST LOOK</span><h2>On your radar</h2></div><button className="text-button" onClick={() => selectNav('Valuations')}>All valuations <ArrowRight size={15} /></button></div>
            <article className="featured-property">
              <div className="featured-image-wrap">
                <Photo id="photo-1600596542815-ffad4c1539a9" className="featured-image" alt="Modern San Francisco home with landscaped front yard" />
                <span className="photo-tag"><Sparkles size={13} /> AI PROPERTY BRIEF</span>
                <button className="image-action" aria-label="View property brief" onClick={() => setNotice('Your latest property brief is shown in the analysis panel.')}><ArrowUpRight size={17} /></button>
              </div>
              <div className="featured-details">
                <div className="property-topline"><span className="property-type">SINGLE-FAMILY HOME</span><span className="property-date"><CalendarDays size={13} /> ANALYZED TODAY</span></div>
                <h3>1842 Valencia Street</h3>
                <p className="property-location"><MapPin size={14} /> Mission District, San Francisco</p>
                <div className="property-facts"><span>3 <small>beds</small></span><i /><span>2 <small>baths</small></span><i /><span>1,840 <small>sq ft</small></span><i /><span>1924 <small>built</small></span></div>
                <div className="value-panel">
                  <div><span className="value-label">ESTIMATED MARKET VALUE</span><strong>{valuation ? dollars(valuation.estimated_value) : '$1,248,000'}</strong><small>{valuation ? `Confidence ${valuation.confidence}%` : 'Based on 12 nearby comparable sales'}</small></div>
                  <div className="value-trend"><span><ArrowUpRight size={14} /> 4.2%</span><small>vs. last quarter</small></div>
                </div>
                <button className="analysis-link" onClick={() => valuation ? setDialogOpen(true) : openNewValuation()}>View property analysis <ArrowRight size={15} /></button>
              </div>
            </article>
          </section>

          <section className="lower-grid">
            <div className="activity-section">
              <div className="section-heading compact-heading"><div><span className="section-kicker">KEEPING A RECORD</span><h2>Recent valuations</h2></div><button className="subtle-link" onClick={() => selectNav('Valuations')}>View all <ArrowRight size={14} /></button></div>
              <div className="valuation-list">
                {activityItems.map((item, index) => (
                  <button className="valuation-row" key={item.address} onClick={() => index === 0 && valuation ? setDialogOpen(true) : setNotice(`${item.address} report selected.`)}>
                    <Photo id={item.image} className="row-thumb" alt="" />
                    <span className="row-property"><strong>{item.address}</strong><small>{item.detail}</small></span>
                    <span className="row-price"><strong>{index === 0 && valuation ? dollars(valuation.estimated_value) : item.value}</strong><small className={item.tone}><ArrowUpRight size={12} /> {item.change}</small></span>
                    <span className="row-date">{item.date}</span>
                    <ChevronRight className="row-chevron" size={15} />
                  </button>
                ))}
              </div>
            </div>
            <aside className="insight-column">
              <div className="insight-heading"><span className="section-kicker">A LITTLE CONTEXT</span><span className="insight-spark"><Sparkles size={14} /></span></div>
              <h3>Small details.<br />Better decisions.</h3>
              <p>Listings in the Mission are moving 8 days faster than the city average. Well-kept homes under $1.5M are seeing the most competition.</p>
              <div className="insight-source"><span className="source-dot" /> MARKET NOTE <span>·</span> UPDATED 2H AGO</div>
              <div className="weather-note"><CloudSun size={17} /><span><strong>Clear week ahead</strong><small>Good conditions for a neighborhood visit</small></span><ArrowUpRight size={14} /></div>
            </aside>
          </section>

          <footer className="page-footer"><span>GROUNDWORK INTELLIGENCE <span>·</span> SAN FRANCISCO</span><span>Property estimates are informational, not appraisals.</span></footer>
        </div>
      </main>

      {dialogOpen && (
        <div className="modal-backdrop" role="presentation" onMouseDown={(event) => event.target === event.currentTarget && setDialogOpen(false)}>
          <section className={`valuation-modal ${valuation ? 'result-mode' : ''}`} role="dialog" aria-modal="true" aria-labelledby="modal-title">
            <header className="modal-header"><div className="modal-brand"><span className="modal-mark"><Sparkles size={15} /></span><span>PROPERTY INTELLIGENCE</span></div><button className="icon-button modal-close" aria-label="Close dialog" onClick={() => setDialogOpen(false)}><X size={19} /></button></header>
            {!valuation ? (
              <form ref={formRef} onSubmit={submitValuation}>
                <div className="modal-intro"><span className="section-kicker">A MORE GROUNDED ESTIMATE</span><h2 id="modal-title">Tell us about the property.</h2><p>Share the details you have. Add a photo for a richer visual assessment.</p></div>
                <label className="field-label" htmlFor="address">Property address</label>
                <div className="input-with-icon"><MapPin size={16} /><input id="address" name="address" placeholder="e.g. 1842 Valencia Street, San Francisco" required minLength="5" maxLength="200" /></div>
                <div className="form-grid">
                  <label><span className="field-label">Property type</span><select name="property_type"><option value="single_family">Single-family home</option><option value="condo">Condominium</option><option value="townhouse">Townhouse</option><option value="multifamily">Multi-family</option></select></label>
                  <label><span className="field-label">Condition</span><select name="condition"><option value="good">Good</option><option value="excellent">Excellent</option><option value="fair">Fair</option><option value="needs_work">Needs work</option></select></label>
                  <label><span className="field-label">Bedrooms</span><input name="bedrooms" type="number" min="0" max="30" defaultValue="3" required /></label>
                  <label><span className="field-label">Bathrooms</span><input name="bathrooms" type="number" min="0" max="30" step="0.5" defaultValue="2" required /></label>
                  <label><span className="field-label">Interior area (sq ft)</span><input name="area_sqft" type="number" min="100" max="100000" defaultValue="1840" required /></label>
                  <label><span className="field-label">Year built</span><input name="year_built" type="number" min="1700" max="2026" defaultValue="1924" required /></label>
                </div>
                <label className="field-label" htmlFor="asking_price">Asking price <span className="optional">OPTIONAL</span></label>
                <div className="input-with-icon dollar-input"><span>$</span><input id="asking_price" name="asking_price" type="number" min="1" placeholder="No asking price yet" /></div>
                <label className={`upload-box ${photo ? 'has-photo' : ''}`} htmlFor="property-image">
                  {photo ? <><img src={photo.dataUrl} alt="Selected property preview" /><span className="upload-copy"><strong>{photo.name}</strong><small>Image ready to analyze</small></span><button type="button" className="remove-image" aria-label="Remove image" onClick={(event) => { event.preventDefault(); setPhoto(null); }}><X size={15} /></button></> : <><span className="upload-icon"><FileImage size={18} /></span><span className="upload-copy"><strong>Add a property photo</strong><small>JPG, PNG or WebP · up to 5 MB</small></span><span className="upload-cta">Browse</span></>}
                  <input id="property-image" type="file" accept="image/jpeg,image/png,image/webp" onChange={handlePhoto} />
                </label>
                {error && <p className="form-error" role="alert">{error}</p>}
                <div className="modal-actions"><button type="button" className="cancel-button" onClick={() => setDialogOpen(false)}>Cancel</button><button type="submit" className="primary-button" disabled={loading}>{loading ? <span className="spinner" /> : <Sparkles size={16} />}{loading ? 'Analyzing property…' : 'Generate valuation'}</button></div>
                <p className="privacy-note"><ShieldCheck size={13} /> Property details stay in your personal workspace.</p>
              </form>
            ) : (
              <div className="result-content">
                <span className="section-kicker">VALUATION COMPLETE <span className="result-check"><Check size={11} /></span></span>
                <h2 id="modal-title">A clearer picture.</h2>
                <p className="result-address"><MapPin size={14} /> {valuation.address}</p>
                <div className="result-value"><span>ESTIMATED MARKET VALUE</span><strong>{dollars(valuation.estimated_value)}</strong><small>Range {dollars(valuation.low_estimate)} – {dollars(valuation.high_estimate)}</small></div>
                <div className="confidence-line"><span>Confidence</span><strong>{valuation.confidence}%</strong><div><i style={{ width: `${valuation.confidence}%` }} /></div></div>
                <div className="result-block"><span className="section-kicker">WHAT SHAPED THIS</span>{valuation.rationale.map((item) => <p key={item}><span className="rationale-dot" />{item}</p>)}</div>
                <div className="result-block comparables-block"><span className="section-kicker">NEARBY COMPARABLES</span>{valuation.comparables.map((item) => <div className="comparable-row" key={item.address}><span><strong>{item.address}</strong><small>{item.distance_miles} mi · {item.area_sqft.toLocaleString()} sq ft</small></span><strong>{dollars(item.sale_price)}</strong></div>)}</div>
                <div className="analysis-source"><span className="source-dot" /> {valuation.analysis_source === 'multimodal_ai' ? 'MULTIMODAL AI ANALYSIS' : 'ILLUSTRATIVE LOCAL ESTIMATE'} <span>·</span> NOT AN APPRAISAL</div>
                <div className="modal-actions result-actions"><button className="cancel-button" onClick={() => { setValuation(null); setError(''); }}>Edit details</button><button className="primary-button" onClick={() => setDialogOpen(false)}><FileText size={15} /> Done</button></div>
              </div>
            )}
          </section>
        </div>
      )}
    </div>
  );
}

export default App;