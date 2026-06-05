require("dotenv").config();

const express = require("express");
const cors = require("cors");
const crypto = require("crypto");
const prisma = require("./lib/prisma");
const { sha256 } = require("./lib/hash");

const app = express();
const PORT = process.env.PORT || 4000;

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

app.get(
  "/api/admin/clients",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const clients = await prisma.client.findMany({
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

    const client = await prisma.client.create({
      data: {
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
  "/api/admin/sites",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const sites = await prisma.site.findMany({
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
      sites: sites.map((site) => {
        const latestSnapshot = site.snapshots[0] || null;

        return {
          id: site.id,
          clientId: site.clientId,
          clientName: site.client.name,
          siteName: site.siteName,
          siteUrl: site.siteUrl,
          status: site.status,
          lastSeenAt: site.lastSeenAt,
          pluginUpdatesCount: latestSnapshot
            ? latestSnapshot.pluginUpdatesCount
            : null,
          createdAt: site.createdAt,
          updatedAt: site.updatedAt,
        };
      }),
    });
  })
);

app.post(
  "/api/admin/sites",
  requireAdminToken,
  asyncHandler(async (req, res) => {
    const body = req.body && typeof req.body === "object" ? req.body : {};
    const clientId = requireString(body.clientId, "clientId");
    const siteName = requireString(body.siteName, "siteName");
    const siteUrl = requireString(body.siteUrl, "siteUrl");
    const apiKey = crypto.randomBytes(32).toString("hex");

    const site = await prisma.site.create({
      data: {
        clientId,
        siteName,
        siteUrl,
        apiKeyHash: sha256(apiKey),
        status: "unknown",
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

    return res.json({
      received: true,
      site_id: site.id,
      status,
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

  console.error("Unhandled API error.", err);

  return res.status(500).json({
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`SitePulse API listening on port ${PORT}`);
});
