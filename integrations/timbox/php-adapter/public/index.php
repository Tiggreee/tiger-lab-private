<?php

declare(strict_types=1);

ini_set('display_errors', '0');
error_reporting(E_ALL);

header('Content-Type: application/json; charset=utf-8');

if ($_SERVER['REQUEST_METHOD'] !== 'POST') {
    http_response_code(405);
    echo json_encode(['error' => 'Method not allowed']);
    exit;
}

$uri = parse_url($_SERVER['REQUEST_URI'] ?? '/', PHP_URL_PATH) ?: '/';
if ($uri !== '/timbox/timbrar' && $uri !== '/timbox/manifiesto/firmar' && $uri !== '/timbox/cancelar') {
    http_response_code(404);
    echo json_encode(['error' => 'Route not found']);
    exit;
}

$payloadRaw = file_get_contents('php://input');
$payload = json_decode($payloadRaw ?: '{}', true);
if (!is_array($payload)) {
    http_response_code(400);
    echo json_encode(['error' => 'Invalid JSON payload']);
    exit;
}

$username = trim((string)($payload['username'] ?? ''));
$password = trim((string)($payload['password'] ?? ''));
$sxml = trim((string)($payload['sxml'] ?? ''));
$timbradoWsdl = trim((string)($payload['timbradoWsdl'] ?? ''));
$manifiestoWsdl = trim((string)($payload['manifiestoWsdl'] ?? ''));
$cancelacionWsdl = trim((string)($payload['cancelacionWsdl'] ?? ''));
$manifiestoMethod = trim((string)($payload['manifiestoMethod'] ?? ''));
$email = trim((string)($payload['email'] ?? ''));
$rfc = trim((string)($payload['rfc'] ?? ''));
$razonSocial = trim((string)($payload['razon_social'] ?? ''));
$certPem = trim((string)($payload['cert_pem'] ?? ''));
$llavePem = trim((string)($payload['llave_pem'] ?? ''));
$cadena = trim((string)($payload['cadena'] ?? ''));
$sello = trim((string)($payload['sello'] ?? ''));
$certificado = trim((string)($payload['certificado'] ?? ''));
$rfcEmisor = trim((string)($payload['rfc_emisor'] ?? ''));
$folios = $payload['folios'] ?? [];

if ($timbradoWsdl === '') {
    $timbradoWsdl = 'https://staging.ws.timbox.com.mx/timbrado_cfdi40/wsdl';
}

if ($manifiestoWsdl === '') {
    $manifiestoWsdl = 'https://staging.ws.timbox.com.mx/manifiesto/wsdl';
}

if ($cancelacionWsdl === '') {
    $cancelacionWsdl = 'https://staging.ws.timbox.com.mx/cancelacion/wsdl';
}

if ($uri === '/timbox/timbrar' && ($username === '' || $password === '' || $sxml === '')) {
    http_response_code(422);
    echo json_encode(['error' => 'username, password and sxml are required']);
    exit;
}

if ($uri === '/timbox/manifiesto/firmar' && ($username === '' || $password === '')) {
    http_response_code(422);
    echo json_encode(['error' => 'username and password are required']);
    exit;
}

if ($uri === '/timbox/cancelar' && ($username === '' || $password === '' || $rfcEmisor === '')) {
    http_response_code(422);
    echo json_encode(['error' => 'username, password and rfc_emisor are required']);
    exit;
}

if ($uri === '/timbox/cancelar' && !is_array($folios)) {
    http_response_code(422);
    echo json_encode(['error' => 'folios must be an array']);
    exit;
}

if ($uri === '/timbox/cancelar' && count($folios) === 0) {
    http_response_code(422);
    echo json_encode(['error' => 'folios array cannot be empty']);
    exit;
}

if (!class_exists('SoapClient')) {
    http_response_code(500);
    echo json_encode(['error' => 'PHP SOAP extension is required']);
    exit;
}

function soapValueToString(mixed $value): string
{
    if (is_string($value)) {
        return trim($value);
    }

    if (is_scalar($value)) {
        return trim((string)$value);
    }

    if ($value instanceof stdClass) {
        $vars = get_object_vars($value);
        foreach (['xml', 'XML', 'cfdi', 'message', 'mensaje'] as $candidate) {
            if (array_key_exists($candidate, $vars)) {
                return soapValueToString($vars[$candidate]);
            }
        }

        return trim(json_encode($vars) ?: '');
    }

    if (is_array($value)) {
        if (array_key_exists('xml', $value)) {
            return soapValueToString($value['xml']);
        }

        if (array_key_exists(0, $value)) {
            return soapValueToString($value[0]);
        }

        return trim(json_encode($value) ?: '');
    }

    return '';
}

function timboxErrorHint(string $detail): string
{
    $normalized = mb_strtolower($detail, 'UTF-8');

    if (str_contains($normalized, 'nocertificado') && str_contains($normalized, 'length')) {
        return 'NoCertificado debe ser el numero de serie de 20 digitos, no el certificado completo.';
    }

    if (str_contains($normalized, 'nocertificado') && str_contains($normalized, 'pattern')) {
        return 'NoCertificado invalido. Debe cumplir el patron [0-9]{20}.';
    }

    if (str_contains($normalized, 'certificado no se encuentra en la lista lco')) {
        return 'El certificado no esta vigente/autorizado para timbrado en LCO SAT. Validar CSD vigente y RFC emisor.';
    }

    if (str_contains($normalized, 'digestion') && str_contains($normalized, 'sello')) {
        return 'Sello invalido para la cadena original: verificar canonicalizacion, certificado CSD correcto y llave privada correspondiente.';
    }

    if (str_contains($normalized, 'no es un base64')) {
        return 'Sello o certificado no estan en base64 valido.';
    }

    return '';
}

try {
    $selectedWsdl = $uri === '/timbox/timbrar'
        ? $timbradoWsdl
        : ($uri === '/timbox/cancelar' ? $cancelacionWsdl : $manifiestoWsdl);
    $client = new SoapClient($selectedWsdl, [
        'trace' => 1,
        'exceptions' => true,
    ]);

    if ($uri === '/timbox/timbrar') {
        // Timbox docs: sxml must be the XML base64-encoded.
        // The sxml value arrives already base64-encoded from the Node caller.
        $parametros = array(
            'username' => $username,
            'password' => $password,
            'sxml'     => $sxml,
        );

        $response = $client->__soapCall('timbrar_cfdi', $parametros);

        $xml = soapValueToString($response->xml ?? '');
        if ($xml === '') {
            throw new RuntimeException('timbrar_cfdi returned empty xml');
        }

        $uuid = '';
        if (preg_match('/UUID="([A-Fa-f0-9\-]{36})"/', $xml, $matches) === 1) {
            $uuid = $matches[1];
        }

        if ($uuid === '') {
            throw new RuntimeException('UUID not found in timbrado response XML');
        }

        echo json_encode([
            'provider' => 'timbox',
            'method' => 'timbrar_cfdi',
            'uuid' => $uuid,
            'xml' => $xml,
        ]);
        exit;
    }

    if ($uri === '/timbox/cancelar') {
        $certPemCancelar = trim((string)($payload['cert_pem'] ?? ''));
        $llavePemCancelar = trim((string)($payload['llave_pem'] ?? ''));

        if ($certPemCancelar === '' || $llavePemCancelar === '') {
            http_response_code(422);
            echo json_encode(['error' => 'cert_pem and llave_pem are required for cancelar_cfdi']);
            exit;
        }

        $parametros = array(
            'username' => $username,
            'password' => $password,
            'rfc_emisor' => $rfcEmisor,
            'folios' => $folios,
            'cert_pem' => $certPemCancelar,
            'llave_pem' => $llavePemCancelar,
        );

        $response = $client->__soapCall('cancelar_cfdi', $parametros);
        $result = $response->cancelar_cfdi_result ?? $response->cancelar_cfdiResponse ?? $response;
        $code = soapValueToString($result->code ?? '');
        $message = soapValueToString($result->message ?? $result->mensaje ?? '');

        echo json_encode([
            'provider' => 'timbox',
            'method' => 'cancelar_cfdi',
            'code' => $code,
            'message' => $message,
            'result' => $result instanceof stdClass ? get_object_vars($result) : $result,
        ]);
        exit;
    }

    $useSelloMode = $manifiestoMethod === 'firmar_manifiesto_sello' || ($cadena !== '' || $sello !== '' || $certificado !== '');
    if (!$useSelloMode && ($rfc === '' || $razonSocial === '' || $email === '' || $certPem === '' || $llavePem === '')) {
        http_response_code(422);
        echo json_encode(['error' => 'For firmar_manifiesto require rfc, razon_social, email, cert_pem and llave_pem']);
        exit;
    }
    if ($useSelloMode && ($email === '' || $cadena === '' || $sello === '' || $certificado === '')) {
        http_response_code(422);
        echo json_encode(['error' => 'For firmar_manifiesto_sello require email, cadena, sello and certificado']);
        exit;
    }

    if ($useSelloMode) {
        $parametros = array(
            'username' => $username,
            'password' => $password,
            'email' => $email,
            'cadena' => $cadena,
            'sello' => $sello,
            'certificado' => $certificado,
        );
        $response = $client->__soapCall('firmar_manifiesto_sello', $parametros);
        $result = $response->firmar_manifiesto_sello_result ?? $response->firma_manifiesto_sello_result ?? $response;
    } else {
        $parametros = array(
            'username' => $username,
            'password' => $password,
            'rfc' => $rfc,
            'razon_social' => $razonSocial,
            'email' => $email,
            'cert_pem' => $certPem,
            'llave_pem' => $llavePem,
        );
        $response = $client->__soapCall('firmar_manifiesto', $parametros);
        $result = $response->firmar_manifiesto_result ?? $response->firma_manifiesto_result ?? $response;
    }

    $code = soapValueToString($result->code ?? '');
    $message = soapValueToString($result->message ?? '');
    $manifiesto = $result->manifiesto ?? $result->manifiesto_sello ?? null;

    $payloadOut = [
        'provider' => 'timbox',
        'method' => $useSelloMode ? 'firmar_manifiesto_sello' : 'firmar_manifiesto',
        'code' => $code,
        'message' => $message,
    ];

    if ($manifiesto instanceof stdClass) {
        $encabezado = $manifiesto->encabezado ?? $manifiesto->encabezado_firma ?? new stdClass();
        $certInfo = $manifiesto->certificado ?? $manifiesto->certificado_firma ?? new stdClass();
        $payloadOut['manifiesto'] = [
            'encabezado' => get_object_vars($encabezado),
            'contenido' => soapValueToString($manifiesto->contenido ?? ''),
            'firma' => soapValueToString($manifiesto->firma ?? ''),
            'cadena_original' => soapValueToString($manifiesto->cadena_original ?? ''),
            'certificado' => get_object_vars($certInfo),
        ];
    }

    echo json_encode($payloadOut);
} catch (Throwable $exception) {
    $detail = $exception->getMessage();
    $hint = timboxErrorHint($detail);
    http_response_code(502);
    echo json_encode([
        'error' => 'Timbox SOAP call failed',
        'detail' => $detail,
        'hint' => $hint,
    ]);
}
