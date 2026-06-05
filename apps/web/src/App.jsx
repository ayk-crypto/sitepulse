import { useCallback, useEffect, useState } from 'react'
import './App.css'

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://sitepulse-api-84m8.onrender.com'
const API_URL_STORAGE_KEY = 'sitepulse_api_base_url'
const ADMIN_TOKEN_STORAGE_KEY = 'sitepulse_admin_token'
const CACHE_PREFIX = 'sitepulse_cache'

const inFlightRequests = new Map()

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'sites', label: 'Sites' },
  { id: 'clients', label: 'Clients' },
  { id: 'settings', label: 'Settings' },
]

function getInitialRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash || 'dashboard'
}

function setRouteHash(route) {
  window.location.hash = `/${route}`
}

function cacheKey(name, apiBaseUrl) {
  return `${CACHE_PREFIX}:${normalizeUrl(apiBaseUrl)}:${name}`
}

function readCache(name, apiBaseUrl) {
  try {
    const raw = localStorage.getItem(cacheKey(name, apiBaseUrl))
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function writeCache(name, apiBaseUrl, data) {
  const payload = {
    data,
    refreshedAt: new Date().toISOString(),
  }

  localStorage.setItem(cacheKey(name, apiBaseUrl), JSON.stringify(payload))
  return payload
}

function requestOnce(key, fetcher, force = false) {
  if (!force && inFlightRequests.has(key)) {
    return inFlightRequests.get(key)
  }

  const promise = fetcher().finally(() => {
    inFlightRequests.delete(key)
  })

  inFlightRequests.set(key, promise)
  return promise
}

function looksLikeJson(text, contentType = '') {
  const trimmed = text.trim()

  return (
    contentType.toLowerCase().includes('application/json') ||
    trimmed.startsWith('{') ||
    trimmed.startsWith('[')
  )
}

function parseApiResponseText(text, contentType, endpoint) {
  if (!text) return null

  if (!looksLikeJson(text, contentType)) {
    const error = new Error(`API returned non-JSON response from ${endpoint}`)
    error.isNonJson = true
    throw error
  }

  try {
    return JSON.parse(text)
  } catch {
    throw new Error(`API returned invalid JSON from ${endpoint}`)
  }
}

async function safeFetchJson(url, options = {}, endpoint = url) {
  const response = await fetch(url, options)
  const text = await response.text()
  const contentType = response.headers.get('content-type') || ''
  let data = null

  try {
    data = parseApiResponseText(text, contentType, endpoint)
  } catch (error) {
    if (error.isNonJson) {
      throw new Error(`API returned non-JSON response from ${endpoint}`)
    }

    throw error
  }

  if (!response.ok) {
    throw new Error(data?.error || `HTTP ${response.status} from ${endpoint}`)
  }

  return data
}

function normalizeUrl(url) {
  return (url || '').trim().replace(/\/+$/, '')
}

function formatDate(value) {
  if (!value) return 'Never'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  return new Intl.DateTimeFormat(undefined, {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
    hour: 'numeric',
    minute: '2-digit',
  }).format(date)
}

function formatRelativeTime(value) {
  if (!value) return 'Never synced'

  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Unknown'

  const diffSeconds = Math.round((date.getTime() - Date.now()) / 1000)
  const absSeconds = Math.abs(diffSeconds)
  const units = [
    ['year', 31536000],
    ['month', 2592000],
    ['day', 86400],
    ['hour', 3600],
    ['minute', 60],
  ]
  const [unit, seconds] = units.find(([, size]) => absSeconds >= size) || ['second', 1]

  return new Intl.RelativeTimeFormat(undefined, { numeric: 'auto' }).format(
    Math.round(diffSeconds / seconds),
    unit,
  )
}

function getDomain(url) {
  try {
    return new URL(url).hostname.replace(/^www\./, '')
  } catch {
    return url || 'unknown.site'
  }
}

function getInitials(value) {
  return (value || 'SP')
    .split(/[\s.-]+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join('')
    .toUpperCase()
}

function StatusBadge({ status = 'unknown' }) {
  return <span className={`status status-${status || 'unknown'}`}>{status || 'unknown'}</span>
}

function CountBadge({ value }) {
  if (value === null || value === undefined) return <span className="count-badge muted">No snapshot</span>

  return (
    <span className={value > 0 ? 'count-badge attention' : 'count-badge'}>
      {value} {value === 1 ? 'update' : 'updates'}
    </span>
  )
}

function PageCheckBadge({ check }) {
  if (!check) return <span className="status status-unknown">Not checked</span>

  if (check.errorDetected) return <span className="status status-critical">Critical</span>

  if (check.httpStatus >= 300 || check.httpStatus === null || check.httpStatus === undefined) {
    return <span className="status status-warning">Warning</span>
  }

  return <span className="status status-healthy">OK</span>
}

function AlertSeverityBadge({ severity = 'info' }) {
  return <span className={`status status-${severity}`}>{severity}</span>
}

function AlertStatusBadge({ status = 'open' }) {
  return <span className={`alert-status alert-status-${status}`}>{status}</span>
}

function getTopIssueReasons(alerts = [], limit = 2) {
  return alerts
    .filter((alert) => ['open', 'acknowledged', 'snoozed'].includes(alert.status))
    .sort((a, b) => {
      const severityWeight = { critical: 0, warning: 1, info: 2 }
      return (severityWeight[a.severity] ?? 3) - (severityWeight[b.severity] ?? 3)
    })
    .slice(0, limit)
    .map((alert) => alert.title)
}

function App() {
  const [route, setRoute] = useState(getInitialRoute)
  const [apiBaseUrl, setApiBaseUrl] = useState(
    () => localStorage.getItem(API_URL_STORAGE_KEY) || DEFAULT_API_BASE_URL,
  )
  const [adminToken, setAdminToken] = useState(
    () => localStorage.getItem(ADMIN_TOKEN_STORAGE_KEY) || '',
  )
  const [apiStatus, setApiStatus] = useState({ state: 'checking', label: 'Checking API' })

  useEffect(() => {
    const onHashChange = () => setRoute(getInitialRoute())
    window.addEventListener('hashchange', onHashChange)

    if (!window.location.hash) {
      setRouteHash('dashboard')
    }

    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const request = useCallback(
    async (path, options = {}) => {
      return safeFetchJson(
        `${normalizeUrl(apiBaseUrl)}${path}`,
        {
          ...options,
          headers: {
            ...(options.body ? { 'Content-Type': 'application/json' } : {}),
            ...(adminToken ? { 'x-sitepulse-admin-token': adminToken } : {}),
            ...options.headers,
          },
        },
        path,
      )
    },
    [adminToken, apiBaseUrl],
  )

  const checkApiStatus = useCallback(async () => {
    setApiStatus({ state: 'checking', label: 'Checking API' })

    try {
      const data = await safeFetchJson(`${normalizeUrl(apiBaseUrl)}/health`, {}, '/health')

      if (data?.status === 'ok') {
        setApiStatus({ state: 'online', label: 'API online' })
        return { success: true, message: 'Connection successful.' }
      }

      setApiStatus({ state: 'offline', label: 'Health check failed' })
      return { success: false, message: 'Health check failed.' }
    } catch {
      setApiStatus({ state: 'offline', label: 'API unavailable' })
      return { success: false, message: 'Unable to reach the API.' }
    }
  }, [apiBaseUrl])

  useEffect(() => {
    checkApiStatus()
  }, [checkApiStatus])

  const saveSettings = (nextSettings) => {
    const nextApiUrl = normalizeUrl(nextSettings.apiBaseUrl || DEFAULT_API_BASE_URL)

    localStorage.setItem(API_URL_STORAGE_KEY, nextApiUrl)
    localStorage.setItem(ADMIN_TOKEN_STORAGE_KEY, nextSettings.adminToken || '')
    setApiBaseUrl(nextApiUrl)
    setAdminToken(nextSettings.adminToken || '')
  }

  const activePage = route.startsWith('sites/') ? 'site-detail' : route
  const sidebarPage = activePage === 'site-detail' ? 'sites' : activePage

  return (
    <div className="app-shell">
      <Sidebar activePage={sidebarPage} />
      <main className="main-panel">
        <TopBar apiBaseUrl={apiBaseUrl} apiStatus={apiStatus} onRefresh={checkApiStatus} />
        {activePage === 'dashboard' && (
          <DashboardPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!adminToken} />
        )}
        {activePage === 'sites' && (
          <SitesPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!adminToken} />
        )}
        {activePage === 'alerts' && (
          <AlertsPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!adminToken} />
        )}
        {activePage === 'site-detail' && (
          <SiteDetailPage
            siteId={route.split('/')[1]}
            request={request}
            apiBaseUrl={apiBaseUrl}
            hasToken={!!adminToken}
          />
        )}
        {activePage === 'clients' && (
          <ClientsPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!adminToken} />
        )}
        {activePage === 'settings' && (
          <SettingsPage
            apiBaseUrl={apiBaseUrl}
            adminToken={adminToken}
            onSave={saveSettings}
            onCheckApi={checkApiStatus}
          />
        )}
      </main>
    </div>
  )
}

function Sidebar({ activePage }) {
  return (
    <aside className="sidebar">
      <div className="brand">
        <div className="brand-mark">SP</div>
        <div>
          <div className="brand-name">SitePulse</div>
          <div className="brand-subtitle">Onset Media</div>
        </div>
      </div>
      <nav className="nav-list" aria-label="Primary navigation">
        {navItems.map((item) => (
          <button
            className={activePage === item.id ? 'nav-item active' : 'nav-item'}
            key={item.id}
            type="button"
            onClick={() => setRouteHash(item.id)}
          >
            <span>{item.label}</span>
          </button>
        ))}
      </nav>
    </aside>
  )
}

function TopBar({ apiBaseUrl, apiStatus, onRefresh }) {
  return (
    <header className="top-bar">
      <div>
        <p className="eyebrow">Internal MVP</p>
        <h1>SitePulse Dashboard</h1>
      </div>
      <div className="api-pill">
        <span className={`dot ${apiStatus.state}`} />
        <span>{apiStatus.label}</span>
        <code>{apiBaseUrl}</code>
        <button className="secondary-button small" type="button" onClick={onRefresh}>
          Test
        </button>
      </div>
    </header>
  )
}

function PageHeader({ title, description, action }) {
  return (
    <div className="page-header">
      <div>
        <h2>{title}</h2>
        <p>{description}</p>
      </div>
      {action}
    </div>
  )
}

function LoadingState({ label = 'Loading data...' }) {
  return (
    <div className="state-box loading-state">
      <span className="loader" />
      {label}
    </div>
  )
}

function RefreshMeta({ refreshedAt, refreshing }) {
  return (
    <div className="refresh-meta">
      {refreshing ? 'Refreshing...' : `Last refreshed ${refreshedAt ? formatRelativeTime(refreshedAt) : 'never'}`}
    </div>
  )
}

function MetricSkeletons() {
  return (
    <div className="metric-grid">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="metric skeleton-card" key={index}>
          <span className="skeleton-line short" />
          <strong className="skeleton-line number" />
          <p className="skeleton-line medium" />
        </div>
      ))}
    </div>
  )
}

function TableSkeleton({ rows = 5 }) {
  return (
    <div className="table-wrap skeleton-table">
      <table>
        <tbody>
          {Array.from({ length: rows }).map((_, index) => (
            <tr key={index}>
              <td>
                <div className="site-cell">
                  <span className="skeleton-avatar" />
                  <div className="skeleton-stack">
                    <span className="skeleton-line wide" />
                    <span className="skeleton-line medium" />
                  </div>
                </div>
              </td>
              <td>
                <span className="skeleton-line medium" />
              </td>
              <td>
                <span className="skeleton-pill" />
              </td>
              <td>
                <span className="skeleton-line wide" />
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function DetailSkeleton() {
  return (
    <div className="detail-stack">
      <div className="section-card">
        <div className="overview-row">
          <span className="skeleton-avatar large" />
          <div className="skeleton-stack">
            <span className="skeleton-line wide" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line short" />
          </div>
        </div>
      </div>
      <div className="detail-grid">
        {Array.from({ length: 6 }).map((_, index) => (
          <div className="detail-item" key={index}>
            <span className="skeleton-line short" />
            <strong className="skeleton-line wide" />
          </div>
        ))}
      </div>
      <div className="section-card">
        <TableSkeleton rows={4} />
      </div>
    </div>
  )
}

function ErrorState({ message }) {
  if (!message) return null
  return <div className="state-box error-state">{message}</div>
}

function EmptyState({ title, description }) {
  return (
    <div className="empty-state">
      <strong>{title}</strong>
      <span>{description}</span>
    </div>
  )
}

function EmptyTokenNotice() {
  return (
    <div className="state-box token-state">
      Add your admin token in Settings before using internal admin endpoints.
    </div>
  )
}

function DashboardPage({ request, apiBaseUrl, hasToken }) {
  const [summary, setSummary] = useState({
    totalSites: 0,
    healthy: 0,
    warning: 0,
    critical: 0,
    unknown: 0,
    recentlySyncedSites: [],
  })
  const [recentChecks, setRecentChecks] = useState([])
  const [alertSummary, setAlertSummary] = useState({
    openCount: 0,
    criticalOpenCount: 0,
    warningOpenCount: 0,
    resolvedLast24h: 0,
    latestOpenAlerts: [],
  })
  const [lastRefreshed, setLastRefreshed] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)

  const loadSummary = useCallback(async (force = false) => {
    if (!hasToken) return

    const cached = readCache('dashboard-summary', apiBaseUrl)
    const cachedChecks = readCache('recent-page-checks', apiBaseUrl)
    const cachedAlerts = readCache('alerts-summary', apiBaseUrl)
    const hasCachedSummary = cached?.data

    if (hasCachedSummary && !force) {
      setSummary(cached.data)
      setRecentChecks(cachedChecks?.data?.checks || [])
      setAlertSummary(cachedAlerts?.data || {
        openCount: 0,
        criticalOpenCount: 0,
        warningOpenCount: 0,
        resolvedLast24h: 0,
        latestOpenAlerts: [],
      })
      setLastRefreshed(cached.refreshedAt)
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const summaryData = await requestOnce(
        cacheKey('dashboard-summary', apiBaseUrl),
        () => request('/api/admin/dashboard-summary'),
        force,
      )
      const cachedPayload = writeCache('dashboard-summary', apiBaseUrl, summaryData)
      setSummary(summaryData)
      setLastRefreshed(cachedPayload.refreshedAt)

      const [checksResult, alertsResult] = await Promise.allSettled([
        requestOnce(
          cacheKey('recent-page-checks', apiBaseUrl),
          () => request('/api/admin/page-checks/recent'),
          force,
        ),
        requestOnce(
          cacheKey('alerts-summary', apiBaseUrl),
          () => request('/api/admin/alerts/summary'),
          force,
        ),
      ])

      if (checksResult.status === 'fulfilled') {
        writeCache('recent-page-checks', apiBaseUrl, checksResult.value)
        setRecentChecks((checksResult.value.checks || []).slice(0, 10))
      } else {
        setRecentChecks(cachedChecks?.data?.checks || [])
      }

      if (alertsResult.status === 'fulfilled') {
        writeCache('alerts-summary', apiBaseUrl, alertsResult.value)
        setAlertSummary(alertsResult.value)
      } else {
        setAlertSummary(cachedAlerts?.data || {
          openCount: 0,
          criticalOpenCount: 0,
          warningOpenCount: 0,
          resolvedLast24h: 0,
          latestOpenAlerts: [],
        })
      }
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiBaseUrl, hasToken, request])

  useEffect(() => {
    loadSummary()
  }, [loadSummary])

  const recentSites = summary.recentlySyncedSites || []

  return (
    <section className="page">
      <PageHeader
        title="Dashboard"
        description="Monitor connected WordPress sites, update pressure, and sync freshness."
        action={
          <div className="header-actions">
            <RefreshMeta refreshedAt={lastRefreshed} refreshing={refreshing} />
            <button className="secondary-button" type="button" onClick={() => loadSummary(true)}>
              Refresh
            </button>
          </div>
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      <ErrorState message={error} />
      {loading && !recentSites.length ? (
        <MetricSkeletons />
      ) : (
        <div className="metric-grid">
          <Metric label="Total sites" value={summary.totalSites} detail={`${summary.unknown} unknown`} />
          <Metric label="Healthy" value={summary.healthy} status="healthy" detail="No active flags" />
          <Metric label="Warning" value={summary.warning} status="warning" detail="Needs attention" />
          <Metric label="Critical" value={summary.critical} status="critical" detail="High-priority risk" />
        </div>
      )}
      <Section title="Recently synced sites">
        {loading && !recentSites.length ? (
          <TableSkeleton rows={4} />
        ) : (
          <SiteTable
            sites={recentSites}
            compact
            emptyTitle="No recent syncs"
            emptyDescription="Sites will appear here after the WordPress agent sends data."
          />
        )}
      </Section>
      <Section title="Alert Summary">
        <div className="alert-summary-grid">
          <Metric label="Open alerts" value={alertSummary.openCount} detail="Active issues" />
          <Metric label="Critical" value={alertSummary.criticalOpenCount} status="critical" detail="Needs action" />
          <Metric label="Warning" value={alertSummary.warningOpenCount} status="warning" detail="Review soon" />
          <Metric label="Resolved 24h" value={alertSummary.resolvedLast24h} status="healthy" detail="Recently cleared" />
        </div>
        <AlertTable
          alerts={(alertSummary.latestOpenAlerts || []).filter((alert) => alert.severity === 'critical').slice(0, 5)}
          compact
          emptyTitle="No critical open alerts"
          emptyDescription="Critical alerts will appear here when SitePulse detects high-priority issues."
        />
        <button className="text-button top-gap" type="button" onClick={() => setRouteHash('alerts')}>
          View all alerts
        </button>
      </Section>
      <Section title="Recent Page Checks">
        {loading && !recentChecks.length ? (
          <TableSkeleton rows={4} />
        ) : (
          <RecentPageChecksTable checks={recentChecks.slice(0, 10)} />
        )}
      </Section>
    </section>
  )
}

function Metric({ label, value, status, detail }) {
  return (
    <div className={`metric ${status ? `metric-card-${status}` : ''}`}>
      <div>
        <span>{label}</span>
        <strong className={status ? `metric-${status}` : ''}>{value}</strong>
      </div>
      <p>{detail}</p>
    </div>
  )
}

function AlertsPage({ request, apiBaseUrl, hasToken }) {
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [filters, setFilters] = useState({ status: 'open', severity: '', source: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState('')

  const loadAlerts = useCallback(async (force = false) => {
    if (!hasToken) return

    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    const query = params.toString() ? `?${params.toString()}` : ''

    try {
      const [alertsData, summaryData] = await Promise.all([
        requestOnce(
          cacheKey(`alerts:${query}`, apiBaseUrl),
          () => request(`/api/admin/alerts${query}`),
          force,
        ),
        requestOnce(
          cacheKey('alerts-summary', apiBaseUrl),
          () => request('/api/admin/alerts/summary'),
          force,
        ),
      ])
      writeCache(`alerts:${query}`, apiBaseUrl, alertsData)
      writeCache('alerts-summary', apiBaseUrl, summaryData)
      setAlerts(alertsData.alerts || [])
      setSummary(summaryData)
    } catch (err) {
      setError(err.message)
      const cached = readCache(`alerts:${query}`, apiBaseUrl)
      if (cached?.data?.alerts) setAlerts(cached.data.alerts)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, filters, hasToken, request])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  async function runAlertAction(alertId, action) {
    setActionId(alertId)
    setError('')

    try {
      await request(`/api/admin/alerts/${alertId}/${action}`, {
        method: 'POST',
        body: action === 'snooze' ? JSON.stringify({ hours: 24 }) : undefined,
      })
      await loadAlerts(true)
      if (selectedAlert?.id === alertId) setSelectedAlert(null)
      setError(`${action === 'snooze' ? 'Snoozed' : action === 'resolve' ? 'Resolved' : 'Acknowledged'} alert successfully.`)
    } catch (err) {
      setError(err.message)
    } finally {
      setActionId('')
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Alerts"
        description="Review WordPress health, page monitoring, and operational alerts across client sites."
        action={
          <button className="secondary-button" type="button" onClick={() => loadAlerts(true)}>
            Refresh
          </button>
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      <ErrorState message={error} />
      <div className="metric-grid">
        <Metric label="Open" value={summary?.openCount || 0} detail="Active alerts" />
        <Metric label="Critical" value={summary?.criticalOpenCount || 0} status="critical" detail="High priority" />
        <Metric label="Warning" value={summary?.warningOpenCount || 0} status="warning" detail="Needs review" />
        <Metric label="Resolved 24h" value={summary?.resolvedLast24h || 0} status="healthy" detail="Recently fixed" />
      </div>
      <Section title="Alert Filters">
        <div className="filter-row">
          <label>
            Status
            <select value={filters.status} onChange={(event) => setFilters({ ...filters, status: event.target.value })}>
              <option value="">All</option>
              <option value="open">Open</option>
              <option value="acknowledged">Acknowledged</option>
              <option value="snoozed">Snoozed</option>
              <option value="resolved">Resolved</option>
            </select>
          </label>
          <label>
            Severity
            <select value={filters.severity} onChange={(event) => setFilters({ ...filters, severity: event.target.value })}>
              <option value="">All</option>
              <option value="critical">Critical</option>
              <option value="warning">Warning</option>
              <option value="info">Info</option>
            </select>
          </label>
          <label>
            Source
            <select value={filters.source} onChange={(event) => setFilters({ ...filters, source: event.target.value })}>
              <option value="">All</option>
              <option value="wordpress">WordPress</option>
              <option value="page-monitor">Page monitor</option>
            </select>
          </label>
        </div>
      </Section>
      <div className="split-layout alerts-layout">
        <Section title="Alert Center" meta={loading ? 'Loading...' : `${alerts.length} alerts`}>
          {loading && !alerts.length ? (
            <TableSkeleton rows={6} />
          ) : (
            <AlertTable
              alerts={alerts}
              actionId={actionId}
              onSelect={setSelectedAlert}
              onAction={runAlertAction}
            />
          )}
        </Section>
        <AlertDetailCard alert={selectedAlert} actionId={actionId} onAction={runAlertAction} />
      </div>
    </section>
  )
}

function AlertTable({ alerts, compact = false, onSelect, emptyTitle, emptyDescription }) {
  if (!alerts.length) {
    return (
      <EmptyState
        title={emptyTitle || 'No alerts found'}
        description={emptyDescription || 'Alerts will appear when SitePulse detects a finding.'}
      />
    )
  }

  return (
    <div className="table-wrap">
      <table className={compact ? 'alerts-table compact-alerts-table' : 'alerts-table'}>
        <thead>
          <tr>
            <th>Severity</th>
            <th>Title</th>
            <th>Site</th>
            {!compact && <th>Source</th>}
            <th>Last Seen</th>
            {!compact && <th>Occurrences</th>}
          </tr>
        </thead>
        <tbody>
          {alerts.map((alert) => (
            <tr key={alert.id} className={alert.severity === 'critical' ? 'critical-alert-row' : ''}>
              <td><AlertSeverityBadge severity={alert.severity} /></td>
              <td>
                <div className="alert-title-cell">
                  <div className="alert-title-line">
                    <button className="link-button" type="button" onClick={() => onSelect?.(alert)}>
                      {alert.title}
                    </button>
                    <AlertStatusBadge status={alert.status} />
                  </div>
                  <span>{alert.message || alert.recommendation || 'No details provided'}</span>
                </div>
              </td>
              <td>
                <strong>{alert.site?.siteName || 'Unknown site'}</strong>
                <span>{alert.site?.siteUrl ? getDomain(alert.site.siteUrl) : ''}</span>
              </td>
              {!compact && <td>{alert.source}</td>}
              <td>{formatRelativeTime(alert.lastSeenAt)}</td>
              {!compact && <td>{alert.occurrenceCount}</td>}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function AlertDetailCard({ alert, actionId, onAction }) {
  return (
    <div className="section-card alert-detail-card">
      <div className="section-title">
        <h3>Alert Detail</h3>
      </div>
      {!alert ? (
        <EmptyState title="Select an alert" description="Alert timeline and recommendation details will show here." />
      ) : (
        <div className="alert-detail">
          <AlertSeverityBadge severity={alert.severity} />
          <h3>{alert.title}</h3>
          <p>{alert.message || 'No message provided.'}</p>
          <div className="detail-list">
            <DetailItem label="Site" value={alert.site?.siteName || 'Unknown'} />
            <DetailItem label="Status" value={<AlertStatusBadge status={alert.status} />} />
            <DetailItem label="Source" value={alert.source} />
            <DetailItem label="First seen" value={formatDate(alert.firstSeenAt)} />
            <DetailItem label="Last seen" value={formatDate(alert.lastSeenAt)} />
            <DetailItem label="Occurrences" value={alert.occurrenceCount} />
          </div>
          <div className="recommendation-box">
            <strong>Recommendation</strong>
            <p>{alert.recommendation || 'No recommendation provided.'}</p>
          </div>
          <div className="alert-action-panel">
            <button className="secondary-button" disabled={actionId === alert.id} onClick={() => onAction(alert.id, 'acknowledge')}>Acknowledge</button>
            <button className="secondary-button" disabled={actionId === alert.id} onClick={() => onAction(alert.id, 'snooze')}>Snooze 24h</button>
            <button className="danger-button" disabled={actionId === alert.id} onClick={() => onAction(alert.id, 'resolve')}>Resolve</button>
          </div>
        </div>
      )}
    </div>
  )
}

function SitesPage({ request, apiBaseUrl, hasToken }) {
  const [sites, setSites] = useState([])
  const [clients, setClients] = useState([])
  const [openAlerts, setOpenAlerts] = useState([])
  const [lastRefreshed, setLastRefreshed] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [form, setForm] = useState({ clientId: '', siteName: '', siteUrl: '' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadData = useCallback(async (force = false) => {
    if (!hasToken) return

    const cachedSites = readCache('sites', apiBaseUrl)
    const cachedClients = readCache('clients', apiBaseUrl)
    const cachedAlerts = readCache('site-open-alerts', apiBaseUrl)
    const hasCachedData = cachedSites?.data?.sites || cachedClients?.data?.clients

    if (hasCachedData && !force) {
      setSites(cachedSites?.data?.sites || [])
      setClients(cachedClients?.data?.clients || [])
      setOpenAlerts(cachedAlerts?.data?.alerts || [])
      setLastRefreshed(cachedSites?.refreshedAt || cachedClients?.refreshedAt || '')
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const [sitesData, clientsData, alertsData] = await Promise.all([
        requestOnce(cacheKey('sites', apiBaseUrl), () => request('/api/admin/sites'), force),
        requestOnce(cacheKey('clients', apiBaseUrl), () => request('/api/admin/clients'), force),
        requestOnce(cacheKey('site-open-alerts', apiBaseUrl), () => request('/api/admin/alerts?status=open'), force),
      ])
      const sitesPayload = writeCache('sites', apiBaseUrl, sitesData)
      writeCache('clients', apiBaseUrl, clientsData)
      writeCache('site-open-alerts', apiBaseUrl, alertsData)
      setSites(sitesData.sites || [])
      setClients(clientsData.clients || [])
      setOpenAlerts(alertsData.alerts || [])
      setLastRefreshed(sitesPayload.refreshedAt)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiBaseUrl, hasToken, request])

  useEffect(() => {
    loadData()
  }, [loadData])

  async function createSite(event) {
    event.preventDefault()
    setError('')
    setCreatedApiKey('')
    setCreating(true)

    try {
      const data = await request('/api/admin/sites', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setCreatedApiKey(data.apiKey)
      setCopyLabel('Copy')
      setForm({ clientId: '', siteName: '', siteUrl: '' })
      await loadData(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function copyApiKey() {
    await navigator.clipboard?.writeText(createdApiKey)
    setCopyLabel('Copied')
    setTimeout(() => setCopyLabel('Copy'), 1800)
  }

  return (
    <section className="page">
      <PageHeader
        title="Sites"
        description="Onboard websites and review the latest health data from agent syncs."
        action={
          <div className="header-actions">
            <RefreshMeta refreshedAt={lastRefreshed} refreshing={refreshing} />
            <button className="secondary-button" type="button" onClick={() => loadData(true)}>
              Refresh
            </button>
          </div>
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      <ErrorState message={error} />
      <div className="split-layout sites-layout">
        <Section title="All sites" meta={refreshing ? 'Refreshing...' : `${sites.length} total`}>
          {loading && !sites.length ? (
            <TableSkeleton rows={6} />
          ) : (
            <SiteTable
              sites={sites}
              alertsBySite={openAlerts.reduce((acc, alert) => {
                const siteId = alert.siteId || alert.site?.id
                if (!siteId) return acc
                acc[siteId] = [...(acc[siteId] || []), alert]
                return acc
              }, {})}
              emptyTitle="No sites yet"
              emptyDescription="Create a site to generate a unique API key for the WordPress plugin."
            />
          )}
        </Section>
        <Section title="Create site">
          <form className="stack-form" onSubmit={createSite}>
            <label>
              Client
              <select
                value={form.clientId}
                onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                required
              >
                <option value="">Select a client</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.id}>
                    {client.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Site name
              <input
                value={form.siteName}
                onChange={(event) => setForm({ ...form, siteName: event.target.value })}
                placeholder="ThincsCorp Website"
                required
              />
            </label>
            <label>
              Site URL
              <input
                value={form.siteUrl}
                onChange={(event) => setForm({ ...form, siteUrl: event.target.value })}
                placeholder="https://thincscorp.com"
                required
              />
            </label>
            <button className="primary-button" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Site'}
            </button>
          </form>
          {createdApiKey && (
            <div className="api-key-box">
              <strong>API key shown once</strong>
              <p>Copy this key into the WordPress plugin now. It is not stored in plain text.</p>
              <div className="copy-row">
                <input readOnly value={createdApiKey} onFocus={(event) => event.target.select()} />
                <button className="secondary-button" type="button" onClick={copyApiKey}>
                  {copyLabel}
                </button>
              </div>
            </div>
          )}
        </Section>
      </div>
    </section>
  )
}

function SiteTable({ sites, compact = false, alertsBySite = {}, emptyTitle, emptyDescription }) {
  if (!sites.length) {
    return (
      <EmptyState
        title={emptyTitle || 'No sites to show'}
        description={emptyDescription || 'Create or sync a site to populate this view.'}
      />
    )
  }

  return (
    <div className="table-wrap">
      <table className="sites-table">
        <thead>
          <tr>
            <th>Website</th>
            {!compact && <th>Client</th>}
            <th>Status</th>
            <th>Last seen</th>
            <th>Plugin updates</th>
          </tr>
        </thead>
        <tbody>
          {sites.map((site) => {
            const issueReasons = getTopIssueReasons(alertsBySite[site.id] || [])

            return (
              <tr key={site.id} className="click-row" onClick={() => setRouteHash(`sites/${site.id}`)}>
                <td>
                  <div className="site-cell">
                    <div className="site-avatar">{getInitials(getDomain(site.siteUrl))}</div>
                    <div>
                      <strong>{site.siteName}</strong>
                      <span>{getDomain(site.siteUrl)}</span>
                      {!!issueReasons.length && <span className="issue-reasons">{issueReasons.join(' · ')}</span>}
                    </div>
                  </div>
                </td>
                {!compact && <td>{site.clientName}</td>}
                <td>
                  <StatusBadge status={site.status} />
                </td>
                <td>
                  <strong className="date-primary">{formatRelativeTime(site.lastSeenAt)}</strong>
                  <span>{formatDate(site.lastSeenAt)}</span>
                </td>
                <td>
                  <CountBadge value={site.pluginUpdatesCount} />
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function RecentPageChecksTable({ checks }) {
  if (!checks.length) {
    return (
      <EmptyState
        title="No page checks yet"
        description="Recent page checks will appear here after monitored pages are checked."
      />
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Site</th>
            <th>Page</th>
            <th>Status</th>
            <th>Response</th>
            <th>Checked</th>
          </tr>
        </thead>
        <tbody>
          {checks.map((check) => (
            <tr key={check.id} className={check.errorDetected ? 'error-row' : ''}>
              <td>
                <strong>{check.siteName}</strong>
                <span>{getDomain(check.siteUrl)}</span>
              </td>
              <td>
                <strong>{check.pageLabel}</strong>
                <span>{check.pageUrl}</span>
              </td>
              <td>
                <PageCheckBadge check={check} />
              </td>
              <td>{check.responseTimeMs ?? 'Unknown'} ms</td>
              <td>
                <strong className="date-primary">{formatRelativeTime(check.checkedAt)}</strong>
                <span>{formatDate(check.checkedAt)}</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SiteDetailPage({ siteId, request, apiBaseUrl, hasToken }) {
  const [site, setSite] = useState(null)
  const [relatedAlerts, setRelatedAlerts] = useState([])
  const [pages, setPages] = useState([])
  const [pageForm, setPageForm] = useState({ label: '', url: '' })
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pagesLoading, setPagesLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pageActionId, setPageActionId] = useState('')
  const [checkingAll, setCheckingAll] = useState(false)
  const [addingPage, setAddingPage] = useState(false)

  const detailCacheName = `site:${siteId}`
  const pagesCacheName = `site:${siteId}:pages`

  const loadSite = useCallback(async (force = false) => {
    if (!hasToken || !siteId) return

    const cached = readCache(detailCacheName, apiBaseUrl)

    if (cached?.data?.site && !force) {
      setSite(cached.data.site)
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const data = await requestOnce(
        cacheKey(detailCacheName, apiBaseUrl),
        () => request(`/api/admin/sites/${siteId}`),
        force,
      )
      writeCache(detailCacheName, apiBaseUrl, data)
      setSite(data.site)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiBaseUrl, detailCacheName, hasToken, request, siteId])

  useEffect(() => {
    loadSite()
  }, [loadSite])

  const loadRelatedAlerts = useCallback(async (force = false) => {
    if (!hasToken || !siteId) return

    try {
      const data = await requestOnce(
        cacheKey(`site:${siteId}:alerts`, apiBaseUrl),
        () => request(`/api/admin/alerts?status=open&siteId=${siteId}`),
        force,
      )
      writeCache(`site:${siteId}:alerts`, apiBaseUrl, data)
      setRelatedAlerts(data.alerts || [])
    } catch {
      const cached = readCache(`site:${siteId}:alerts`, apiBaseUrl)
      if (cached?.data?.alerts) setRelatedAlerts(cached.data.alerts)
    }
  }, [apiBaseUrl, hasToken, request, siteId])

  useEffect(() => {
    loadRelatedAlerts()
  }, [loadRelatedAlerts])

  const loadPages = useCallback(async (force = false) => {
    if (!hasToken || !siteId) return

    const cached = readCache(pagesCacheName, apiBaseUrl)

    if (cached?.data?.pages && !force) {
      setPages(cached.data.pages || [])
    } else {
      setPagesLoading(true)
    }

    setPageError('')

    try {
      const data = await requestOnce(
        cacheKey(pagesCacheName, apiBaseUrl),
        () => request(`/api/admin/sites/${siteId}/pages`),
        force,
      )
      writeCache(pagesCacheName, apiBaseUrl, data)
      setPages(data.pages || [])
    } catch (err) {
      setPageError(err.message)
    } finally {
      setPagesLoading(false)
    }
  }, [apiBaseUrl, hasToken, pagesCacheName, request, siteId])

  useEffect(() => {
    loadPages()
  }, [loadPages])

  async function addMonitoredPage(event) {
    event.preventDefault()
    setAddingPage(true)
    setPageError('')

    try {
      await request(`/api/admin/sites/${siteId}/pages`, {
        method: 'POST',
        body: JSON.stringify(pageForm),
      })
      setPageForm({ label: '', url: '' })
      await loadPages(true)
    } catch (err) {
      setPageError(err.message)
    } finally {
      setAddingPage(false)
    }
  }

  async function checkPageNow(pageId) {
    setPageActionId(pageId)
    setPageError('')

    try {
      await request(`/api/admin/pages/${pageId}/check`, {
        method: 'POST',
      })
      await Promise.all([loadPages(true), loadSite(true)])
    } catch (err) {
      setPageError(err.message)
    } finally {
      setPageActionId('')
    }
  }

  async function deletePage(pageId) {
    setPageActionId(pageId)
    setPageError('')

    try {
      await request(`/api/admin/pages/${pageId}`, {
        method: 'DELETE',
      })
      await loadPages(true)
    } catch (err) {
      setPageError(err.message)
    } finally {
      setPageActionId('')
    }
  }

  async function checkAllPages() {
    setCheckingAll(true)
    setPageError('')

    try {
      await request(`/api/admin/sites/${siteId}/check-pages`, {
        method: 'POST',
      })
      await Promise.all([loadPages(true), loadSite(true)])
    } catch (err) {
      setPageError(err.message)
    } finally {
      setCheckingAll(false)
    }
  }

  const snapshot = site?.latestSnapshot
  const updateCount = snapshot?.pluginUpdatesCount ?? 0
  const flags = [
    snapshot?.coreUpdateAvailable && 'Core update available',
    snapshot?.themeUpdateAvailable && 'Theme update available',
    snapshot?.debugMode && 'Debug mode enabled',
    snapshot?.fileEditorEnabled && 'File editor enabled',
  ].filter(Boolean)
  const topAlertReasons = getTopIssueReasons(relatedAlerts, 3)

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={() => setRouteHash('sites')}>
        Back to sites
      </button>
      <PageHeader
        title={site?.siteName || 'Site Detail'}
        description={site?.siteUrl || 'Review the latest snapshot and plugin inventory.'}
        action={
          site && (
            <div className="header-actions">
              <RefreshMeta
                refreshedAt={readCache(detailCacheName, apiBaseUrl)?.refreshedAt}
                refreshing={refreshing}
              />
              <button className="secondary-button" type="button" onClick={() => loadSite(true)}>
                Refresh
              </button>
            </div>
          )
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      {loading && !site && <DetailSkeleton />}
      <ErrorState message={error} />
      {site && (
        <div className="detail-stack">
          <Section title="Website Overview">
            <div className="overview-row">
              <div className="site-avatar large">{getInitials(getDomain(site.siteUrl))}</div>
              <div>
                <h3>{site.siteName}</h3>
                <a href={site.siteUrl} target="_blank" rel="noreferrer">
                  {site.siteUrl}
                </a>
                <p>{site.client?.name || 'No client assigned'}</p>
              </div>
              <StatusBadge status={site.status} />
            </div>
          </Section>

          <Section title="Open Alerts" meta={`${relatedAlerts.length} open`}>
            <AlertTable
              alerts={relatedAlerts}
              compact
              emptyTitle="No open alerts for this site"
              emptyDescription="SitePulse has not detected active alert conditions for this site."
            />
          </Section>

          <Section title="Health Summary">
            <div className="detail-grid">
              <DetailItem label="Last seen" value={formatDate(site.lastSeenAt)} />
              <DetailItem label="Plugin updates" value={<CountBadge value={updateCount} />} />
              <DetailItem label="Health flags" value={flags.length ? flags.join(', ') : 'None'} />
              <DetailItem label="Top alert reasons" value={topAlertReasons.length ? topAlertReasons.join(' · ') : 'None'} />
            </div>
          </Section>

          <Section title="WordPress Environment">
            <div className="detail-grid">
              <DetailItem label="WordPress version" value={snapshot?.wordpressVersion || 'No snapshot'} />
              <DetailItem label="PHP version" value={snapshot?.phpVersion || 'No snapshot'} />
              <DetailItem label="MySQL version" value={snapshot?.mysqlVersion || 'No snapshot'} />
              <DetailItem
                label="Active theme"
                value={
                  snapshot
                    ? `${snapshot.activeThemeName || 'Unknown'} ${snapshot.activeThemeVersion || ''}`
                    : 'No snapshot'
                }
              />
              <DetailItem label="Debug mode" value={snapshot?.debugMode ? 'Enabled' : 'Disabled'} />
              <DetailItem
                label="File editor"
                value={snapshot?.fileEditorEnabled ? 'Enabled' : 'Disabled'}
              />
            </div>
          </Section>

          <Section title="Plugins">
            <PluginTable plugins={site.plugins || []} />
          </Section>

          <Section
            title="Monitored Pages"
            meta={pagesLoading ? 'Loading...' : `${pages.length} pages`}
            action={
              <button
                className="secondary-button"
                type="button"
                onClick={checkAllPages}
                disabled={checkingAll || !pages.length}
              >
                {checkingAll ? 'Checking...' : 'Check all pages'}
              </button>
            }
          >
            <ErrorState message={pageError} />
            <div className="monitor-layout">
              <form className="stack-form monitor-form" onSubmit={addMonitoredPage}>
                <label>
                  Label
                  <input
                    value={pageForm.label}
                    onChange={(event) => setPageForm({ ...pageForm, label: event.target.value })}
                    placeholder="Homepage"
                    required
                  />
                </label>
                <label>
                  URL
                  <input
                    value={pageForm.url}
                    onChange={(event) => setPageForm({ ...pageForm, url: event.target.value })}
                    placeholder="https://example.com/"
                    required
                  />
                </label>
                <button className="primary-button" type="submit" disabled={addingPage}>
                  {addingPage ? 'Adding...' : 'Add Page'}
                </button>
              </form>
              {pagesLoading && !pages.length ? (
                <TableSkeleton rows={4} />
              ) : (
                <MonitoredPagesTable
                  pages={pages}
                  actionId={pageActionId}
                  onCheck={checkPageNow}
                  onDelete={deletePage}
                />
              )}
            </div>
          </Section>

          <Section title="Snapshot History">
            <SnapshotTable snapshots={site.snapshots || []} />
          </Section>
        </div>
      )}
    </section>
  )
}

function Section({ title, meta, action, children }) {
  return (
    <div className="section-card">
      <div className="section-title">
        <h3>{title}</h3>
        <div className="section-actions">
          {meta && <span>{meta}</span>}
          {action}
        </div>
      </div>
      {children}
    </div>
  )
}

function MonitoredPagesTable({ pages, actionId, onCheck, onDelete }) {
  if (!pages.length) {
    return (
      <EmptyState
        title="No monitored pages yet"
        description="Add high-value pages such as homepage, contact, checkout, or landing pages."
      />
    )
  }

  return (
    <div className="table-wrap">
      <table className="monitor-table">
        <thead>
          <tr>
            <th>Label</th>
            <th>URL</th>
            <th>Last HTTP Status</th>
            <th>Response Time</th>
            <th>Last Check</th>
            <th>Error</th>
            <th>Error Summary</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => {
            const check = page.latestCheck
            const isBusy = actionId === page.id

            return (
              <tr key={page.id} className={check?.errorDetected ? 'error-row' : ''}>
                <td>
                  <strong>{page.label}</strong>
                  <span>{page.isActive ? 'Active' : 'Inactive'}</span>
                </td>
                <td>
                  <a className="table-link" href={page.url} target="_blank" rel="noreferrer">
                    {page.url}
                  </a>
                </td>
                <td>{check?.httpStatus ?? 'Not checked'}</td>
                <td>{check?.responseTimeMs !== undefined && check?.responseTimeMs !== null ? `${check.responseTimeMs} ms` : 'Not checked'}</td>
                <td>
                  <strong className="date-primary">{check ? formatRelativeTime(check.checkedAt) : 'Not checked'}</strong>
                  <span>{check ? formatDate(check.checkedAt) : 'No check yet'}</span>
                </td>
                <td>
                  <PageCheckBadge check={check} />
                </td>
                <td>{check?.errorSummary || 'None'}</td>
                <td>
                  <div className="row-actions">
                    <button
                      className="secondary-button small"
                      type="button"
                      onClick={() => onCheck(page.id)}
                      disabled={isBusy}
                    >
                      {isBusy ? 'Working...' : 'Check now'}
                    </button>
                    <button
                      className="danger-button small"
                      type="button"
                      onClick={() => onDelete(page.id)}
                      disabled={isBusy}
                    >
                      Delete
                    </button>
                  </div>
                </td>
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function DetailItem({ label, value }) {
  return (
    <div className="detail-item">
      <span>{label}</span>
      <strong>{value || 'Unknown'}</strong>
    </div>
  )
}

function PluginTable({ plugins }) {
  if (!plugins.length) {
    return (
      <EmptyState
        title="No plugin data yet"
        description="Plugin inventory appears after the WordPress agent syncs successfully."
      />
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Plugin</th>
            <th>Version</th>
            <th>Latest</th>
            <th>Status</th>
            <th>Update</th>
          </tr>
        </thead>
        <tbody>
          {plugins.map((plugin) => (
            <tr key={plugin.id} className={plugin.updateAvailable ? 'update-row' : ''}>
              <td>
                <strong>{plugin.name}</strong>
                <span>{plugin.slug}</span>
              </td>
              <td>{plugin.version || 'Unknown'}</td>
              <td>{plugin.latestVersion || 'Unknown'}</td>
              <td>
                <span className={`plugin-status ${plugin.status}`}>{plugin.status}</span>
              </td>
              <td>
                <span className={plugin.updateAvailable ? 'count-badge attention' : 'count-badge'}>
                  {plugin.updateAvailable ? 'Update available' : 'Current'}
                </span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SnapshotTable({ snapshots }) {
  if (!snapshots.length) {
    return (
      <EmptyState
        title="No snapshots yet"
        description="Snapshot history will build over time as agents sync."
      />
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Created</th>
            <th>WordPress</th>
            <th>Theme</th>
            <th>Plugin updates</th>
            <th>Flags</th>
          </tr>
        </thead>
        <tbody>
          {snapshots.map((snapshot) => (
            <tr key={snapshot.id}>
              <td>{formatDate(snapshot.createdAt)}</td>
              <td>{snapshot.wordpressVersion || 'Unknown'}</td>
              <td>{snapshot.activeThemeName || 'Unknown'}</td>
              <td>
                <CountBadge value={snapshot.pluginUpdatesCount} />
              </td>
              <td>
                {[
                  snapshot.coreUpdateAvailable && 'Core',
                  snapshot.themeUpdateAvailable && 'Theme',
                  snapshot.debugMode && 'Debug',
                  snapshot.fileEditorEnabled && 'File editor',
                ]
                  .filter(Boolean)
                  .join(', ') || 'None'}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientsPage({ request, apiBaseUrl, hasToken }) {
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadClients = useCallback(async (force = false) => {
    if (!hasToken) return

    const cached = readCache('clients', apiBaseUrl)

    if (cached?.data?.clients && !force) {
      setClients(cached.data.clients || [])
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const data = await requestOnce(
        cacheKey('clients', apiBaseUrl),
        () => request('/api/admin/clients'),
        force,
      )
      writeCache('clients', apiBaseUrl, data)
      setClients(data.clients || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiBaseUrl, hasToken, request])

  useEffect(() => {
    loadClients()
  }, [loadClients])

  async function createClient(event) {
    event.preventDefault()
    setError('')
    setCreating(true)

    try {
      await request('/api/admin/clients', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setForm({ name: '', contactPerson: '', email: '', phone: '', notes: '' })
      await loadClients(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Clients"
        description="Manage agency clients before onboarding their WordPress sites."
        action={
          <button className="secondary-button" type="button" onClick={() => loadClients(true)}>
            Refresh
          </button>
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      <ErrorState message={error} />
      <div className="split-layout">
        <Section title="Client list" meta={refreshing ? 'Refreshing...' : `${clients.length} total`}>
          {loading && !clients.length ? (
            <TableSkeleton rows={5} />
          ) : (
            <ClientTable clients={clients} />
          )}
        </Section>
        <Section title="Create client">
          <form className="stack-form" onSubmit={createClient}>
            {[
              ['name', 'Client name'],
              ['contactPerson', 'Contact person'],
              ['email', 'Email'],
              ['phone', 'Phone'],
            ].map(([key, label]) => (
              <label key={key}>
                {label}
                <input
                  value={form[key]}
                  onChange={(event) => setForm({ ...form, [key]: event.target.value })}
                  required={key === 'name'}
                />
              </label>
            ))}
            <label>
              Notes
              <textarea
                value={form.notes}
                onChange={(event) => setForm({ ...form, notes: event.target.value })}
                rows="4"
              />
            </label>
            <button className="primary-button" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create Client'}
            </button>
          </form>
        </Section>
      </div>
    </section>
  )
}

function ClientTable({ clients }) {
  if (!clients.length) {
    return (
      <EmptyState
        title="No clients yet"
        description="Create your first client before onboarding a website."
      />
    )
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Client</th>
            <th>Contact</th>
            <th>Email</th>
            <th>Sites</th>
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id}>
              <td>
                <div className="site-cell">
                  <div className="client-avatar">{getInitials(client.name)}</div>
                  <div>
                    <strong>{client.name}</strong>
                    <span>{client.notes || 'No notes'}</span>
                  </div>
                </div>
              </td>
              <td>{client.contactPerson || 'Not set'}</td>
              <td>{client.email || 'Not set'}</td>
              <td>
                <span className="count-badge">{client.sitesCount} sites</span>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettingsPage({ apiBaseUrl, adminToken, onSave, onCheckApi }) {
  const [form, setForm] = useState({ apiBaseUrl, adminToken })
  const [notice, setNotice] = useState(null)
  const [testing, setTesting] = useState(false)

  function save(event) {
    event.preventDefault()
    onSave(form)
    setNotice({ type: 'success', message: 'Settings saved in this browser.' })
  }

  async function testConnection() {
    setTesting(true)
    const result = await onCheckApi()
    setNotice({
      type: result.success ? 'success' : 'error',
      message: result.message,
    })
    setTesting(false)
  }

  return (
    <section className="page">
      <PageHeader
        title="Settings"
        description="Store your API base URL and internal admin token in this browser."
      />
      <div className="settings-layout">
        <Section title="Connection">
          <form className="stack-form" onSubmit={save}>
            <label>
              Backend API URL
              <input
                value={form.apiBaseUrl}
                onChange={(event) => setForm({ ...form, apiBaseUrl: event.target.value })}
                placeholder={DEFAULT_API_BASE_URL}
                required
              />
            </label>
            <label>
              Admin token
              <input
                type="password"
                value={form.adminToken}
                onChange={(event) => setForm({ ...form, adminToken: event.target.value })}
                placeholder="x-sitepulse-admin-token"
              />
            </label>
            <div className="button-row">
              <button className="primary-button" type="submit">
                Save Settings
              </button>
              <button className="secondary-button" type="button" onClick={testConnection} disabled={testing}>
                {testing ? 'Testing...' : 'Test /health'}
              </button>
            </div>
          </form>
          {notice && <div className={`state-box ${notice.type}-state`}>{notice.message}</div>}
        </Section>
        <div className="settings-help">
          <h3>Local browser storage</h3>
          <p>
            SitePulse keeps the API URL and internal token in localStorage for this MVP. Do not add
            admin tokens to Vite environment files.
          </p>
        </div>
      </div>
    </section>
  )
}

export default App
