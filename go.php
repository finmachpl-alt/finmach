<?php
/* ═══════════════════════════════════════════════════════════════════
   FINMACH — go.php v2 · CENTRALNY HUB LINKÓW AFILIACYJNYCH
   ───────────────────────────────────────────────────────────────────
   Użycie:  /go.php?p=pragma&s=finmach&c=blog-transport
     p = partner (wymagany)
     s = serwis/źródło (opcjonalny, domyślnie: finmach)
     c = kampania/miejsce na stronie (opcjonalny)

   Stare linki ?p=partner działają bez zmian.

   Logowanie kliknięć:
     1) lokalny plik kliki.csv (natychmiast, zawsze działa)
     2) Google Sheets przez webhook GAS "FINMACH Kliki"
        — wpisz URL w GAS_KLIKI_URL poniżej po wdrożeniu Kliki.gs
   ═══════════════════════════════════════════════════════════════════ */

// ── KONFIGURACJA ────────────────────────────────────────────────────
// URL webhooka GAS "FINMACH Kliki" (zostaw pusty, jeśli jeszcze nie wdrożony)
const GAS_KLIKI_URL = '';

// Domyślny cel, gdy partner nieznany
const FALLBACK_URL = 'https://finmach.pl/';

// ── MAPA LINKÓW AFILIACYJNYCH ───────────────────────────────────────
$links = [
    // FAKTORING
    'faktoria'    => 'https://oferta.faktoria.pl/payflow?hs_preview=RIrEYeAl-372309924045',
    'pragma'      => 'https://online.pragmago.pl/faktoring-online/krok1?recommendation_code=952143',
    'pragmago'    => 'https://online.pragmago.pl/faktoring-online/krok1?recommendation_code=952143',
    'bibby'       => 'https://www.bibbyfinancialservices.pl/kontakt/?utm_source=finmach&utm_medium=broker',
    'efaktor'     => 'https://www.efaktor.pl/?utm_source=finmach&utm_medium=broker',
    'indos'       => 'https://www.indos.pl/kontakt/?utm_source=finmach',
    'teylor'      => 'https://app.teylor.io/pl/?utm_source=finmach',
    'abs'         => 'https://www.abs-faktoring.pl/?utm_source=finmach',

    // POJEDYNCZA FAKTURA / MIKRO
    'monevia'     => 'https://app.monevia.pl/?utm_source=finmach&utm_medium=broker',
    'finea'       => 'https://finea.pl/?utm_source=finmach&utm_medium=broker',
    'wecfina'     => 'https://wecfina.pl/?utm_source=finmach&utm_medium=broker',
    'nfg'         => 'https://sof.nfg.pl/Logowanie?partnerCode=payflow_o',

    // KONTRAKTY
    'faktorone'   => 'https://www.faktor.one/?utm_source=finmach&utm_medium=broker',

    // TERMINALE / MCA
    'wealthon'    => 'https://rejestracja.wealthon.com/nowy-wniosek/rejestracja?utm_source=PF_MB&utm_medium=offline&utm_campaign=POSCASH',
    'fiserv'      => 'https://www.fiserv.com/pl-pl/?utm_source=finmach',

    // KREDYTY / POŻYCZKI
    'smeo'        => 'https://smeo24.pl/seller?utm_source=275&utm_medium=broker',
    'novalend'    => 'https://novalend.pl/landing-long/?id=PCPR19108&channel=KALYPSO_BROKER_MARKETING',
    'pko'         => 'https://www.pkobp.pl/klienci-indywidualni/kredyty/?utm_source=finmach',
    'bnp'         => 'https://www.bnpparibas.pl/dla-firm/?utm_source=finmach',

    // NASZE LP / KONSULTACJE
    'doradca-jdg'    => 'https://finmach.pl/kredyt-jdg.html',
    'doradca-spolka' => 'https://finmach.pl/kredyt-spolka.html',
    'doradca'        => 'https://koalendar.com/e/bezplatna-rozmowa-o-finansowaniu-firmy',
];

// ── ODCZYT PARAMETRÓW ───────────────────────────────────────────────
$partner  = strtolower(trim($_GET['p'] ?? ''));
$serwis   = strtolower(trim($_GET['s'] ?? 'finmach'));
$kampania = strtolower(trim($_GET['c'] ?? ''));

// Sanityzacja: tylko litery, cyfry, myślnik, podkreślnik (max 60 znaków)
$czysc = function ($v) {
    return substr(preg_replace('/[^a-z0-9_\-]/', '', $v), 0, 60);
};
$partner  = $czysc($partner);
$serwis   = $czysc($serwis);
$kampania = $czysc($kampania);

$znany = isset($links[$partner]);
$cel   = $znany ? $links[$partner] : FALLBACK_URL;

// ── PRZEKIEROWANIE (najpierw user, potem logowanie) ─────────────────
header('Location: ' . $cel, true, 302);
header('Cache-Control: no-store');

// Domknij odpowiedź do przeglądarki — logowanie już nie opóźnia usera
if (function_exists('fastcgi_finish_request')) {
    fastcgi_finish_request();
} else {
    // Fallback: wypchnij bufor
    if (ob_get_level() > 0) { @ob_end_flush(); }
    @flush();
}

// ── LOGOWANIE 1: lokalny CSV (zawsze) ───────────────────────────────
$wiersz = [
    date('Y-m-d H:i:s'),
    $partner ?: '(brak)',
    $serwis,
    $kampania,
    $znany ? 'ok' : 'nieznany-partner',
    substr($_SERVER['HTTP_REFERER'] ?? '', 0, 200),
];
$fh = @fopen(__DIR__ . '/kliki.csv', 'a');
if ($fh) {
    @fputcsv($fh, $wiersz, ';');
    @fclose($fh);
}

// ── LOGOWANIE 2: Google Sheets przez GAS (jeśli skonfigurowany) ─────
if (GAS_KLIKI_URL !== '') {
    $url = GAS_KLIKI_URL
         . '?partner='  . urlencode($partner)
         . '&serwis='   . urlencode($serwis)
         . '&kampania=' . urlencode($kampania)
         . '&status='   . ($znany ? 'ok' : 'nieznany')
         . '&ref='      . urlencode(substr($_SERVER['HTTP_REFERER'] ?? '', 0, 200));

    if (function_exists('curl_init')) {
        $ch = curl_init($url);
        curl_setopt_array($ch, [
            CURLOPT_RETURNTRANSFER => true,
            CURLOPT_FOLLOWLOCATION => true,   // GAS zawsze robi redirect 302
            CURLOPT_TIMEOUT        => 5,
            CURLOPT_CONNECTTIMEOUT => 3,
        ]);
        @curl_exec($ch);
        @curl_close($ch);
    } else {
        $ctx = stream_context_create(['http' => ['timeout' => 5]]);
        @file_get_contents($url, false, $ctx);
    }
}
exit;
