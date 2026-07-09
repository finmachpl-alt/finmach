<?php
/**
 * FINMACH - weryfikacja NIP v2.1 (FIX)
 * 1) Biała lista MF - nazwa, adres, status VAT, KRS, data rej. VAT
 * 2) Jeśli jest KRS -> otwarte API KRS - dokładna forma prawna i data rejestracji
 * FIX v2.1: usunięty MB_CASE_SENTENCE (nie istnieje w PHP), sekcja KRS
 * opakowana tak, że jej awaria NIGDY nie psuje podstawowej odpowiedzi.
 */
ini_set('display_errors', '0');
header('Access-Control-Allow-Origin: *');
header('Content-Type: application/json');

$nip = preg_replace('/\D/', '', $_GET['nip'] ?? '');
if (strlen($nip) !== 10) {
    echo json_encode(['error' => 'Nieprawidłowy NIP']);
    exit;
}

function fm_get($url) {
    $ctx = stream_context_create(['http' => ['timeout' => 6, 'ignore_errors' => true]]);
    return @file_get_contents($url, false, $ctx);
}

/* ── 1. Biała lista MF ── */
$date = date('Y-m-d');
$response = fm_get("https://wl-api.mf.gov.pl/api/search/nip/{$nip}?date={$date}");

if (!$response) {
    echo json_encode(['error' => 'Nie udało się pobrać danych']);
    exit;
}

$data = json_decode($response, true);
$p = $data['result']['subject'] ?? null;

if (!$p || empty($p['name'])) {
    echo json_encode(['error' => 'Nie znaleziono firmy']);
    exit;
}

$krs       = $p['krs'] ?? '';
$dataStart = $p['registrationLegalDate'] ?? '';
$zrodloD   = 'VAT';
$formaTxt  = !empty($krs) ? 'Spółka' : 'Jednoosobowa działalność gospodarcza';
$legalForm = !empty($krs) ? 'spzoo' : 'jdg';

/* ── 2. Spółka? Dociągamy dane z otwartego API KRS (całość fail-safe) ── */
if (!empty($krs)) {
    try {
        $krsResp = fm_get("https://api-krs.ms.gov.pl/api/krs/OdpisAktualny/{$krs}?rejestr=P&format=json");
        if ($krsResp) {
            $k = json_decode($krsResp, true);

            $fp = $k['odpis']['dane']['dzial1']['danePodmiotu']['formaPrawna'] ?? '';
            if ($fp) {
                /* Wielka litera na początku, reszta małymi - bez egzotycznych trybów mb */
                $lower = function_exists('mb_strtolower') ? mb_strtolower($fp, 'UTF-8') : strtolower($fp);
                $formaTxt = function_exists('mb_substr')
                    ? mb_strtoupper(mb_substr($lower, 0, 1, 'UTF-8'), 'UTF-8') . mb_substr($lower, 1, null, 'UTF-8')
                    : ucfirst($lower);

                $fpU = function_exists('mb_strtoupper') ? mb_strtoupper($fp, 'UTF-8') : strtoupper($fp);
                if (strpos($fpU, 'KOMANDYTOWO-AKCYJNA') !== false)  $legalForm = 'inna';
                elseif (strpos($fpU, 'AKCYJNA') !== false)          $legalForm = 'sa';
                elseif (strpos($fpU, 'OGRANICZON') !== false)       $legalForm = 'spzoo';
                else                                                $legalForm = 'inna';
            }

            $dr = $k['odpis']['naglowekA']['dataRejestracjiWKRS']
               ?? $k['odpis']['dane']['dzial1']['danePodmiotu']['dataRejestracjiWKRS']
               ?? '';
            if (!$dr && preg_match('/"dataRejestracji[^"]*"\s*:\s*"(\d{2}\.\d{2}\.\d{4}|\d{4}-\d{2}-\d{2})"/', $krsResp, $m)) {
                $dr = $m[1];
            }
            if ($dr) {
                if (preg_match('/^(\d{2})\.(\d{2})\.(\d{4})$/', $dr, $m)) $dr = "{$m[3]}-{$m[2]}-{$m[1]}";
                $dataStart = $dr;
                $zrodloD   = 'KRS';
            }
        }
    } catch (Throwable $e) {
        /* awaria KRS nie może zepsuć weryfikacji - jedziemy na danych z białej listy */
    }
}

/* ── 3. Wiek firmy w miesiącach ── */
$wiekMiesiecy = null;
if ($dataStart) {
    try {
        $start = new DateTime($dataStart);
        $now   = new DateTime();
        $diff  = $start->diff($now);
        $wiekMiesiecy = $diff->y * 12 + $diff->m;
    } catch (Exception $e) { $wiekMiesiecy = null; }
}

echo json_encode([
    'nazwa'        => $p['name'],
    'nip'          => $nip,
    'regon'        => $p['regon'] ?? '',
    'krs'          => $krs,
    'forma'        => $formaTxt,
    'legalForm'    => $legalForm,
    'dataRej'      => $p['registrationLegalDate'] ?? '',
    'dataStart'    => $dataStart,
    'zrodloDaty'   => $zrodloD,
    'wiekMiesiecy' => $wiekMiesiecy,
    'adres'        => $p['workingAddress'] ?? $p['residenceAddress'] ?? '',
    'status'       => ($p['statusVat'] ?? '') === 'Czynny' ? 'Aktywna (VAT czynny)' : ($p['statusVat'] ?? 'Aktywna'),
    'typ'          => !empty($krs) ? 'spolka' : 'jdg'
], JSON_UNESCAPED_UNICODE);
