# RouteWise v0.1

RouteWise is a local logistics demo built with Go, PostgreSQL, React, and Docker Compose. This release covers the shipment lifecycle from creation through delivery.

- Admins manage customers, carriers, routes, and shipments.
- Status updates validate transitions and record tracking events in the same transaction.
- Customers can look up a shipment by its tracking number.
- A fresh database can be populated with fictional sample records.

## Run locally

Start Docker Desktop and open PowerShell in this folder.

```powershell
.\setup.ps1
```

Open [RouteWise](http://localhost:4000). The local demo admin signs in with `admin@routewise.com` and `admin123`. The setup script creates a local secret and seeds an empty database. Use these credentials only for the local demo.

1. Open **Shipments** and create a shipment using a sample customer, carrier, and route.
2. Open the new shipment and change its status to **Dispatched**, then **In Transit**.
3. Copy the tracking number and open **Track Shipment** to see the timeline. You can also try the seeded number `SHP-1001`.

The API readiness check is [available on port 8001](http://localhost:8001/ready). Use `BACKEND_PORT` in your local `.env` to change that host port.

## Run checks

- From `backend_go`, run `go test ./...` and `go vet ./...`.
- For integration tests, set `TEST_DATABASE_URL` to a disposable PostgreSQL database. The workflow exercises both current and legacy schemas.
- From `frontend`, run `npm ci` and `npm run build`.

## Release scope

This is the first shipment-management release. The roadmap includes an operations dashboard, rule-based risk summaries, and delay alerts.
