FROM golang:1.26-alpine AS build
WORKDIR /src
COPY backend_go/go.mod backend_go/go.sum ./
RUN go mod download
COPY backend_go/ ./
RUN CGO_ENABLED=0 go build -trimpath -o /routewise ./cmd/server

FROM alpine:3.23 AS app
RUN apk add --no-cache ca-certificates tzdata && adduser -D routewise
WORKDIR /app
COPY --from=build /routewise ./routewise
COPY backend_go/internal/db/schema.sql ./internal/db/schema.sql
USER routewise
EXPOSE 8000
CMD ["./routewise"]
