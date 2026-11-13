# Prototypes

Static reference prototypes. They are not part of the app build.

- `consumer/index.html`: consumer site (Open Trip, flights, trains, hotels and villas, business trip).
- `business/index.html`: business portal (Employee, Manager, Finance admin and ops personas).

Open them through a local web server so the images load:

```bash
cd prototype && python3 -m http.server 8080
# http://localhost:8080/consumer/  and  http://localhost:8080/business/
```

## Changes from the uploaded files (2026-11-13)
- Added photos from Wikimedia Commons in `*/img/`; authors and licences are in `CREDITS.md`.
- Consumer: the "Open company portal" link points to `../business/index.html`; the Tidung alt text matches its photo; the footer credits the photos.
- Business: demo SPPD budgets are computed from the estimate formula (see `docs/decisions.md` §1). Storage key is now `kwb_state_v2`.
- Business: fixed a crash when switching to the "kitawisata ops" persona (the sidebar counted pending approvals for a user who doesn't exist).
