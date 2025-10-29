# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code and static files (needed for embedding)
COPY . .

# Build the application (embedded files will be included)
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata curl

WORKDIR /app

# Copy the binary from builder stage (includes embedded files)
COPY --from=builder /app/main .

# Copy static and template files (for development/debugging if needed)
COPY --from=builder /app/static ./static
COPY --from=builder /app/templates ./templates
COPY --from=builder /app/locales ./locales

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Set environment variable
ENV PORT=8080

# Command to run
CMD ["./main"]

# Health check
HEALTHCHECK --interval=30s --timeout=3s --start-period=5s --retries=3 \
CMD curl -f http://localhost:8080/health || exit 1