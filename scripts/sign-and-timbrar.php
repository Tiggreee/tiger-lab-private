<?php
/**
 * sign-and-timbrar.php
 * Firma el CFDI con el CSD y timbra con Timbox (staging por default).
 * Ejecutar: php sign-and-timbrar.php
 */

declare(strict_types=1);

ini_set('display_errors', '1');
error_reporting(E_ALL);

// ── Rutas CSD (Documents/Tigre-Labs) ───────────────────────────────────────
$CER_PATH = resolveExistingPath([
    getenv('CSD_CER_PATH') ?: '',
    'C:\\Users\\victo\\Documents\\Tigre-Labs\\00001000000725699623.cer',
    '/c/Users/victo/Documents/Tigre-Labs/00001000000725699623.cer',
]);

$KEY_PATH = resolveExistingPath([
    getenv('CSD_KEY_PATH') ?: '',
    'C:\\Users\\victo\\Documents\\Tigre-Labs\\CSD_MATRIZ_SALV880427GW4_20260609_032347.key',
    '/c/Users/victo/Documents/Tigre-Labs/CSD_MATRIZ_SALV880427GW4_20260609_032347.key',
]);
$XML_PATH = trim((string) (getenv('CFDI_XML_PATH') ?: (__DIR__ . '/../integrations/timbox/cfdi-test.xml')));
$SIGNED_XML_PATH = trim((string) (getenv('CFDI_SIGNED_XML_PATH') ?: (__DIR__ . '/../integrations/timbox/cfdi-signed.xml')));
$TIMBRADO_XML_PATH = trim((string) (getenv('CFDI_TIMBRADO_XML_PATH') ?: (__DIR__ . '/../integrations/timbox/cfdi-timbrado.xml')));

// ── Timbox entorno configurable (staging por default) ───────────────────────
$TIMBOX_ENV = strtolower(trim((string) (getenv('TIMBOX_ENV') ?: 'staging')));

$TIMBOX_WSDL_STAGING = 'https://staging.ws.timbox.com.mx/timbrado_cfdi40/wsdl';
$TIMBOX_WSDL_PRODUCTION = 'https://sistema.timbox.com.mx/timbrado_cfdi40/wsdl';

$TIMBOX_WSDL = trim((string) getenv('TIMBOX_WSDL'));
if ($TIMBOX_WSDL === '') {
    $TIMBOX_WSDL = $TIMBOX_ENV === 'production' ? $TIMBOX_WSDL_PRODUCTION : $TIMBOX_WSDL_STAGING;
}

$defaultUser = 'SALV880427GW4';
$defaultPassStaging = 'PMTGZoZkce6b5S9xFGaC';
$defaultPassProduction = '83ToyzYJbzbTQDzWk1XY';

$TIMBOX_USERNAME = trim((string) (getenv('TIMBOX_USERNAME') ?: $defaultUser));
$TIMBOX_PASSWORD = trim((string) getenv('TIMBOX_PASSWORD'));
if ($TIMBOX_PASSWORD === '') {
    $TIMBOX_PASSWORD = $TIMBOX_ENV === 'production' ? $defaultPassProduction : $defaultPassStaging;
}
$EMISOR_RFC = strtoupper(trim((string) (getenv('CSD_EMISOR_RFC') ?: $TIMBOX_USERNAME)));
$EMISOR_NOMBRE_ENV = trim((string) (getenv('CSD_EMISOR_NOMBRE') ?: ''));
$EMISOR_REGIMEN_ENV = trim((string) (getenv('CSD_REGIMEN_FISCAL') ?: ''));

$DRY_RUN = strtolower(trim((string) (getenv('TIMBOX_DRY_RUN') ?: 'false'))) === 'true';
$ALLOW_UNSAFE_MANUAL_CADENA = strtolower(trim((string) (getenv('TIMBOX_ALLOW_UNSAFE_MANUAL_CADENA') ?: 'false'))) === 'true';
$autoRefreshFechaEnv = strtolower(trim((string) (getenv('TIMBOX_AUTO_REFRESH_FECHA') ?: '')));
$AUTO_REFRESH_FECHA = $autoRefreshFechaEnv === ''
    ? ($TIMBOX_ENV !== 'production')
    : in_array($autoRefreshFechaEnv, ['1', 'true', 'yes', 'on'], true);
$ALLOW_NON_TEST_RFC_STAGING = strtolower(trim((string) (getenv('TIMBOX_ALLOW_NON_TEST_RFC_STAGING') ?: 'false'))) === 'true';

// ── XSLT cadena original CFDI 4.0 ────────────────────────────────────────────
$XSLT_URL = 'https://www.sat.gob.mx/sitio_internet/cfd/4/cadenaoriginal_4_0/cadenaoriginal_4_0.xslt';

// ── Pedir password del .key de forma segura ──────────────────────────────────
// Permite inyectar por variable de entorno para automatizacion local.
$password = trim((string) (getenv('CSD_KEY_PASSWORD') ?: ''));

if ($password === '') {
    echo "Contrasena del CSD .key (no se muestra): ";

    $sttyOk = false;
    if (PHP_OS_FAMILY !== 'Windows' && function_exists('shell_exec')) {
        $sttyOk = ((int) shell_exec('stty -echo >/dev/null 2>&1; echo $?') === 0);
    }

    $password = trim((string) fgets(STDIN));

    if ($sttyOk) {
        shell_exec('stty echo');
    }

    echo "\n";
}

if ($password === '') {
    fwrite(STDERR, "ERROR: Contrasena vacia.\n");
    exit(1);
}

if ($password === 'TU_PASSWORD_KEY') {
    fwrite(STDERR, "ERROR: Detectado password placeholder 'TU_PASSWORD_KEY'. Usa la contrasena REAL del archivo .key.\n");
    exit(1);
}

if (preg_match('/^(AQUI_|CHANGE_ME|REPLACE_ME|YOUR_)/i', $password) === 1) {
    fwrite(STDERR, "ERROR: Detectado password placeholder ($password). Usa la contrasena REAL del archivo .key.\n");
    exit(1);
}

// ── Cargar .cer ──────────────────────────────────────────────────────────────
if ($CER_PATH === '' || !file_exists($CER_PATH)) {
    fwrite(STDERR, "ERROR: No existe .cer. Intenta exportar CSD_CER_PATH con ruta completa.\n");
    fwrite(STDERR, "Ejemplo: CSD_CER_PATH=C:\\\\Users\\\\victo\\\\Documents\\\\Tigre-Labs\\\\00001000000725699623.cer\n");
    exit(1);
}
$cerDer      = file_get_contents($CER_PATH);
$cerBase64   = base64_encode($cerDer);
$noCert      = '';

// Extraer NoCertificado del Subject Serial Number del .cer
$x509 = @openssl_x509_read("file://$CER_PATH");
if ($x509 === false) {
    // Intentar con formato DER -> PEM
    $cerPem = "-----BEGIN CERTIFICATE-----\n" . chunk_split(base64_encode($cerDer), 64) . "-----END CERTIFICATE-----\n";
    $x509   = openssl_x509_read($cerPem);
}
if ($x509 === false) {
    fwrite(STDERR, "ERROR: No se pudo leer el .cer\n");
    exit(1);
}
$certInfo = openssl_x509_parse($x509);
$serialRaw = (string) ($certInfo['serialNumber'] ?? $certInfo['serialNumberHex'] ?? '');
$noCert = normalizarNoCertificadoSAT($serialRaw);
$EMISOR_NOMBRE = resolveEmisorNombre($certInfo, $EMISOR_NOMBRE_ENV);
$EMISOR_REGIMEN = resolveEmisorRegimenFiscal($EMISOR_RFC, $EMISOR_REGIMEN_ENV);

echo "NoCertificado: $noCert\n";
echo "Timbox env: $TIMBOX_ENV\n";
echo "Timbox wsdl: $TIMBOX_WSDL\n";
echo "Timbox dry-run: " . ($DRY_RUN ? 'true' : 'false') . "\n";
echo "Timbox unsafe-manual-cadena: " . ($ALLOW_UNSAFE_MANUAL_CADENA ? 'true' : 'false') . "\n";
echo "Timbox auto-refresh-fecha: " . ($AUTO_REFRESH_FECHA ? 'true' : 'false') . "\n";
echo "RFC emisor objetivo: $EMISOR_RFC\n";
if ($EMISOR_NOMBRE !== '') {
    echo "Nombre emisor objetivo: $EMISOR_NOMBRE\n";
}
if ($EMISOR_REGIMEN !== '') {
    echo "Regimen fiscal emisor objetivo: $EMISOR_REGIMEN\n";
}

if ($TIMBOX_ENV === 'staging' && !$ALLOW_NON_TEST_RFC_STAGING && !isKnownStagingRfc($EMISOR_RFC)) {
    fwrite(STDERR, "ERROR: RFC emisor no permitido para ambiente de pruebas Timbox: $EMISOR_RFC\n");
    fwrite(STDERR, "ERROR: En staging usa un RFC de pruebas con CSD de pruebas que le corresponda, o cambia a TIMBOX_ENV=production con credenciales/certificado reales de produccion.\n");
    fwrite(STDERR, "ERROR: Si quieres omitir este precheck local, exporta TIMBOX_ALLOW_NON_TEST_RFC_STAGING=true (Timbox aun puede rechazar).\n");
    exit(1);
}

// ── Desencriptar .key ────────────────────────────────────────────────────────
if ($KEY_PATH === '' || !file_exists($KEY_PATH)) {
    fwrite(STDERR, "ERROR: No existe .key. Intenta exportar CSD_KEY_PATH con ruta completa.\n");
    fwrite(STDERR, "Ejemplo: CSD_KEY_PATH=C:\\\\Users\\\\victo\\\\Documents\\\\Tigre-Labs\\\\CSD_MATRIZ_SALV880427GW4_20260609_032347.key\n");
    exit(1);
}

$keyDer    = file_get_contents($KEY_PATH);
$privateKey = loadPrivateKeyFromFile($KEY_PATH, $password);
if ($privateKey === false) {
    fwrite(STDERR, "ERROR: No se pudo desencriptar el .key. Revisa contrasena y formato de llave (PEM/DER).\n");
    fwrite(STDERR, openssl_error_string() . "\n");
    exit(1);
}
echo "Llave privada cargada OK\n";

// ── Preparar XML base (sin Sello) ────────────────────────────────────────────
if (!file_exists($XML_PATH)) {
    fwrite(STDERR, "ERROR: No existe XML en $XML_PATH\n");
    exit(1);
}

$xmlContent = file_get_contents($XML_PATH);

$fechaRefresh = refreshComprobanteFecha($xmlContent, $AUTO_REFRESH_FECHA);
$xmlContent = $fechaRefresh['xml'];
if ($fechaRefresh['original'] !== '') {
    echo "Fecha original CFDI: {$fechaRefresh['original']}\n";
}
if ($fechaRefresh['updated'] !== '') {
    echo "Fecha vigente CFDI: {$fechaRefresh['updated']}\n";
}

$descuentoNormalization = normalizeComprobanteDescuento($xmlContent);
$xmlContent = $descuentoNormalization['xml'];
if ($descuentoNormalization['applied']) {
    echo "Descuento comprobante normalizado: {$descuentoNormalization['summary']}\n";
}

// Actualizar NoCertificado y Certificado en el XML
$xmlContent = preg_replace('/\bCertificado="[^"]*"/', "Certificado=\"$cerBase64\"", $xmlContent);
$xmlContent = preg_replace('/\bNoCertificado="[^"]*"/', "NoCertificado=\"$noCert\"", $xmlContent);
$xmlContent = preg_replace_callback(
    '/(<cfdi:Emisor\b[^>]*\bRfc=")[^"]*(")/i',
    static fn(array $m): string => $m[1] . $EMISOR_RFC . $m[2],
    $xmlContent,
    1
);
if ($EMISOR_NOMBRE !== '') {
    $emisorNombreXml = htmlspecialchars($EMISOR_NOMBRE, ENT_QUOTES | ENT_XML1, 'UTF-8');
    $xmlContent = preg_replace_callback(
        '/(<cfdi:Emisor\b[^>]*\bNombre=")[^"]*(")/i',
        static fn(array $m): string => $m[1] . $emisorNombreXml . $m[2],
        $xmlContent,
        1
    );
}
if ($EMISOR_REGIMEN !== '') {
    $xmlContent = preg_replace_callback(
        '/(<cfdi:Emisor\b[^>]*\bRegimenFiscal=")[^"]*(")/i',
        static fn(array $m): string => $m[1] . $EMISOR_REGIMEN . $m[2],
        $xmlContent,
        1
    );
}

// Quitar Sello actual para calcular cadena original limpia
$xmlContent = preg_replace('/Sello="[^"]*"/', 'Sello=""', $xmlContent);

// ── Generar cadena original via XSLT ─────────────────────────────────────────
echo "Descargando XSLT cadena original...\n";

if (!class_exists('XSLTProcessor')) {
    if ($ALLOW_UNSAFE_MANUAL_CADENA) {
        fwrite(STDERR, "WARN: XSLTProcessor no disponible. Usando cadena manual por contingencia (riesgo de rechazo por digest).\n");
        $cadena = generarCadenaOriginalManual($xmlContent);
    } else {
        fwrite(STDERR, "ERROR: XSLTProcessor no disponible en este PHP. Instala/extiende PHP con soporte XSL para generar cadena original valida.\n");
        fwrite(STDERR, "ERROR: Si necesitas desbloqueo temporal, usa TIMBOX_ALLOW_UNSAFE_MANUAL_CADENA=true.\n");
        exit(1);
    }
}

if (!isset($cadena)) {
    $xsltContent = @file_get_contents($XSLT_URL);
    if ($xsltContent === false) {
        if ($ALLOW_UNSAFE_MANUAL_CADENA) {
            fwrite(STDERR, "WARN: No se pudo descargar XSLT oficial SAT. Usando cadena manual por contingencia (riesgo de rechazo por digest).\n");
            $cadena = generarCadenaOriginalManual($xmlContent);
        } else {
            fwrite(STDERR, "ERROR: No se pudo descargar XSLT oficial SAT desde $XSLT_URL.\n");
            fwrite(STDERR, "ERROR: Sin XSLT oficial no se genera cadena valida y el sello sera rechazado.\n");
            fwrite(STDERR, "ERROR: Si necesitas desbloqueo temporal, usa TIMBOX_ALLOW_UNSAFE_MANUAL_CADENA=true.\n");
            exit(1);
        }
    } else {
        $xsl = new DOMDocument();
        $xsl->loadXML($xsltContent);

        $xml = new DOMDocument();
        $xml->loadXML($xmlContent);

        $processor = new XSLTProcessor();
        $processor->importStylesheet($xsl);
        $cadena = $processor->transformToXml($xml);
        if ($cadena === false || $cadena === null) {
            fwrite(STDERR, "ERROR: Fallo la transformacion XSLT\n");
            exit(1);
        }
        $cadena = trim($cadena);
    }
}

echo "Cadena original (primeros 100 chars): " . substr($cadena, 0, 100) . "...\n";

// ── Firmar con SHA256withRSA ──────────────────────────────────────────────────
$signature = '';
$ok = openssl_sign($cadena, $signature, $privateKey, OPENSSL_ALGO_SHA256);
if (!$ok) {
    fwrite(STDERR, "ERROR: No se pudo firmar: " . openssl_error_string() . "\n");
    exit(1);
}
$sello = base64_encode($signature);
echo "Sello generado OK (" . strlen($sello) . " chars)\n";

// ── Actualizar Sello en XML ──────────────────────────────────────────────────
$xmlFirmado = preg_replace('/Sello=""/', "Sello=\"$sello\"", $xmlContent);

// Guardar XML firmado
$xmlFirmadoPath = $SIGNED_XML_PATH;
file_put_contents($xmlFirmadoPath, $xmlFirmado);
echo "XML firmado guardado en: $xmlFirmadoPath\n";

if ($DRY_RUN) {
    echo "\nDRY RUN activo. No se envio a Timbox.\n";
    exit(0);
}

// ── Enviar a Timbox ──────────────────────────────────────────────────────────
echo "\nEnviando a Timbox ($TIMBOX_ENV)...\n";
$xmlBase64 = base64_encode($xmlFirmado);

$parametros = array(
    'username' => $TIMBOX_USERNAME,
    'password' => $TIMBOX_PASSWORD,
    'sxml'     => $xmlBase64,
);

try {
    $client   = new SoapClient($TIMBOX_WSDL, ['exceptions' => true, 'trace' => 1]);
    $respuesta = $client->__soapCall('timbrar_cfdi', $parametros);

    $xmlTimbrado = '';
    if (isset($respuesta->xml)) {
        $xmlTimbrado = is_string($respuesta->xml) ? $respuesta->xml : (string)($respuesta->xml ?? '');
    } elseif (is_string($respuesta)) {
        $xmlTimbrado = $respuesta;
    }

    if (empty($xmlTimbrado)) {
        fwrite(STDERR, "ERROR: Timbox devolvio respuesta vacia\n");
        exit(1);
    }

    $uuid = '';
    if (preg_match('/UUID="([A-Fa-f0-9\-]{36})"/', $xmlTimbrado, $m)) {
        $uuid = $m[1];
    }

    echo "\n========================================\n";
    echo "TIMBRADO EXITOSO\n";
    echo "UUID: $uuid\n";
    echo "========================================\n";

    // Guardar XML timbrado
    $timbradoPath = $TIMBRADO_XML_PATH;
    file_put_contents($timbradoPath, $xmlTimbrado);
    echo "XML timbrado guardado en: $timbradoPath\n";

} catch (Throwable $e) {
    fwrite(STDERR, "\nERROR Timbox: " . $e->getMessage() . "\n");
    exit(1);
}

function resolveExistingPath(array $candidates): string
{
    foreach ($candidates as $candidate) {
        $candidate = trim((string) $candidate);
        if ($candidate === '') {
            continue;
        }

        if (file_exists($candidate)) {
            return $candidate;
        }

        // Convierte rutas tipo /c/Users/... a C:\Users\... para php.exe nativo.
        if (preg_match('#^/([a-zA-Z])/(.+)$#', $candidate, $m) === 1) {
            $winPath = strtoupper($m[1]) . ':\\' . str_replace('/', '\\', $m[2]);
            if (file_exists($winPath)) {
                return $winPath;
            }
        }
    }

    return '';
}

function normalizarNoCertificadoSAT(string $serialRaw): string
{
    $serialRaw = trim($serialRaw);

    if ($serialRaw === '') {
        return '';
    }

    // Algunos certificados regresan 0x3030... (hex del texto ASCII "000010...").
    if (str_starts_with(strtolower($serialRaw), '0x')) {
        $hex = substr($serialRaw, 2);
        if ($hex !== '' && ctype_xdigit($hex) && (strlen($hex) % 2 === 0)) {
            $decoded = @hex2bin($hex);
            if ($decoded !== false) {
                $decoded = trim($decoded);
                if ($decoded !== '' && ctype_digit($decoded)) {
                    return str_pad($decoded, 20, '0', STR_PAD_LEFT);
                }
            }
        }
    }

    if (ctype_digit($serialRaw)) {
        return str_pad($serialRaw, 20, '0', STR_PAD_LEFT);
    }

    if (ctype_xdigit($serialRaw)) {
        $dec = base_convert($serialRaw, 16, 10);
        if ($dec !== '') {
            return str_pad($dec, 20, '0', STR_PAD_LEFT);
        }
    }

    return $serialRaw;
}

function generarCadenaOriginalManual(string $xml): string
{
    $doc = new DOMDocument();
    $doc->loadXML($xml);
    $root = $doc->documentElement;

    $attrs = [];
    $attrOrder = ['Version','Serie','Folio','Fecha','FormaPago','NoCertificado',
                  'SubTotal','Descuento','Moneda','TipoCambio','Total',
                  'TipoDeComprobante','Exportacion','MetodoPago','LugarExpedicion'];

    foreach ($attrOrder as $name) {
        $val = $root->getAttribute($name);
        if ($val !== '') {
            $attrs[] = $val;
        }
    }

    return '||4.0|' . implode('|', $attrs) . '||';
}

function loadPrivateKeyFromFile(string $keyPath, string $password): mixed
{
    $raw = file_get_contents($keyPath);
    if ($raw === false || $raw === '') {
        return false;
    }

    $candidates = [];

    // Caso PEM directo (.key.pem o similar).
    if (str_contains($raw, '-----BEGIN')) {
        $candidates[] = $raw;
        $candidates[] = "file://$keyPath";
    } else {
        // Caso DER (frecuente en CSD .key del SAT).
        $keyBase64 = base64_encode($raw);
        $candidates[] = "-----BEGIN ENCRYPTED PRIVATE KEY-----\n" . chunk_split($keyBase64, 64) . "-----END ENCRYPTED PRIVATE KEY-----\n";
        $candidates[] = "-----BEGIN PRIVATE KEY-----\n" . chunk_split($keyBase64, 64) . "-----END PRIVATE KEY-----\n";
        $candidates[] = "-----BEGIN RSA PRIVATE KEY-----\n" . chunk_split($keyBase64, 64) . "-----END RSA PRIVATE KEY-----\n";
    }

    foreach ($candidates as $candidate) {
        $key = @openssl_pkey_get_private($candidate, $password);
        if ($key !== false) {
            return $key;
        }
    }

    return false;
}

function isKnownStagingRfc(string $rfc): bool
{
    $known = [
        'AAA010101AAA',
        'XAXX010101000',
        'XEXX010101000',
        'EKU9003173C9',
        'BASM970620AZA',
        'COSC8001137NA',
    ];

    return in_array(strtoupper(trim($rfc)), $known, true);
}

function resolveEmisorNombre(array $certInfo, string $envName): string
{
    $envName = trim($envName);
    if ($envName !== '') {
        return $envName;
    }

    $subject = $certInfo['subject'] ?? [];
    if (!is_array($subject)) {
        return '';
    }

    foreach (['name', 'CN', 'O', 'OU'] as $candidateKey) {
        $candidate = trim((string) ($subject[$candidateKey] ?? ''));
        if ($candidate !== '') {
            return $candidate;
        }
    }

    return '';
}

function resolveEmisorRegimenFiscal(string $rfc, string $envRegimen): string
{
    $envRegimen = trim($envRegimen);
    if ($envRegimen !== '') {
        return $envRegimen;
    }

    $rfc = strtoupper(trim($rfc));
    // RFC 13 chars -> persona fisica. RFC 12 chars -> persona moral.
    if (strlen($rfc) === 13) {
        return '612';
    }
    if (strlen($rfc) === 12) {
        return '601';
    }

    return '';
}

function refreshComprobanteFecha(string $xml, bool $enabled): array
{
    $doc = new DOMDocument();
    if (@$doc->loadXML($xml) === false) {
        return [
            'xml' => $xml,
            'original' => '',
            'updated' => '',
        ];
    }

    $root = $doc->documentElement;
    if (!$root) {
        return [
            'xml' => $xml,
            'original' => '',
            'updated' => '',
        ];
    }

    $original = (string) $root->getAttribute('Fecha');
    $updated = $original;

    if ($enabled) {
        $now = new DateTimeImmutable('now', new DateTimeZone('America/Mexico_City'));
        $updated = $now->format('Y-m-d\\TH:i:s');
        $root->setAttribute('Fecha', $updated);
    }

    return [
        'xml' => $doc->saveXML(),
        'original' => $original,
        'updated' => $updated,
    ];
}

function normalizeComprobanteDescuento(string $xml): array
{
    $doc = new DOMDocument();
    if (@$doc->loadXML($xml) === false) {
        return [
            'xml' => $xml,
            'applied' => false,
            'summary' => '',
        ];
    }

    $xp = new DOMXPath($doc);
    $xp->registerNamespace('cfdi', 'http://www.sat.gob.mx/cfd/4');

    $comprobante = $xp->query('/cfdi:Comprobante')->item(0);
    if (!$comprobante instanceof DOMElement) {
        return [
            'xml' => $xml,
            'applied' => false,
            'summary' => '',
        ];
    }

    $conceptos = $xp->query('//cfdi:Concepto');
    $sum = 0.0;
    $countWithDiscount = 0;
    foreach ($conceptos as $concepto) {
        if (!$concepto instanceof DOMElement) {
            continue;
        }
        if ($concepto->hasAttribute('Descuento')) {
            $countWithDiscount++;
            $sum += (float) $concepto->getAttribute('Descuento');
        }
    }

    $sumRounded = number_format(round($sum, 2), 2, '.', '');
    if ($countWithDiscount > 0) {
        $comprobante->setAttribute('Descuento', $sumRounded);
        return [
            'xml' => $doc->saveXML(),
            'applied' => true,
            'summary' => $sumRounded,
        ];
    }

    if ($comprobante->hasAttribute('Descuento')) {
        $comprobante->removeAttribute('Descuento');
        return [
            'xml' => $doc->saveXML(),
            'applied' => true,
            'summary' => 'removed',
        ];
    }

    return [
        'xml' => $xml,
        'applied' => false,
        'summary' => '',
    ];
}
