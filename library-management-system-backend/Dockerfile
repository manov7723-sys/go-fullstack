# syntax=docker/dockerfile:1
# --- Build stage ---
FROM golang:1.23-alpine AS builder
# The official golang images pin GOTOOLCHAIN=local, which makes the base
# image's Go version a hard ceiling: a go.mod requiring anything newer fails
# at `go mod download` ("go.mod requires go >= X, running Y"). auto lets Go
# fetch the exact toolchain go.mod declares, so the pinned base is a floor,
# not a ceiling — the generator's version guess can never break the build.
ENV GOTOOLCHAIN=auto
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 GOOS=linux go build -ldflags="-s -w" -o /out/app ./cmd

# --- Runtime: distroless, non-root, no shell ---
FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=builder /out/app /app
# Numeric uid, not a name. Kubernetes' runAsNonRoot check refuses to start
# a container whose USER is a name: it cannot verify from outside the image
# that the name is non-root, and the pod dies with
# CreateContainerConfigError (2026-09).
# distroless 'nonroot' is uid 65532.
USER 65532
EXPOSE 8080
ENTRYPOINT ["/app"]
