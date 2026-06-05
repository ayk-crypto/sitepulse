require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const prisma = require("./lib/prisma");
const { sha256 } = require("./lib/hash");
const {
  upsertFindingAndAlert,
  resolveMissingAlertsForSite,
  resolveAlertByFingerprint,
} = require("./services/alertService");

const app = express();
const PORT = process.env.PORT || 4000;
const DEFAULT_TENANT_SLUG = process.env.DEFAULT_TENANT_SLUG || "onset-media";

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

function toBoolean(value, fallback = false) {
  return typeof value === "boolean" ? value : fallback;
}

function toOptionalString(value) {
  return typeof value === "string" && value.trim() !== "" ? value : undefined;
}

function requireAdminToken(req, res, next) {
  const adminToken = process.env.ADMIN_API_TOKEN;
  const providedToken = req.header("x-sitepulse-admin-token");

  if (!adminToken || !providedToken || providedToken !== adminToken) {
    return res.status(401).json({
      error: "Unauthorized",
    });
  }

  return next();
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
    latestSnapshot,
    pluginUpdatesCount: latestSnapshot ? latestSnapshot.pluginUpdatesCount : null,
    activeThemeName: latestSnapshot ? latestSnapshot.activeThemeName : null,
    wordpressVersion: latestSnapshot ? latestSnapshot.wordpressVersion : null,
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

app.get(
  "/api/admin/clients",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    const clients = await prisma.client.findMany({
      where: {
        tenantId: tenant.id,
      },
      orderBy: {
        createdAt: "desc",
      },
      include: {
        _count: {
          select: {
            sites: true,
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
        createdAt: client.createdAt,
        updatedAt: client.updatedAt,
        sitesCount: client._count.sites,
      })),
    });
  })
);

app.post(
  "/api/admin/clients",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const tenant = await getDefaultTenant();

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
    const tenant = await getDefaultTenant();
    await refreshStaleSiteStatuses(tenant.id);
    const [totalSites, statusCounts, recentlySyncedSites] = await Promise.all([
      prisma.site.count({
        where: {
          tenantId: tenant.id,
        },
      }),
      prisma.site.groupBy({
        by: ["status"],
        where: {
          tenantId: tenant.id,
        },
        _count: {
          status: true,
        },
      }),
      prisma.site.findMany({
        where: {
          tenantId: tenant.id,
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
      recentlySyncedSites: recentlySyncedSites.map(formatSiteListItem),
    });
  })
);

app.get(
  "/api/admin/alerts/summary",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [openCount, criticalOpenCount, warningOpenCount, resolvedLast24h, latestOpenAlerts] =
      await Promise.all([
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
        }),
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            severity: "critical",
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
        }),
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            severity: "warning",
            status: {
              in: ["open", "acknowledged", "snoozed"],
            },
          },
        }),
        prisma.alert.count({
          where: {
            tenantId: tenant.id,
            status: "resolved",
            resolvedAt: {
              gte: since,
            },
          },
        }),
        prisma.alert.findMany({
          where: {
            tenantId: tenant.id,
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
    const tenant = await getDefaultTenant();
    const where = {
      tenantId: tenant.id,
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
    const tenant = await getDefaultTenant();
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
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    const alert = await prisma.alert.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: "acknowledged",
        acknowledgedAt: new Date(),
        acknowledgedBy: "admin",
      },
    });

    if (alert.tenantId !== tenant.id) {
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
  "/api/admin/alerts/:id/resolve",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    const alert = await prisma.alert.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: "resolved",
        resolvedAt: new Date(),
      },
    });

    if (alert.tenantId !== tenant.id) {
      return res.status(404).json({
        error: "Alert not found",
      });
    }

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
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const hours = Number(body.hours || 24);
    const snoozedUntil = new Date(Date.now() + Math.max(1, hours) * 60 * 60 * 1000);
    const alert = await prisma.alert.update({
      where: {
        id: req.params.id,
      },
      data: {
        status: "snoozed",
        snoozedUntil,
      },
    });

    if (alert.tenantId !== tenant.id) {
      return res.status(404).json({
        error: "Alert not found",
      });
    }

    return res.json({
      alert,
    });
  })
);

app.get(
  "/api/admin/sites",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    await refreshStaleSiteStatuses(tenant.id);
    const sites = await prisma.site.findMany({
      where: {
        tenantId: tenant.id,
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
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const tenant = await getDefaultTenant();
    const clientId = requireString(body.clientId, "clientId");
    const siteName = requireString(body.siteName, "siteName");
    const siteUrl = requireString(body.siteUrl, "siteUrl");
    const apiKey = crypto.randomBytes(32).toString("hex");

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

app.get(
  "/api/admin/sites/:id",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const site = await prisma.site.findUnique({
      where: {
        id: req.params.id,
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
  "/api/admin/sites/:id/pages",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const site = await prisma.site.findUnique({
      where: {
        id: req.params.id,
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
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const site = await prisma.site.findUnique({
      where: {
        id: req.params.id,
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

    return res.status(201).json({
      page,
    });
  })
);

app.delete(
  "/api/admin/pages/:pageId",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const page = await prisma.monitoredPage.findUnique({
      where: {
        id: req.params.pageId,
      },
      select: {
        id: true,
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

    return res.json({
      deleted: true,
    });
  })
);

app.post(
  "/api/admin/pages/:pageId/check",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const page = await prisma.monitoredPage.findUnique({
      where: {
        id: req.params.pageId,
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
  asyncHandler(async (req, res) => {
    const site = await prisma.site.findUnique({
      where: {
        id: req.params.id,
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
    const tenant = await getDefaultTenant();
    const now = new Date();
    const sites = await prisma.site.findMany({
      where: {
        tenantId: tenant.id,
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
  asyncHandler(async (req, res) => {
    const tenant = await getDefaultTenant();
    const now = new Date();
    const sites = await prisma.site.findMany({
      where: {
        tenantId: tenant.id,
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
    const checks = await prisma.pageCheck.findMany({
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
    const finalStatus = await updateSiteStatusAfterPageChecks(site.id);

    return res.json({
      received: true,
      site_id: site.id,
      status: finalStatus || status,
      plugin_updates_count: pluginUpdatesCount,
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
