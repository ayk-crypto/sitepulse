const prisma = require("../lib/prisma");

function normalizeDate(value, fieldName) {
  const date = new Date(value);

  if (!value || Number.isNaN(date.getTime())) {
    const error = new Error(`${fieldName} must be a valid date`);
    error.statusCode = 400;
    throw error;
  }

  return date;
}

function isAgentSyncStale(site) {
  if (!site.lastSeenAt) return true;

  const intervalHours = site.agentSyncIntervalHours || 12;
  const staleAfterMs = intervalHours * 2 * 60 * 60 * 1000;

  return Date.now() - new Date(site.lastSeenAt).getTime() > staleAfterMs;
}

function compactAlert(alert) {
  return {
    id: alert.id,
    severity: alert.severity,
    title: alert.title,
    message: alert.message,
    recommendation: alert.recommendation,
    status: alert.status,
    lastSeenAt: alert.lastSeenAt,
  };
}

function buildRecommendations({ site, snapshot, monitoredPagesCount, pageErrorsCount }) {
  const recommendations = [];

  if (snapshot?.debugMode) recommendations.push("Disable WP_DEBUG on production.");
  if (snapshot?.fileEditorEnabled) {
    recommendations.push("Disable WordPress file editor using DISALLOW_FILE_EDIT.");
  }
  if ((snapshot?.pluginUpdatesCount || 0) > 0) {
    recommendations.push("Review and update plugins after taking backup.");
  }
  if (pageErrorsCount > 0) recommendations.push("Investigate failing monitored pages.");
  if (monitoredPagesCount === 0) recommendations.push("Add key business pages to monitoring.");
  if (isAgentSyncStale(site)) recommendations.push("Check SitePulse Agent connectivity.");

  if (!recommendations.length) {
    recommendations.push("Continue regular monitoring and maintenance cadence.");
  }

  return recommendations;
}

async function buildSiteSummary({ tenantId, siteId, periodStart, periodEnd }) {
  const site = await prisma.site.findFirst({
    where: {
      id: siteId,
      tenantId,
    },
    include: {
      client: true,
      snapshots: {
        orderBy: { createdAt: "desc" },
        take: 1,
      },
      monitoredPages: {
        include: {
          checks: {
            where: {
              checkedAt: {
                gte: periodStart,
                lte: periodEnd,
              },
            },
            orderBy: { checkedAt: "desc" },
          },
        },
      },
      alerts: {
        where: {
          OR: [
            { createdAt: { gte: periodStart, lte: periodEnd } },
            { lastSeenAt: { gte: periodStart, lte: periodEnd } },
            { status: { in: ["open", "acknowledged", "snoozed"] } },
          ],
        },
        orderBy: [{ severity: "asc" }, { lastSeenAt: "desc" }],
        take: 12,
      },
    },
  });

  if (!site) {
    const error = new Error("Site not found");
    error.statusCode = 404;
    throw error;
  }

  const snapshot = site.snapshots[0] || null;
  const pageChecks = site.monitoredPages.flatMap((page) => page.checks);
  const responseTimes = pageChecks
    .map((check) => check.responseTimeMs)
    .filter((value) => typeof value === "number");
  const pageErrorsCount = pageChecks.filter((check) => check.errorDetected || check.httpStatus >= 400).length;
  const openAlerts = site.alerts.filter((alert) =>
    ["open", "acknowledged", "snoozed"].includes(alert.status)
  );
  const resolvedAlerts = site.alerts.filter((alert) => alert.status === "resolved");
  const activityLogs = await prisma.activityLog.findMany({
    where: {
      tenantId,
      createdAt: { gte: periodStart, lte: periodEnd },
      OR: [
        { entityType: "site", entityId: site.id },
        { entityType: "report" },
      ],
    },
    orderBy: { createdAt: "desc" },
    take: 8,
  });

  return {
    scope: "site",
    site: {
      id: site.id,
      siteName: site.siteName,
      siteUrl: site.siteUrl,
      status: site.status,
      lastSeenAt: site.lastSeenAt,
    },
    client: site.client
      ? {
          id: site.client.id,
          name: site.client.name,
          contactPerson: site.client.contactPerson,
          email: site.client.email,
        }
      : null,
    overallHealthStatus: site.status,
    latestWordPressSnapshot: snapshot,
    pluginUpdateCount: snapshot?.pluginUpdatesCount || 0,
    coreUpdateAvailable: Boolean(snapshot?.coreUpdateAvailable),
    themeUpdateAvailable: Boolean(snapshot?.themeUpdateAvailable),
    debugMode: Boolean(snapshot?.debugMode),
    fileEditorEnabled: Boolean(snapshot?.fileEditorEnabled),
    monitoredPagesCount: site.monitoredPages.length,
    pageChecksCount: pageChecks.length,
    pageErrorsCount,
    averageResponseTime: responseTimes.length
      ? Math.round(responseTimes.reduce((sum, value) => sum + value, 0) / responseTimes.length)
      : null,
    openAlertsCount: openAlerts.length,
    criticalAlertsCount: openAlerts.filter((alert) => alert.severity === "critical").length,
    warningAlertsCount: openAlerts.filter((alert) => alert.severity === "warning").length,
    resolvedAlertsCount: resolvedAlerts.length,
    topAlerts: site.alerts.slice(0, 6).map(compactAlert),
    activityCount: activityLogs.length,
    keyActivities: activityLogs.map((log) => ({
      id: log.id,
      action: log.action,
      message: log.message,
      createdAt: log.createdAt,
      userName: log.userName,
    })),
    recommendations: buildRecommendations({
      site,
      snapshot,
      monitoredPagesCount: site.monitoredPages.length,
      pageErrorsCount,
    }),
  };
}

async function generateSiteReport({ tenantId, siteId, periodStart, periodEnd, title, createdBy }) {
  const start = normalizeDate(periodStart, "periodStart");
  const end = normalizeDate(periodEnd, "periodEnd");
  const summary = await buildSiteSummary({ tenantId, siteId, periodStart: start, periodEnd: end });

  const report = await prisma.report.create({
    data: {
      tenantId,
      clientId: summary.client?.id,
      siteId,
      title: title || `${summary.site.siteName} Website Health Report`,
      reportType: "monthly",
      periodStart: start,
      periodEnd: end,
      summary: JSON.parse(JSON.stringify(summary)),
      createdByUserId: createdBy?.id,
      createdByName: createdBy?.name,
    },
  });

  await logActivity({
    tenantId,
    user: createdBy,
    action: "report.generated",
    entityType: "report",
    entityId: report.id,
    message: `Generated report: ${report.title}`,
  });

  return report;
}

async function generateClientReport({ tenantId, clientId, periodStart, periodEnd, title, createdBy }) {
  const start = normalizeDate(periodStart, "periodStart");
  const end = normalizeDate(periodEnd, "periodEnd");
  const client = await prisma.client.findFirst({
    where: { id: clientId, tenantId },
    include: {
      sites: {
        where: { isArchived: false },
        select: { id: true },
      },
    },
  });

  if (!client) {
    const error = new Error("Client not found");
    error.statusCode = 404;
    throw error;
  }

  const siteSummaries = await Promise.all(
    client.sites.map((site) =>
      buildSiteSummary({ tenantId, siteId: site.id, periodStart: start, periodEnd: end })
    )
  );
  const totals = siteSummaries.reduce(
    (acc, summary) => {
      acc.monitoredPagesCount += summary.monitoredPagesCount;
      acc.pageChecksCount += summary.pageChecksCount;
      acc.pageErrorsCount += summary.pageErrorsCount;
      acc.openAlertsCount += summary.openAlertsCount;
      acc.criticalAlertsCount += summary.criticalAlertsCount;
      acc.warningAlertsCount += summary.warningAlertsCount;
      acc.resolvedAlertsCount += summary.resolvedAlertsCount;
      acc.pluginUpdateCount += summary.pluginUpdateCount;
      if (summary.averageResponseTime !== null) acc.responseTimes.push(summary.averageResponseTime);
      return acc;
    },
    {
      monitoredPagesCount: 0,
      pageChecksCount: 0,
      pageErrorsCount: 0,
      openAlertsCount: 0,
      criticalAlertsCount: 0,
      warningAlertsCount: 0,
      resolvedAlertsCount: 0,
      pluginUpdateCount: 0,
      responseTimes: [],
    }
  );
  const recommendations = [...new Set(siteSummaries.flatMap((summary) => summary.recommendations))];
  const summary = {
    scope: "client",
    client: {
      id: client.id,
      name: client.name,
      contactPerson: client.contactPerson,
      email: client.email,
    },
    sites: siteSummaries,
    overallHealthStatus: siteSummaries.some((item) => item.overallHealthStatus === "critical")
      ? "critical"
      : siteSummaries.some((item) => item.overallHealthStatus === "warning")
        ? "warning"
        : "healthy",
    ...totals,
    averageResponseTime: totals.responseTimes.length
      ? Math.round(totals.responseTimes.reduce((sum, value) => sum + value, 0) / totals.responseTimes.length)
      : null,
    topAlerts: siteSummaries.flatMap((item) => item.topAlerts).slice(0, 8),
    activityCount: siteSummaries.reduce((sum, item) => sum + item.activityCount, 0),
    keyActivities: siteSummaries.flatMap((item) => item.keyActivities).slice(0, 10),
    recommendations: recommendations.length ? recommendations : ["Continue regular monitoring and maintenance cadence."],
  };
  delete summary.responseTimes;

  const report = await prisma.report.create({
    data: {
      tenantId,
      clientId,
      title: title || `${client.name} Website Health Report`,
      reportType: "monthly",
      periodStart: start,
      periodEnd: end,
      summary: JSON.parse(JSON.stringify(summary)),
      createdByUserId: createdBy?.id,
      createdByName: createdBy?.name,
    },
  });

  await logActivity({
    tenantId,
    user: createdBy,
    action: "report.generated",
    entityType: "report",
    entityId: report.id,
    message: `Generated report: ${report.title}`,
  });

  return report;
}

async function logActivity({ tenantId, user, action, entityType, entityId, message, metadata }) {
  return prisma.activityLog.create({
    data: {
      tenantId,
      userId: user?.id,
      userName: user?.name,
      action,
      entityType,
      entityId,
      message,
      metadata,
    },
  });
}

module.exports = {
  generateSiteReport,
  generateClientReport,
  logActivity,
};
