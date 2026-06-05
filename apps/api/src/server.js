require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const prisma = require("./lib/prisma");
const { sha256 } = require("./lib/hash");
const {
  upsertFindingAndAlert,
  resolveMissingAlertsForSite,
  resolveAlertByFingerprint,
} = require("./services/alertService");
const {
  generateSiteReport,
  generateClientReport,
  logActivity,
} = require("./services/reportService");

const app = express();
const PORT = process.env.PORT || 4000;
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "onset-media";
const JWT_SECRET = process.env.JWT_SECRET || "change-me";
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN || "7d";
const OWNER_ADMIN_ROLES = ["owner", "admin"];
const MANAGER_WRITE_ROLES = ["owner", "admin", "manager"];

app.use(cors());
app.use(express.json());

app.get("/", (req, res) => {
  res.json({
    service: "SitePulse API",
    status: "running",
    health: "/health",
    agentSync: "/api/agent/sync",
  });
});

app.get("/health", (req, res) => {
  res.json({
    status: "ok",
    service: "SitePulse API",
  });
});

app.post(
  "/api/auth/login",
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const email = requireString(body.email, "email").toLowerCase();
    const password = requireString(body.password, "password");
    const user = await prisma.user.findUnique({
      where: {
        email,
      },
      include: {
        tenant: true,
      },
    });

    if (!user || !user.isActive) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const validPassword = await bcrypt.compare(password, user.passwordHash);

    if (!validPassword) {
      return res.status(401).json({
        error: "Invalid email or password",
      });
    }

    const updatedUser = await prisma.user.update({
      where: {
        id: user.id,
      },
      data: {
        lastLoginAt: new Date(),
      },
    });
    const token = jwt.sign(
      {
        userId: user.id,
        tenantId: user.tenantId,
        role: user.role,
        email: user.email,
      },
      JWT_SECRET,
      {
        expiresIn: JWT_EXPIRES_IN,
      }
    );

    return res.json({
      token,
      user: publicUser({
        ...updatedUser,
        tenant: user.tenant,
      }),
    });
  })
);

app.get(
  "/api/auth/me",
  requireAuth,
  asyncHandler(async (req, res) => {
    const user = await prisma.user.findUnique({
      where: {
        id: req.user.id,
      },
      include: {
        tenant: true,
      },
    });

    return res.json({
      user: publicUser(user),
      tenant: user.tenant,
    });
  })
);

app.post("/api/auth/logout", requireAuth, (req, res) => {
  return res.json({
    loggedOut: true,
  });
});

function toBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function toOptionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

async function loadUserFromAuthorizationHeader(req) {
  const authorization = req.header("authorization") || "";
  const match = authorization.match(/^Bearer\s+(.+)$/i);

  if (!match) {
    return null;
  }

  const payload = jwt.verify(match[1], JWT_SECRET);
  const user = await prisma.user.findUnique({
    where: {
      id: payload.userId,
    },
    include: {
      tenant: true,
    },
  });

  if (!user || !user.isActive) {
    return null;
  }

  return {
    id: user.id,
    tenantId: user.tenantId,
    role: user.role,
    email: user.email,
    name: user.name,
    tenant: user.tenant,
  };
}

async function requireAuth(req, res, next) {
  try {
    const user = await loadUserFromAuthorizationHeader(req);

    if (!user) {
      return res.status(401).json({
        error: "Unauthorized",
      });
    }

    req.user = user;
    req.authMode = "jwt";
    return next();
  } catch {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }
}

async function requireAdminToken(req, res, next) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = req.header("x-sitepulse-admin-token");

  if (adminToken && providedToken && providedToken === adminToken) {
    req.authMode = "admin-token";
    return next();
  }

  return requireAuth(req, res, next);
}

function requireRole(roles) {
  return (req, res, next) => {
    if (req.authMode === "admin-token") {
      return next();
    }

    if (!req.user || !roles.includes(req.user.role)) {
      return res.status(403).json({
        error: "Forbidden",
      });
    }

    return next();
  };
}

function requireString(value, fieldName) {
  const normalized = toOptionalString(value);

  if (!normalized) {
    const error = new Error(`${fieldName} is required`);
    error.statusCode = 400;
    throw error;
  }

  return normalized;
}

function asyncHandler(handler) {
  return async (req, res, next) => {
    try {
      await handler(req, res, next);
    } catch (error) {
      next(error);
    }
  };
}

async function getDefaultTenant() {
  return prisma.tenant.upsert({
    where: {
      slug: DEFAULT_TENANT_SLUG,
    },
    update: {
      name: "Onset Media",
    },
    create: {
      name: "Onset Media",
      slug: DEFAULT_TENANT_SLUG,
    },
  });
}

async function getRequestTenant(req) {
  if (req.user?.tenantId) {
    const tenant = await prisma.tenant.findUnique({
      where: {
        id: req.user.tenantId,
      },
    });

    if (tenant) {
      return tenant;
    }
  }

  return getDefaultTenant();
}

function publicUser(user) {
  return {
    id: user.id,
    name: user.name,
    email: user.email,
    role: user.role,
    tenantId: user.tenantId,
    isActive: user.isActive,
    lastLoginAt: user.lastLoginAt,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
  };
}

function normalizePlugins(plugins) {
  if (!Array.isArray(plugins)) {
    return [];
  }

  return plugins
    .filter((plugin) => plugin && typeof plugin === "object")
    .map((plugin) => ({
      name: toOptionalString(plugin.name) || "Unknown Plugin",
      slug: toOptionalString(plugin.slug) || toOptionalString(plugin.name) || "unknown-plugin",
      version: toOptionalString(plugin.version),
      latestVersion: toOptionalString(plugin.latest_version),
      status: toOptionalString(plugin.status) || "unknown",
      updateAvailable: toBoolean(plugin.update_available),
    }));
}

function includeArchived(req) {
  return String(req.query.includeArchived || "").toLowerCase() === "true";
}

function toOptionalDate(value) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);

  return Number.isNaN(date.getTime()) ? undefined : date;
}

function normalizeInventoryPages(pages) {
  if (!Array.isArray(pages)) {
    return [];
  }

  return pages
    .filter((page) => page && typeof page === "object")
    .map((page) => {
      const title = toOptionalString(page.title) || "Untitled page";
      const url = toOptionalString(page.url);

      if (!url) {
        return null;
      }

      return {
        title,
        url,
        postType: toOptionalString(page.post_type),
        status: toOptionalString(page.status),
        modifiedAt: toOptionalDate(page.modified_at),
        fingerprint: sha256(url.toLowerCase()),
      };
    })
    .filter(Boolean);
}

function calculatePageImportance(page) {
  const haystack = `${page.title} ${page.url}`.toLowerCase();
  const highTerms = [
    "home",
    "contact",
    "service",
    "services",
    "pricing",
    "quote",
    "appointment",
    "booking",
    "checkout",
    "cart",
    "account",
    "login",
    "landing",
  ];
  const lowTerms = ["privacy", "terms", "policy", "blog", "category", "tag", "author"];

  const highMatch = highTerms.find((term) => haystack.includes(term));

  if (highMatch) {
    return {
      importance: "high",
      recommendationReason: `Matches high-priority page signal: ${highMatch}`,
    };
  }

  const lowMatch = lowTerms.find((term) => haystack.includes(term));

  if (lowMatch) {
    return {
      importance: "low",
      recommendationReason: `Matches low-priority content signal: ${lowMatch}`,
    };
  }

  return {
    importance: "normal",
    recommendationReason: "General published page discovered by WordPress Agent.",
  };
}

function calculateSiteStatus({
  coreUpdateAvailable,
  pluginUpdatesCount,
  themeUpdateAvailable,
  debugMode,
  fileEditorEnabled,
}) {
  if (
    coreUpdateAvailable ||
    pluginUpdatesCount > 5 ||
    debugMode ||
    fileEditorEnabled
  ) {
    return "critical";
  }

  if (pluginUpdatesCount > 0 || themeUpdateAvailable) {
    return "warning";
  }

  return "healthy";
}

function addHours(date, hours) {
  return new Date(date.getTime() + hours * 60 * 60 * 1000);
}

function isAgentSyncStale(site, now = new Date()) {
  if (!site.lastSeenAt) {
    return true;
  }

  const intervalHours = site.agentSyncIntervalHours || 12;
  const staleAfterMs = intervalHours * 2 * 60 * 60 * 1000;

  return now.getTime() - new Date(site.lastSeenAt).getTime() > staleAfterMs;
}

const PAGE_ERROR_PATTERNS = [
  "There has been a critical error on this website",
  "Fatal error",
  "Parse error",
  "Warning:",
  "Notice:",
  "Deprecated:",
  "Error establishing a database connection",
  "Briefly unavailable for scheduled maintenance",
  "Allowed memory size exhausted",
];

function requireHttpUrl(value, fieldName) {
  const normalized = requireString(value, fieldName);

  try {
    const url = new URL(normalized);

    if (url.protocol !== "http:" && url.protocol !== "https:") {
      throw new Error("Invalid protocol");
    }

    return url.toString();
  } catch {
    const error = new Error(`${fieldName} must start with http:// or https://`);
    error.statusCode = 400;
    throw error;
  }
}

function requireDate(value, fieldName) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }

  return date;
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function renderReportHtml(report) {
  const summary = report.summary || {};
  const clientName = summary.client?.name || report.client?.name || "Client";
  const siteName = summary.site?.siteName || report.site?.siteName || "Multiple sites";
  const recommendations = summary.recommendations || [];
  const topAlerts = summary.topAlerts || [];

  return `<!doctype html>
<html>
<head>
  <meta charset="utf-8">
  <title>${escapeHtml(report.title)}</title>
  <style>
    body { color: #172033; font-family: Arial, sans-serif; line-height: 1.45; margin: 40px; }
    header { border-bottom: 2px solid #4055d8; margin-bottom: 28px; padding-bottom: 18px; }
    h1, h2, h3 { margin: 0 0 10px; }
    .brand { color: #4055d8; font-weight: 800; text-transform: uppercase; }
    .grid { display: grid; gap: 12px; grid-template-columns: repeat(4, 1fr); margin: 18px 0; }
    .card { border: 1px solid #dfe7f3; border-radius: 8px; padding: 14px; }
    .badge { border-radius: 999px; display: inline-block; font-weight: 700; padding: 5px 9px; text-transform: capitalize; }
    .critical { background: #ffecef; color: #c53445; }
    .warning { background: #fff4dc; color: #b36b00; }
    .healthy { background: #e9f8f1; color: #16845f; }
    table { border-collapse: collapse; margin-top: 8px; width: 100%; }
    th, td { border-bottom: 1px solid #edf1f7; padding: 8px; text-align: left; }
    @media print { body { margin: 24px; } .no-print { display: none; } }
  </style>
</head>
<body>
  <header>
    <div class="brand">SitePulse by Onset Media</div>
    <h1>${escapeHtml(report.title)}</h1>
    <p>${escapeHtml(clientName)} · ${escapeHtml(siteName)}</p>
    <p>${escapeHtml(report.periodStart.toISOString().slice(0, 10))} to ${escapeHtml(report.periodEnd.toISOString().slice(0, 10))}</p>
  </header>
  <section>
    <h2>Executive Summary</h2>
    <div class="grid">
      <div class="card"><strong>Status</strong><br><span class="badge ${escapeHtml(summary.overallHealthStatus || "healthy")}">${escapeHtml(summary.overallHealthStatus || "healthy")}</span></div>
      <div class="card"><strong>Open Alerts</strong><br>${escapeHtml(summary.openAlertsCount || 0)}</div>
      <div class="card"><strong>Plugin Updates</strong><br>${escapeHtml(summary.pluginUpdateCount || 0)}</div>
      <div class="card"><strong>Avg Response</strong><br>${summary.averageResponseTime ? `${escapeHtml(summary.averageResponseTime)}ms` : "n/a"}</div>
    </div>
  </section>
  <section>
    <h2>WordPress Health</h2>
    <p>WordPress: ${escapeHtml(summary.latestWordPressSnapshot?.wordpressVersion || "No snapshot")} · PHP: ${escapeHtml(summary.latestWordPressSnapshot?.phpVersion || "No snapshot")} · Theme: ${escapeHtml(summary.latestWordPressSnapshot?.activeThemeName || "Unknown")}</p>
  </section>
  <section>
    <h2>Page Monitoring</h2>
    <p>${escapeHtml(summary.monitoredPagesCount || 0)} monitored pages, ${escapeHtml(summary.pageChecksCount || 0)} checks, ${escapeHtml(summary.pageErrorsCount || 0)} errors.</p>
  </section>
  <section>
    <h2>Alerts Summary</h2>
    <p>${escapeHtml(summary.criticalAlertsCount || 0)} critical, ${escapeHtml(summary.warningAlertsCount || 0)} warnings, ${escapeHtml(summary.resolvedAlertsCount || 0)} resolved.</p>
    <table><thead><tr><th>Severity</th><th>Issue</th><th>Recommendation</th></tr></thead><tbody>
      ${topAlerts.map((alert) => `<tr><td>${escapeHtml(alert.severity)}</td><td>${escapeHtml(alert.title)}</td><td>${escapeHtml(alert.recommendation || "")}</td></tr>`).join("")}
    </tbody></table>
  </section>
  <section>
    <h2>Recommendations</h2>
    <ul>${recommendations.map((item) => `<li>${escapeHtml(item)}</li>`).join("")}</ul>
  </section>
  <section>
    <h2>Next Steps</h2>
    <p>Review the recommendations above, prioritize critical items, and continue scheduled monitoring.</p>
  </section>
</body>
</html>`;
}

function detectPageError(httpStatus, body, failureMessage) {
  if (failureMessage) {
    return {
      errorDetected: true,
      errorSummary: failureMessage,
    };
  }

  if (httpStatus >= 400) {
    return {
      errorDetected: true,
      errorSummary: `HTTP status ${httpStatus}`,
    };
  }

  const lowerBody = body.toLowerCase();
  const matchedPattern = PAGE_ERROR_PATTERNS.find((pattern) =>
    lowerBody.includes(pattern.toLowerCase())
  );

  if (matchedPattern) {
    return {
      errorDetected: true,
      errorSummary: `Matched error pattern: ${matchedPattern}`,
    };
  }

  return {
    errorDetected: false,
    errorSummary: null,
  };
}

async function runPageCheck(page) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 15000);
  const startedAt = Date.now();
  let httpStatus = null;
  let body = "";
  let failureMessage = null;

  try {
    const response = await fetch(page.url, {
      signal: controller.signal,
    });

    httpStatus = response.status;
    body = await response.text();
  } catch (error) {
    failureMessage =
      error.name === "AbortError"
        ? "Request timed out after 15 seconds"
        : `Request failed: ${error.message}`;
  } finally {
    clearTimeout(timeout);
  }

  const responseTimeMs = Date.now() - startedAt;
  const detection = detectPageError(httpStatus, body, failureMessage);

  return prisma.pageCheck.create({
    data: {
      monitoredPageId: page.id,
      httpStatus,
      responseTimeMs,
      errorDetected: detection.errorDetected,
      errorSummary: detection.errorSummary,
    },
  });
}

async function updateSiteStatusAfterPageChecks(siteId) {
  const site = await prisma.site.findUnique({
    where: {
      id: siteId,
    },
    include: {
      monitoredPages: {
        where: {
          isActive: true,
        },
        include: {
          checks: {
            orderBy: {
              checkedAt: "desc",
            },
            take: 1,
          },
        },
      },
      snapshots: {
        orderBy: {
          createdAt: "desc",
        },
        take: 1,
      },
      alerts: {
        where: {
          severity: "critical",
          status: {
            in: ["open", "acknowledged", "snoozed"],
          },
        },
        take: 1,
      },
    },
  });

  if (!site) {
    return null;
  }

  const hasPageError = site.monitoredPages.some(
    (page) => page.checks[0] && page.checks[0].errorDetected
  );
  const latestSnapshot = site.snapshots[0] || null;
  let nextStatus = site.status;

  if (hasPageError || site.alerts.length > 0) {
    nextStatus = "critical";
  } else if (latestSnapshot) {
    nextStatus = calculateSiteStatus({
      coreUpdateAvailable: latestSnapshot.coreUpdateAvailable,
      pluginUpdatesCount: latestSnapshot.pluginUpdatesCount,
      themeUpdateAvailable: latestSnapshot.themeUpdateAvailable,
      debugMode: latestSnapshot.debugMode,
      fileEditorEnabled: latestSnapshot.fileEditorEnabled,
    });
  } else if (isAgentSyncStale(site)) {
    nextStatus = "warning";
  }

  if (nextStatus === "healthy" && isAgentSyncStale(site)) {
    nextStatus = "warning";
  }

  if (nextStatus !== site.status) {
    await prisma.site.update({
      where: {
        id: siteId,
      },
      data: {
        status: nextStatus,
      },
    });
  }

  return nextStatus;
}

async function runChecksForSitePages(site, { updateSchedule = false } = {}) {
  const pages = await prisma.monitoredPage.findMany({
    where: {
      siteId: site.id,
      isActive: true,
    },
    include: {
      site: {
        select: {
          id: true,
          tenantId: true,
        },
      },
    },
    orderBy: {
      createdAt: "asc",
    },
  });

  const results = await Promise.all(
    pages.map(async (page) => {
      const check = await runPageCheck(page);
      await generatePageCheckAlerts({ page, check });

      return {
        pageId: page.id,
        label: page.label,
        url: page.url,
        check,
      };
    })
  );

  const siteStatus = await updateSiteStatusAfterPageChecks(site.id);

  if (updateSchedule) {
    const now = new Date();

    await prisma.site.update({
      where: {
        id: site.id,
      },
      data: {
        lastPageCheckAt: now,
        nextPageCheckAt: addHours(now, site.pageCheckIntervalHours || 12),
      },
    });
  }

  return {
    siteStatus,
    results,
  };
}

async function refreshStaleSiteStatuses(tenantId) {
  const sites = await prisma.site.findMany({
    where: {
      tenantId,
      isArchived: false,
      status: {
        not: "critical",
      },
    },
    include: {
      alerts: {
        where: {
          severity: "critical",
          status: {
            in: ["open", "acknowledged", "snoozed"],
          },
        },
        take: 1,
      },
    },
  });

  await Promise.all(
    sites
      .filter((site) => site.alerts.length === 0 && isAgentSyncStale(site))
      .map((site) =>
        prisma.site.update({
          where: {
            id: site.id,
          },
          data: {
            status: "warning",
          },
        })
      )
  );
}

function formatSiteListItem(site) {
  const latestSnapshot = site.snapshots[0] || null;

  return {
    id: site.id,
    clientId: site.clientId,
    clientName: site.client.name,
    siteName: site.siteName,
    siteUrl: site.siteUrl,
    status: site.status,
    lastSeenAt: site.lastSeenAt,
    agentSyncIntervalHours: site.agentSyncIntervalHours,
    pageCheckIntervalHours: site.pageCheckIntervalHours,
    lastPageCheckAt: site.lastPageCheckAt,
    nextPageCheckAt: site.nextPageCheckAt,
    latestSnapshot,
    pluginUpdatesCount: latestSnapshot ? latestSnapshot.pluginUpdatesCount : null,
    activeThemeName: latestSnapshot ? latestSnapshot.activeThemeName : null,
    wordpressVersion: latestSnapshot ? latestSnapshot.wordpressVersion : null,
    isArchived: site.isArchived,
    archivedAt: site.archivedAt,
    createdAt: site.createdAt,
    updatedAt: site.updatedAt,
  };
}

async function generateWordPressAlerts({ site, activeTheme, plugins, snapshotFlags }) {
  const activeFingerprints = [];
  const base = {
    tenantId: site.tenantId,
    siteId: site.id,
    source: "wordpress",
  };

  async function addAlert(alert) {
    activeFingerprints.push(alert.fingerprint);
    await upsertFindingAndAlert({
      ...base,
      ...alert,
    });
  }

  if (snapshotFlags.debugMode) {
    await addAlert({
      severity: "critical",
      title: "Debug mode is enabled",
      description: "WP_DEBUG is enabled on this WordPress site.",
      recommendation: "Disable WP_DEBUG in production environments.",
      fingerprint: `site:${site.id}:wordpress:debug-mode`,
    });
  }

  if (snapshotFlags.fileEditorEnabled) {
    await addAlert({
      severity: "critical",
      title: "WordPress file editor is enabled",
      description: "The WordPress theme/plugin file editor is enabled.",
      recommendation: "Set DISALLOW_FILE_EDIT to true in wp-config.php.",
      fingerprint: `site:${site.id}:wordpress:file-editor`,
    });
  }

  if (snapshotFlags.coreUpdateAvailable) {
    await addAlert({
      severity: "warning",
      title: "WordPress core update available",
      description: "A WordPress core update is available.",
      recommendation: "Review and apply the core update after taking a backup.",
      fingerprint: `site:${site.id}:wordpress:core-update`,
    });
  }

  if (snapshotFlags.themeUpdateAvailable) {
    const themeName = toOptionalString(activeTheme.name) || "active-theme";

    await addAlert({
      severity: "warning",
      title: "Active theme update available",
      description: `${themeName} has an update available.`,
      recommendation: "Review and update the active theme after testing.",
      fingerprint: `site:${site.id}:theme:${themeName}:update`,
    });
  }

  const pluginUpdatesCount = plugins.filter((plugin) => plugin.updateAvailable).length;

  if (pluginUpdatesCount > 0) {
    await addAlert({
      severity: "warning",
      title: `${pluginUpdatesCount} plugin update${pluginUpdatesCount === 1 ? "" : "s"} available`,
      description: "One or more WordPress plugins have updates available.",
      recommendation: "Review plugin changelogs, back up the site, and apply updates safely.",
      fingerprint: `site:${site.id}:plugins:updates`,
    });
  }

  await resolveMissingAlertsForSite({
    tenantId: site.tenantId,
    siteId: site.id,
    source: "wordpress",
    activeFingerprints,
  });
}

async function generatePageCheckAlerts({ page, check }) {
  const activeFingerprints = [];
  const possibleFingerprints = [
    `site:${page.siteId}:page:${page.id}:http-error`,
    `site:${page.siteId}:page:${page.id}:content-error`,
    `site:${page.siteId}:page:${page.id}:slow`,
  ];
  const base = {
    tenantId: page.site.tenantId,
    siteId: page.siteId,
    source: "page-monitor",
  };

  async function addAlert(alert) {
    activeFingerprints.push(alert.fingerprint);
    await upsertFindingAndAlert({
      ...base,
      ...alert,
    });
  }

  if (check.httpStatus >= 500) {
    await addAlert({
      severity: "critical",
      title: `${page.label} returned HTTP ${check.httpStatus}`,
      description: `${page.url} returned a server error.`,
      recommendation: "Investigate hosting, application logs, and recent deployments.",
      fingerprint: `site:${page.siteId}:page:${page.id}:http-error`,
    });
  } else if (check.httpStatus === 404) {
    await addAlert({
      severity: "warning",
      title: `${page.label} returned HTTP 404`,
      description: `${page.url} was not found.`,
      recommendation: "Confirm the URL is correct or restore the missing page.",
      fingerprint: `site:${page.siteId}:page:${page.id}:http-error`,
    });
  }

  if (check.errorDetected && check.errorSummary && !String(check.errorSummary).startsWith("HTTP status")) {
    await addAlert({
      severity: "critical",
      title: `${page.label} has page content errors`,
      description: check.errorSummary,
      recommendation: "Inspect the page output and WordPress/PHP logs.",
      fingerprint: `site:${page.siteId}:page:${page.id}:content-error`,
    });
  }

  if (check.responseTimeMs > 5000) {
    await addAlert({
      severity: "warning",
      title: `${page.label} is responding slowly`,
      description: `${page.url} responded in ${check.responseTimeMs}ms.`,
      recommendation: "Review hosting performance, caching, database load, and third-party requests.",
      fingerprint: `site:${page.siteId}:page:${page.id}:slow`,
    });
  }

  await Promise.all(
    possibleFingerprints
      .filter((fingerprint) => !activeFingerprints.includes(fingerprint))
      .map((fingerprint) =>
        resolveAlertByFingerprint({
          tenantId: page.site.tenantId,
          fingerprint,
        })
      )
  );
}

async function syncPageInventory({ site, pages }) {
  const normalizedPages = normalizeInventoryPages(pages);

  if (!normalizedPages.length) {
    return {
      discovered: 0,
      newUnmonitored: 0,
    };
  }

  const now = new Date();
  const monitoredPages = await prisma.monitoredPage.findMany({
    where: {
      siteId: site.id,
    },
    select: {
      url: true,
    },
  });
  const monitoredUrls = new Set(
    monitoredPages.map((page) => page.url.trim().toLowerCase())
  );
  const activeFingerprints = normalizedPages.map((page) => page.fingerprint);
  let newUnmonitored = 0;

  for (const page of normalizedPages) {
    const existing = await prisma.sitePageInventory.findUnique({
      where: {
        siteId_fingerprint: {
          siteId: site.id,
          fingerprint: page.fingerprint,
        },
      },
    });
    const importance = calculatePageImportance(page);
    const isMonitored = monitoredUrls.has(page.url.trim().toLowerCase());
    const inventoryPage = await prisma.sitePageInventory.upsert({
      where: {
        siteId_fingerprint: {
          siteId: site.id,
          fingerprint: page.fingerprint,
        },
      },
      update: {
        title: page.title,
        url: page.url,
        postType: page.postType,
        status: page.status,
        modifiedAt: page.modifiedAt,
        importance: importance.importance,
        recommendationReason: importance.recommendationReason,
        isMonitored,
        lastSeenAt: now,
        isActive: true,
      },
      create: {
        tenantId: site.tenantId,
        siteId: site.id,
        title: page.title,
        url: page.url,
        postType: page.postType,
        status: page.status,
        modifiedAt: page.modifiedAt,
        importance: importance.importance,
        recommendationReason: importance.recommendationReason,
        isMonitored,
        fingerprint: page.fingerprint,
      },
    });

    if (!existing && !inventoryPage.isMonitored) {
      newUnmonitored += 1;
      await upsertFindingAndAlert({
        tenantId: site.tenantId,
        siteId: site.id,
        source: "page-discovery",
        severity: inventoryPage.importance === "high" ? "warning" : "info",
        title: "New unmonitored page detected",
        description: `${inventoryPage.title} was discovered but is not monitored.`,
        recommendation:
          "Review and add this page to monitoring if it is important for leads, sales, or customer experience.",
        fingerprint: `site:${site.id}:page-inventory:${inventoryPage.fingerprint}:unmonitored`,
      });
    }
  }

  await prisma.sitePageInventory.updateMany({
    where: {
      siteId: site.id,
      fingerprint: {
        notIn: activeFingerprints,
      },
      isActive: true,
    },
    data: {
      isActive: false,
    },
  });

  return {
    discovered: normalizedPages.length,
    newUnmonitored,
  };
}

app.get(
  "/api/admin/reports",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const where = {
      tenantId: tenant.id,
      status: {
        not: "archived",
      },
    };

    if (req.query.clientId) where.clientId = String(req.query.clientId);
    if (req.query.siteId) where.siteId = String(req.query.siteId);
    if (req.query.reportType) where.reportType = String(req.query.reportType);

    const reports = await prisma.report.findMany({
      where,
      orderBy: { createdAt: "desc" },
      include: {
        client: { select: { id: true, name: true } },
        site: { select: { id: true, siteName: true, siteUrl: true } },
      },
    });

    return res.json({ reports });
  })
);

app.post(
  "/api/admin/reports/site",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const report = await generateSiteReport({
      tenantId: tenant.id,
      siteId: requireString(body.siteId, "siteId"),
      periodStart: requireDate(body.periodStart, "periodStart"),
      periodEnd: requireDate(body.periodEnd, "periodEnd"),
      title: toOptionalString(body.title),
      createdBy: req.user,
    });

    return res.status(201).json({ report });
  })
);

app.post(
  "/api/admin/reports/client",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const report = await generateClientReport({
      tenantId: tenant.id,
      clientId: requireString(body.clientId, "clientId"),
      periodStart: requireDate(body.periodStart, "periodStart"),
      periodEnd: requireDate(body.periodEnd, "periodEnd"),
      title: toOptionalString(body.title),
      createdBy: req.user,
    });

    return res.status(201).json({ report });
  })
);

app.get(
  "/api/admin/reports/:id",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const report = await prisma.report.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        site: true,
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    await logActivity({
      tenantId: tenant.id,
      user: req.user,
      action: "report.viewed",
      entityType: "report",
      entityId: report.id,
      message: `Viewed report: ${report.title}`,
    });

    return res.json({ report });
  })
);

app.get(
  "/api/admin/reports/:id/html",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const report = await prisma.report.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        site: true,
      },
    });

    if (!report) {
      return res.status(404).send("Report not found");
    }

    await logActivity({
      tenantId: tenant.id,
      user: req.user,
      action: "report.exported",
      entityType: "report",
      entityId: report.id,
      message: `Exported report HTML: ${report.title}`,
    });

    res.setHeader("Content-Type", "text/html; charset=utf-8");
    return res.send(renderReportHtml(report));
  })
);

app.delete(
  "/api/admin/reports/:id",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const report = await prisma.report.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!report) {
      return res.status(404).json({ error: "Report not found" });
    }

    const archivedReport = await prisma.report.update({
      where: { id: report.id },
      data: { status: "archived" },
    });

    await logActivity({
      tenantId: tenant.id,
      user: req.user,
      action: "report.archived",
      entityType: "report",
      entityId: report.id,
      message: `Archived report: ${report.title}`,
    });

    return res.json({ report: archivedReport, archived: true });
  })
);

app.get(
  "/api/admin/users",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const users = await prisma.user.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        createdAt: "desc",
      },
    });

    return res.json({
      users: users.map(publicUser),
    });
  })
);

app.post(
  "/api/admin/users",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const role = toOptionalString(body.role) || "viewer";
    const allowedRoles = ["owner", "admin", "manager", "viewer"];

    if (!allowedRoles.includes(role)) {
      return res.status(400).json({
        error: "Invalid role",
      });
    }

    const password = requireString(body.password, "password");
    const user = await prisma.user.create({
      data: {
        tenantId: tenant.id,
        name: requireString(body.name, "name"),
        email: requireString(body.email, "email").toLowerCase(),
        passwordHash: await bcrypt.hash(password, 12),
        role,
        isActive: true,
      },
    });

    return res.status(201).json({
      user: publicUser(user),
    });
  })
);

app.patch(
  "/api/admin/users/:id",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const existing = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    const data = {};
    if (body.name !== undefined) data.name = requireString(body.name, "name");
    if (body.role !== undefined) {
      const role = requireString(body.role, "role");
      if (!["owner", "admin", "manager", "viewer"].includes(role)) {
        return res.status(400).json({
          error: "Invalid role",
        });
      }
      data.role = role;
    }
    if (body.isActive !== undefined) data.isActive = Boolean(body.isActive);

    const user = await prisma.user.update({
      where: {
        id: existing.id,
      },
      data,
    });

    return res.json({
      user: publicUser(user),
    });
  })
);

app.post(
  "/api/admin/users/:id/reset-password",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const existing = await prisma.user.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "User not found",
      });
    }

    await prisma.user.update({
      where: {
        id: existing.id,
      },
      data: {
        passwordHash: await bcrypt.hash(requireString(body.password, "password"), 12),
      },
    });

    return res.json({
      passwordReset: true,
    });
  })
);

app.get(
  "/api/admin/clients",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const clients = await prisma.client.findMany({
      where: {
        tenantId: tenant.id,
        ...(includeArchived(req) ? {} : { isArchived: false }),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            sites: {
              where: {
                isArchived: false,
              },
            },
          },
        },
      },
    });

    res.json({
      clients: clients.map((client) => ({
        id: client.id,
        name: client.name,
        contactPerson: client.contactPerson,
        email: client.email,
        phone: client.phone,
        notes: client.notes,
        isArchived: client.isArchived,
        archivedAt: client.archivedAt,
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        sitesCount: client._count.sites,
      })),
    });
  })
);

app.patch(
  "/api/admin/clients/:id",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const existing = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Client not found",
      });
    }

    const client = await prisma.client.update({
      where: {
        id: existing.id,
      },
      data: {
        name: body.name !== undefined ? requireString(body.name, "name") : undefined,
        contactPerson:
          body.contactPerson !== undefined ? toOptionalString(body.contactPerson) || null : undefined,
        email: body.email !== undefined ? toOptionalString(body.email) || null : undefined,
        phone: body.phone !== undefined ? toOptionalString(body.phone) || null : undefined,
        notes: body.notes !== undefined ? toOptionalString(body.notes) || null : undefined,
      },
    });

    return res.json({
      client,
    });
  })
);

app.post(
  "/api/admin/clients/:id/archive",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const client = await prisma.client.updateMany({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    if (client.count === 0) {
      return res.status(404).json({
        error: "Client not found",
      });
    }

    return res.json({
      archived: true,
    });
  })
);

app.post(
  "/api/admin/clients/:id/restore",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const client = await prisma.client.updateMany({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    if (client.count === 0) {
      return res.status(404).json({
        error: "Client not found",
      });
    }

    return res.json({
      restored: true,
    });
  })
);

app.delete(
  "/api/admin/clients/:id",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const client = await prisma.client.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      include: {
        _count: {
          select: {
            sites: {
              where: {
                isArchived: false,
              },
            },
          },
        },
      },
    });

    if (!client) {
      return res.status(404).json({
        error: "Client not found",
      });
    }

    if (client._count.sites > 0 && String(req.query.force) !== "true") {
      return res.status(400).json({
        error: "Client has active sites. Archive/delete those sites first or retry with ?force=true.",
      });
    }

    await prisma.client.delete({
      where: {
        id: client.id,
      },
    });

    return res.json({
      deleted: true,
    });
  })
);

app.post(
  "/api/admin/clients",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const tenant = await getRequestTenant(req);

    const client = await prisma.client.create({
      data: {
        tenantId: tenant.id,
        name: requireString(body.name, "name"),
        contactPerson: toOptionalString(body.contactPerson),
        email: toOptionalString(body.email),
        phone: toOptionalString(body.phone),
        notes: toOptionalString(body.notes),
      },
    });

    res.status(201).json({
      client,
    });
  })
);

app.get(
  "/api/admin/dashboard-summary",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    await refreshStaleSiteStatuses(tenant.id);
    const [totalSites, statusCounts, recentlySyncedSites, unmonitoredImportantPages] = await Promise.all([
      prisma.site.count({
        where: {
          tenantId: tenant.id,
          isArchived: false,
        },
      }),
      prisma.site.groupBy({
        by: ["status"],
        where: {
          tenantId: tenant.id,
          isArchived: false,
        },
        _count: {
          status: true,
        },
      }),
      prisma.site.findMany({
        where: {
          tenantId: tenant.id,
          isArchived: false,
          lastSeenAt: {
            not: null,
          },
        },
        orderBy: {
          lastSeenAt: "desc",
        },
        take: 6,
        include: {
          client: {
            select: {
              id: true,
              name: true,
            },
          },
          snapshots: {
            orderBy: {
              createdAt: "desc",
            },
            take: 1,
          },
        },
      }),
      prisma.sitePageInventory.count({
        where: {
          tenantId: tenant.id,
          importance: "high",
          isMonitored: false,
          isActive: true,
          site: {
            isArchived: false,
          },
        },
      }),
    ]);

    const counts = {
      healthy: 0,
      warning: 0,
      critical: 0,
      unknown: 0,
    };

    statusCounts.forEach((item) => {
      const status = item.status || "unknown";

      if (Object.prototype.hasOwnProperty.call(counts, status)) {
        counts[status] = item._count.status;
      } else {
        counts.unknown += item._count.status;
      }
    });

    res.json({
      totalSites,
      healthy: counts.healthy,
      warning: counts.warning,
      critical: counts.critical,
      unknown: counts.unknown,
      unmonitoredImportantPages,
      recentlySyncedSites: recentlySyncedSites.map(formatSiteListItem),
    });
  })
);

app.get(
  "/api/admin/alerts/summary",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [openCount, criticalOpenCount, warningOpenCount, resolvedLast24h, latestOpenAlerts] =
      await Promise.all([
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            site: {
              isArchived: false,
            },
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
        }),
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            site: {
              isArchived: false,
            },
            severity: "critical",
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
        }),
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            site: {
              isArchived: false,
            },
            severity: "warning",
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
        }),
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            site: {
              isArchived: false,
            },
            status: "resolved",
            resolvedAt: {
              gte: since,
            },
          },
        }),
        prisma.alert.findMany({
          where: {
            tenantId: tenant.id,
            site: {
              isArchived: false,
            },
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
          orderBy: {
            lastSeenAt: "desc",
          },
          take: 8,
          include: {
            site: {
              select: {
                id: true,
                siteName: true,
                siteUrl: true,
              },
            },
          },
        }),
      ]);

    res.json({
      openCount,
      criticalOpenCount,
      warningOpenCount,
      resolvedLast24h,
      latestOpenAlerts,
    });
  })
);

app.get(
  "/api/admin/alerts",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const where = {
      tenantId: tenant.id,
      site: {
        isArchived: false,
      },
    };

    if (req.query.status) {
      where.status = String(req.query.status);
    }

    if (req.query.severity) {
      where.severity = String(req.query.severity);
    }

    if (req.query.source) {
      where.source = String(req.query.source);
    }

    if (req.query.siteId) {
      where.siteId = String(req.query.siteId);
    }

    const alerts = await prisma.alert.findMany({
      where,
      orderBy: {
        lastSeenAt: "desc",
      },
      include: {
        site: {
          select: {
            id: true,
            siteName: true,
            siteUrl: true,
          },
        },
      },
    });

    res.json({
      alerts,
    });
  })
);

app.get(
  "/api/admin/alerts/:id",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const alert = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      include: {
        site: true,
      },
    });

    if (!alert) {
      return res.status(404).json({
        error: "Alert not found",
      });
    }

    return res.json({
      alert,
    });
  })
);

app.post(
  "/api/admin/alerts/:id/acknowledge",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const existing = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Alert not found",
      });
    }

    const alert = await prisma.alert.update({
      where: {
        id: existing.id,
      },
      data: {
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: req.user?.email || "admin",
      },
    });

    return res.json({
      alert,
    });
  })
);

app.post(
  "/api/admin/alerts/:id/resolve",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const existing = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Alert not found",
      });
    }

    const alert = await prisma.alert.update({
      where: {
        id: existing.id,
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });

    await prisma.finding.updateMany({
      where: {
        tenantId: tenant.id,
        fingerprint: alert.fingerprint,
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });

    return res.json({
      alert,
    });
  })
);

app.post(
  "/api/admin/alerts/:id/snooze",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const hours = Number(body.hours || 24);
    const snoozedUntil = new Date(Date.now() + Math.max(1, hours) * 60 * 60 * 1000);
    const existing = await prisma.alert.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Alert not found",
      });
    }

    const alert = await prisma.alert.update({
      where: {
        id: existing.id,
      },
      data: {
        status: "snoozed",
        snoozedUntil,
      },
    });

    return res.json({
      alert,
    });
  })
);

app.get(
  "/api/admin/sites",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    await refreshStaleSiteStatuses(tenant.id);
    const sites = await prisma.site.findMany({
      where: {
        tenantId: tenant.id,
        ...(includeArchived(req) ? {} : { isArchived: false }),
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        client: {
          select: {
            id: true,
            name: true,
          },
        },
        snapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 1,
        },
      },
    });

    res.json({
      sites: sites.map(formatSiteListItem),
    });
  })
);

app.post(
  "/api/admin/sites",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const tenant = await getRequestTenant(req);
    const clientId = requireString(body.clientId, "clientId");
    const siteName = requireString(body.siteName, "siteName");
    const siteUrl = requireString(body.siteUrl, "siteUrl");
    const apiKey = crypto.randomBytes(32).toString("hex");
    const client = await prisma.client.findFirst({
      where: {
        id: clientId,
        tenantId: tenant.id,
        isArchived: false,
      },
    });

    if (!client) {
      return res.status(400).json({
        error: "Client not found",
      });
    }

    const site = await prisma.site.create({
      data: {
        tenantId: tenant.id,
        clientId,
        siteName,
        siteUrl,
        apiKeyHash: sha256(apiKey),
        status: "unknown",
        agentSyncIntervalHours: 12,
        pageCheckIntervalHours: 12,
      },
    });

    res.status(201).json({
      site,
      apiKey,
    });
  })
);

app.patch(
  "/api/admin/sites/:id",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const existing = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!existing) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const data = {};

    if (body.siteName !== undefined) data.siteName = requireString(body.siteName, "siteName");
    if (body.siteUrl !== undefined) data.siteUrl = requireString(body.siteUrl, "siteUrl");

    if (body.clientId !== undefined) {
      const clientId = requireString(body.clientId, "clientId");
      const client = await prisma.client.findFirst({
        where: {
          id: clientId,
          tenantId: tenant.id,
        },
      });

      if (!client) {
        return res.status(400).json({
          error: "Client not found",
        });
      }

      data.clientId = clientId;
    }

    if (body.agentSyncIntervalHours !== undefined) {
      data.agentSyncIntervalHours = Math.max(1, Number(body.agentSyncIntervalHours) || 12);
    }

    if (body.pageCheckIntervalHours !== undefined) {
      data.pageCheckIntervalHours = Math.max(1, Number(body.pageCheckIntervalHours) || 12);
    }

    const site = await prisma.site.update({
      where: {
        id: existing.id,
      },
      data,
    });

    return res.json({
      site,
    });
  })
);

app.post(
  "/api/admin/sites/:id/archive",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.updateMany({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      data: {
        isArchived: true,
        archivedAt: new Date(),
      },
    });

    if (site.count === 0) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    return res.json({
      archived: true,
    });
  })
);

app.post(
  "/api/admin/sites/:id/restore",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.updateMany({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      data: {
        isArchived: false,
        archivedAt: null,
      },
    });

    if (site.count === 0) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    return res.json({
      restored: true,
    });
  })
);

app.delete(
  "/api/admin/sites/:id",
  requireAdminToken,
  requireRole(OWNER_ADMIN_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);

    if (String(req.query.confirm) !== "true") {
      return res.status(400).json({
        error: "Permanent site delete requires ?confirm=true",
      });
    }

    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    await prisma.site.delete({
      where: {
        id: site.id,
      },
    });

    return res.json({
      deleted: true,
    });
  })
);

app.get(
  "/api/admin/sites/:id",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      include: {
        client: true,
        plugins: {
          orderBy: {
            name: "asc",
          },
        },
        snapshots: {
          orderBy: {
            createdAt: "desc",
          },
          take: 10,
        },
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const { snapshots, ...siteDetails } = site;

    return res.json({
      site: {
        ...siteDetails,
        latestSnapshot: snapshots[0] || null,
        snapshots,
      },
    });
  })
);

app.get(
  "/api/admin/sites/:id/discovered-pages",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const where = {
      siteId: site.id,
    };

    if (req.query.importance) {
      where.importance = String(req.query.importance);
    }

    if (String(req.query.unmonitored || "").toLowerCase() === "true") {
      where.isMonitored = false;
    }

    if (String(req.query.active || "").toLowerCase() === "true") {
      where.isActive = true;
    }

    const pages = await prisma.sitePageInventory.findMany({
      where,
      orderBy: [
        {
          importance: "asc",
        },
        {
          firstSeenAt: "desc",
        },
      ],
    });

    return res.json({
      pages,
    });
  })
);

app.post(
  "/api/admin/sites/:id/discovered-pages/add-to-monitoring",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const pageInventoryIds = Array.isArray(body.pageInventoryIds)
      ? body.pageInventoryIds.filter((id) => typeof id === "string")
      : [];

    if (!pageInventoryIds.length) {
      return res.status(400).json({
        error: "pageInventoryIds is required",
      });
    }

    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const inventoryPages = await prisma.sitePageInventory.findMany({
      where: {
        siteId: site.id,
        id: {
          in: pageInventoryIds,
        },
      },
    });
    const createdPages = [];

    for (const inventoryPage of inventoryPages) {
      let monitoredPage = await prisma.monitoredPage.findFirst({
        where: {
          siteId: site.id,
          url: inventoryPage.url,
        },
      });

      if (!monitoredPage) {
        monitoredPage = await prisma.monitoredPage.create({
          data: {
            siteId: site.id,
            label: inventoryPage.title,
            url: inventoryPage.url,
          },
        });
        createdPages.push(monitoredPage);
      }

      await prisma.sitePageInventory.update({
        where: {
          id: inventoryPage.id,
        },
        data: {
          isMonitored: true,
        },
      });
    }

    return res.status(201).json({
      createdPages,
    });
  })
);

app.post(
  "/api/admin/sites/:id/discover-pages",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const pages = await prisma.sitePageInventory.findMany({
      where: {
        siteId: site.id,
      },
      orderBy: {
        firstSeenAt: "desc",
      },
    });

    if (!pages.length) {
      return res.json({
        message: "No discovered pages yet. Run WordPress Agent sync first.",
        pages: [],
      });
    }

    return res.json({
      pages,
    });
  })
);

app.get(
  "/api/admin/sites/:id/pages",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const pages = await prisma.monitoredPage.findMany({
      where: {
        siteId: req.params.id,
      },
      orderBy: {
        createdAt: "asc",
      },
      include: {
        checks: {
          orderBy: {
            checkedAt: "desc",
          },
          take: 1,
        },
      },
    });

    return res.json({
      pages: pages.map((page) => {
        const { checks, ...pageDetails } = page;

        return {
          ...pageDetails,
          latestCheck: checks[0] || null,
        };
      }),
    });
  })
);

app.post(
  "/api/admin/sites/:id/pages",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const page = await prisma.monitoredPage.create({
      data: {
        siteId: site.id,
        label: requireString(body.label, "label"),
        url: requireHttpUrl(body.url, "url"),
      },
    });

    await prisma.sitePageInventory.updateMany({
      where: {
        siteId: site.id,
        url: page.url,
      },
      data: {
        isMonitored: true,
      },
    });

    return res.status(201).json({
      page,
    });
  })
);

app.delete(
  "/api/admin/pages/:pageId",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const page = await prisma.monitoredPage.findFirst({
      where: {
        id: req.params.pageId,
        site: {
          tenantId: tenant.id,
        },
      },
      select: {
        id: true,
        siteId: true,
        url: true,
      },
    });

    if (!page) {
      return res.status(404).json({
        error: "Monitored page not found",
      });
    }

    await prisma.monitoredPage.delete({
      where: {
        id: req.params.pageId,
      },
    });

    const remaining = await prisma.monitoredPage.count({
      where: {
        siteId: page.siteId,
        url: page.url,
      },
    });

    if (remaining === 0) {
      await prisma.sitePageInventory.updateMany({
        where: {
          siteId: page.siteId,
          url: page.url,
        },
        data: {
          isMonitored: false,
        },
      });
    }

    return res.json({
      deleted: true,
    });
  })
);

app.post(
  "/api/admin/pages/:pageId/check",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const page = await prisma.monitoredPage.findFirst({
      where: {
        id: req.params.pageId,
        site: {
          tenantId: tenant.id,
        },
      },
      include: {
        site: {
          select: {
            id: true,
            tenantId: true,
            siteName: true,
          },
        },
      },
    });

    if (!page) {
      return res.status(404).json({
        error: "Monitored page not found",
      });
    }

    const check = await runPageCheck(page);
    await generatePageCheckAlerts({ page, check });
    const siteStatus = await updateSiteStatusAfterPageChecks(page.siteId);

    return res.json({
      page: {
        id: page.id,
        label: page.label,
        url: page.url,
        siteId: page.siteId,
        siteName: page.site.siteName,
      },
      check,
      siteStatus,
    });
  })
);

app.post(
  "/api/admin/sites/:id/check-pages",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const site = await prisma.site.findFirst({
      where: {
        id: req.params.id,
        tenantId: tenant.id,
      },
      select: {
        id: true,
      },
    });

    if (!site) {
      return res.status(404).json({
        error: "Site not found",
      });
    }

    const { results, siteStatus } = await runChecksForSitePages(site);

    return res.json({
      checked: results.length,
      errors: results.filter((result) => result.check.errorDetected).length,
      siteStatus,
      results,
    });
  })
);

app.get(
  "/api/admin/scheduler/due",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const now = new Date();
    const sites = await prisma.site.findMany({
      where: {
        tenantId: tenant.id,
        isArchived: false,
      },
      include: {
        monitoredPages: {
          where: {
            isActive: true,
          },
          select: {
            id: true,
          },
        },
      },
      orderBy: {
        siteName: "asc",
      },
    });

    const pageCheckSitesDue = sites.filter(
      (site) =>
        site.monitoredPages.length > 0 &&
        (!site.nextPageCheckAt || new Date(site.nextPageCheckAt) <= now)
    );
    const staleAgentSyncSites = sites.filter((site) => {
      if (!site.lastSeenAt) {
        return true;
      }

      const staleAfterMs = (site.agentSyncIntervalHours || 12) * 60 * 60 * 1000;

      return now.getTime() - new Date(site.lastSeenAt).getTime() > staleAfterMs;
    });

    return res.json({
      pageCheckSitesDue: pageCheckSitesDue.map((site) => ({
        id: site.id,
        siteName: site.siteName,
        siteUrl: site.siteUrl,
        nextPageCheckAt: site.nextPageCheckAt,
        pageCheckIntervalHours: site.pageCheckIntervalHours,
        activeMonitoredPagesCount: site.monitoredPages.length,
      })),
      staleAgentSyncSites: staleAgentSyncSites.map((site) => ({
        id: site.id,
        siteName: site.siteName,
        siteUrl: site.siteUrl,
        lastSeenAt: site.lastSeenAt,
        agentSyncIntervalHours: site.agentSyncIntervalHours,
      })),
    });
  })
);

app.post(
  "/api/admin/scheduler/run-page-checks",
  requireAdminToken,
  requireRole(MANAGER_WRITE_ROLES),
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const now = new Date();
    const sites = await prisma.site.findMany({
      where: {
        tenantId: tenant.id,
        isArchived: false,
        monitoredPages: {
          some: {
            isActive: true,
          },
        },
        OR: [
          {
            nextPageCheckAt: null,
          },
          {
            nextPageCheckAt: {
              lte: now,
            },
          },
        ],
      },
      orderBy: {
        siteName: "asc",
      },
    });

    let pagesChecked = 0;
    let errors = 0;

    for (const site of sites) {
      const { results } = await runChecksForSitePages(site, {
        updateSchedule: true,
      });

      pagesChecked += results.length;
      errors += results.filter((result) => result.check.errorDetected).length;
    }

    return res.json({
      sitesChecked: sites.length,
      pagesChecked,
      errors,
    });
  })
);

app.get(
  "/api/admin/page-checks/recent",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getRequestTenant(req);
    const checks = await prisma.pageCheck.findMany({
      where: {
        monitoredPage: {
          site: {
            tenantId: tenant.id,
            isArchived: false,
          },
        },
      },
      orderBy: {
        checkedAt: "desc",
      },
      take: 20,
      include: {
        monitoredPage: {
          include: {
            site: {
              select: {
                id: true,
                siteName: true,
                siteUrl: true,
              },
            },
          },
        },
      },
    });

    return res.json({
      checks: checks.map((check) => ({
        id: check.id,
        monitoredPageId: check.monitoredPageId,
        pageLabel: check.monitoredPage.label,
        pageUrl: check.monitoredPage.url,
        siteId: check.monitoredPage.site.id,
        siteName: check.monitoredPage.site.siteName,
        siteUrl: check.monitoredPage.site.siteUrl,
        httpStatus: check.httpStatus,
        responseTimeMs: check.responseTimeMs,
        errorDetected: check.errorDetected,
        errorSummary: check.errorSummary,
        checkedAt: check.checkedAt,
      })),
    });
  })
);

app.post("/api/agent/sync", async (req, res) => {
  try {
    const apiKey = req.header("x-sitepulse-api-key");

    if (!apiKey) {
      return res.status(401).json({
        error: "Missing API key",
      });
    }

    const site = await prisma.site.findFirst({
      where: {
        apiKeyHash: sha256(apiKey),
      },
    });

    if (!site) {
      return res.status(401).json({
        error: "Invalid API key",
      });
    }

    const body = req.body && typeof req.body === "object" ? req.body : {};
    const activeTheme =
      body.active_theme && typeof body.active_theme === "object"
        ? body.active_theme
        : {};
    const plugins = normalizePlugins(body.plugins);
    const pluginUpdatesCount = plugins.filter(
      (plugin) => plugin.updateAvailable
    ).length;
    const coreUpdateAvailable = toBoolean(body.core_update_available);
    const themeUpdateAvailable = toBoolean(activeTheme.update_available);
    const debugMode = toBoolean(body.debug_mode);
    const fileEditorEnabled = toBoolean(body.file_editor_enabled);
    const status = calculateSiteStatus({
      coreUpdateAvailable,
      pluginUpdatesCount,
      themeUpdateAvailable,
      debugMode,
      fileEditorEnabled,
    });

    const result = await prisma.$transaction(async (tx) => {
      const snapshot = await tx.siteSnapshot.create({
        data: {
          siteId: site.id,
          wordpressVersion: toOptionalString(body.wordpress_version),
          phpVersion: toOptionalString(body.php_version),
          mysqlVersion: toOptionalString(body.mysql_version),
          activeThemeName: toOptionalString(activeTheme.name),
          activeThemeVersion: toOptionalString(activeTheme.version),
          coreUpdateAvailable,
          pluginUpdatesCount,
          themeUpdateAvailable,
          debugMode,
          fileEditorEnabled,
        },
      });

      await tx.sitePlugin.deleteMany({
        where: {
          siteId: site.id,
        },
      });

      if (plugins.length > 0) {
        await tx.sitePlugin.createMany({
          data: plugins.map((plugin) => ({
            siteId: site.id,
            ...plugin,
          })),
        });
      }

      await tx.site.update({
        where: {
          id: site.id,
        },
        data: {
          lastSeenAt: new Date(),
          status,
        },
      });

      return snapshot;
    });

    await generateWordPressAlerts({
      site,
      activeTheme,
      plugins,
      snapshotFlags: {
        coreUpdateAvailable,
        pluginUpdatesCount,
        themeUpdateAvailable,
        debugMode,
        fileEditorEnabled,
      },
    });
    const inventoryResult = await syncPageInventory({
      site,
      pages: body.pages,
    });
    const finalStatus = await updateSiteStatusAfterPageChecks(site.id);

    return res.json({
      received: true,
      site_id: site.id,
      status: finalStatus || status,
      plugin_updates_count: pluginUpdatesCount,
      discovered_pages_count: inventoryResult.discovered,
      snapshot_id: result.id,
    });
  } catch (error) {
    console.error("Agent sync failed.", error);

    return res.status(500).json({
      error: "Sync failed",
    });
  }
});

app.use((err, req, res, next) => {
  if (err instanceof SyntaxError && "body" in err) {
    return res.status(400).json({
      error: "Invalid JSON body",
    });
  }

  return next(err);
});

app.use((err, req, res, next) => {
  if (err.statusCode) {
    return res.status(err.statusCode).json({
      error: err.message,
    });
  }

  if (err.code === "P2002") {
    return res.status(409).json({
      error: "A record with this unique value already exists",
    });
  }

  if (err.code === "P2003") {
    return res.status(400).json({
      error: "Invalid related record",
    });
  }

  if (err.code === "P2025") {
    return res.status(404).json({
      error: "Record not found",
    });
  }

  console.error("Unhandled API error.", err);

  return res.status(500).json({
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`SitePulse API listening on port ${PORT}`);
});
