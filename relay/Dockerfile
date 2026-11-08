# Relay-Image: baut die Spiele (Konsole, Tennis, Ski, Handy-Pad) und den Go-Server, liefert beides aus.
# Build aus dem Repo-Root: docker build -f relay/Dockerfile -t disroop-relay .
FROM node:22-alpine AS site
WORKDIR /src
COPY games/package.json games/package-lock.json games/
RUN cd games && npm ci --no-audit --no-fund
COPY games games
COPY console console
COPY scripts/site.sh scripts/site.sh
RUN cd games && node dev/build.js && cd .. && sh scripts/site.sh /site --no-hardware

FROM golang:1.25-alpine AS server
WORKDIR /src
COPY relay/go.mod relay/go.sum ./
RUN go mod download
COPY relay .
RUN CGO_ENABLED=0 go build -trimpath -o /relay ./cmd/relay

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=server /relay /relay
COPY --from=site /site /site
EXPOSE 8080
ENTRYPOINT ["/relay", "-addr", ":8080", "-static", "/site"]
