#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
SSL_DIR="$SCRIPT_DIR/ssl"
KEY_FILE="$SSL_DIR/local.key"
CERT_FILE="$SSL_DIR/local.crt"
CONF_FILE="$SSL_DIR/openssl-local.cnf"

mkdir -p "$SSL_DIR"

LOCAL_IP="${1:-}"
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="$(ifconfig en0 2>/dev/null | awk '/inet / {print $2; exit}')"
fi
if [ -z "$LOCAL_IP" ]; then
  LOCAL_IP="$(ifconfig en1 2>/dev/null | awk '/inet / {print $2; exit}')"
fi
if [ -z "$LOCAL_IP" ]; then
  echo "Impossible de detecter l'IP locale. Passe-la en argument: sh create-local-ssl.sh 192.168.1.13"
  exit 1
fi

cat > "$CONF_FILE" <<EOF
[req]
default_bits = 2048
prompt = no
default_md = sha256
x509_extensions = v3_req
distinguished_name = dn

[dn]
C = MA
ST = Casablanca
L = Casablanca
O = Cabinet ARAQI HOUSSAINI
OU = Local SSL
CN = $LOCAL_IP

[v3_req]
subjectAltName = @alt_names

[alt_names]
IP.1 = $LOCAL_IP
IP.2 = 127.0.0.1
DNS.1 = localhost
EOF

openssl req -x509 -nodes -days 825 -newkey rsa:2048 \
  -keyout "$KEY_FILE" \
  -out "$CERT_FILE" \
  -config "$CONF_FILE"

echo ""
echo "SSL local cree:"
echo " - Key : $KEY_FILE"
echo " - Cert: $CERT_FILE"
echo ""
echo "Lance le serveur puis ouvre:"
echo " - https://$LOCAL_IP:3443"
echo ""
echo "Note: browser ghadi ybqa y3ti warning 7tta ttrusti had cert."
