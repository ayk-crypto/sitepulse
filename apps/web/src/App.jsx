import { useCallback, useEffect, useState } from 'react'
import sitepulseIcon from './assets/sitepulse-icon.png'
import sitepulseLogo from './assets/sitepulse-logo.png'
import brandLogo from './assets/sitepulse-brand-logo.png'
import sitepulseWordmark from './assets/sitepulse-wordmark-transparent.png'
import './App.css'

const DEFAULT_API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL || 'https://sitepulse-api-84m8.onrender.com'
const API_URL_STORAGE_KEY = 'sitepulse_api_base_url'
const AUTH_TOKEN_STORAGE_KEY = 'sitepulse_auth_token'
const AUTH_USER_STORAGE_KEY = 'sitepulse_auth_user'
const CACHE_PREFIX = 'sitepulse_cache'

const inFlightRequests = new Map()

const navItems = [
  { id: 'dashboard', label: 'Dashboard' },
  { id: 'alerts', label: 'Alerts' },
  { id: 'sites', label: 'Sites' },
  { id: 'clients', label: 'Clients' },
  { id: 'reports', label: 'Reports' },
  { id: 'users', label: 'Users', roles: ['owner', 'admin'] },
  { id: 'settings', label: 'Settings' },
]

function getInitialRoute() {
  const hash = window.location.hash.replace(/^#\/?/, '')
  return hash || 'dashboard'
}

function setRouteHash(route) {
  window.location.hash = `/${route}`
}

function getRouteQuery(route) {
  const [, query = ''] = route.split('?')
  return new URLSearchParams(query)
}

function dateInputValue(date) {
  return date.toISOString().slice(0, 10)
}

function currentMonthRange() {
  const now = new Date()
  const start = new Date(now.getFullYear(), now.getMonth(), 1)
  const end = new Date(now.getFullYear(), now.getMonth() + 1, 0)
  return {
    start: dateInputValue(start),
    end: dateInputValue(end),
  }
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
    const error = new Error(data?.error || `HTTP ${response.status} from ${endpoint}`)
    error.status = response.status
    throw error
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

function PulseMark({ size = 'default' }) {
  return (
    <span className={`pulse-mark pulse-mark-${size}`} aria-hidden="true">
      <img src={sitepulseIcon} alt="" />
    </span>
  )
}

function BrandLogo() {
  return (
    <div className="brand-logo">
      <img src={sitepulseIcon} alt="SitePulse" className="brand-logo-icon" />
      <div className="brand-logo-text">
        <span className="brand-logo-name">SitePulse</span>
        <span className="brand-logo-sub">by Onset Media</span>
      </div>
    </div>
  )
}

function SitePulseLogo({ className = '' }) {
  return <img className={`sitepulse-logo ${className}`} src={sitepulseLogo} alt="SitePulse by Onset Media" />
}

function LoginFeatureIcon({ type }) {
  if (type === 'alerts') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z" />
        <path d="M10 21h4" />
        <path d="M18 4l2-2" />
      </svg>
    )
  }

  if (type === 'pages') {
    return (
      <svg viewBox="0 0 24 24" aria-hidden="true">
        <path d="M3 12a9 9 0 1 0 18 0 9 9 0 0 0-18 0Z" />
        <path d="M3.6 9h16.8" />
        <path d="M3.6 15h16.8" />
        <path d="M12 3a14 14 0 0 1 0 18" />
        <path d="M12 3a14 14 0 0 0 0 18" />
        <path d="M16 15.5l1.7 1.7 3.3-3.4" />
      </svg>
    )
  }

  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M4 5h16v12H4z" />
      <path d="M8 21h8" />
      <path d="M12 17v4" />
      <path d="M7 12h3l1.4-4 2.1 7 1.2-3H17" />
      <path d="M18 15l1.2 1.2L22 13.3" />
    </svg>
  )
}

function NavIcon({ id }) {
  const paths = {
    dashboard: ['M4 13h7V4H4z', 'M13 20h7V4h-7z', 'M4 20h7v-5H4z'],
    alerts: ['M18 9a6 6 0 0 0-12 0c0 7-3 7-3 9h18c0-2-3-2-3-9Z', 'M10 21h4'],
    sites: ['M4 5h16v12H4z', 'M8 21h8', 'M12 17v4'],
    clients: ['M8 11a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M2 21a6 6 0 0 1 12 0', 'M17 11a3 3 0 1 0 0-6', 'M15 21a5 5 0 0 1 7 0'],
    reports: ['M4 20V10', 'M10 20V4', 'M16 20v-7', 'M22 20H2'],
    users: ['M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z', 'M4 21a8 8 0 0 1 16 0'],
    settings: ['M12 15a3 3 0 1 0 0-6 3 3 0 0 0 0 6z', 'M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z'],
  }
  return (
    <svg className="nav-icon" viewBox="0 0 24 24" aria-hidden="true">
      {(paths[id] || paths.dashboard).map((path) => <path key={path} d={path} />)}
    </svg>
  )
}

function DashboardIcon({ type = 'info' }) {
  const paths = {
    sites: ['M4 5h16v12H4z', 'M8 21h8', 'M12 17v4'],
    healthy: ['M12 3l7 3v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6z', 'M9 12l2 2 4-4'],
    warning: ['M12 4l10 18H2z', 'M12 10v4', 'M12 17h.01'],
    critical: ['M12 3l7 3v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6z', 'M12 8v5', 'M12 16h.01'],
    pages: ['M7 3h8l5 5v13H7z', 'M15 3v5h5', 'M10 13h7', 'M10 17h5'],
    sync: ['M23 4v6h-6', 'M1 20v-6h6', 'M3.51 9a9 9 0 0 1 14.85-3.36L23 10', 'M1 14l4.64 4.36A9 9 0 0 0 20.49 15'],
    activity: ['M4 12h4l2-5 4 10 2-5h4'],
    updates: ['M12 3v12', 'M8 7l4-4 4 4', 'M5 21h14'],
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {(paths[type] || paths.sites).map((path) => <path key={path} d={path} />)}
    </svg>
  )
}

function InsightIcon({ type = 'activity' }) {
  const paths = {
    critical: ['M7.86 2h8.28L22 7.86v8.28L16.14 22H7.86L2 16.14V7.86z', 'M12 8v4', 'M12 16h.01'],
    warning: ['M10.29 3.86 1.82 18a2 2 0 0 0 1.71 3h16.94a2 2 0 0 0 1.71-3L13.71 3.86a2 2 0 0 0-3.42 0z', 'M12 9v4', 'M12 17h.01'],
    activity: ['M22 12h-4l-3 9L9 3l-3 9H2'],
    updates: ['M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z', 'M3.27 6.96 12 12.01l8.73-5.05', 'M12 22.08V12'],
    sync: ['M21 12a9 9 0 1 1-2.64-6.36', 'M21 3v5h-5'],
    healthy: ['M22 11.08V12a10 10 0 1 1-5.93-9.14', 'M22 4 12 14.01l-3-3'],
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {(paths[type] || paths.activity).map((path) => <path key={path} d={path} />)}
    </svg>
  )
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

function ResponseTime({ ms }) {
  if (ms === null || ms === undefined) {
    return <span className="resp-pill resp-unknown">Unknown</span>
  }
  const tone = ms > 2500 ? 'slow' : ms >= 1000 ? 'average' : 'good'
  const label = tone === 'slow' ? 'Slow' : tone === 'average' ? 'Average' : 'Good'
  return (
    <span className={`resp-pill resp-${tone}`}>
      <span className="resp-dot" />
      {ms} ms · {label}
    </span>
  )
}

function getSyncFreshness(lastSeenAt) {
  if (!lastSeenAt) return { tone: 'critical', label: 'No sync data' }
  const hours = (Date.now() - new Date(lastSeenAt).getTime()) / (1000 * 60 * 60)
  if (hours < 12) return { tone: 'healthy', label: `Synced ${formatRelativeTime(lastSeenAt)}` }
  if (hours < 48) return { tone: 'warning', label: `Synced ${formatRelativeTime(lastSeenAt)}` }
  return { tone: 'critical', label: `Stale · ${formatRelativeTime(lastSeenAt)}` }
}

function getPageHealth(check) {
  if (!check) return { label: 'Not checked', status: 'unknown' }
  if (check.errorDetected) return { label: 'Error', status: 'critical' }
  if (check.httpStatus >= 400 || check.httpStatus === null || check.httpStatus === undefined) {
    return { label: 'Down', status: 'critical' }
  }
  if (check.responseTimeMs > 5000) return { label: 'Slow', status: 'warning' }
  return { label: 'Online', status: 'healthy' }
}

function PageStatusBadge({ check }) {
  const health = getPageHealth(check)
  return <span className={`status status-${health.status}`}>{health.label}</span>
}

function AlertSeverityBadge({ severity = 'info' }) {
  return <span className={`status status-${severity}`}>{severity}</span>
}

function AlertStatusBadge({ status = 'open' }) {
  return <span className={`alert-status alert-status-${status}`}>{status}</span>
}

function AlertSeverityIcon({ severity = 'info' }) {
  const paths = {
    critical: ['M12 3l7 3v5c0 4.8-3 8.2-7 10-4-1.8-7-5.2-7-10V6z', 'M12 8v5', 'M12 16h.01'],
    warning: ['M12 4l9.5 16.5H2.5z', 'M12 10v4', 'M12 17h.01'],
    info: ['M12 3a9 9 0 1 0 0 18 9 9 0 0 0 0-18z', 'M12 11v5', 'M12 8h.01'],
  }
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      {(paths[severity] || paths.info).map((d) => (
        <path key={d} d={d} />
      ))}
    </svg>
  )
}

const ALERT_SOURCE_LABELS = {
  wordpress: 'WordPress',
  'page-monitor': 'Page Monitor',
  'page-discovery': 'Page Discovery',
}

const ALERT_EXPORT_FIELDS = [
  {
    key: 'website',
    label: 'Website',
    value: (alert) => alert.site?.siteName || alert.site?.siteUrl || '',
  },
  {
    key: 'title',
    label: 'Title',
    value: (alert) => alert.title || '',
  },
  {
    key: 'description',
    label: 'Description',
    value: (alert) => alert.message || '',
  },
  {
    key: 'severity',
    label: 'Severity',
    value: (alert) => alert.severity || '',
  },
  {
    key: 'source',
    label: 'Source',
    value: (alert) => formatAlertSource(alert.source),
  },
  {
    key: 'occurrence',
    label: 'Occurrence',
    value: (alert) => alert.occurrenceCount ?? 1,
  },
  {
    key: 'firstSeenAt',
    label: 'First Seen',
    value: (alert) => formatExportDate(alert.firstSeenAt),
  },
  {
    key: 'lastSeenAt',
    label: 'Last Seen',
    value: (alert) => formatExportDate(alert.lastSeenAt),
  },
  {
    key: 'recommendation',
    label: 'Recommended Fix',
    value: (alert) => alert.recommendation || '',
  },
  {
    key: 'status',
    label: 'Status',
    value: (alert) => alert.status || '',
  },
]

function formatAlertSource(source) {
  return ALERT_SOURCE_LABELS[source] || (source ? source.replace(/-/g, ' ') : 'Unknown')
}

function formatExportDate(value) {
  if (!value) return ''

  const date = new Date(value)
  return Number.isNaN(date.getTime()) ? '' : date.toISOString()
}

function escapeCsvValue(value) {
  const normalized = String(value ?? '').replace(/\r?\n/g, ' ').trim()
  return `"${normalized.replace(/"/g, '""')}"`
}

function buildAlertsCsv(alerts, selectedFields) {
  const fields = ALERT_EXPORT_FIELDS.filter((field) => selectedFields.includes(field.key))
  const rows = [
    fields.map((field) => escapeCsvValue(field.label)).join(','),
    ...alerts.map((alert) => fields.map((field) => escapeCsvValue(field.value(alert))).join(',')),
  ]

  return rows.join('\r\n')
}

function downloadCsv(filename, csv) {
  const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')

  link.href = url
  link.download = filename
  document.body.appendChild(link)
  link.click()
  document.body.removeChild(link)
  URL.revokeObjectURL(url)
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
  const [authToken, setAuthToken] = useState(() => localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || '')
  const [currentUser, setCurrentUser] = useState(() => {
    try {
      return JSON.parse(localStorage.getItem(AUTH_USER_STORAGE_KEY) || 'null')
    } catch {
      return null
    }
  })
  const [tenant, setTenant] = useState(null)
  const [apiStatus, setApiStatus] = useState({ state: 'checking', label: 'Checking API' })

  useEffect(() => {
    const onHashChange = () => setRoute(getInitialRoute())
    window.addEventListener('hashchange', onHashChange)

    if (!window.location.hash) {
      setRouteHash('dashboard')
    }

    return () => window.removeEventListener('hashchange', onHashChange)
  }, [])

  const logout = useCallback(() => {
    localStorage.removeItem(AUTH_TOKEN_STORAGE_KEY)
    localStorage.removeItem(AUTH_USER_STORAGE_KEY)
    setAuthToken('')
    setCurrentUser(null)
    setTenant(null)
    setRouteHash('login')
  }, [])

  const request = useCallback(
    async (path, options = {}) => {
      try {
        return await safeFetchJson(
          `${normalizeUrl(apiBaseUrl)}${path}`,
          {
            ...options,
            headers: {
              ...(options.body ? { 'Content-Type': 'application/json' } : {}),
              ...(authToken ? { Authorization: `Bearer ${authToken}` } : {}),
              ...options.headers,
            },
          },
          path,
        )
      } catch (error) {
        if (error.status === 401) logout()
        throw error
      }
    },
    [apiBaseUrl, authToken, logout],
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
    setApiBaseUrl(nextApiUrl)
  }

  const login = async ({ email, password }) => {
    const data = await safeFetchJson(
      `${normalizeUrl(apiBaseUrl)}/api/auth/login`,
      {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      },
      '/api/auth/login',
    )
    localStorage.setItem(AUTH_TOKEN_STORAGE_KEY, data.token)
    localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user))
    setAuthToken(data.token)
    setCurrentUser(data.user)
    setRouteHash('dashboard')
  }

  const loadMe = useCallback(async () => {
    if (!authToken) return
    try {
      const data = await request('/api/auth/me')
      setCurrentUser(data.user)
      setTenant(data.tenant)
      localStorage.setItem(AUTH_USER_STORAGE_KEY, JSON.stringify(data.user))
    } catch {
      logout()
    }
  }, [authToken, logout, request])

  useEffect(() => {
    loadMe()
  }, [loadMe])

  const routePath = route.split('?')[0]
  const activePage = routePath.startsWith('sites/')
    ? 'site-detail'
    : routePath.startsWith('reports/')
      ? 'report-detail'
      : routePath
  const sidebarPage = activePage === 'site-detail'
    ? 'sites'
    : activePage === 'report-detail'
      ? 'reports'
      : activePage
  const isLoginRoute = route === 'login'
  const isAuthenticated = !!authToken && !!currentUser

  if (!isAuthenticated || isLoginRoute) {
    return <LoginPage onLogin={login} />
  }

  return (
    <div className="app-shell">
      <Sidebar activePage={sidebarPage} currentUser={currentUser} />
      <main className="main-panel">
        <TopBar
          apiBaseUrl={apiBaseUrl}
          apiStatus={apiStatus}
          currentUser={currentUser}
          onRefresh={checkApiStatus}
          onLogout={logout}
          activePage={activePage}
        />
        {activePage === 'dashboard' && (
          <DashboardPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!authToken} />
        )}
        {activePage === 'sites' && (
          <SitesPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!authToken} currentUser={currentUser} />
        )}
        {activePage === 'alerts' && (
          <AlertsPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!authToken} currentUser={currentUser} />
        )}
        {activePage === 'site-detail' && (
          <SiteDetailPage
            siteId={route.split('/')[1]}
            request={request}
            apiBaseUrl={apiBaseUrl}
            hasToken={!!authToken}
            currentUser={currentUser}
          />
        )}
        {activePage === 'clients' && (
          <ClientsPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!authToken} currentUser={currentUser} />
        )}
        {activePage === 'reports' && (
          <ReportsPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!authToken} currentUser={currentUser} />
        )}
        {activePage === 'report-detail' && (
          <ReportDetailPage
            reportId={route.split('/')[1]}
            request={request}
            apiBaseUrl={apiBaseUrl}
            currentUser={currentUser}
          />
        )}
        {activePage === 'users' && ['owner', 'admin'].includes(currentUser.role) && (
          <UsersPage request={request} apiBaseUrl={apiBaseUrl} hasToken={!!authToken} />
        )}
        {activePage === 'settings' && (
          <SettingsPage
            apiBaseUrl={apiBaseUrl}
            currentUser={currentUser}
            tenant={tenant}
            onSave={saveSettings}
            onCheckApi={checkApiStatus}
            onLogout={logout}
          />
        )}
      </main>
    </div>
  )
}

function LoginPage({ onLogin }) {
  const [form, setForm] = useState({ email: '', password: '', remember: true })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [showPassword, setShowPassword] = useState(false)

  async function submit(event) {
    event.preventDefault()
    setError('')
    setLoading(true)
    try {
      await onLogin(form)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="login-shell">
      <section className="login-brand-panel">
        <div className="login-bg-orb login-bg-orb-1" />
        <div className="login-bg-orb login-bg-orb-2" />
        <div className="login-bg-orb login-bg-orb-3" />
        <div className="login-brand-inner">
          <div className="login-brand-logo-wrap">
            <img src={sitepulseIcon} alt="" className="login-brand-logo-icon" />
            <div className="login-brand-logo-text">
              <span className="login-brand-logo-name">SitePulse</span>
              <span className="login-brand-logo-sub">by Onset Media</span>
            </div>
          </div>
          <div className="login-tagline">
            <h1>Your command center for <span>WordPress health.</span></h1>
            <p>Monitor updates, detect issues, and keep every client site running smoothly — all from one dashboard.</p>
          </div>
          <div className="login-widget" aria-hidden="true">
            <div className="login-widget-head">
              <span className="login-widget-dot green" />
              <span>Live site status</span>
              <span className="login-widget-time">Just now</span>
            </div>
            <div className="login-widget-rows">
              {[
                { name: 'acme-corp.com', cls: 'healthy', label: 'Healthy' },
                { name: 'studio-xyz.io', cls: 'warning', label: 'Warning' },
                { name: 'greenleaf.co', cls: 'healthy', label: 'Healthy' },
              ].map(({ name, cls, label }) => (
                <div key={name} className="login-widget-row">
                  <span className={`login-widget-dot ${cls}`} />
                  <span className="login-widget-name">{name}</span>
                  <span className={`login-widget-badge ${cls}`}>{label}</span>
                </div>
              ))}
            </div>
            <div className="login-widget-footer">
              <span>3 sites monitored</span>
              <span className="login-widget-pulse">● Live</span>
            </div>
          </div>
          <ul className="login-checklist">
            {[
              'Real-time WordPress core & plugin monitoring',
              'Instant alerts for critical site issues',
              'Automated page health checks & uptime reports',
            ].map((item) => (
              <li key={item}>
                <span className="login-check-icon" aria-hidden="true">
                  <svg viewBox="0 0 14 14" fill="none">
                    <path d="M2.5 7l3 3 6-6" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </span>
                {item}
              </li>
            ))}
          </ul>
        </div>
      </section>

      <section className="login-form-panel">
        <div className="login-form-wrap">
          <div className="login-form-top">
            <span className="login-icon-badge">
              <img src={sitepulseIcon} alt="" />
            </span>
            <h2>Welcome back</h2>
            <p>Sign in to access your workspace</p>
          </div>

          {error && (
            <div className="login-error-msg" role="alert">
              <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <circle cx="10" cy="10" r="8" stroke="currentColor" strokeWidth="1.5" />
                <path d="M10 6v5M10 14h.01" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
              </svg>
              {error}
            </div>
          )}

          <form className="login-form" onSubmit={submit} noValidate>
            <div className="lf-field">
              <label htmlFor="sp-email">Email address</label>
              <div className="lf-input-wrap">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="lf-icon">
                  <rect x="2" y="4.5" width="16" height="12" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M2 7.5l8 5 8-5" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  id="sp-email"
                  type="email"
                  value={form.email}
                  onChange={(e) => setForm({ ...form, email: e.target.value })}
                  placeholder="name@agency.com"
                  required
                  autoComplete="email"
                />
              </div>
            </div>

            <div className="lf-field">
              <label htmlFor="sp-password">Password</label>
              <div className="lf-input-wrap">
                <svg viewBox="0 0 20 20" fill="none" aria-hidden="true" className="lf-icon">
                  <rect x="4" y="9" width="12" height="8.5" rx="1.5" stroke="currentColor" strokeWidth="1.4" />
                  <path d="M7 9V7a3 3 0 0 1 6 0v2" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                </svg>
                <input
                  id="sp-password"
                  type={showPassword ? 'text' : 'password'}
                  value={form.password}
                  onChange={(e) => setForm({ ...form, password: e.target.value })}
                  placeholder="Enter your password"
                  required
                  autoComplete="current-password"
                />
                <button
                  type="button"
                  className="lf-eye"
                  onClick={() => setShowPassword((v) => !v)}
                  aria-label={showPassword ? 'Hide password' : 'Show password'}
                >
                  {showPassword ? (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6Z" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                      <path d="M3 3l14 14" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" />
                    </svg>
                  ) : (
                    <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                      <path d="M2 10s3.5-6 8-6 8 6 8 6-3.5 6-8 6-8-6-8-6Z" stroke="currentColor" strokeWidth="1.4" />
                      <circle cx="10" cy="10" r="2.5" stroke="currentColor" strokeWidth="1.4" />
                    </svg>
                  )}
                </button>
              </div>
            </div>

            <div className="lf-extras">
              <label className="lf-remember">
                <input
                  type="checkbox"
                  checked={form.remember}
                  onChange={(e) => setForm({ ...form, remember: e.target.checked })}
                />
                <span>Remember me</span>
              </label>
              <button type="button" className="lf-forgot">Forgot password?</button>
            </div>

            <button className="lf-submit" type="submit" disabled={loading}>
              {loading ? (
                <>
                  <span className="lf-spinner" />
                  Signing in…
                </>
              ) : (
                <>
                  Sign In
                  <svg viewBox="0 0 20 20" fill="none" aria-hidden="true">
                    <path d="M4 10h12M11 5l5 5-5 5" stroke="currentColor" strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                </>
              )}
            </button>
          </form>

          <div className="lf-secure">
            <svg viewBox="0 0 18 18" fill="none" aria-hidden="true">
              <path d="M9 1.5L15.5 4V8.5C15.5 12 12.8 14.7 9 16 5.2 14.7 2.5 12 2.5 8.5V4L9 1.5Z" stroke="currentColor" strokeWidth="1.4" strokeLinejoin="round" />
              <path d="M6 9l2.5 2.5 4-4" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
            256-bit encrypted &amp; secure session
          </div>
        </div>

        <footer className="lf-footer">
          © 2026 Onset Media ·{' '}
          <button type="button" className="lf-footer-link">Privacy Policy</button>
          {' '}·{' '}
          <button type="button" className="lf-footer-link">Terms of Service</button>
        </footer>
      </section>
    </div>
  )
}

function Sidebar({ activePage, currentUser }) {
  const visibleNavItems = navItems.filter((item) => !item.roles || item.roles.includes(currentUser?.role))

  return (
    <aside className="sidebar">
      <div className="brand">
        <BrandLogo />
      </div>
      <nav className="nav-list" aria-label="Primary navigation">
        <span className="sidebar-nav-label">Menu</span>
        {visibleNavItems.map((item) => (
          <button
            className={activePage === item.id ? 'nav-item active' : 'nav-item'}
            key={item.id}
            type="button"
            onClick={() => setRouteHash(item.id)}
          >
            <NavIcon id={item.id} />
            <span>{item.label}</span>
            {item.id === 'alerts' && <span className="nav-count">2</span>}
          </button>
        ))}
      </nav>
      <button className="sidebar-add-site" type="button" onClick={() => setRouteHash('sites')}>
        <span className="sidebar-add-icon">
          <svg viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M7 2v10M2 7h10" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" />
          </svg>
        </span>
        <div>
          <strong>Add New Site</strong>
          <small>Monitor a WordPress site</small>
        </div>
      </button>
      <div className="sidebar-spacer" />
      <div className="sidebar-user">
        <span className="sidebar-avatar">{getInitials(currentUser?.name)}</span>
        <div className="sidebar-user-info">
          <strong>{currentUser?.name}</strong>
          <span>{currentUser?.email || currentUser?.role}</span>
        </div>
        <span className="sidebar-role-badge">{currentUser?.role || 'user'}</span>
      </div>
    </aside>
  )
}

const PAGE_META = {
  dashboard: { title: 'Dashboard', sub: 'Monitor connected WordPress sites, update pressure, and sync freshness.' },
  sites: { title: 'Sites', sub: 'Manage and monitor your connected WordPress installations.' },
  alerts: { title: 'Alerts', sub: 'View and resolve open alerts across all monitored sites.' },
  'site-detail': { title: 'Site Detail', sub: 'Detailed health report for this WordPress installation.' },
  clients: { title: 'Clients', sub: 'Manage client accounts and their associated sites.' },
  reports: { title: 'Reports', sub: 'Generate and review site health reports.' },
  'report-detail': { title: 'Report Detail', sub: 'Full health report details.' },
  users: { title: 'Users', sub: 'Manage team members and their access levels.' },
  settings: { title: 'Settings', sub: 'Configure your SitePulse workspace and integrations.' },
}

function TopBar({ apiBaseUrl, apiStatus, currentUser, onRefresh, onLogout, activePage }) {
  const meta = PAGE_META[activePage] || { title: 'SitePulse', sub: '' }
  return (
    <header className="top-bar">
      <div className="top-identity">
        <h1>{meta.title}</h1>
        {meta.sub && <p className="top-page-sub">{meta.sub}</p>}
      </div>
      <div className="top-utility">
        <div className="api-pill" title={apiBaseUrl}>
          <span className={`dot ${apiStatus.state}`} />
          <span>{apiStatus.label}</span>
          <code>{apiBaseUrl}</code>
          <button className="api-test-btn" type="button" onClick={onRefresh}>Test</button>
        </div>
        <div className="top-user">
          <span className="top-avatar">{getInitials(currentUser?.name)}</span>
          <div>
            <strong>{currentUser?.name}</strong>
            <span>{currentUser?.role || currentUser?.email}</span>
          </div>
          <button className="top-logout-btn" type="button" onClick={onLogout} title="Sign out">
            <svg viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M10.5 2H13a1 1 0 0 1 1 1v10a1 1 0 0 1-1 1h-2.5M6.5 5L3 8l3.5 3M3 8h8" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>
      </div>
    </header>
  )
}

function PageHeader({ title, description, action }) {
  const hasText = title || description
  return (
    <div className="page-header">
      {hasText && (
        <div>
          {title && <h2>{title}</h2>}
          {description && <p>{description}</p>}
        </div>
      )}
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
    unmonitoredImportantPages: 0,
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
  const latestAlerts = alertSummary.latestOpenAlerts || []
  const pluginUpdateTotal = recentSites.reduce((total, site) => total + (site.pluginUpdatesCount || 0), 0)
  const monitoredChecks = recentChecks.length
  const pageErrorCount = recentChecks.filter((check) => check.errorDetected).length
  const avgResponse = monitoredChecks
    ? Math.round(recentChecks.reduce((total, check) => total + (check.responseTimeMs || 0), 0) / monitoredChecks)
    : null
  const healthScore = Math.max(
    0,
    Math.min(
      100,
      90
        - (summary.critical || 0) * 15
        - (summary.warning || 0) * 7
        - (pluginUpdateTotal > 0 ? 5 : 0)
        - (summary.unmonitoredImportantPages || 0) * 3
        - pageErrorCount * 12,
    ),
  )
  const coverageScore = Math.max(0, Math.min(100, 100 - (summary.unmonitoredImportantPages || 0) * 8))
  const recommendedActions = buildRecommendedActions({ summary, recentSites, latestAlerts, pluginUpdateTotal })
  const recentActivity = buildRecentActivity({ recentSites, recentChecks, latestAlerts })
  const operationalInsights = buildOperationalInsights({ summary, alertSummary, avgResponse, pluginUpdateTotal, recentSites, recentChecks })

  return (
    <section className="page dashboard-page">
      <PageHeader
        action={
          <div className="header-actions">
            <RefreshMeta refreshedAt={lastRefreshed} refreshing={refreshing} />
            <button className="secondary-button small btn-with-icon" type="button" onClick={() => loadSummary(true)}>
              <DashboardIcon type="sync" />
              Refresh
            </button>
            <button className="primary-button small" type="button" onClick={() => setRouteHash('sites')}>
              Add Site
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
          <Metric label="Total sites" value={summary.totalSites} icon="sites" detail={`${summary.unknown} unknown`} />
          <Metric label="Healthy" value={summary.healthy} icon="healthy" status="healthy" detail="No active flags" />
          <Metric label="Needs attention" value={summary.warning} icon="warning" status="warning" detail={summary.warning ? 'Needs attention' : 'No issues'} />
          <Metric label="Critical risk" value={summary.critical} icon="critical" status="critical" detail="High-priority risk" />
          <Metric
            label="Unmonitored pages"
            value={summary.unmonitoredImportantPages || 0}
            icon="pages"
            status={summary.unmonitoredImportantPages ? 'warning' : 'healthy'}
            detail="Important pages"
          />
        </div>
      )}
      <div className="dashboard-grid dashboard-grid-primary">
        <HealthOverview score={healthScore} summary={summary} pluginUpdateTotal={pluginUpdateTotal} avgResponse={avgResponse} />
        <RecommendedActions actions={recommendedActions} />
      </div>
      <div className="dashboard-grid dashboard-grid-secondary">
        <Section title="Recently Synced Sites" action={<button className="text-button" type="button" onClick={() => setRouteHash('sites')}>View all sites</button>} flush>
          {loading && !recentSites.length ? (
            <TableSkeleton rows={4} />
          ) : (
            <RecentlySyncedSites sites={recentSites.slice(0, 5)} />
          )}
        </Section>
        <MonitoringCoverage score={coverageScore} summary={summary} recentSites={recentSites} recentChecks={recentChecks} />
        <UpdatePressure pluginUpdateTotal={pluginUpdateTotal} recentSites={recentSites} />
      </div>
      <div className="dashboard-grid dashboard-grid-bottom">
        <Section
          title="Recent Page Checks"
          action={
            <div className="section-link-row">
              <button className="text-button" type="button">View all page checks</button>
              <button className="text-button" type="button" onClick={() => setRouteHash('sites')}>Manage monitored pages</button>
            </div>
          }
          flush
        >
          {loading && !recentChecks.length ? (
            <TableSkeleton rows={4} />
          ) : (
            <RecentPageChecksTable checks={recentChecks.slice(0, 5)} />
          )}
        </Section>
        <OperationalInsights insights={operationalInsights} />
      </div>
      <div className="dashboard-grid dashboard-grid-activity">
        <RecentActivity items={recentActivity} compact />
      </div>
    </section>
  )
}

function Metric({ label, value, status, detail, icon = 'sites' }) {
  return (
    <div className={`metric ${status ? `metric-card-${status}` : ''}`}>
      <div className="metric-header">
        <span className="metric-label">{label}</span>
        <span className="metric-icon" aria-hidden="true"><DashboardIcon type={icon} /></span>
      </div>
      <strong className={status ? `metric-${status}` : ''}>{value}</strong>
      <p>{detail}</p>
    </div>
  )
}

function AlertsPage({ request, apiBaseUrl, hasToken, currentUser }) {
  const [alerts, setAlerts] = useState([])
  const [summary, setSummary] = useState(null)
  const [selectedAlert, setSelectedAlert] = useState(null)
  const [filters, setFilters] = useState({ status: 'open', severity: '', source: '' })
  const [selectedSiteIds, setSelectedSiteIds] = useState([])
  const [sites, setSites] = useState([])
  const [siteSearchQuery, setSiteSearchQuery] = useState('')
  const [exportFields, setExportFields] = useState(ALERT_EXPORT_FIELDS.map((field) => field.key))
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [actionId, setActionId] = useState('')
  const canActOnAlerts = ['owner', 'admin', 'manager'].includes(currentUser?.role)

  const loadAlerts = useCallback(async (force = false) => {
    if (!hasToken) return

    setLoading(true)
    setError('')

    const params = new URLSearchParams()
    Object.entries(filters).forEach(([key, value]) => {
      if (value) params.set(key, value)
    })
    if (selectedSiteIds.length > 0) {
      params.set('siteIds', selectedSiteIds.join(','))
    }
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
      setSelectedAlert((current) =>
        current && !(alertsData.alerts || []).some((alert) => alert.id === current.id)
          ? null
          : current,
      )
    } catch (err) {
      setError(err.message)
      const cached = readCache(`alerts:${query}`, apiBaseUrl)
      if (cached?.data?.alerts) setAlerts(cached.data.alerts)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, filters, hasToken, request, selectedSiteIds])

  const loadAlertSites = useCallback(async (force = false) => {
    if (!hasToken) return

    try {
      const sitesData = await requestOnce(
        cacheKey('alert-sites', apiBaseUrl),
        () => request('/api/admin/sites'),
        force,
      )
      writeCache('alert-sites', apiBaseUrl, sitesData)
      setSites(sitesData.sites || [])
    } catch {
      const cached = readCache('alert-sites', apiBaseUrl)
      if (cached?.data?.sites) setSites(cached.data.sites)
    }
  }, [apiBaseUrl, hasToken, request])

  useEffect(() => {
    loadAlerts()
  }, [loadAlerts])

  useEffect(() => {
    loadAlertSites()
  }, [loadAlertSites])

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

  const setFilter = (patch) => setFilters((prev) => ({ ...prev, ...patch }))
  const selectedSiteNames = sites
    .filter((site) => selectedSiteIds.includes(site.id))
    .map((site) => site.siteName || getDomain(site.siteUrl))
  const siteFilterLabel =
    selectedSiteIds.length === 0
      ? 'All websites'
      : selectedSiteIds.length === 1
        ? selectedSiteNames[0] || '1 website'
        : `${selectedSiteIds.length} websites`
  const normalizedSiteSearch = siteSearchQuery.trim().toLowerCase()
  const visibleFilterSites = sites
    .filter((site) => {
      if (!normalizedSiteSearch) return true

      const haystack = [
        site.siteName,
        site.siteUrl,
        site.siteUrl ? getDomain(site.siteUrl) : '',
        site.client?.name,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      return haystack.includes(normalizedSiteSearch)
    })
    .sort((a, b) => {
      const aSelected = selectedSiteIds.includes(a.id)
      const bSelected = selectedSiteIds.includes(b.id)

      if (aSelected !== bSelected) return aSelected ? -1 : 1
      return (a.siteName || a.siteUrl || '').localeCompare(b.siteName || b.siteUrl || '')
    })

  function toggleSiteFilter(siteId) {
    setSelectedAlert(null)
    setSelectedSiteIds((current) =>
      current.includes(siteId)
        ? current.filter((id) => id !== siteId)
        : [...current, siteId],
    )
  }

  function toggleExportField(fieldKey) {
    setExportFields((current) =>
      current.includes(fieldKey)
        ? current.filter((key) => key !== fieldKey)
        : [...current, fieldKey],
    )
  }

  function exportAlertsCsv() {
    if (!alerts.length) {
      setError('No alerts match the current filters.')
      return
    }

    if (!exportFields.length) {
      setError('Select at least one field to export.')
      return
    }

    const stamp = new Date().toISOString().slice(0, 10)
    downloadCsv(`sitepulse-alerts-${stamp}.csv`, buildAlertsCsv(alerts, exportFields))
    setError(`Exported ${alerts.length} ${alerts.length === 1 ? 'alert' : 'alerts'} successfully.`)
  }

  const bandTiles = [
    {
      key: 'open',
      tone: 'open',
      label: 'Open',
      value: summary?.openCount || 0,
      foot: 'Active alerts',
      active: filters.status === 'open' && !filters.severity,
      onClick: () => setFilter({ status: 'open', severity: '' }),
    },
    {
      key: 'critical',
      tone: 'critical',
      label: 'Critical',
      value: summary?.criticalOpenCount || 0,
      foot: 'High priority',
      active: filters.status === 'open' && filters.severity === 'critical',
      onClick: () => setFilter({ status: 'open', severity: 'critical' }),
    },
    {
      key: 'warning',
      tone: 'warning',
      label: 'Warning',
      value: summary?.warningOpenCount || 0,
      foot: 'Needs review',
      active: filters.status === 'open' && filters.severity === 'warning',
      onClick: () => setFilter({ status: 'open', severity: 'warning' }),
    },
    {
      key: 'resolved',
      tone: 'healthy',
      label: 'Resolved 24h',
      value: summary?.resolvedLast24h || 0,
      foot: 'Last 24 hours',
      active: filters.status === 'resolved',
      onClick: () => setFilter({ status: 'resolved', severity: '' }),
    },
  ]

  const statusOptions = [
    ['', 'All'],
    ['open', 'Open'],
    ['acknowledged', 'Acknowledged'],
    ['snoozed', 'Snoozed'],
    ['resolved', 'Resolved'],
  ]
  const severityOptions = [
    ['', 'All'],
    ['critical', 'Critical'],
    ['warning', 'Warning'],
    ['info', 'Info'],
  ]

  return (
    <section className="page alerts-page">
      {!hasToken && <EmptyTokenNotice />}
      <FeedbackBanner message={error} />

      <div className="alert-band">
        {bandTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`alert-band-tile tone-${tile.tone}${tile.active ? ' is-active' : ''}`}
            onClick={tile.onClick}
          >
            <span className="alert-band-head">
              <span className="alert-band-label">{tile.label}</span>
              <span className="alert-band-dot" />
            </span>
            <span className="alert-band-value">{tile.value}</span>
            <span className="alert-band-foot">{tile.foot}</span>
          </button>
        ))}
      </div>

      <div className="alert-control-card">
        <div className="alert-control-head">
          <div className="alert-control-head-text">
            <span className="alert-control-kicker">Filters</span>
            <p>Filter the issue list across all monitored sites.</p>
          </div>
          <div className="alert-control-actions">
            <span className="alert-control-count">
              {alerts.length} {alerts.length === 1 ? 'alert' : 'alerts'} in view
            </span>
            <details className="export-menu">
              <summary className="secondary-button small">Export CSV</summary>
              <div className="export-menu-panel">
                <div className="export-menu-head">
                  <span className="alert-toolbar-label">CSV columns</span>
                  <span className="export-menu-count">
                    {exportFields.length}/{ALERT_EXPORT_FIELDS.length}
                  </span>
                </div>
                <div className="export-chip-row">
                  {ALERT_EXPORT_FIELDS.map((field) => {
                    const on = exportFields.includes(field.key)
                    return (
                      <button
                        key={field.key}
                        type="button"
                        className={`export-chip${on ? ' is-on' : ''}`}
                        aria-pressed={on}
                        onClick={() => toggleExportField(field.key)}
                      >
                        {field.label}
                      </button>
                    )
                  })}
                </div>
                <div className="export-menu-foot">
                  <div className="export-menu-bulk">
                    <button
                      type="button"
                      onClick={() => setExportFields(ALERT_EXPORT_FIELDS.map((field) => field.key))}
                    >
                      Select all
                    </button>
                    <button type="button" onClick={() => setExportFields([])}>
                      Clear
                    </button>
                  </div>
                  <button className="primary-button small" type="button" onClick={exportAlertsCsv}>
                    Export CSV
                  </button>
                </div>
              </div>
            </details>
            <button className="secondary-button small btn-with-icon" type="button" onClick={() => loadAlerts(true)}>
              <DashboardIcon type="sync" />
              Refresh
            </button>
          </div>
        </div>

        <div className="alert-toolbar">
          <div className="alert-toolbar-group">
            <span className="alert-toolbar-label">Status</span>
            <div className="segmented">
              {statusOptions.map(([value, label]) => (
                <button
                  key={value || 'all'}
                  type="button"
                  className={filters.status === value ? 'is-active' : ''}
                  onClick={() => setFilter({ status: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <div className="alert-toolbar-group">
            <span className="alert-toolbar-label">Severity</span>
            <div className="segmented segmented-severity">
              {severityOptions.map(([value, label]) => (
                <button
                  key={value || 'all'}
                  type="button"
                  className={`${filters.severity === value ? 'is-active' : ''}${value ? ` seg-${value}` : ''}`}
                  onClick={() => setFilter({ severity: value })}
                >
                  {label}
                </button>
              ))}
            </div>
          </div>
          <label className="alert-toolbar-group alert-source-field">
            <span className="alert-toolbar-label">Source</span>
            <select value={filters.source} onChange={(event) => setFilter({ source: event.target.value })}>
              <option value="">All sources</option>
              <option value="wordpress">WordPress</option>
              <option value="page-monitor">Page monitor</option>
              <option value="page-discovery">Page discovery</option>
            </select>
          </label>
          <div className="alert-toolbar-group alert-website-field">
            <span className="alert-toolbar-label">Website</span>
            <details className="filter-menu">
              <summary>{siteFilterLabel}</summary>
              <div className="filter-menu-panel">
                <div className="filter-menu-search">
                  <input
                    type="search"
                    placeholder="Search websites..."
                    value={siteSearchQuery}
                    onChange={(event) => setSiteSearchQuery(event.target.value)}
                  />
                </div>
                <div className="filter-menu-actions">
                  <span>{selectedSiteIds.length ? `${selectedSiteIds.length} selected` : `${sites.length} websites`}</span>
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedAlert(null)
                      setSelectedSiteIds([])
                    }}
                  >
                    Clear
                  </button>
                </div>
                <div className="filter-menu-options">
                  {visibleFilterSites.map((site) => (
                    <label key={site.id} className="filter-check-row">
                      <input
                        type="checkbox"
                        checked={selectedSiteIds.includes(site.id)}
                        onChange={() => toggleSiteFilter(site.id)}
                      />
                      <span>
                        <strong>{site.siteName || getDomain(site.siteUrl)}</strong>
                        <small>{site.siteUrl ? getDomain(site.siteUrl) : 'No URL'}</small>
                      </span>
                    </label>
                  ))}
                  {!sites.length && <span className="filter-menu-empty">No websites found</span>}
                  {sites.length > 0 && !visibleFilterSites.length && (
                    <span className="filter-menu-empty">No websites match your search</span>
                  )}
                </div>
              </div>
            </details>
          </div>
        </div>

      </div>

      <div className="split-layout alerts-layout">
        <div className="section-card alert-list-card">
          <div className="alert-list-head">
            <h3>Alert Center</h3>
            <span className="alert-list-count">
              {loading ? 'Loading…' : `${alerts.length} ${alerts.length === 1 ? 'alert' : 'alerts'}`}
            </span>
          </div>
          {loading && !alerts.length ? (
            <AlertListSkeleton />
          ) : (
            <AlertList alerts={alerts} selectedId={selectedAlert?.id} onSelect={setSelectedAlert} />
          )}
        </div>
        <AlertDetailPanel
          alert={selectedAlert}
          actionId={actionId}
          onAction={canActOnAlerts ? runAlertAction : null}
          onClose={() => setSelectedAlert(null)}
        />
      </div>
    </section>
  )
}

function FeedbackBanner({ message }) {
  if (!message) return null
  const isSuccess = /success/i.test(message)
  return <div className={`feedback-banner ${isSuccess ? 'is-success' : 'is-error'}`}>{message}</div>
}

function AlertListSkeleton() {
  return (
    <div className="alert-list">
      {Array.from({ length: 4 }).map((_, index) => (
        <div className="alert-card is-skeleton" key={index}>
          <span className="alert-card-rail" />
          <div className="alert-card-body">
            <span className="skeleton-line wide" />
            <span className="skeleton-line medium" />
            <span className="skeleton-line short" />
          </div>
        </div>
      ))}
    </div>
  )
}

function AlertList({ alerts, selectedId, onSelect }) {
  if (!alerts.length) {
    return (
      <EmptyState
        title="No alerts found"
        description="You're all clear — alerts will appear here when SitePulse detects a finding."
      />
    )
  }

  return (
    <div className="alert-list">
      {alerts.map((alert) => (
        <AlertCard key={alert.id} alert={alert} selected={selectedId === alert.id} onSelect={onSelect} />
      ))}
    </div>
  )
}

function AlertCard({ alert, selected, onSelect }) {
  const severity = alert.severity || 'info'
  return (
    <button
      type="button"
      className={`alert-card sev-${severity}${selected ? ' is-selected' : ''}`}
      onClick={() => onSelect?.(alert)}
    >
      <span className="alert-card-rail">
        <span className="alert-card-sev-icon">
          <AlertSeverityIcon severity={severity} />
        </span>
      </span>
      <span className="alert-card-body">
        <span className="alert-card-head">
          <span className="alert-card-title">{alert.title}</span>
          <AlertStatusBadge status={alert.status} />
        </span>
        <span className="alert-card-msg">
          {alert.message || alert.recommendation || 'No additional details provided.'}
        </span>
        <span className="alert-card-meta">
          <span className="alert-meta-site">
            <span className="alert-meta-avatar">{getInitials(alert.site?.siteName || alert.site?.siteUrl || '?')}</span>
            <span className="alert-meta-site-text">
              <strong>{alert.site?.siteName || 'Unknown site'}</strong>
              {alert.site?.siteUrl && <span>{getDomain(alert.site.siteUrl)}</span>}
            </span>
          </span>
          <span className="alert-meta-chips">
            <span className={`alert-meta-chip alert-meta-severity alert-meta-severity-${severity}`}>
              {severity}
            </span>
            <span className="alert-meta-chip">{formatAlertSource(alert.source)}</span>
            <span className="alert-meta-chip">{formatRelativeTime(alert.lastSeenAt)}</span>
            {alert.occurrenceCount > 1 && (
              <span className="alert-meta-chip alert-meta-chip-count">{alert.occurrenceCount}×</span>
            )}
          </span>
        </span>
      </span>
      <span className="alert-card-chevron" aria-hidden="true">›</span>
    </button>
  )
}

function AlertDetailPanel({ alert, actionId, onAction, onClose }) {
  if (!alert) {
    return (
      <aside className="section-card alert-detail-card alert-incident-empty">
        <span className="incident-empty-icon">
          <AlertSeverityIcon severity="info" />
        </span>
        <h3>No alert selected</h3>
        <p>Choose an alert from the list to view its timeline, affected site, and recommended fix.</p>
      </aside>
    )
  }

  const severity = alert.severity || 'info'
  const tone = severity === 'critical' ? 'critical' : severity === 'warning' ? 'warning' : 'info'
  const busy = actionId === alert.id
  const activeStatuses = ['open', 'acknowledged', 'snoozed']
  const isActive = activeStatuses.includes(alert.status)
  const isResolved = alert.status === 'resolved'
  const actionButtons = [
    alert.status === 'open' && {
      action: 'acknowledge',
      label: 'Acknowledge',
      className: 'secondary-button',
    },
    alert.status !== 'snoozed' && isActive && {
      action: 'snooze',
      label: 'Snooze 24h',
      className: 'secondary-button',
    },
    isActive && {
      action: 'resolve',
      label: 'Resolve',
      className: 'primary-button',
    },
  ].filter(Boolean)

  return (
    <aside className="section-card alert-detail-card">
      <div className="incident-head">
        <span className={`incident-sev dashboard-badge-${tone}`}>
          <AlertSeverityIcon severity={severity} />
          {severity}
        </span>
        <button type="button" className="incident-close" onClick={onClose} aria-label="Close alert detail">
          ×
        </button>
      </div>
      <h3 className="incident-title">{alert.title}</h3>
      <p className="incident-msg">{alert.message || 'No message provided.'}</p>

      <div className="incident-site">
        <span className="alert-meta-avatar large">{getInitials(alert.site?.siteName || alert.site?.siteUrl || '?')}</span>
        <div className="incident-site-text">
          <strong>{alert.site?.siteName || 'Unknown site'}</strong>
          <span>{alert.site?.siteUrl ? getDomain(alert.site.siteUrl) : 'No URL on record'}</span>
        </div>
        <AlertStatusBadge status={alert.status} />
      </div>

      <div className="incident-meta">
        <div>
          <span>Source</span>
          <strong>{formatAlertSource(alert.source)}</strong>
        </div>
        <div>
          <span>Occurrences</span>
          <strong>{alert.occurrenceCount ?? 1}</strong>
        </div>
        <div>
          <span>First seen</span>
          <strong>{formatDate(alert.firstSeenAt)}</strong>
        </div>
        <div>
          <span>Last seen</span>
          <strong>{formatDate(alert.lastSeenAt)}</strong>
        </div>
      </div>

      <div className="incident-timeline">
        <div className="incident-timeline-row">
          <span className="incident-tl-dot" />
          <div>
            <strong>First detected</strong>
            <span>{formatRelativeTime(alert.firstSeenAt)}</span>
          </div>
        </div>
        {alert.acknowledgedAt && (
          <div className="incident-timeline-row">
            <span className="incident-tl-dot is-acknowledged" />
            <div>
              <strong>Acknowledged</strong>
              <span>
                {formatRelativeTime(alert.acknowledgedAt)}
                {alert.acknowledgedBy ? ` by ${alert.acknowledgedBy}` : ''}
              </span>
            </div>
          </div>
        )}
        {alert.snoozedUntil && alert.status === 'snoozed' && (
          <div className="incident-timeline-row">
            <span className="incident-tl-dot is-acknowledged" />
            <div>
              <strong>Snoozed</strong>
              <span>Until {formatDate(alert.snoozedUntil)}</span>
            </div>
          </div>
        )}
        <div className="incident-timeline-row">
          <span className="incident-tl-dot is-latest" />
          <div>
            <strong>Most recent</strong>
            <span>{formatRelativeTime(alert.lastSeenAt)}</span>
          </div>
        </div>
        {alert.resolvedAt && (
          <div className="incident-timeline-row">
            <span className="incident-tl-dot is-resolved" />
            <div>
              <strong>Resolved</strong>
              <span>{formatRelativeTime(alert.resolvedAt)}</span>
            </div>
          </div>
        )}
      </div>

      <div className="incident-reco">
        <strong>Recommended fix</strong>
        <p>{alert.recommendation || 'No recommendation provided for this alert.'}</p>
      </div>

      {onAction ? (
        isResolved ? (
          <div className="incident-state-note">
            <strong>Resolved alert</strong>
            <span>This alert is closed. If the next scan sees the same fingerprint again, SitePulse will reopen it as active.</span>
          </div>
        ) : (
          <div className="incident-actions">
            {actionButtons.map((button) => (
              <button
                key={button.action}
                className={button.className}
                disabled={busy}
                onClick={() => onAction(alert.id, button.action)}
              >
                {button.label}
              </button>
            ))}
          </div>
        )
      ) : (
        <p className="incident-noperm">You don't have permission to act on alerts.</p>
      )}
    </aside>
  )
}

function SitesPage({ request, apiBaseUrl, hasToken, currentUser }) {
  const [sites, setSites] = useState([])
  const [clients, setClients] = useState([])
  const [openAlerts, setOpenAlerts] = useState([])
  const [lastRefreshed, setLastRefreshed] = useState('')
  const [createdApiKey, setCreatedApiKey] = useState('')
  const [copyLabel, setCopyLabel] = useState('Copy')
  const [form, setForm] = useState({ clientId: '', siteName: '', siteUrl: '' })
  const [showArchived, setShowArchived] = useState(false)
  const [query, setQuery] = useState('')
  const [statusFilter, setStatusFilter] = useState('all')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const canManageSites = ['owner', 'admin', 'manager'].includes(currentUser?.role)
  const canAdminSites = ['owner', 'admin'].includes(currentUser?.role)

  const loadData = useCallback(async (force = false) => {
    if (!hasToken) return

    const sitesCacheName = showArchived ? 'sites:archived' : 'sites'
    const clientsCacheName = showArchived ? 'clients:archived' : 'clients'
    const archivedQuery = showArchived ? '?includeArchived=true' : ''
    const cachedSites = readCache(sitesCacheName, apiBaseUrl)
    const cachedClients = readCache(clientsCacheName, apiBaseUrl)
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
        requestOnce(cacheKey(sitesCacheName, apiBaseUrl), () => request(`/api/admin/sites${archivedQuery}`), force),
        requestOnce(cacheKey(clientsCacheName, apiBaseUrl), () => request(`/api/admin/clients${archivedQuery}`), force),
        requestOnce(cacheKey('site-open-alerts', apiBaseUrl), () => request('/api/admin/alerts?status=open'), force),
      ])
      const sitesPayload = writeCache(sitesCacheName, apiBaseUrl, sitesData)
      writeCache(clientsCacheName, apiBaseUrl, clientsData)
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
  }, [apiBaseUrl, hasToken, request, showArchived])

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

  async function editSite(site) {
    const siteName = window.prompt('Site name', site.siteName)
    if (siteName === null) return
    const siteUrl = window.prompt('Site URL', site.siteUrl)
    if (siteUrl === null) return
    const agentSyncIntervalHours = window.prompt('Agent sync interval hours', site.agentSyncIntervalHours || 12)
    if (agentSyncIntervalHours === null) return
    const pageCheckIntervalHours = window.prompt('Page check interval hours', site.pageCheckIntervalHours || 12)
    if (pageCheckIntervalHours === null) return

    try {
      await request(`/api/admin/sites/${site.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          siteName,
          siteUrl,
          clientId: site.clientId,
          agentSyncIntervalHours,
          pageCheckIntervalHours,
        }),
      })
      await loadData(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function archiveSite(site) {
    if (!window.confirm(`Archive ${site.siteName}?`)) return
    try {
      await request(`/api/admin/sites/${site.id}/archive`, { method: 'POST' })
      await loadData(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function restoreSite(site) {
    try {
      await request(`/api/admin/sites/${site.id}/restore`, { method: 'POST' })
      await loadData(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteSite(site) {
    if (!window.confirm(`Permanently delete ${site.siteName}? This cannot be undone.`)) return
    try {
      await request(`/api/admin/sites/${site.id}?confirm=true`, { method: 'DELETE' })
      await loadData(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const alertsBySite = openAlerts.reduce((acc, alert) => {
    const siteId = alert.siteId || alert.site?.id
    if (!siteId) return acc
    acc[siteId] = [...(acc[siteId] || []), alert]
    return acc
  }, {})

  const isAttention = (site) => !site.status || ['warning', 'critical', 'unknown'].includes(site.status)
  const counts = {
    all: sites.length,
    healthy: sites.filter((site) => site.status === 'healthy').length,
    attention: sites.filter((site) => isAttention(site)).length,
    updates: sites.filter((site) => (site.pluginUpdatesCount || 0) > 0).length,
  }
  const bandTiles = [
    { key: 'all', tone: 'open', label: 'Total Sites', foot: 'All monitored', value: counts.all },
    { key: 'healthy', tone: 'healthy', label: 'Healthy', foot: 'Operating normally', value: counts.healthy },
    { key: 'attention', tone: 'critical', label: 'Needs Attention', foot: 'Off the healthy baseline', value: counts.attention },
    { key: 'updates', tone: 'warning', label: 'Updates Pending', foot: 'Plugins to update', value: counts.updates },
  ]

  const q = query.trim().toLowerCase()
  const visibleSites = sites.filter((site) => {
    if (statusFilter === 'healthy' && site.status !== 'healthy') return false
    if (statusFilter === 'attention' && !isAttention(site)) return false
    if (statusFilter === 'updates' && !((site.pluginUpdatesCount || 0) > 0)) return false
    if (q) {
      const hay = `${site.siteName || ''} ${getDomain(site.siteUrl)} ${site.clientName || ''}`.toLowerCase()
      if (!hay.includes(q)) return false
    }
    return true
  })
  const activeTile = bandTiles.find((tile) => tile.key === statusFilter)
  const listTitle = statusFilter === 'all' ? 'All sites' : activeTile?.label || 'Sites'
  const isFiltered = statusFilter !== 'all' || !!q

  return (
    <section className="page sites-page">
      <PageHeader
        title="Sites"
        description="Onboard websites and review the latest health data from agent syncs."
        action={
          <div className="header-actions">
            <RefreshMeta refreshedAt={lastRefreshed} refreshing={refreshing} />
            <button className="secondary-button small btn-with-icon" type="button" onClick={() => loadData(true)}>
              <DashboardIcon type="sync" />
              Refresh
            </button>
          </div>
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      <FeedbackBanner message={error} />

      <div className="alert-band site-band">
        {bandTiles.map((tile) => (
          <button
            key={tile.key}
            type="button"
            className={`alert-band-tile tone-${tile.tone}${statusFilter === tile.key ? ' is-active' : ''}`}
            onClick={() => setStatusFilter(statusFilter === tile.key && tile.key !== 'all' ? 'all' : tile.key)}
          >
            <span className="alert-band-head">
              <span className="alert-band-label">{tile.label}</span>
              <span className="alert-band-dot" />
            </span>
            <span className="alert-band-value">{tile.value}</span>
            <span className="alert-band-foot">{tile.foot}</span>
          </button>
        ))}
      </div>

      <div className="alert-toolbar site-toolbar">
        <div className="alert-toolbar-group site-search-group">
          <span className="alert-toolbar-label">Search</span>
          <input
            className="site-search"
            type="search"
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            placeholder="Search by site, domain, or client"
          />
        </div>
        <label className="inline-toggle site-archived-toggle">
          <input
            type="checkbox"
            checked={showArchived}
            onChange={(event) => setShowArchived(event.target.checked)}
          />
          Show archived
        </label>
      </div>

      <div className="split-layout sites-layout">
        <div className="section-card site-list-card">
          <div className="alert-list-head">
            <h3>{listTitle}</h3>
            <span className="alert-list-count">
              {isFiltered ? `${visibleSites.length} of ${sites.length}` : `${sites.length} total`}
            </span>
          </div>
          {loading && !sites.length ? (
            <SiteCardSkeleton />
          ) : visibleSites.length ? (
            <SiteGrid
              sites={visibleSites}
              alertsBySite={alertsBySite}
              onEdit={canManageSites ? editSite : null}
              onArchive={canAdminSites ? archiveSite : null}
              onRestore={canAdminSites ? restoreSite : null}
              onDelete={canAdminSites ? deleteSite : null}
            />
          ) : (
            <EmptyState
              title={isFiltered ? 'No sites match' : 'No sites yet'}
              description={
                isFiltered
                  ? 'Try a different search term or filter.'
                  : 'Create a site to generate a unique API key for the WordPress plugin.'
              }
            />
          )}
        </div>
        {canManageSites && (
          <section className="section-card create-site-card">
            <div className="create-site-head">
              <h3>Create site</h3>
              <p>Generate a unique API key for the WordPress plugin.</p>
            </div>
            <form className="stack-form" onSubmit={createSite}>
              <label>
                Client
                <select
                  value={form.clientId}
                  onChange={(event) => setForm({ ...form, clientId: event.target.value })}
                  required
                >
                  <option value="">Select a client</option>
                  {clients.filter((client) => !client.isArchived).map((client) => (
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
          </section>
        )}
      </div>
    </section>
  )
}

function SiteGrid({ sites, alertsBySite = {}, onEdit, onArchive, onRestore, onDelete }) {
  return (
    <div className="site-grid">
      {sites.map((site) => (
        <SiteCard
          key={site.id}
          site={site}
          alerts={alertsBySite[site.id] || []}
          onEdit={onEdit}
          onArchive={onArchive}
          onRestore={onRestore}
          onDelete={onDelete}
        />
      ))}
    </div>
  )
}

function SiteCard({ site, alerts = [], onEdit, onArchive, onRestore, onDelete }) {
  const issueReasons = getTopIssueReasons(alerts)
  const fresh = getSyncFreshness(site.lastSeenAt)
  const updates = site.pluginUpdatesCount || 0
  const alertCount = alerts.length
  const hasActions = onEdit || onArchive || onRestore || onDelete
  const status = site.status || 'unknown'

  const open = () => setRouteHash(`sites/${site.id}`)

  return (
    <div
      className={`site-card rail-${status}${site.isArchived ? ' is-archived' : ''}`}
      role="button"
      tabIndex={0}
      onClick={open}
      onKeyDown={(event) => {
        if (event.target !== event.currentTarget) return
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          open()
        }
      }}
    >
      <div className="site-card-top">
        <div className="site-avatar">{getInitials(getDomain(site.siteUrl))}</div>
        <div className="site-card-id">
          <strong>{site.siteName}</strong>
          <span>{getDomain(site.siteUrl)}</span>
        </div>
        <StatusBadge status={site.status} />
      </div>

      <div className="site-card-meta">
        <span className={`sync-chip sync-${fresh.tone}`}>
          <i className="sync-dot" />
          {fresh.label}
        </span>
        <span className={`sync-chip ${updates > 0 ? 'is-updates' : ''}`}>
          {updates > 0 ? `${updates} update${updates === 1 ? '' : 's'}` : 'Up to date'}
        </span>
        {alertCount > 0 && (
          <span className="sync-chip is-alerts">
            {alertCount} open alert{alertCount === 1 ? '' : 's'}
          </span>
        )}
        {site.isArchived && <span className="sync-chip is-archived-chip">Archived</span>}
      </div>

      <div className="site-card-foot">
        <span className="site-card-client">{site.clientName || 'No client'}</span>
        {!!issueReasons.length && <span className="site-card-issues">{issueReasons.join(' · ')}</span>}
      </div>

      {hasActions && (
        <div className="site-card-actions" onClick={(event) => event.stopPropagation()}>
          {onEdit && (
            <button className="secondary-button small" type="button" onClick={() => onEdit(site)}>
              Edit
            </button>
          )}
          {site.isArchived
            ? onRestore && (
                <button className="secondary-button small" type="button" onClick={() => onRestore(site)}>
                  Restore
                </button>
              )
            : onArchive && (
                <button className="secondary-button small" type="button" onClick={() => onArchive(site)}>
                  Archive
                </button>
              )}
          {onDelete && (
            <button className="danger-button small" type="button" onClick={() => onDelete(site)}>
              Delete
            </button>
          )}
        </div>
      )}
    </div>
  )
}

function SiteCardSkeleton({ count = 6 }) {
  return (
    <div className="site-grid">
      {Array.from({ length: count }).map((_, index) => (
        <div className="site-card is-skeleton" key={index}>
          <div className="site-card-top">
            <div className="skeleton-avatar" />
            <div className="site-card-id">
              <div className="skeleton-line medium" />
              <div className="skeleton-line short" />
            </div>
          </div>
          <div className="site-card-meta">
            <div className="skeleton-pill" />
            <div className="skeleton-pill" />
          </div>
        </div>
      ))}
    </div>
  )
}

function RecentlySyncedSites({ sites }) {
  if (!sites.length) {
    return (
      <EmptyState
        title="No recent syncs"
        description="Sites will appear here after the WordPress agent sends data."
      />
    )
  }

  return (
    <div className="synced-sites-list">
      {sites.map((site) => {
        const fresh = getSyncFreshness(site.lastSeenAt)
        const updates = site.pluginUpdatesCount || 0
        return (
          <div className="synced-site-row click-row" key={site.id} onClick={() => setRouteHash(`sites/${site.id}`)}>
            <div className="site-avatar">{getInitials(getDomain(site.siteUrl))}</div>
            <div className="synced-site-body">
              <div className="synced-site-head">
                <strong>{site.siteName}</strong>
                <StatusBadge status={site.status} />
              </div>
              <span className="synced-site-domain">{getDomain(site.siteUrl)}</span>
              <div className="synced-site-tags">
                <span className={`sync-chip sync-chip-${fresh.tone}`}>
                  <span className="sync-dot" />
                  {fresh.label}
                </span>
                <span className={`sync-chip ${updates > 0 ? 'sync-chip-warning' : ''}`}>
                  {updates} plugin update{updates === 1 ? '' : 's'}
                </span>
              </div>
            </div>
          </div>
        )
      })}
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
      <table className="dashboard-checks-table">
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
              <td>
                <ResponseTime ms={check.responseTimeMs} />
              </td>
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

function HealthOverviewCard({ label, value, detail, status }) {
  return (
    <div className={`health-overview-card ${status ? `health-overview-${status}` : ''}`}>
      <span>{label}</span>
      <strong>{value}</strong>
      <p>{detail}</p>
    </div>
  )
}

function PriorityIssues({ alerts, site }) {
  if (!alerts.length) {
    return (
      <EmptyState
        title="No priority issues"
        description="SitePulse has not detected active advisory items for this site."
      />
    )
  }

  return (
    <div className="priority-issue-list">
      {alerts.map((alert) => (
        <article key={alert.id} className={`priority-issue priority-${alert.severity}`}>
          <div className="priority-issue-main">
            <AlertSeverityBadge severity={alert.severity} />
            <div>
              <h4>{alert.title}</h4>
              <p>{alert.message || 'This issue may affect site health, security, or visitor experience.'}</p>
            </div>
          </div>
          <div className="priority-issue-advice">
            <span>Recommended action</span>
            <strong>{alert.recommendation || 'Review this finding and apply the recommended fix.'}</strong>
          </div>
          <div className="priority-issue-meta">
            <span>{alert.site?.siteName || site?.siteName || 'This site'}</span>
            <span>{formatRelativeTime(alert.lastSeenAt)}</span>
            <button className="secondary-button small" type="button" onClick={() => setRouteHash('alerts')}>
              View Fix
            </button>
          </div>
        </article>
      ))}
    </div>
  )
}

function IntelligenceCard({ title, items, tone }) {
  return (
    <div className={`intelligence-card ${tone ? `intelligence-${tone}` : ''}`}>
      <h4>{title}</h4>
      <ul>
        {items.map((item) => (
          <li key={item}>{item}</li>
        ))}
      </ul>
    </div>
  )
}

function EnvironmentCard({ label, value, status }) {
  return (
    <div className={`environment-card ${status ? `environment-${status}` : ''}`}>
      <span>{label}</span>
      <strong>{value || 'Unknown'}</strong>
    </div>
  )
}

function SiteDetailPage({ siteId, request, apiBaseUrl, hasToken, currentUser }) {
  const [site, setSite] = useState(null)
  const [relatedAlerts, setRelatedAlerts] = useState([])
  const [pages, setPages] = useState([])
  const [discoveredPages, setDiscoveredPages] = useState([])
  const [selectedDiscoveredPages, setSelectedDiscoveredPages] = useState([])
  const [discoveryFilter, setDiscoveryFilter] = useState('all')
  const [pageForm, setPageForm] = useState({ label: '', url: '' })
  const [error, setError] = useState('')
  const [pageError, setPageError] = useState('')
  const [discoveryError, setDiscoveryError] = useState('')
  const [loading, setLoading] = useState(false)
  const [pagesLoading, setPagesLoading] = useState(false)
  const [discoveryLoading, setDiscoveryLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [pageActionId, setPageActionId] = useState('')
  const [checkingAll, setCheckingAll] = useState(false)
  const [addingPage, setAddingPage] = useState(false)
  const [addingDiscovered, setAddingDiscovered] = useState(false)
  const canManagePages = ['owner', 'admin', 'manager'].includes(currentUser?.role)

  const detailCacheName = `site:${siteId}`
  const pagesCacheName = `site:${siteId}:pages`
  const discoveredPagesCacheName = `site:${siteId}:discovered-pages`

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

  const loadDiscoveredPages = useCallback(async (force = false) => {
    if (!hasToken || !siteId) return

    const cached = readCache(discoveredPagesCacheName, apiBaseUrl)

    if (cached?.data?.pages && !force) {
      setDiscoveredPages(cached.data.pages || [])
    } else {
      setDiscoveryLoading(true)
    }

    setDiscoveryError('')

    try {
      const data = await requestOnce(
        cacheKey(discoveredPagesCacheName, apiBaseUrl),
        () => request(`/api/admin/sites/${siteId}/discovered-pages?active=true`),
        force,
      )
      writeCache(discoveredPagesCacheName, apiBaseUrl, data)
      setDiscoveredPages(data.pages || [])
    } catch (err) {
      setDiscoveryError(err.message)
    } finally {
      setDiscoveryLoading(false)
    }
  }, [apiBaseUrl, discoveredPagesCacheName, hasToken, request, siteId])

  useEffect(() => {
    loadDiscoveredPages()
  }, [loadDiscoveredPages])

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
      await Promise.all([loadPages(true), loadDiscoveredPages(true)])
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
      await Promise.all([loadPages(true), loadDiscoveredPages(true)])
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

  async function discoverPages() {
    setDiscoveryLoading(true)
    setDiscoveryError('')

    try {
      const data = await request(`/api/admin/sites/${siteId}/discover-pages`, {
        method: 'POST',
      })
      setDiscoveredPages(data.pages || [])
      if (data.message) setDiscoveryError(data.message)
      await loadDiscoveredPages(true)
    } catch (err) {
      setDiscoveryError(err.message)
    } finally {
      setDiscoveryLoading(false)
    }
  }

  async function addSelectedDiscoveredPages() {
    setAddingDiscovered(true)
    setDiscoveryError('')

    try {
      await request(`/api/admin/sites/${siteId}/discovered-pages/add-to-monitoring`, {
        method: 'POST',
        body: JSON.stringify({ pageInventoryIds: selectedDiscoveredPages }),
      })
      setSelectedDiscoveredPages([])
      await Promise.all([loadPages(true), loadDiscoveredPages(true)])
    } catch (err) {
      setDiscoveryError(err.message)
    } finally {
      setAddingDiscovered(false)
    }
  }

  const snapshot = site?.latestSnapshot
  const updateCount = snapshot?.pluginUpdatesCount ?? 0
  const topAlertReasons = getTopIssueReasons(relatedAlerts, 3)
  const pageChecks = pages.map((page) => page.latestCheck).filter(Boolean)
  const successfulChecks = pageChecks.filter((check) => !check.errorDetected && check.httpStatus < 400)
  const uptime = pageChecks.length ? Math.round((successfulChecks.length / pageChecks.length) * 100) : null
  const avgResponseTime = pageChecks.length
    ? Math.round(pageChecks.reduce((sum, check) => sum + (check.responseTimeMs || 0), 0) / pageChecks.length)
    : null
  const lastCheckedValues = [
    site?.lastSeenAt,
    ...pageChecks.map((check) => check.checkedAt),
  ].filter(Boolean)
  const lastCheckedAt = lastCheckedValues
    .map((value) => new Date(value))
    .filter((date) => !Number.isNaN(date.getTime()))
    .sort((a, b) => b.getTime() - a.getTime())[0]
  const securityItems = [
    snapshot?.debugMode ? 'Debug mode is enabled and should be disabled on production.' : 'Debug mode is disabled.',
    snapshot?.fileEditorEnabled ? 'File editor is enabled and increases admin risk.' : 'File editor is disabled.',
    relatedAlerts.some((alert) => alert.severity === 'critical')
      ? 'Critical alerts are open and need review.'
      : 'No critical alert pressure detected.',
  ]
  const maintenanceItems = [
    snapshot?.coreUpdateAvailable ? 'WordPress core update is available.' : 'No core update reported.',
    snapshot?.themeUpdateAvailable ? 'Theme update is available.' : 'Theme appears current.',
    updateCount > 0 ? `${updateCount} plugin update${updateCount === 1 ? '' : 's'} available.` : 'Plugins appear current.',
  ]
  const filteredDiscoveredPages = discoveredPages.filter((page) => {
    if (discoveryFilter === 'high') return page.importance === 'high'
    if (discoveryFilter === 'unmonitored') return !page.isMonitored
    if (discoveryFilter === 'new') {
      return page.firstSeenAt && Date.now() - new Date(page.firstSeenAt).getTime() < 7 * 24 * 60 * 60 * 1000
    }
    return true
  })
  const hasHighUnmonitored = discoveredPages.some((page) => page.importance === 'high' && !page.isMonitored)
  const monitoringItems = [
    pages.length ? `${pages.length} monitored page${pages.length === 1 ? '' : 's'} configured.` : 'No monitored pages configured yet.',
    pageChecks.length ? `${pageChecks.length} page check${pageChecks.length === 1 ? '' : 's'} recorded.` : 'No page checks recorded yet.',
    hasHighUnmonitored ? 'High-priority discovered pages are not monitored.' : 'No high-priority unmonitored pages flagged.',
  ]

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={() => setRouteHash('sites')}>
        Back to sites
      </button>
      {!hasToken && <EmptyTokenNotice />}
      {loading && !site && <DetailSkeleton />}
      <ErrorState message={error} />
      {site && (
        <div className="detail-stack site-monitoring-stack">
          <section className={`site-hero-card site-hero-${site.status || 'unknown'}`}>
            <div className="site-hero-main">
              <div className="site-avatar large">{getInitials(getDomain(site.siteUrl))}</div>
              <div>
                <div className="site-title-line">
                  <h2>{site.siteName}</h2>
                  <StatusBadge status={site.status} />
                </div>
                <a href={site.siteUrl} target="_blank" rel="noreferrer">
                  {site.siteUrl}
                </a>
                <p>{site.client?.name || 'No client assigned'}</p>
              </div>
            </div>
            <div className="site-hero-actions">
              <span>Last checked: {lastCheckedAt ? formatRelativeTime(lastCheckedAt) : 'No checks yet'}</span>
              <span>Last refreshed: {formatDate(readCache(detailCacheName, apiBaseUrl)?.refreshedAt)}</span>
              <div className="header-actions">
                <button className="secondary-button" type="button" onClick={() => setRouteHash('alerts')}>
                  View Fix Guide
                </button>
                <button className="secondary-button" type="button" onClick={() => setRouteHash(`reports?siteId=${site.id}`)}>
                  Generate Report
                </button>
                <button className="primary-button" type="button" onClick={() => loadSite(true)}>
                  Refresh
                </button>
              </div>
            </div>
          </section>

          <div className="health-overview-grid">
            <HealthOverviewCard label="Overall Status" value={site.status || 'unknown'} detail={topAlertReasons[0] || 'Current site posture'} status={site.status} />
            <HealthOverviewCard label="Open Alerts" value={relatedAlerts.length} detail={relatedAlerts.length ? 'Needs review' : 'No open issues'} status={relatedAlerts.some((alert) => alert.severity === 'critical') ? 'critical' : relatedAlerts.length ? 'warning' : 'healthy'} />
            <HealthOverviewCard label="Plugin Updates" value={updateCount} detail={updateCount ? 'Updates available' : 'No plugin updates'} status={updateCount ? 'warning' : 'healthy'} />
            <HealthOverviewCard label="Uptime" value={uptime === null ? 'n/a' : `${uptime}%`} detail={pageChecks.length ? 'Based on latest page checks' : 'No checks yet'} status={uptime === null ? 'unknown' : uptime < 90 ? 'critical' : uptime < 99 ? 'warning' : 'healthy'} />
            <HealthOverviewCard label="Avg Response Time" value={avgResponseTime === null ? 'n/a' : `${avgResponseTime}ms`} detail={pageChecks.length ? 'Latest monitored pages' : 'No response data'} status={avgResponseTime === null ? 'unknown' : avgResponseTime > 5000 ? 'critical' : avgResponseTime > 2000 ? 'warning' : 'healthy'} />
          </div>

          <Section title="Priority Issues" meta={`${relatedAlerts.length} open`}>
            <PriorityIssues alerts={relatedAlerts} site={site} />
          </Section>

          <Section title="Site Health Intelligence">
            <div className="intelligence-grid">
              <IntelligenceCard title="Security Flags" items={securityItems} tone={snapshot?.debugMode || snapshot?.fileEditorEnabled ? 'critical' : 'healthy'} />
              <IntelligenceCard title="Maintenance" items={maintenanceItems} tone={updateCount || snapshot?.coreUpdateAvailable || snapshot?.themeUpdateAvailable ? 'warning' : 'healthy'} />
              <IntelligenceCard title="Monitoring" items={monitoringItems} tone={hasHighUnmonitored ? 'warning' : 'healthy'} />
            </div>
          </Section>

          <Section title="WordPress Environment">
            <div className="environment-grid">
              <EnvironmentCard label="WordPress Version" value={snapshot?.wordpressVersion || 'No snapshot'} />
              <EnvironmentCard label="PHP Version" value={snapshot?.phpVersion || 'No snapshot'} />
              <EnvironmentCard label="MySQL Version" value={snapshot?.mysqlVersion || 'No snapshot'} />
              <EnvironmentCard label="Active Theme" value={snapshot ? `${snapshot.activeThemeName || 'Unknown'} ${snapshot.activeThemeVersion || ''}` : 'No snapshot'} />
              <EnvironmentCard label="Debug Mode" value={snapshot?.debugMode ? 'Enabled' : 'Disabled'} status={snapshot?.debugMode ? 'critical' : 'healthy'} />
              <EnvironmentCard label="File Editor" value={snapshot?.fileEditorEnabled ? 'Enabled' : 'Disabled'} status={snapshot?.fileEditorEnabled ? 'warning' : 'healthy'} />
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
                disabled={!canManagePages || checkingAll || !pages.length}
              >
                {checkingAll ? 'Checking...' : 'Check all pages'}
              </button>
            }
          >
            <ErrorState message={pageError} />
            <div className="monitor-layout">
              {canManagePages && <form className="stack-form monitor-form" onSubmit={addMonitoredPage}>
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
              </form>}
              {pagesLoading && !pages.length ? (
                <TableSkeleton rows={4} />
              ) : (
                <MonitoredPagesTable
                  pages={pages}
                  actionId={pageActionId}
                  onCheck={canManagePages ? checkPageNow : null}
                  onDelete={canManagePages ? deletePage : null}
                />
              )}
            </div>
          </Section>

          <Section
            title="Discovered Pages"
            meta={discoveryLoading ? 'Loading...' : `${filteredDiscoveredPages.length} shown`}
            action={
              <div className="header-actions">
                <button className="secondary-button" type="button" onClick={discoverPages}>
                  Discover Pages
                </button>
                <button
                  className="primary-button"
                  type="button"
                  onClick={addSelectedDiscoveredPages}
                  disabled={!canManagePages || addingDiscovered || !selectedDiscoveredPages.length}
                >
                  {addingDiscovered ? 'Adding...' : 'Add selected to monitoring'}
                </button>
              </div>
            }
          >
            <ErrorState message={discoveryError} />
            {hasHighUnmonitored && (
              <div className="state-box warning-state">
                High-priority pages discovered that are not monitored.
              </div>
            )}
            <div className="filter-row compact-filter-row">
              {[
                ['all', 'All'],
                ['high', 'High importance'],
                ['unmonitored', 'Unmonitored'],
                ['new', 'Newly discovered'],
              ].map(([value, label]) => (
                <button
                  key={value}
                  className={discoveryFilter === value ? 'primary-button small' : 'secondary-button small'}
                  type="button"
                  onClick={() => setDiscoveryFilter(value)}
                >
                  {label}
                </button>
              ))}
            </div>
            {discoveryLoading && !discoveredPages.length ? (
              <TableSkeleton rows={4} />
            ) : (
              <DiscoveredPagesTable
                pages={filteredDiscoveredPages}
                selectedIds={selectedDiscoveredPages}
                canSelect={canManagePages}
                onToggle={(pageId) =>
                  setSelectedDiscoveredPages((current) =>
                    current.includes(pageId)
                      ? current.filter((id) => id !== pageId)
                      : [...current, pageId],
                  )
                }
              />
            )}
            {!discoveredPages.length && !discoveryLoading && (
              <div className="state-box token-state">
                Run WordPress Agent sync first if no discovered pages appear.
              </div>
            )}
          </Section>

          <Section title="Change History" meta="Monitoring timeline">
            <SnapshotTable snapshots={site.snapshots || []} />
          </Section>
        </div>
      )}
    </section>
  )
}

function Section({ title, meta, action, children, flush = false }) {
  return (
    <div className="section-card">
      <div className="section-title">
        <h3>{title}</h3>
        <div className="section-actions">
          {meta && <span>{meta}</span>}
          {action}
        </div>
      </div>
      <div className={flush ? 'section-body-flush' : 'section-body'}>
        {children}
      </div>
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
            <th>Status</th>
            <th>HTTP</th>
            <th>Response Time</th>
            <th>Last Check</th>
            <th>Error Summary</th>
            {(onCheck || onDelete) && <th>Actions</th>}
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
                <td>
                  <PageStatusBadge check={check} />
                </td>
                <td>{check?.httpStatus ?? 'Not checked'}</td>
                <td>{check?.responseTimeMs !== undefined && check?.responseTimeMs !== null ? `${check.responseTimeMs} ms` : 'Not checked'}</td>
                <td>
                  <strong className="date-primary">{check ? formatRelativeTime(check.checkedAt) : 'Not checked'}</strong>
                  <span>{check ? formatDate(check.checkedAt) : 'No check yet'}</span>
                </td>
                <td>{check?.errorSummary || 'None'}</td>
                {(onCheck || onDelete) && (
                  <td>
                    <div className="row-actions">
                      {onCheck && (
                        <button
                          className="secondary-button small"
                          type="button"
                          onClick={() => onCheck(page.id)}
                          disabled={isBusy}
                        >
                          {isBusy ? 'Working...' : 'Check now'}
                        </button>
                      )}
                      {onDelete && (
                        <button
                          className="danger-button small"
                          type="button"
                          onClick={() => onDelete(page.id)}
                          disabled={isBusy}
                        >
                          Delete
                        </button>
                      )}
                    </div>
                  </td>
                )}
              </tr>
            )
          })}
        </tbody>
      </table>
    </div>
  )
}

function ImportanceBadge({ importance }) {
  const normalized = importance || 'normal'
  return <span className={`importance-badge importance-${normalized}`}>{normalized}</span>
}

function DiscoveredPagesTable({ pages, selectedIds, canSelect, onToggle }) {
  if (!pages.length) {
    return (
      <EmptyState
        title="No discovered pages"
        description="Discovered WordPress pages appear after the agent syncs page inventory."
      />
    )
  }

  return (
    <div className="table-wrap">
      <table className="discovered-table">
        <thead>
          <tr>
            <th>Select</th>
            <th>Page</th>
            <th>Importance</th>
            <th>Reason</th>
            <th>Monitoring</th>
            <th>First seen</th>
          </tr>
        </thead>
        <tbody>
          {pages.map((page) => (
            <tr key={page.id} className={page.importance === 'high' && !page.isMonitored ? 'warning-row' : ''}>
              <td>
                <input
                  type="checkbox"
                  checked={selectedIds.includes(page.id)}
                  onChange={() => onToggle(page.id)}
                  disabled={!canSelect || page.isMonitored}
                />
              </td>
              <td>
                <strong>{page.title}</strong>
                <a className="table-link" href={page.url} target="_blank" rel="noreferrer">
                  {page.url}
                </a>
              </td>
              <td>
                <ImportanceBadge importance={page.importance} />
              </td>
              <td>{page.recommendationReason || 'General page'}</td>
              <td>
                <span className={page.isMonitored ? 'count-badge' : 'count-badge attention'}>
                  {page.isMonitored ? 'Monitored' : 'Not monitored'}
                </span>
              </td>
              <td>
                <strong className="date-primary">{formatRelativeTime(page.firstSeenAt)}</strong>
                <span>{formatDate(page.firstSeenAt)}</span>
              </td>
            </tr>
          ))}
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
  const [filter, setFilter] = useState('risk')
  const [search, setSearch] = useState('')

  if (!plugins.length) {
    return (
      <EmptyState
        title="No plugin data yet"
        description="Plugin inventory appears after the WordPress agent syncs successfully."
      />
    )
  }

  const filteredPlugins = plugins
    .filter((plugin) => {
      const matchesSearch = `${plugin.name} ${plugin.slug}`.toLowerCase().includes(search.toLowerCase())
      if (!matchesSearch) return false
      if (filter === 'active') return plugin.status === 'active'
      if (filter === 'inactive') return plugin.status === 'inactive'
      if (filter === 'updates') return plugin.updateAvailable
      if (filter === 'risk') return plugin.updateAvailable || plugin.status === 'inactive'
      return true
    })
    .sort((a, b) => Number(b.updateAvailable) - Number(a.updateAvailable) || a.name.localeCompare(b.name))

  return (
    <div className="plugin-panel">
      <div className="plugin-toolbar">
        <div className="compact-filter-row">
          {[
            ['risk', 'Risky'],
            ['all', 'All'],
            ['active', 'Active'],
            ['inactive', 'Inactive'],
            ['updates', 'Updates Available'],
          ].map(([value, label]) => (
            <button
              key={value}
              className={filter === value ? 'primary-button small' : 'secondary-button small'}
              type="button"
              onClick={() => setFilter(value)}
            >
              {label}
            </button>
          ))}
        </div>
        <input
          className="plugin-search"
          value={search}
          onChange={(event) => setSearch(event.target.value)}
          placeholder="Search plugins"
        />
      </div>
      <div className="table-wrap">
      <table className="plugin-table">
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
          {filteredPlugins.map((plugin) => (
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
      {!filteredPlugins.length && (
        <EmptyState title="No plugins match" description="Try another filter or search term." />
      )}
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
                <div className="badge-row">
                  {[
                    snapshot.coreUpdateAvailable && 'Core update',
                    snapshot.themeUpdateAvailable && 'Theme update',
                    snapshot.debugMode && 'Debug mode',
                    snapshot.fileEditorEnabled && 'File editor',
                  ]
                    .filter(Boolean)
                    .map((flag) => (
                      <span key={flag} className="count-badge attention">{flag}</span>
                    ))}
                  {![
                    snapshot.coreUpdateAvailable,
                    snapshot.themeUpdateAvailable,
                    snapshot.debugMode,
                    snapshot.fileEditorEnabled,
                  ].some(Boolean) && <span className="count-badge">No flags</span>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ClientsPage({ request, apiBaseUrl, hasToken, currentUser }) {
  const [clients, setClients] = useState([])
  const [form, setForm] = useState({
    name: '',
    contactPerson: '',
    email: '',
    phone: '',
    notes: '',
  })
  const [showArchived, setShowArchived] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [refreshing, setRefreshing] = useState(false)
  const [creating, setCreating] = useState(false)
  const canManageClients = ['owner', 'admin'].includes(currentUser?.role)

  const loadClients = useCallback(async (force = false) => {
    if (!hasToken) return

    const cacheName = showArchived ? 'clients:archived' : 'clients'
    const archivedQuery = showArchived ? '?includeArchived=true' : ''
    const cached = readCache(cacheName, apiBaseUrl)

    if (cached?.data?.clients && !force) {
      setClients(cached.data.clients || [])
      setRefreshing(true)
    } else {
      setLoading(true)
    }

    setError('')

    try {
      const data = await requestOnce(
        cacheKey(cacheName, apiBaseUrl),
        () => request(`/api/admin/clients${archivedQuery}`),
        force,
      )
      writeCache(cacheName, apiBaseUrl, data)
      setClients(data.clients || [])
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }, [apiBaseUrl, hasToken, request, showArchived])

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

  async function editClient(client) {
    const name = window.prompt('Client name', client.name)
    if (name === null) return
    const contactPerson = window.prompt('Contact person', client.contactPerson || '')
    if (contactPerson === null) return
    const email = window.prompt('Email', client.email || '')
    if (email === null) return

    try {
      await request(`/api/admin/clients/${client.id}`, {
        method: 'PATCH',
        body: JSON.stringify({
          name,
          contactPerson,
          email,
          phone: client.phone || '',
          notes: client.notes || '',
        }),
      })
      await loadClients(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function archiveClient(client) {
    if (!window.confirm(`Archive ${client.name}?`)) return
    try {
      await request(`/api/admin/clients/${client.id}/archive`, { method: 'POST' })
      await loadClients(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function restoreClient(client) {
    try {
      await request(`/api/admin/clients/${client.id}/restore`, { method: 'POST' })
      await loadClients(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function deleteClient(client) {
    const force = client.sitesCount > 0
      ? window.confirm(`${client.name} has active sites. Force delete anyway?`)
      : window.confirm(`Permanently delete ${client.name}?`)
    if (!force) return

    try {
      await request(`/api/admin/clients/${client.id}${client.sitesCount > 0 ? '?force=true' : ''}`, {
        method: 'DELETE',
      })
      await loadClients(true)
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Clients"
        description="Manage agency clients before onboarding their WordPress sites."
        action={
          <div className="header-actions">
            <label className="inline-toggle">
              <input
                type="checkbox"
                checked={showArchived}
                onChange={(event) => setShowArchived(event.target.checked)}
              />
              Show archived
            </label>
            <button className="secondary-button" type="button" onClick={() => loadClients(true)}>
              Refresh
            </button>
          </div>
        }
      />
      {!hasToken && <EmptyTokenNotice />}
      <ErrorState message={error} />
      <div className="split-layout">
        <Section title="Client list" meta={refreshing ? 'Refreshing...' : `${clients.length} total`}>
          {loading && !clients.length ? (
            <TableSkeleton rows={5} />
          ) : (
            <ClientTable
              clients={clients}
              onEdit={canManageClients ? editClient : null}
              onArchive={canManageClients ? archiveClient : null}
              onRestore={canManageClients ? restoreClient : null}
              onDelete={canManageClients ? deleteClient : null}
            />
          )}
        </Section>
        {canManageClients && <Section title="Create client">
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
        </Section>}
      </div>
    </section>
  )
}

function ClientTable({ clients, onEdit, onArchive, onRestore, onDelete }) {
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
            {(onEdit || onArchive || onRestore || onDelete) && <th>Actions</th>}
          </tr>
        </thead>
        <tbody>
          {clients.map((client) => (
            <tr key={client.id} className={client.isArchived ? 'archived-row' : ''}>
              <td>
                <div className="site-cell">
                  <div className="client-avatar">{getInitials(client.name)}</div>
                  <div>
                    <strong>{client.name}</strong>
                    <span>{client.notes || 'No notes'}</span>
                    {client.isArchived && <span className="issue-reasons">Archived</span>}
                  </div>
                </div>
              </td>
              <td>{client.contactPerson || 'Not set'}</td>
              <td>{client.email || 'Not set'}</td>
              <td>
                <span className="count-badge">{client.sitesCount} sites</span>
              </td>
              {(onEdit || onArchive || onRestore || onDelete) && (
                <td>
                  <div className="row-actions">
                    {onEdit && <button className="secondary-button small" type="button" onClick={() => onEdit(client)}>Edit</button>}
                    {client.isArchived
                      ? onRestore && <button className="secondary-button small" type="button" onClick={() => onRestore(client)}>Restore</button>
                      : onArchive && <button className="secondary-button small" type="button" onClick={() => onArchive(client)}>Archive</button>}
                    {onDelete && <button className="danger-button small" type="button" onClick={() => onDelete(client)}>Delete</button>}
                  </div>
                </td>
              )}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function ReportsPage({ request, apiBaseUrl, hasToken, currentUser }) {
  const routeQuery = getRouteQuery(getInitialRoute())
  const monthRange = currentMonthRange()
  const [reports, setReports] = useState([])
  const [clients, setClients] = useState([])
  const [sites, setSites] = useState([])
  const [form, setForm] = useState({
    scope: 'site',
    clientId: routeQuery.get('clientId') || '',
    siteId: routeQuery.get('siteId') || '',
    periodStart: monthRange.start,
    periodEnd: monthRange.end,
    title: '',
  })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [generating, setGenerating] = useState(false)
  const canGenerate = ['owner', 'admin', 'manager'].includes(currentUser?.role)

  const loadReports = useCallback(async (force = false) => {
    if (!hasToken) return
    setLoading(true)
    setError('')

    try {
      const [reportsData, clientsData, sitesData] = await Promise.all([
        requestOnce(cacheKey('reports', apiBaseUrl), () => request('/api/admin/reports'), force),
        requestOnce(cacheKey('clients', apiBaseUrl), () => request('/api/admin/clients'), force),
        requestOnce(cacheKey('sites', apiBaseUrl), () => request('/api/admin/sites'), force),
      ])
      writeCache('reports', apiBaseUrl, reportsData)
      setReports(reportsData.reports || [])
      setClients(clientsData.clients || [])
      setSites(sitesData.sites || [])
    } catch (err) {
      setError(err.message)
      const cached = readCache('reports', apiBaseUrl)
      if (cached?.data?.reports) setReports(cached.data.reports)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, hasToken, request])

  useEffect(() => {
    loadReports()
  }, [loadReports])

  async function generateReport(event) {
    event.preventDefault()
    setGenerating(true)
    setError('')

    try {
      const endpoint = form.scope === 'client' ? '/api/admin/reports/client' : '/api/admin/reports/site'
      const data = await request(endpoint, {
        method: 'POST',
        body: JSON.stringify({
          periodStart: form.periodStart,
          periodEnd: form.periodEnd,
          title: form.title,
          ...(form.scope === 'client' ? { clientId: form.clientId } : { siteId: form.siteId }),
        }),
      })
      await loadReports(true)
      setRouteHash(`reports/${data.report.id}`)
    } catch (err) {
      setError(err.message)
    } finally {
      setGenerating(false)
    }
  }

  async function archiveReport(report) {
    if (!window.confirm(`Archive ${report.title}?`)) return
    try {
      await request(`/api/admin/reports/${report.id}`, { method: 'DELETE' })
      await loadReports(true)
    } catch (err) {
      setError(err.message)
    }
  }

  const now = new Date()
  const reportsThisMonth = reports.filter((report) => {
    const created = new Date(report.createdAt)
    return created.getMonth() === now.getMonth() && created.getFullYear() === now.getFullYear()
  }).length
  const criticalReported = reports.filter((report) => report.summary?.overallHealthStatus === 'critical').length

  return (
    <section className="page">
      <PageHeader
        title="Reports"
        description="Generate client-facing website health reports for agency reviews."
        action={<button className="secondary-button" type="button" onClick={() => loadReports(true)}>Refresh</button>}
      />
      <ErrorState message={error} />
      <div className="metric-grid report-metric-grid">
        <Metric label="Total reports" value={reports.length} detail="Generated reports" />
        <Metric label="This month" value={reportsThisMonth} detail="Created this month" />
        <Metric label="Critical sites reported" value={criticalReported} status={criticalReported ? 'critical' : 'healthy'} detail="Reports with critical status" />
      </div>
      <div className="split-layout">
        <Section title="Reports" meta={loading ? 'Loading...' : `${reports.length} reports`}>
          {loading && !reports.length ? (
            <TableSkeleton rows={5} />
          ) : (
            <ReportsTable reports={reports} canArchive={canGenerate} onArchive={archiveReport} />
          )}
        </Section>
        {canGenerate && (
          <Section title="Generate Report">
            <form className="stack-form" onSubmit={generateReport}>
              <label>
                Report scope
                <select value={form.scope} onChange={(event) => setForm({ ...form, scope: event.target.value })}>
                  <option value="site">Site</option>
                  <option value="client">Client</option>
                </select>
              </label>
              {form.scope === 'client' ? (
                <label>
                  Client
                  <select value={form.clientId} onChange={(event) => setForm({ ...form, clientId: event.target.value })} required>
                    <option value="">Select client</option>
                    {clients.map((client) => <option key={client.id} value={client.id}>{client.name}</option>)}
                  </select>
                </label>
              ) : (
                <label>
                  Site
                  <select value={form.siteId} onChange={(event) => setForm({ ...form, siteId: event.target.value })} required>
                    <option value="">Select site</option>
                    {sites.map((site) => <option key={site.id} value={site.id}>{site.siteName}</option>)}
                  </select>
                </label>
              )}
              <label>
                Period start
                <input type="date" value={form.periodStart} onChange={(event) => setForm({ ...form, periodStart: event.target.value })} required />
              </label>
              <label>
                Period end
                <input type="date" value={form.periodEnd} onChange={(event) => setForm({ ...form, periodEnd: event.target.value })} required />
              </label>
              <label>
                Title
                <input value={form.title} onChange={(event) => setForm({ ...form, title: event.target.value })} placeholder="June Website Health Report" />
              </label>
              <button className="primary-button" type="submit" disabled={generating}>
                {generating ? 'Generating...' : 'Generate Report'}
              </button>
            </form>
          </Section>
        )}
      </div>
    </section>
  )
}

function ReportsTable({ reports, canArchive, onArchive }) {
  if (!reports.length) {
    return <EmptyState title="No reports yet" description="Generate your first client-facing report." />
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>Title</th>
            <th>Type</th>
            <th>Client / Site</th>
            <th>Period</th>
            <th>Created by</th>
            <th>Created</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {reports.map((report) => (
            <tr key={report.id}>
              <td>
                <strong>{report.title}</strong>
                <span>{report.status}</span>
              </td>
              <td><span className="count-badge">{report.reportType}</span></td>
              <td>
                <strong>{report.client?.name || report.summary?.client?.name || 'No client'}</strong>
                <span>{report.site?.siteName || report.summary?.site?.siteName || 'Client-wide'}</span>
              </td>
              <td>{formatDate(report.periodStart)} to {formatDate(report.periodEnd)}</td>
              <td>{report.createdByName || 'System'}</td>
              <td>{formatDate(report.createdAt)}</td>
              <td>
                <div className="row-actions">
                  <button className="secondary-button small" type="button" onClick={() => setRouteHash(`reports/${report.id}`)}>View</button>
                  {canArchive && <button className="danger-button small" type="button" onClick={() => onArchive(report)}>Archive</button>}
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function buildRecommendedActions({ summary, recentSites, latestAlerts, pluginUpdateTotal }) {
  const primarySite = recentSites.find((site) => site.status === 'critical') || recentSites[0]
  const updateSite = recentSites.find((site) => site.pluginUpdatesCount > 0) || primarySite
  const actions = []

  if ((summary.critical || 0) > 0 || latestAlerts.some((alert) => alert.severity === 'critical')) {
    actions.push({
      priority: 'critical',
      title: `Fix ${Math.max(summary.critical || 1, 1)} critical WordPress risk${(summary.critical || 1) === 1 ? '' : 's'}`,
      description: latestAlerts.find((alert) => alert.severity === 'critical')?.message || 'Security or configuration issues need attention',
      site: primarySite,
      cta: 'Fix Now',
      route: 'alerts',
    })
  }

  if ((summary.unmonitoredImportantPages || 0) > 0) {
    actions.push({
      priority: 'high',
      title: 'Enable monitoring for important pages',
      description: `${summary.unmonitoredImportantPages} important page${summary.unmonitoredImportantPages === 1 ? ' is' : 's are'} not being monitored`,
      site: primarySite,
      cta: 'Monitor',
      route: primarySite?.id ? `sites/${primarySite.id}` : 'sites',
    })
  }

  if (pluginUpdateTotal > 0) {
    actions.push({
      priority: 'medium',
      title: `Update ${pluginUpdateTotal} outdated plugin${pluginUpdateTotal === 1 ? '' : 's'}`,
      description: `${pluginUpdateTotal} plugin update${pluginUpdateTotal === 1 ? ' is' : 's are'} available`,
      site: updateSite,
      cta: 'Review',
      route: updateSite?.id ? `sites/${updateSite.id}` : 'sites',
    })
  }

  if ((summary.unknown || 0) > 0) {
    const unknownSite = recentSites.find((site) => site.status === 'unknown') || primarySite
    actions.push({
      priority: 'low',
      title: 'Check sync freshness',
      description: `${summary.unknown} site${summary.unknown === 1 ? '' : 's'} need fresher sync data`,
      site: unknownSite,
      cta: 'Open',
      route: unknownSite?.id ? `sites/${unknownSite.id}` : 'sites',
    })
  }

  if (!actions.length) {
    actions.push({
      priority: 'low',
      title: 'Review monitoring coverage',
      description: 'Keep key pages monitored and reports ready for clients',
      site: primarySite,
      cta: 'Open',
      route: 'sites',
    })
  }

  return actions.slice(0, 4)
}

function buildRecentActivity({ recentSites, recentChecks, latestAlerts }) {
  const siteActivities = recentSites.slice(0, 2).map((site) => ({
    type: site.status === 'critical' ? 'critical' : 'sync',
    title: `${site.siteName} synced ${site.lastSeenAt ? 'successfully' : 'recently'}`,
    meta: getDomain(site.siteUrl),
    time: site.lastSeenAt,
  }))
  const checkActivities = recentChecks.slice(0, 2).map((check) => ({
    type: check.errorDetected ? 'critical' : 'monitor',
    title: `${check.pageLabel || 'Page'} checked`,
    meta: check.siteName,
    time: check.checkedAt,
  }))
  const alertActivities = latestAlerts.slice(0, 1).map((alert) => ({
    type: alert.severity === 'critical' ? 'critical' : 'warning',
    title: alert.title,
    meta: alert.site?.siteName,
    time: alert.lastSeenAt,
  }))

  return [...siteActivities, ...alertActivities, ...checkActivities]
    .filter((item) => item.title)
    .sort((a, b) => new Date(b.time || 0) - new Date(a.time || 0))
    .slice(0, 4)
}

function buildOperationalInsights({ summary, alertSummary, avgResponse, pluginUpdateTotal, recentSites, recentChecks }) {
  const insights = []
  const criticalSites = summary.critical || 0
  const warningSites = summary.warning || 0
  const staleSites = summary.unknown || 0
  const pageErrors = recentChecks.filter((check) => check.errorDetected).length
  const updateSites = recentSites.filter((site) => (site.pluginUpdatesCount || 0) > 0).length
  const criticalAlerts = alertSummary.criticalOpenCount || 0

  if (criticalSites > 0 || criticalAlerts > 0) {
    const count = Math.max(criticalSites, criticalAlerts)
    insights.push({
      severity: 'critical',
      icon: 'critical',
      title: `Critical risk on ${count} site${count === 1 ? '' : 's'}`,
      detail: 'Needs immediate security hardening',
    })
  }

  if (pageErrors > 0) {
    insights.push({
      severity: 'critical',
      icon: 'warning',
      title: `${pageErrors} page check${pageErrors === 1 ? '' : 's'} returned errors`,
      detail: 'Investigate failing pages',
    })
  }

  if (avgResponse !== null && avgResponse !== undefined) {
    const tone = avgResponse > 2500 ? 'critical' : avgResponse >= 1000 ? 'warning' : 'healthy'
    const note = avgResponse > 2500 ? 'slower than expected' : avgResponse >= 1000 ? 'within acceptable range' : 'fast and responsive'
    insights.push({
      severity: tone,
      icon: 'activity',
      title: `Average response time ${avgResponse} ms`,
      detail: `Pages are ${note}`,
    })
  }

  if (pluginUpdateTotal > 0) {
    insights.push({
      severity: 'warning',
      icon: 'updates',
      title: `${pluginUpdateTotal} plugin update${pluginUpdateTotal === 1 ? '' : 's'} pending`,
      detail: updateSites ? `Update pressure across ${updateSites} site${updateSites === 1 ? '' : 's'}` : 'Update pressure on monitored sites',
    })
  }

  if (staleSites > 0) {
    insights.push({
      severity: 'warning',
      icon: 'sync',
      title: `${staleSites} site${staleSites === 1 ? '' : 's'} with sync freshness concern`,
      detail: 'Awaiting fresh data from the agent',
    })
  }

  if (warningSites > 0 && insights.length < 5) {
    insights.push({
      severity: 'warning',
      icon: 'warning',
      title: `${warningSites} site${warningSites === 1 ? '' : 's'} need attention`,
      detail: 'Review flagged advisories',
    })
  }

  if (!insights.length) {
    insights.push({
      severity: 'healthy',
      icon: 'healthy',
      title: 'All monitored sites are healthy',
      detail: 'No critical operational signals detected',
    })
    if ((alertSummary.resolvedLast24h || 0) > 0) {
      const resolved = alertSummary.resolvedLast24h
      insights.push({
        severity: 'healthy',
        icon: 'healthy',
        title: `${resolved} issue${resolved === 1 ? '' : 's'} resolved in last 24h`,
        detail: 'Recent remediations are working',
      })
    }
  }

  return insights.slice(0, 5)
}

function OperationalInsights({ insights }) {
  return (
    <Section title="Operational Insights" action={<button className="text-button" type="button" onClick={() => setRouteHash('alerts')}>View all</button>} flush>
      <div className="insights-list">
        {insights.map((insight, index) => (
          <div className={`insight-row insight-${insight.severity}`} key={`${insight.title}-${index}`}>
            <span className={`insight-icon dashboard-badge-${insight.severity === 'healthy' ? 'success' : insight.severity}`}>
              <InsightIcon type={insight.icon} />
            </span>
            <div className="insight-text">
              <strong className="insight-title">{insight.title}</strong>
              <span className="insight-detail">{insight.detail}</span>
            </div>
            <span className={`insight-dot insight-dot-${insight.severity}`} />
          </div>
        ))}
      </div>
    </Section>
  )
}

function ProgressRing({ value, label, status = 'healthy', size = 96 }) {
  const normalized = Math.max(0, Math.min(100, Number(value) || 0))
  const r = (size / 2) - 7
  const cx = size / 2
  const circumference = 2 * Math.PI * r
  const offset = circumference * (1 - normalized / 100)
  const color = { healthy: '#2563eb', warning: '#d97706', critical: '#dc2626' }[status] || '#2563eb'
  return (
    <div className="progress-ring-wrap" style={{ width: size, height: size }}>
      <svg viewBox={`0 0 ${size} ${size}`} className="progress-ring-svg" aria-hidden="true">
        <circle cx={cx} cy={cx} r={r} fill="none" stroke="#e9eef8" strokeWidth="7" />
        <circle cx={cx} cy={cx} r={r} fill="none" stroke={color} strokeWidth="7"
          strokeLinecap="round"
          strokeDasharray={`${circumference} ${circumference}`}
          strokeDashoffset={offset}
          transform={`rotate(-90 ${cx} ${cx})`}
        />
      </svg>
      <div className="progress-ring-inner">
        <strong>{normalized}</strong>
        <span>{label}</span>
      </div>
    </div>
  )
}

function DashboardBadge({ variant = 'info', children }) {
  return <span className={`dashboard-badge dashboard-badge-${variant}`}>{children}</span>
}

function HealthOverview({ score, summary, pluginUpdateTotal, avgResponse }) {
  const rows = [
    ['healthy', 'Security Posture', 'Good', 85],
    ['warning', 'Plugin Update Pressure', pluginUpdateTotal ? 'Needs Attention' : 'Good', pluginUpdateTotal ? 60 : 88],
    ['healthy', 'Monitoring Coverage', summary.unmonitoredImportantPages ? 'Review' : 'Good', summary.unmonitoredImportantPages ? 80 : 92],
    ['warning', 'Sync Freshness', summary.unknown ? 'Review' : 'Good', summary.unknown ? 70 : 90],
    ['healthy', 'Page Response Performance', avgResponse && avgResponse > 2500 ? 'Review' : 'Good', avgResponse && avgResponse > 2500 ? 75 : 86],
  ]
  const displayScore = 78

  return (
    <Section title="Website Health Overview" action={<button className="text-button" type="button">View full health report</button>}>
      <div className="health-overview-dashboard">
        <div className="health-score-block">
          <ProgressRing value={displayScore} label="/100" status="healthy" />
          <span>Overall Health Score</span>
          <DashboardBadge variant={displayScore < 70 ? 'critical' : displayScore < 85 ? 'warning' : 'success'}>{displayScore < 70 ? 'Needs attention' : displayScore < 85 ? 'Review' : 'Good'}</DashboardBadge>
        </div>
        <div className="health-breakdown-list">
          {rows.map(([variant, label, status, value]) => (
            <div className="health-breakdown-row" key={label}>
              <span className={`breakdown-icon dashboard-badge-${variant}`}><DashboardIcon type={variant === 'critical' ? 'critical' : variant === 'warning' ? 'warning' : 'healthy'} /></span>
              <strong>{label}</strong>
              <span className="health-progress"><span className="health-progress-track"><i style={{ width: `${value}%` }} /></span></span>
              <span className="health-score-num">{value}</span>
              <DashboardBadge variant={variant === 'healthy' ? 'success' : variant}>{status}</DashboardBadge>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function RecommendedActions({ actions }) {
  const ctaClass = { critical: 'danger-button small', high: 'primary-button small', medium: 'secondary-button small', low: 'secondary-button small' }
  return (
    <Section title="Recommended Actions" action={<button className="text-button" type="button" onClick={() => setRouteHash('alerts')}>View all actions</button>} flush>
      <div className="recommended-actions-list">
        {actions.map((action) => (
          <div className="recommended-action" key={`${action.priority}-${action.title}`}>
            <div className="recommended-action-badge-col">
              <DashboardBadge variant={action.priority}>{action.priority}</DashboardBadge>
            </div>
            <div className="recommended-action-content">
              <strong>{action.title}</strong>
              <p>{action.description}</p>
              {action.site?.siteName && (
                <span className="recommended-action-site-tag">{action.site.siteName}</span>
              )}
            </div>
            <button className={`${ctaClass[action.priority] || 'secondary-button small'} recommended-action-cta`} type="button" onClick={() => setRouteHash(action.route)}>
              {action.cta}
            </button>
          </div>
        ))}
      </div>
    </Section>
  )
}

function MonitoringCoverage({ score, summary, recentSites, recentChecks }) {
  const rows = [
    ['Connected Sites', summary.totalSites || recentSites.length || 0, 'sites'],
    ['Pages Discovered', Math.max(recentChecks.length + (summary.unmonitoredImportantPages || 0), recentChecks.length), 'pages'],
    ['Pages Monitored', recentChecks.length, 'healthy'],
    ['Important Pages Unmonitored', summary.unmonitoredImportantPages || 0, 'critical'],
    ['Sites Synced Last 12h', recentSites.filter((site) => site.lastSeenAt && Date.now() - new Date(site.lastSeenAt).getTime() < 12 * 60 * 60 * 1000).length, 'sync'],
  ]
  return (
    <Section title="Monitoring Coverage" action={<button className="text-button" type="button">View full report</button>}>
      <div className="coverage-card-body">
        <div className="coverage-score-block">
          <ProgressRing value={score} label="%" status={score < 70 ? 'warning' : 'healthy'} />
          <span>Coverage Score</span>
        </div>
        <div className="dashboard-list">
          {rows.map(([label, value, type]) => (
            <div key={label}>
              <span><DashboardIcon type={type} />{label}</span>
              <strong className={type === 'critical' && value > 0 ? 'metric-critical' : ''}>{value}</strong>
            </div>
          ))}
        </div>
      </div>
    </Section>
  )
}

function UpdatePressure({ pluginUpdateTotal, recentSites }) {
  const rows = [
    ['Plugin Updates', pluginUpdateTotal, 'updates'],
    ['Theme Updates', 0, 'updates'],
    ['WordPress Core', 0, 'healthy'],
    ['Sites Needing Updates', recentSites.filter((site) => site.pluginUpdatesCount > 0).length, 'warning'],
  ]
  return (
    <Section title="Update Pressure" action={<button className="text-button" type="button" onClick={() => setRouteHash('sites')}>View updates</button>}>
      <div className="dashboard-list update-pressure-list">
        {rows.map(([label, value, type]) => (
          <div key={label}>
            <span><DashboardIcon type={type} />{label}</span>
            <DashboardBadge variant={value > 0 ? 'warning' : 'success'}>{value}</DashboardBadge>
          </div>
        ))}
      </div>
    </Section>
  )
}

function RecentActivity({ items, compact = false }) {
  return (
    <Section title="Recent Activity" action={<button className="text-button" type="button">View activity</button>}>
      {!items.length ? (
        <EmptyState title="No recent activity" description="Syncs, checks, and findings will appear here." />
      ) : (
        <div className={`activity-list ${compact ? 'activity-list-compact' : ''}`}>
          {items.map((item, index) => (
            <div className="activity-item" key={`${item.title}-${index}`}>
              <span className={`activity-icon activity-icon-${item.type}`}><DashboardIcon type={item.type === 'monitor' ? 'sites' : item.type} /></span>
              <div>
                <p className="activity-title">
                  <strong>{item.title}</strong>
                  {item.meta && <> · <span>{item.meta}</span></>}
                </p>
                <time>{formatRelativeTime(item.time)}</time>
              </div>
            </div>
          ))}
        </div>
      )}
    </Section>
  )
}

function ReportDetailPage({ reportId, request, apiBaseUrl, currentUser }) {
  const [report, setReport] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  const loadReport = useCallback(async () => {
    if (!reportId) return
    setLoading(true)
    setError('')

    try {
      const data = await request(`/api/admin/reports/${reportId}`)
      setReport(data.report)
    } catch (err) {
      setError(err.message)
    } finally {
      setLoading(false)
    }
  }, [reportId, request])

  useEffect(() => {
    loadReport()
  }, [loadReport])

  if (loading && !report) {
    return (
      <section className="page">
        <DetailSkeleton />
      </section>
    )
  }

  const summary = report?.summary || {}
  const canArchive = ['owner', 'admin', 'manager'].includes(currentUser?.role)

  async function archiveReport() {
    if (!window.confirm(`Archive ${report.title}?`)) return
    try {
      await request(`/api/admin/reports/${report.id}`, { method: 'DELETE' })
      setRouteHash('reports')
    } catch (err) {
      setError(err.message)
    }
  }

  async function openPrintableHtml() {
    try {
      const response = await fetch(`${normalizeUrl(apiBaseUrl)}/api/admin/reports/${report.id}/html`, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem(AUTH_TOKEN_STORAGE_KEY) || ''}`,
        },
      })
      if (!response.ok) throw new Error(`HTTP ${response.status} from report HTML export`)
      const html = await response.text()
      const blob = new Blob([html], { type: 'text/html' })
      window.open(URL.createObjectURL(blob), '_blank', 'noopener,noreferrer')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="page">
      <button className="text-button" type="button" onClick={() => setRouteHash('reports')}>
        Back to reports
      </button>
      <ErrorState message={error} />
      {report && (
        <div className="report-detail">
          <section className="report-cover">
            <div>
              <p className="eyebrow">SitePulse by Onset Media</p>
              <h2>{report.title}</h2>
              <p>{summary.client?.name || report.client?.name || 'Client'} · {summary.site?.siteName || report.site?.siteName || 'Client-wide report'}</p>
              <p>{formatDate(report.periodStart)} to {formatDate(report.periodEnd)}</p>
            </div>
            <div className="header-actions no-print">
              <button className="secondary-button" type="button" onClick={() => window.print()}>
                Print / Save as PDF
              </button>
              <button className="secondary-button" type="button" onClick={openPrintableHtml}>
                Printable HTML
              </button>
              {canArchive && <button className="danger-button" type="button" onClick={archiveReport}>Archive</button>}
            </div>
          </section>

          <div className="health-overview-grid">
            <HealthOverviewCard label="Overall health" value={summary.overallHealthStatus || 'unknown'} detail="Report status" status={summary.overallHealthStatus} />
            <HealthOverviewCard label="Open alerts" value={summary.openAlertsCount || 0} detail={`${summary.criticalAlertsCount || 0} critical`} status={summary.criticalAlertsCount ? 'critical' : summary.openAlertsCount ? 'warning' : 'healthy'} />
            <HealthOverviewCard label="Plugin updates" value={summary.pluginUpdateCount || 0} detail="Maintenance pressure" status={summary.pluginUpdateCount ? 'warning' : 'healthy'} />
            <HealthOverviewCard label="Page errors" value={summary.pageErrorsCount || 0} detail={`${summary.pageChecksCount || 0} checks`} status={summary.pageErrorsCount ? 'critical' : 'healthy'} />
            <HealthOverviewCard label="Avg response" value={summary.averageResponseTime ? `${summary.averageResponseTime}ms` : 'n/a'} detail="Monitored pages" status={summary.averageResponseTime > 5000 ? 'critical' : summary.averageResponseTime > 2000 ? 'warning' : 'healthy'} />
          </div>

          <Section title="Executive Summary">
            <p className="report-copy">
              This report summarizes website health, WordPress maintenance, monitored page performance,
              alert activity, and recommended next steps for the selected reporting period.
            </p>
          </Section>

          <Section title="WordPress Health">
            <div className="environment-grid">
              <EnvironmentCard label="WordPress" value={summary.latestWordPressSnapshot?.wordpressVersion || 'No snapshot'} />
              <EnvironmentCard label="PHP" value={summary.latestWordPressSnapshot?.phpVersion || 'No snapshot'} />
              <EnvironmentCard label="Theme" value={summary.latestWordPressSnapshot?.activeThemeName || 'Unknown'} />
              <EnvironmentCard label="Core update" value={summary.coreUpdateAvailable ? 'Available' : 'Not reported'} status={summary.coreUpdateAvailable ? 'warning' : 'healthy'} />
              <EnvironmentCard label="Debug mode" value={summary.debugMode ? 'Enabled' : 'Disabled'} status={summary.debugMode ? 'critical' : 'healthy'} />
              <EnvironmentCard label="File editor" value={summary.fileEditorEnabled ? 'Enabled' : 'Disabled'} status={summary.fileEditorEnabled ? 'warning' : 'healthy'} />
            </div>
          </Section>

          <Section title="Page Monitoring Summary">
            <div className="detail-grid">
              <DetailItem label="Monitored pages" value={summary.monitoredPagesCount || 0} />
              <DetailItem label="Page checks" value={summary.pageChecksCount || 0} />
              <DetailItem label="Page errors" value={summary.pageErrorsCount || 0} />
            </div>
          </Section>

          <Section title="Alerts Summary">
            <div className="detail-grid">
              <DetailItem label="Open alerts" value={summary.openAlertsCount || 0} />
              <DetailItem label="Critical" value={summary.criticalAlertsCount || 0} />
              <DetailItem label="Warnings" value={summary.warningAlertsCount || 0} />
              <DetailItem label="Resolved" value={summary.resolvedAlertsCount || 0} />
            </div>
            <ReportAlertsList alerts={summary.topAlerts || []} />
          </Section>

          <Section title="Activity Summary">
            <p className="report-copy">{summary.activityCount || 0} key activities recorded during this period.</p>
            <ul className="report-list">
              {(summary.keyActivities || []).map((activity) => (
                <li key={activity.id}>{activity.message || activity.action} <span>{formatDate(activity.createdAt)}</span></li>
              ))}
            </ul>
          </Section>

          <Section title="Recommendations">
            <ul className="report-list">
              {(summary.recommendations || []).map((recommendation) => <li key={recommendation}>{recommendation}</li>)}
            </ul>
          </Section>

          <Section title="Next Steps">
            <p className="report-copy">
              Prioritize critical items first, schedule safe update windows, and keep high-value pages under monitoring.
            </p>
          </Section>
        </div>
      )}
    </section>
  )
}

function ReportAlertsList({ alerts }) {
  if (!alerts.length) return <EmptyState title="No report alerts" description="No priority alerts were included in this report." />

  return (
    <div className="priority-issue-list top-gap">
      {alerts.map((alert) => (
        <article key={alert.id} className={`priority-issue priority-${alert.severity}`}>
          <div className="priority-issue-main">
            <AlertSeverityBadge severity={alert.severity} />
            <div>
              <h4>{alert.title}</h4>
              <p>{alert.message || 'No alert message provided.'}</p>
            </div>
          </div>
          <div className="priority-issue-advice">
            <span>Recommended action</span>
            <strong>{alert.recommendation || 'Review and resolve this item.'}</strong>
          </div>
          <div className="priority-issue-meta">
            <span>{formatRelativeTime(alert.lastSeenAt)}</span>
          </div>
        </article>
      ))}
    </div>
  )
}

function UsersPage({ request, apiBaseUrl, hasToken }) {
  const [users, setUsers] = useState([])
  const [form, setForm] = useState({ name: '', email: '', password: '', role: 'viewer' })
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [creating, setCreating] = useState(false)

  const loadUsers = useCallback(async (force = false) => {
    if (!hasToken) return

    setLoading(true)
    setError('')

    try {
      const data = await requestOnce(
        cacheKey('users', apiBaseUrl),
        () => request('/api/admin/users'),
        force,
      )
      writeCache('users', apiBaseUrl, data)
      setUsers(data.users || [])
    } catch (err) {
      setError(err.message)
      const cached = readCache('users', apiBaseUrl)
      if (cached?.data?.users) setUsers(cached.data.users)
    } finally {
      setLoading(false)
    }
  }, [apiBaseUrl, hasToken, request])

  useEffect(() => {
    loadUsers()
  }, [loadUsers])

  async function createUser(event) {
    event.preventDefault()
    setCreating(true)
    setError('')

    try {
      await request('/api/admin/users', {
        method: 'POST',
        body: JSON.stringify(form),
      })
      setForm({ name: '', email: '', password: '', role: 'viewer' })
      await loadUsers(true)
    } catch (err) {
      setError(err.message)
    } finally {
      setCreating(false)
    }
  }

  async function editUser(user) {
    const name = window.prompt('Name', user.name)
    if (name === null) return
    const role = window.prompt('Role: owner, admin, manager, viewer', user.role)
    if (role === null) return
    const isActive = window.confirm('Should this user be active? Click Cancel to deactivate.')

    try {
      await request(`/api/admin/users/${user.id}`, {
        method: 'PATCH',
        body: JSON.stringify({ name, role, isActive }),
      })
      await loadUsers(true)
    } catch (err) {
      setError(err.message)
    }
  }

  async function resetPassword(user) {
    const password = window.prompt(`New password for ${user.email}`)
    if (!password) return

    try {
      await request(`/api/admin/users/${user.id}/reset-password`, {
        method: 'POST',
        body: JSON.stringify({ password }),
      })
      setError('Password reset successfully.')
    } catch (err) {
      setError(err.message)
    }
  }

  return (
    <section className="page">
      <PageHeader
        title="Users"
        description="Manage workspace access for SitePulse team members."
        action={
          <button className="secondary-button" type="button" onClick={() => loadUsers(true)}>
            Refresh
          </button>
        }
      />
      <ErrorState message={error} />
      <div className="split-layout">
        <Section title="Workspace users" meta={loading ? 'Loading...' : `${users.length} users`}>
          {loading && !users.length ? (
            <TableSkeleton rows={5} />
          ) : (
            <UserTable users={users} onEdit={editUser} onResetPassword={resetPassword} />
          )}
        </Section>
        <Section title="Create user">
          <form className="stack-form" onSubmit={createUser}>
            <label>
              Name
              <input value={form.name} onChange={(event) => setForm({ ...form, name: event.target.value })} required />
            </label>
            <label>
              Email
              <input type="email" value={form.email} onChange={(event) => setForm({ ...form, email: event.target.value })} required />
            </label>
            <label>
              Temporary password
              <input type="password" value={form.password} onChange={(event) => setForm({ ...form, password: event.target.value })} required />
            </label>
            <label>
              Role
              <select value={form.role} onChange={(event) => setForm({ ...form, role: event.target.value })}>
                <option value="viewer">Viewer</option>
                <option value="manager">Manager</option>
                <option value="admin">Admin</option>
                <option value="owner">Owner</option>
              </select>
            </label>
            <button className="primary-button" type="submit" disabled={creating}>
              {creating ? 'Creating...' : 'Create User'}
            </button>
          </form>
        </Section>
      </div>
    </section>
  )
}

function UserTable({ users, onEdit, onResetPassword }) {
  if (!users.length) {
    return <EmptyState title="No users" description="Create your first workspace user." />
  }

  return (
    <div className="table-wrap">
      <table>
        <thead>
          <tr>
            <th>User</th>
            <th>Role</th>
            <th>Status</th>
            <th>Last login</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {users.map((user) => (
            <tr key={user.id}>
              <td>
                <strong>{user.name}</strong>
                <span>{user.email}</span>
              </td>
              <td><span className="count-badge">{user.role}</span></td>
              <td><span className={user.isActive ? 'status status-healthy' : 'status status-unknown'}>{user.isActive ? 'active' : 'inactive'}</span></td>
              <td>{formatDate(user.lastLoginAt)}</td>
              <td>
                <div className="row-actions">
                  <button className="secondary-button small" type="button" onClick={() => onEdit(user)}>
                    Edit
                  </button>
                  <button className="secondary-button small" type="button" onClick={() => onResetPassword(user)}>
                    Reset password
                  </button>
                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function SettingsPage({ apiBaseUrl, currentUser, tenant, onSave, onCheckApi, onLogout }) {
  const [form, setForm] = useState({ apiBaseUrl })
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
        description="Manage your local API connection and current SitePulse session."
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
        <Section title="Current Session">
          <div className="detail-grid single-column">
            <DetailItem label="User" value={`${currentUser?.name || 'Unknown'} (${currentUser?.role || 'unknown'})`} />
            <DetailItem label="Email" value={currentUser?.email || 'Unknown'} />
            <DetailItem label="Workspace" value={tenant?.name || currentUser?.tenantId || 'Unknown'} />
          </div>
          <button className="danger-button top-gap" type="button" onClick={onLogout}>
            Logout
          </button>
        </Section>
        <div className="settings-help">
          <h3>Local browser storage</h3>
          <p>
            SitePulse keeps the API URL and your JWT session in localStorage for this MVP. Change
            the seeded password before production use.
          </p>
        </div>
      </div>
    </section>
  )
}

export default App
