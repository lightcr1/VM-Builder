#!/bin/sh
set -eu

CERT_DIR="/certs"
CERT_FILE="$CERT_DIR/tls.crt"
KEY_FILE="$CERT_DIR/tls.key"
OPENSSL_CONFIG="$CERT_DIR/openssl.cnf"
PROXY_HOST="${PROXY_HOST:-10.10.40.61}"

mkdir -p "$CERT_DIR"

if [ ! -s "$CERT_FILE" ] || [ ! -s "$KEY_FILE" ]; then
  apk add --no-cache openssl >/dev/null

  cat >"$OPENSSL_CONFIG" <<EOF
[req]
distinguished_name = req_distinguished_name
x509_extensions = req_ext
prompt = no

[req_distinguished_name]
CN = ${PROXY_HOST}

[req_ext]
subjectAltName = @alt_names

[alt_names]
IP.1 = ${PROXY_HOST}
EOF

  openssl req \
    -x509 \
    -nodes \
    -newkey rsa:2048 \
    -sha256 \
    -days 365 \
    -keyout "$KEY_FILE" \
    -out "$CERT_FILE" \
    -config "$OPENSSL_CONFIG" \
    -extensions req_ext

  chmod 600 "$KEY_FILE"
  chmod 644 "$CERT_FILE"
fi

exec nginx -g 'daemon off;'
