FROM golang:1.22-alpine AS build
WORKDIR /src
COPY go.mod go.sum ./
RUN go mod download
COPY . .
RUN CGO_ENABLED=0 go build -o /out/app ./cmd

FROM gcr.io/distroless/static-debian12:nonroot
COPY --from=build /out/app /app
# distroless nonroot is uid 65532; using the number so Kubernetes'
# runAsNonRoot check accepts it (a name it cannot verify).
USER 65532
EXPOSE 8080
ENTRYPOINT ["/app"]
