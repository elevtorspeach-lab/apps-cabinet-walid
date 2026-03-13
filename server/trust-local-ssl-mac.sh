#!/bin/sh
set -eu

SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd)"
CERT_FILE="${1:-$SCRIPT_DIR/ssl/local.crt}"

if [ ! -f "$CERT_FILE" ]; then
  echo "Certificat introuvable: $CERT_FILE"
  exit 1
fi

echo "Ajout du certificat dans le trousseau Systeme..."
sudo security add-trusted-cert -d -r trustRoot -k /Library/Keychains/System.keychain "$CERT_FILE"
echo "Certificat ajoute. Redemarre Chrome/Firefox si besoin."
