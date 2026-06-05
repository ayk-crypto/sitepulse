const prisma = require("../lib/prisma");

const ACTIVE_ALERT_STATUSES = ["open", "acknowledged", "snoozed"];

async function upsertFindingAndAlert({
  tenantId,
  siteId,
  source,
  severity,
  title,
  description,
  recommendation,
  fingerprint,
}) {
  const now = new Date();
  const finding = await prisma.finding.upsert({
    where: {
      tenantId_fingerprint: {
        tenantId,
        fingerprint,
      },
    },
    update: {
      siteId,
      source,
      severity,
      title,
      description,
      recommendation,
      status: "open",
      lastSeenAt: now,
      resolvedAt: null,
      occurrenceCount: {
        increment: 1,
      },
    },
    create: {
      tenantId,
      siteId,
      source,
      severity,
      title,
      description,
      recommendation,
      fingerprint,
    },
  });

  const alert = await prisma.alert.upsert({
    where: {
      tenantId_fingerprint: {
        tenantId,
        fingerprint,
      },
    },
    update: {
      siteId,
      findingId: finding.id,
      source,
      severity,
      title,
      message: description,
      recommendation,
      status: "open",
      lastSeenAt: now,
      resolvedAt: null,
      occurrenceCount: {
        increment: 1,
      },
    },
    create: {
      tenantId,
      siteId,
      findingId: finding.id,
      source,
      severity,
      title,
      message: description,
      recommendation,
      fingerprint,
    },
  });

  return {
    finding,
    alert,
  };
}

async function resolveAlertByFingerprint({ tenantId, fingerprint }) {
  const now = new Date();

  await prisma.finding.updateMany({
    where: {
      tenantId,
      fingerprint,
      status: {
        in: ACTIVE_ALERT_STATUSES,
      },
    },
    data: {
      status: "resolved",
      resolvedAt: now,
    },
  });

  await prisma.alert.updateMany({
    where: {
      tenantId,
      fingerprint,
      status: {
        in: ACTIVE_ALERT_STATUSES,
      },
    },
    data: {
      status: "resolved",
      resolvedAt: now,
    },
  });
}

async function resolveMissingAlertsForSite({ tenantId, siteId, activeFingerprints, source }) {
  const now = new Date();
  const where = {
    tenantId,
    siteId,
    status: {
      in: ACTIVE_ALERT_STATUSES,
    },
    fingerprint: {
      notIn: activeFingerprints,
    },
  };

  if (source) {
    where.source = source;
  }

  await prisma.finding.updateMany({
    where,
    data: {
      status: "resolved",
      resolvedAt: now,
    },
  });

  await prisma.alert.updateMany({
    where,
    data: {
      status: "resolved",
      resolvedAt: now,
    },
  });
}

module.exports = {
  ACTIVE_ALERT_STATUSES,
  upsertFindingAndAlert,
  resolveAlertByFingerprint,
  resolveMissingAlertsForSite,
};
