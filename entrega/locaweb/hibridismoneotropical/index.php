<?php
// Proxy publico restrito. Nao recebe host, URL ou credenciais do visitante.
// Instalar somente em public_html/hibridismoneotropical/.
declare(strict_types=1);

const UPSTREAM = 'https://vivencialabs.vercel.app';
const BASE_PATH = '/hibridismoneotropical/';
const MAX_RESPONSE_BYTES = 33554432; // 32 MiB por arquivo publico.

$method = $_SERVER['REQUEST_METHOD'] ?? '';
function failResponse(int $status, string $message): void
{
    http_response_code($status);
    header('Content-Type: text/plain; charset=utf-8');
    header('Cache-Control: no-store');
    header('X-Content-Type-Options: nosniff');
    if (($_SERVER['REQUEST_METHOD'] ?? '') !== 'HEAD') {
        echo $message . "\n";
    }
    exit;
}

// Apenas esta rota admite POST. Todas as demais continuam GET/HEAD.
$rawPath = explode('?', $_SERVER['REQUEST_URI'] ?? '', 2)[0];
$isLeadPost = $method === 'POST' && $rawPath === BASE_PATH . 'api/leads';
if ($method !== 'GET' && $method !== 'HEAD' && !$isLeadPost) {
    header('Allow: ' . ($rawPath === BASE_PATH . 'api/leads' ? 'POST' : 'GET, HEAD'));
    failResponse(405, 'Metodo nao permitido.');
}
$postBody = null;
if ($isLeadPost) {
    $origin = $_SERVER['HTTP_ORIGIN'] ?? '';
    if ($origin !== '' && $origin !== 'https://vivencialab.com.br') {
        failResponse(403, 'Origem nao permitida.');
    }
    if (!preg_match('/^application\/json(?:\s*;|$)/i', $_SERVER['CONTENT_TYPE'] ?? '')) {
        failResponse(415, 'Envie dados em JSON.');
    }
    $input = fopen('php://input', 'rb');
    $postBody = $input === false ? false : stream_get_contents($input, 16385);
    if (is_resource($input)) { fclose($input); }
    if ($postBody === false || strlen($postBody) > 16384) {
        failResponse(413, 'Dados muito extensos.');
    }
    $payload = json_decode($postBody, true);
    if (!is_array($payload) || ($payload['material'] ?? '') !== 'estudo' || isset($payload['downloadReceipt'])) {
        failResponse(422, 'Somente cadastro de interesse no estudo e permitido.');
    }
}
if ($rawPath === rtrim(BASE_PATH, '/') || $rawPath === BASE_PATH . 'index.php') {
    header('Location: ' . BASE_PATH, true, 308);
    exit;
}
if (strncmp($rawPath, BASE_PATH, strlen(BASE_PATH)) !== 0) {
    failResponse(404, 'Caminho nao encontrado.');
}
$relative = substr($rawPath, strlen(BASE_PATH));
if (strlen($relative) > 2048 || preg_match('/%(?![0-9a-f]{2})/i', $relative)) {
    failResponse(400, 'Caminho invalido.');
}
$path = rawurldecode($relative);
// Proibe codificacao dupla, controles, barras invertidas e separadores codificados.
if (preg_match('/[\x00-\x1f\x7f\\\\%?#]/', $path) || preg_match('/%(?:2f|5c)/i', $relative)) {
    failResponse(400, 'Caminho invalido.');
}
if ($path !== '') {
    foreach (explode('/', $path) as $segment) {
        if ($segment === '' || $segment[0] === '.') {
            failResponse(404, 'Caminho nao permitido.');
        }
    }
    $publicFiles = ['styles.css', 'design.css', 'app.js', 'site-config.js'];
    $publicAsset = strncmp($path, 'assets/', 7) === 0
        && preg_match('/\.(?:svg|png|webp|jpe?g|gif|avif|ico|woff2?|ttf|otf|eot)$/iD', $path);
    if (!in_array($path, $publicFiles, true) && !$publicAsset && !$isLeadPost) {
        failResponse(404, 'Caminho nao permitido.');
    }
}

if (!extension_loaded('curl')) {
    failResponse(503, 'Extensao cURL indisponivel na hospedagem.');
}
$buffer = tmpfile();
if ($buffer === false) {
    failResponse(503, 'Proxy temporariamente indisponivel.');
}
// A origem publica usa nomes NFC; alguns URLs do CSS contem acentos NFD.
// O fallback cobre os acentos portugueses sem exigir a extensao intl.
if (class_exists('Normalizer')) {
    $normalized = Normalizer::normalize($path, Normalizer::FORM_C);
    if ($normalized !== false) {
        $path = $normalized;
    }
} else {
    $path = strtr($path, [
        "a\xCC\x83" => 'ã', "o\xCC\x83" => 'õ', "c\xCC\xA7" => 'ç',
        "a\xCC\x81" => 'á', "e\xCC\x81" => 'é', "i\xCC\x81" => 'í',
        "o\xCC\x81" => 'ó', "u\xCC\x81" => 'ú', "a\xCC\x80" => 'à',
        "a\xCC\x82" => 'â', "e\xCC\x82" => 'ê', "o\xCC\x82" => 'ô',
    ]);
}
$encodedPath = implode('/', array_map('rawurlencode', explode('/', $path)));
$curl = curl_init(UPSTREAM . '/' . $encodedPath);
if ($curl === false) {
    fclose($buffer);
    failResponse(502, 'Nao foi possivel carregar a landing.');
}
$bytes = 0;
$location = null;
curl_setopt_array($curl, [
    CURLOPT_FOLLOWLOCATION => false,
    CURLOPT_SSL_VERIFYPEER => true,
    CURLOPT_SSL_VERIFYHOST => 2,
    CURLOPT_CONNECTTIMEOUT => 10,
    CURLOPT_TIMEOUT => 45,
    CURLOPT_NOBODY => $method === 'HEAD',
    CURLOPT_ENCODING => '',
    CURLOPT_USERAGENT => 'VivenciaLab-PublicLandingProxy/1.0',
    // Sem cookies, Authorization, corpo ou headers recebidos do visitante.
    CURLOPT_HTTPHEADER => ['Accept: */*'],
    CURLOPT_HEADERFUNCTION => static function ($handle, string $header) use (&$location): int {
        if (stripos($header, 'HTTP/') === 0) {
            $location = null;
        } elseif (stripos($header, 'Location:') === 0) {
            $location = trim(substr($header, 9));
        }
        return strlen($header);
    },
    CURLOPT_WRITEFUNCTION => static function ($handle, string $chunk) use ($buffer, &$bytes): int {
        $bytes += strlen($chunk);
        if ($bytes > MAX_RESPONSE_BYTES) {
            return 0;
        }
        $written = fwrite($buffer, $chunk);
        return $written === false ? 0 : $written;
    },
]);
if (defined('CURLOPT_PROTOCOLS_STR')) {
    curl_setopt($curl, CURLOPT_PROTOCOLS_STR, 'https');
} else {
    curl_setopt($curl, CURLOPT_PROTOCOLS, CURLPROTO_HTTPS);
}
if ($isLeadPost) {
    curl_setopt_array($curl, [
        CURLOPT_POST => true,
        CURLOPT_POSTFIELDS => $postBody,
        CURLOPT_HTTPHEADER => ['Accept: application/json', 'Content-Type: application/json', 'Origin: https://vivencialab.com.br'],
    ]);
}
$ok = curl_exec($curl);
$status = (int) curl_getinfo($curl, CURLINFO_HTTP_CODE);
$contentType = curl_getinfo($curl, CURLINFO_CONTENT_TYPE);
unset($curl);
if ($ok === false || $status < 200 || $status > 599) {
    fclose($buffer);
    failResponse(502, 'Nao foi possivel carregar a landing. Tente novamente.');
}
// Nunca redireciona o navegador para outro host nem segue redirects no servidor.
if ($location !== null) {
    $target = parse_url($location);
    $sameHost = is_array($target)
        && (!isset($target['host']) || strtolower($target['host']) === 'vivencialabs.vercel.app')
        && (!isset($target['scheme']) || $target['scheme'] === 'https')
        && !isset($target['user']) && !isset($target['pass']) && !isset($target['port']);
    $targetPath = is_array($target) ? ($target['path'] ?? '/') : '';
    // Redirects somente para a raiz da landing; os demais nao sao necessarios.
    if (!$sameHost || $targetPath !== '/') {
        fclose($buffer);
        failResponse(502, 'Redirecionamento de origem nao permitido.');
    }
    header('Location: ' . BASE_PATH);
}
http_response_code($status);
header('Content-Type: ' . (is_string($contentType) && !preg_match('/[\r\n]/', $contentType)
    ? $contentType : 'application/octet-stream'));
header('X-Content-Type-Options: nosniff');
header('Cache-Control: no-store');
if (($method === 'GET' || $isLeadPost) && $status !== 204 && $status !== 304) {
    rewind($buffer);
    fpassthru($buffer);
}
fclose($buffer);
