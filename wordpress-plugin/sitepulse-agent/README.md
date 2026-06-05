# SitePulse Agent

SitePulse Agent connects a WordPress site to the SitePulse API by Onset Media.

## Install

Zip the `sitepulse-agent` folder, then upload it in WordPress from **Plugins > Add New > Upload Plugin**. Activate **SitePulse Agent** after installation.

## Configure

Open **SitePulse** in the WordPress admin menu.

Set **Dashboard API URL** to:

```text
http://localhost:4000
```

For local demo testing, set **API Key** to:

```text
sitepulse_demo_key_12345
```

Save settings. The saved API key is not shown in plain text after saving.

## Sync

Click **Sync Now** on the SitePulse settings page. The plugin sends WordPress, theme, plugin, and environment health data to:

```text
http://localhost:4000/api/agent/sync
```
