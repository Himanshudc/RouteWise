# RouteWise v0.3

RouteWise is a local logistics demo built with Go, PostgreSQL, React, and Docker Compose. This release adds delay alerts to the shipment workflow and operations dashboard.

- Admins manage customers, carriers, routes, and shipments.
- Status updates validate transitions and record tracking events in the same transaction.
- Customers can look up a shipment by its tracking number.
- A fresh database can be populated with fictional sample records.

## Dashboard and risk

The dashboard shows shipment counts, delivery performance, carrier delay rates, and a risk breakdown. Risk counts cover dispatched, in-transit, out-for-delivery, and delayed shipments.

- **High** applies to overdue shipments and shipments marked delayed.
- **Medium** applies before the deadline when transit has reached 80% of the route estimate, the carrier delay rate exceeds 25%, or the time remaining is within 20% of the route estimate.
- **Low** applies to active shipments that meet neither threshold.

A fresh database includes examples in each category. Risk levels can change as deadlines pass. Click a risk card to filter the shipment list, then open a shipment to see its assessment.

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

Admins can open **Alerts** from the sidebar or notification bell. RouteWise checks for overdue or explicitly delayed shipments when alerts are loaded, records each alert type once per shipment, and lets admins acknowledge alerts. The dashboard shows the most recent alerts.
