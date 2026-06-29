#!/bin/bash
# Generate self-signed TLS certificates for local LEATrace production gateway simulation
SSL_DIR="$(dirname "$0")/certs"
mkdir -p "$SSL_DIR"

if [ ! -f "$SSL_DIR/leatrace.key" ] || [ ! -f "$SSL_DIR/leatrace.crt" ]; then
    echo "Generating new self-signed TLS certificates for local domain: localhost..."
    openssl req -x509 -nodes -days 365 -newkey rsa:2048 \
        -keyout "$SSL_DIR/leatrace.key" \
        -out "$SSL_DIR/leatrace.crt" \
        -subj "/C=IN/ST=Delhi/L=New Delhi/O=NIA/OU=Cyber Incident Command/CN=localhost"
    chmod 600 "$SSL_DIR/leatrace.key"
    chmod 644 "$SSL_DIR/leatrace.crt"
    echo "TLS Certificates generated successfully in $SSL_DIR"
else
    echo "TLS Certificates already exist in $SSL_DIR. Skipping generation."
fi
