# Build stage
FROM golang:1.21-alpine AS builder

WORKDIR /app

# Copy go mod files
COPY go.mod go.sum ./

# Download dependencies
RUN go mod download

# Copy source code
COPY . .

# Build the application
RUN CGO_ENABLED=0 GOOS=linux go build -a -installsuffix cgo -o main .

# Final stage
FROM alpine:latest

RUN apk --no-cache add ca-certificates tzdata

WORKDIR /app

# Copy the binary from builder stage
COPY --from=builder /app/main .

# Create data directory
RUN mkdir -p /app/data

# Expose port
EXPOSE 8080

# Set environment variable
ENV PORT=8080

# Command to run
CMD ["./main"]