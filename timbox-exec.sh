#!/bin/bash
# Timbox seguro: selector staging|production + credenciales en runtime (no se guardan en archivo)
# Ejecuta: bash timbox-exec.sh [staging|production]

set -euo pipefail

DEFAULT_SXML_PATH="/c/Users/victo/Documents/Tigre-Labs/tiger-lab-private/integrations/timbox/cfdi-test.xml"
MODE="${1:-staging}"

if [[ "$MODE" != "staging" && "$MODE" != "production" ]]; then
	echo "Uso: bash timbox-exec.sh [staging|production]"
	exit 1
fi

if [[ "$MODE" == "staging" ]]; then
	TIMBOX_WSDL="https://staging.ws.timbox.com.mx/timbrado_cfdi40/wsdl"
else
	TIMBOX_WSDL="https://sistema.timbox.com.mx/timbrado_cfdi40/wsdl"
fi

# TODO LO DEMÁS YA ESTÁ AQUI
export INVOICE_PROVIDER=timbox
export TIMBOX_ADAPTER_URL=http://127.0.0.1:8788/timbox/timbrar
export TIMBOX_TIMBRADO_WSDL="$TIMBOX_WSDL"
export TIMBOX_TIMEOUT_MS=30000
export BILLING_SELLER_EMAIL=sales@yourdomain.com
export BILLING_ACCOUNTANT_EMAIL=accounting@yourdomain.com
export INVOICE_AUTOMATION_STRICT=true

echo "Modo Timbox: $MODE"
echo "WSDL: $TIMBOX_TIMBRADO_WSDL"

echo "Ingresa credenciales Timbox/Resend (no se guardan en el archivo):"
read -r -p "TIMBOX_USERNAME: " TIMBOX_USERNAME
read -r -s -p "TIMBOX_PASSWORD: " TIMBOX_PASSWORD
echo ""
read -r -s -p "RESEND_API_KEY: " RESEND_API_KEY
echo ""
read -r -p "BILLING_FROM_EMAIL: " BILLING_FROM_EMAIL
read -r -p "TIMBOX_SXML_PATH [${DEFAULT_SXML_PATH}]: " TIMBOX_SXML_PATH

if [[ -z "${TIMBOX_SXML_PATH}" ]]; then
	TIMBOX_SXML_PATH="${DEFAULT_SXML_PATH}"
fi

export TIMBOX_USERNAME="$TIMBOX_USERNAME"
export TIMBOX_PASSWORD="$TIMBOX_PASSWORD"
export RESEND_API_KEY="$RESEND_API_KEY"
export BILLING_FROM_EMAIL="$BILLING_FROM_EMAIL"
export TIMBOX_SXML_PATH="$TIMBOX_SXML_PATH"

cd /c/Users/victo/Documents/Tigre-Labs/tiger-lab-private

echo "SAT Check..."
npm run billing:sat:check
if [ $? -ne 0 ]; then exit 1; fi

echo ""
echo "Invoice Retry..."
npm run billing:invoice:retry -- --payment-id pay_manual_1 --buyer-email "$BILLING_FROM_EMAIL"

echo ""
echo "Reconciliation..."
npm run billing:reconcile:strict
