require("dotenv").config();

const express = require("express");
const cors = require("cors");
const prisma = require("./lib/prisma");
const { sha256 } = require("./lib/hash");

const app = express();
const PORT = process.env.PORT || 4000;

app.use(cors());
app.use(express.json());

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
  console.error("Unhandled API error.", err);

  res.status(500).json({
    error: "Internal server error",
  });
});

app.listen(PORT, () => {
  console.log(`SitePulse API listening on port ${PORT}`);
});
