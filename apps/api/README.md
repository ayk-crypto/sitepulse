# SitePulse API

## Admin onboarding API

Set `ADMIN_API_TOKEN` in `.env`, then pass it with each internal admin request:

```bash
ADMIN_TOKEN="change-me"
```

Create a client:

```bash
curl -X POST http://localhost:4000/api/admin/clients \
  -H "Content-Type: application/json" \
  -H "x-sitepulse-admin-token: change-me" \
  -d '{
    "name": "Client Name",
    "contactPerson": "Person Name",
    "email": "client@example.com",
    "phone": "",
    "notes": ""
  }'
```

Create a site and copy the returned `apiKey`; it is shown only once:

```bash
curl -X POST http://localhost:4000/api/admin/sites \
  -H "Content-Type: application/json" \
  -H "x-sitepulse-admin-token: change-me" \
  -d '{
    "clientId": "CLIENT_ID_FROM_CREATE_CLIENT",
    "siteName": "ThincsCorp Website",
    "siteUrl": "https://thincscorp.com"
  }'
```

List sites:

```bash
curl http://localhost:4000/api/admin/sites \
  -H "x-sitepulse-admin-token: change-me"
```

## Page monitoring API

Add a monitored page:

```bash
curl -X POST http://localhost:4000/api/admin/sites/SITE_ID/pages \
  -H "Content-Type: application/json" \
  -H "x-sitepulse-admin-token: change-me" \
  -d '{
    "label": "Homepage",
    "url": "https://example.com/"
  }'
```

List monitored pages for a site:

```bash
curl http://localhost:4000/api/admin/sites/SITE_ID/pages \
  -H "x-sitepulse-admin-token: change-me"
```

Check one monitored page:

```bash
curl -X POST http://localhost:4000/api/admin/pages/PAGE_ID/check \
  -H "x-sitepulse-admin-token: change-me"
```

Check all active monitored pages for a site:

```bash
curl -X POST http://localhost:4000/api/admin/sites/SITE_ID/check-pages \
  -H "x-sitepulse-admin-token: change-me"
```

List recent page checks:

```bash
curl http://localhost:4000/api/admin/page-checks/recent \
  -H "x-sitepulse-admin-token: change-me"
```

## Scheduler MVP

Check which work is due:

```bash
curl http://localhost:4000/api/admin/scheduler/due \
  -H "x-sitepulse-admin-token: change-me"
```

Run scheduled page checks manually:

```bash
curl -X POST http://localhost:4000/api/admin/scheduler/run-page-checks \
  -H "x-sitepulse-admin-token: change-me"
```

The MVP defaults are WordPress Agent sync every 12 hours and monitored page checks every 12 hours. The backend reports stale agent syncs but does not trigger WordPress sites directly yet.

## Agent sync testing

Configure `DATABASE_URL` in `.env`, run migrations and seed data, then start the API.

```bash
npm run seed
npm run dev
```

Sample sync request:

```bash
curl -X POST http://localhost:4000/api/agent/sync \
  -H "Content-Type: application/json" \
  -H "x-sitepulse-api-key: sitepulse_demo_key_12345" \
  -d '{
    "site_url": "https://example.com",
    "wordpress_version": "6.5.5",
    "php_version": "8.2.10",
    "mysql_version": "8.0",
    "active_theme": {
      "name": "Astra",
      "version": "4.8.0",
      "update_available": false
    },
    "core_update_available": false,
    "debug_mode": false,
    "file_editor_enabled": false,
    "plugins": [
      {
        "name": "Elementor",
        "slug": "elementor/elementor.php",
        "version": "3.21.0",
        "latest_version": "3.23.0",
        "status": "active",
        "update_available": true
      },
      {
        "name": "Contact Form 7",
        "slug": "contact-form-7/wp-contact-form-7.php",
        "version": "5.9.8",
        "latest_version": "5.9.8",
        "status": "active",
        "update_available": false
      }
    ]
  }'
```
