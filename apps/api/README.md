# SitePulse API

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
