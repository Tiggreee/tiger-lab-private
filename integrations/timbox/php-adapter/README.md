# Timbox PHP Adapter

This adapter exposes local HTTP endpoints for Timbox SOAP timbrado and manifiesto signing.

## Route

- POST /timbox/timbrar
- POST /timbox/manifiesto/firmar
- POST /timbox/cancelar

Request JSON fields:
- username: Timbox user
- password: Timbox password
- sxml: Base64 CFDI XML payload
- timbradoWsdl: optional, defaults to staging Timbox WSDL

Manifiesto request JSON fields:
- username: Timbox user
- password: Timbox password
- manifiestoMethod: optional. `firmar_manifiesto` (default) or `firmar_manifiesto_sello`
- email: RFC emitter contact email

If `manifiestoMethod=firmar_manifiesto` (default):
- rfc: RFC del emisor
- razon_social: Razón social del emisor
- cert_pem: certificado FIEL en formato PEM
- llave_pem: llave FIEL en formato PEM

If `manifiestoMethod=firmar_manifiesto_sello` (compatibility mode):
- cadena: cadena original del manifiesto (estructura ||...||)
- sello: firma digital base64 de la cadena
- certificado: certificado FIEL en formato PEM
- manifiestoWsdl: optional, defaults to staging manifiesto WSDL

Response JSON fields:
- provider
- method
- For timbrado: uuid, xml
- For manifiesto: code, message, manifiesto
- For cancelacion: code, message, result

## Start

From repo root:

```bash
npm run timbox:adapter:start
```

## E2E Check

Run a controlled manifest check (writes runtime evidence):

```bash
npm run timbox:manifiesto:check
```

Strict mode (non-zero exit on BLOCKED/FAIL):

```bash
npm run timbox:manifiesto:check:strict
```

Evidence files:
- ops/runtime/timbox-manifest-e2e-report.json
- ops/runtime/timbox-manifest-e2e-report.md

## Cancel CFDI

Cancel a stamped CFDI via Timbox cancellation service:

```bash
npm run timbox:cancelar
```

Required environment variables:
- TIMBOX_USERNAME
- TIMBOX_PASSWORD
- TIMBOX_CANCELACION_RFC_EMISOR
- TIMBOX_CANCELACION_CERT_PEM or TIMBOX_CANCELACION_CERT_PATH
- TIMBOX_CANCELACION_LLAVE_PEM or TIMBOX_CANCELACION_LLAVE_PATH
- TIMBOX_CANCELACION_FOLIOS_JSON or TIMBOX_CANCELACION_UUID

Optional environment variables:
- TIMBOX_CANCELACION_WSDL (default staging)
- TIMBOX_ADAPTER_CANCEL_URL
- TIMBOX_CANCELACION_MOTIVO (default 02)
- TIMBOX_CANCELACION_FOLIO_SUSTITUCION

## CFDI Inspect

Inspect current SXML payload before timbrado:

```bash
npm run timbox:cfdi:inspect
```

Strict mode (non-zero exit on FAIL):

```bash
npm run timbox:cfdi:inspect:strict
```

Evidence files:
- ops/runtime/timbox-cfdi-inspect-report.json
- ops/runtime/timbox-cfdi-inspect-report.md

## Notes

- Requires PHP SOAP extension enabled.
- Intended for staging rollout and controlled production usage.
