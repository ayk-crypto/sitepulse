# SitePulse API

## Login API

Run the seed script to create the default Onset Media workspace and owner user:

```bash
npm run seed
```

Development login:

```text
Email: admin@sitepulse.local
Password: SitePulse@12345
```

Change this default password before production use. Set `JWT_SECRET` to a strong private value in `.env`; never expose it in frontend code.

Login and use the returned JWT for dashboard requests:

```bash
curl -X POST http://localhost:4000/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{
    "email": "admin@sitepulse.local",
    "password": "SitePulse@12345"
  }'

curl http://localhost:4000/api/auth/me \
  -H "Authorization: Bearer JWT_TOKEN"
```

The WordPress Agent still uses `x-sitepulse-api-key`. Internal scripts may still use `x-sitepulse-admin-token`.

## Admin onboarding API

For internal scripts, set `ADMIN_API_TOKEN` in `.env`, then pass it with each admin request:

```bash
ADMIN_API_TOKEN="change-me"
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

## Client and Site Management

List archived records when needed:

```bash
curl "http://localhost:4000/api/admin/sites?includeArchived=true" \
  -H "x-sitepulse-admin-token: change-me"
```

Archive and restore a site:

```bash
curl -X POST http://localhost:4000/api/admin/sites/SITE_ID/archive \
  -H "x-sitepulse-admin-token: change-me"

curl -X POST http://localhost:4000/api/admin/sites/SITE_ID/restore \
  -H "x-sitepulse-admin-token: change-me"
```

Permanent site deletion requires explicit confirmation:

```bash
curl -X DELETE "http://localhost:4000/api/admin/sites/SITE_ID?confirm=true" \
  -H "x-sitepulse-admin-token: change-me"
```

## Page Discovery

List discovered pages from the latest WordPress Agent sync:

```bash
curl http://localhost:4000/api/admin/sites/SITE_ID/discovered-pages \
  -H "x-sitepulse-admin-token: change-me"
```

Add discovered pages to monitoring:

```bash
curl -X POST http://localhost:4000/api/admin/sites/SITE_ID/discovered-pages/add-to-monitoring \
  -H "Content-Type: application/json" \
  -H "x-sitepulse-admin-token: change-me" \
  -d '{"pageInventoryIds":["PAGE_INVENTORY_ID"]}'
```

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
