# tom-car-voucher

Nezávislý generátor tisknutelného dárkového poukazu pro formulář na `https://www.tom-car.cz/poukaz`.

## Co je v repozitáři

- `voucher.js` – vanilla JS, který se sám napojí na existující formulář přes známé selektory.
- `voucher.css` – styly pro modal, náhled a tisk poukazu (poměr 1536×1024).
- `voucher.html` – demo stránka bez CMS pro rychlé lokální otestování.

## Důležité: podkladový obrázek

Prázdný obrázek poukazu je potřeba uložit přímo do repozitáře jako:

- `voucher-background.jpg`

Bezpečnostní/technická poznámka: obrázek z přílohy nelze spolehlivě načítat z veřejné URL, proto musí být uložen jako lokální soubor v projektu.

## Vložení do webu (CMS)

Stačí vložit **jeden JS soubor** a načíst CSS.

### 1) Nahraj soubory

Nahraj do webu minimálně:

- `voucher.js`
- `voucher.css`
- `voucher-background.jpg`

### 2) Přidej na stránku poukazu

Do stránky s formulářem přidej například:

```html
<link rel="stylesheet" href="/cesta-k-souborum/voucher.css">
<script defer src="/cesta-k-souborum/voucher.js"></script>
```

`voucher.js` se po načtení stránky sám napojí na formulář se selektory:

- osoba: `#frm-bsgrid-col126858-fullForm-person`
- email: `#frm-bsgrid-col126858-fullForm-email`
- telefon: `#frm-bsgrid-col126858-fullForm-phone`
- select částky: `#frm-bsgrid-col126858-fullForm-price`
- vlastní částka: `#frm-bsgrid-col126858-fullForm-customprice`
- formulář: `#frm-bsgrid-col126858-fullForm`

Do formuláře přidá tlačítko **„Zobrazit poukaz“** a otevře přístupný modal s akcemi:

- **Tisk poukazu** (funguje bez dalších knihoven)
- **Export PDF** (volitelný)
- **Zavřít**

Stávající submit/AJAX chování formuláře není měněné.

## Nastavení cesty k obrázku

Výchozí cesta je `voucher-background.jpg`.

Bez editace `voucher.js` ji můžeš změnit:

1. atributem na formuláři:

```html
<form id="frm-bsgrid-col126858-fullForm" data-voucher-background="/assets/voucher-background.jpg">
```

2. nebo globální konfigurací před načtením `voucher.js`:

```html
<script>
  window.VOUCHER_CONFIG = { backgroundImagePath: '/assets/voucher-background.jpg' };
</script>
```

## Tisk a PDF

- Tisk funguje nativně přes prohlížeč (`window.print`), ale nepoužívá tisk celého modalu: JavaScript si připraví samostatný skrytý iframe dokument obsahující jen voucher a ten teprve vytiskne.
- Díky tomu se při tisku nepropíše formulář, modal wrapper ani zbytková výška stránky a v běžných prohlížečích se vytiskne jen jedna landscape stránka s poměrem 1536×1024.
- PDF export je volitelný – pokud chceš tlačítko **Export PDF** aktivovat, přidej html2pdf.js přes CDN:

```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/html2pdf.js/0.10.1/html2pdf.bundle.min.js"></script>
```

Bez této knihovny je tisk stále plně funkční.

## Ladění pozic částek

V `voucher.css` jsou laditelné CSS proměnné pro obě textová místa (velká částka vlevo a částka v pravém odznaku), připravené pro podklad 1536×1024:

- `--voucher-main-left`, `--voucher-main-top`, `--voucher-main-width`
- `--voucher-badge-left`, `--voucher-badge-top`, `--voucher-badge-width`

Podle potřeby je lze jemně doladit bez změn JavaScriptu.

## Demo bez CMS

Otevři `voucher.html` v prohlížeči. Používá stejné ID selektory jako produkční formulář, takže lze snadno testovat generování poukazu lokálně.
