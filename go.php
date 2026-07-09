<?php
/* ════════════════════════════════════════════════════════════════
   FINMACH — go.php  (maskowanie linków afiliacyjnych)
   Użycie:  https://finmach.pl/go.php?p=faktoria
   Prawdziwe linki są ukryte tutaj na serwerze — w mailach i na stronie
   widać tylko go.php?p=KOD, więc nikt nie podejrzy ani nie podmieni linku.
   Zmiana linku partnera = edycja tylko tego pliku.
   ════════════════════════════════════════════════════════════════ */

// Awaryjny adres, gdy partner nie ma jeszcze linku (kierujemy na nasz LP)
$LP_JDG    = "https://finmach.pl/kredyt-jdg.html";
$LP_SPOLKA = "https://finmach.pl/kredyt-spolka.html";

$links = array(

  // ── Faktoring ──────────────────────────────────────────────
  "faktoria"        => "https://oferta.faktoria.pl/payflow?hs_preview=RIrEYeAl-372309924045",
  "pragma"          => "https://online.pragmago.pl/faktoring-online/krok1?recommendation_code=952143",
  "bibby"           => "https://app.kalypso.pl/bibby/onboard/channel/promo_email/PCPR30461",
  "efaktor"         => "https://app.kalypso.pl/efaktor/onboard/channel/promo_sms/PCPR79004",
  "finea"           => "https://app.kalypso.pl/finea/onboard/channel/promo_sms/PCPR59847",
  "monevia"         => "https://www.monevia.pl/faktoring-pro/",
  "nfg"             => "https://sof.nfg.pl/Logowanie?partnerCode=payflow_o",
  "faktorone"       => "http://payflow.faktorone.pl/",

  // ── Indos (3 warianty) ─────────────────────────────────────
  "indos"           => "https://indos.pl/pm-faktoring-cichy/",
  "indos-jawny"     => "https://indos.pl/pm-faktoring-jawny/",
  "indos-pozyczka"  => "https://indos.pl/pm-pozyczka/",

  // ── SMEO ───────────────────────────────────────────────────
  "smeo"            => "https://smeo24.pl/seller?utm_source=275",
  "smeo-pozyczka"   => "https://pozyczka.smeo24.pl/?utm_source=275",

  // ── Pożyczki / inne ────────────────────────────────────────
  "wealthon"        => "https://rejestracja.wealthon.com/nowy-wniosek/rejestracja?utm_source=PF_MB&utm_medium=offline&utm_campaign=POSCASH",
  "novalend"        => "https://novalend.pl/landing-long/?id=PCPR19108&channel=KALYPSO_BROKER_MARKETING",

  // ── WEC ────────────────────────────────────────────────────
  "wec-pozyczka"            => "https://wecfina.pl/gotowka/?partner=profimax",
  "wec-faktury-zakupowe"    => "https://wecfina.pl/wniosek-raty/?partner=profimax",
  "wec-faktury-sprzedazowe" => "https://wecfina.pl/wniosek-faktoring/?partner=profimax",
  "wecfina"                 => "https://wecfina.pl/wniosek-faktoring/?partner=profimax",

  // ── Terminale ──────────────────────────────────────────────
  "pragma-terminale" => "https://online.pragmago.pl/faktoring-online/krok1?utm_source=strefapartnera&utm_medium=link&utm_campaign=faktoringonline&utm_term=b-244226&utm_content=url&recommendation_code=244226",
  "pragma-odwrotny"  => "https://online.pragmago.pl/faktoring-online/krok1?utm_source=strefapartnera&utm_medium=link&utm_campaign=faktoringonline&utm_term=b-244226&utm_content=url&recommendation_code=244226",

  // ── Gotówka bankowa (Comperia) ─────────────────────────────
  "pko"             => "https://www.comperialead.pl/a/pp.php?link=23b37e48418ac8149267595a49c34573&etykieta_=pay",
  "bnp"             => "https://www.comperialead.pl/a/pp.php?link=d8700881ab1b8b0a79a7c61b8d589231&etykieta_=pay",

  // ── Doradca FINMACH / nasze LP ─────────────────────────────
  "doradca-jdg"     => $LP_JDG,
  "doradca-spolka"  => $LP_SPOLKA,
  "lp-jdg"          => $LP_JDG,
  "lp-spolka"       => $LP_SPOLKA,

  // ── Partnerzy bez własnego linku → kierujemy na nasz LP ─────
  // (kontakt przez doradcę: IFIS, ABS, ING, PKO Faktoring, PEKAO,
  //  BNP Faktoring, Taylor, Fiserv, Finbee, Inne)
  "abs"             => $LP_JDG,
  "ifis"            => $LP_JDG,
  "ing"             => $LP_JDG,
  "ing-faktoring"   => $LP_JDG,
  "pko-faktoring"   => $LP_JDG,
  "pekao"           => $LP_JDG,
  "bnp-faktoring"   => $LP_JDG,
  "teylor"          => $LP_JDG,
  "taylor"          => $LP_JDG,
  "fiserv"          => $LP_JDG,
  "finbee"          => $LP_JDG,
  "inne"            => $LP_JDG,
);

// Pobierz kod partnera
$p = isset($_GET["p"]) ? strtolower(trim($_GET["p"])) : "";

// Znajdź link albo użyj awaryjnego LP
if ($p !== "" && isset($links[$p])) {
  $target = $links[$p];
} else {
  $target = $LP_JDG; // nieznany kod → bezpieczny fallback na nasz LP
}

// Przekieruj (302) i zakończ
header("Location: " . $target, true, 302);
exit;
?>
