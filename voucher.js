(function () {
  'use strict';

  var SELECTORS = {
    form: '#frm-bsgrid-col126858-fullForm',
    price: '#frm-bsgrid-col126858-fullForm-price',
    customPrice: '#frm-bsgrid-col126858-fullForm-customprice'
  };

  function getBackgroundImagePath(form) {
    var globalConfig = window.VOUCHER_CONFIG || {};
    return form.getAttribute('data-voucher-background') || globalConfig.backgroundImagePath || 'voucher-background.jpg';
  }
  var GLOBAL_EVENTS_BOUND = '__voucherGlobalEventsBound';
  var PRINT_FRAME_ID = 'voucher-print-frame';
  var PRINT_CUSTOM_PROPERTIES = [
    '--voucher-aspect-ratio',
    '--voucher-main-left',
    '--voucher-main-top',
    '--voucher-main-width',
    '--voucher-badge-left',
    '--voucher-badge-top',
    '--voucher-badge-width',
    '--voucher-main-font',
    '--voucher-badge-font'
  ];

  function safeText(value) {
    return (value == null ? '' : String(value)).trim();
  }

  function parseAmount(raw) {
    var cleaned = safeText(raw).replace(/\s+/g, '').replace(/,/g, '.').replace(/[^0-9.]/g, '');
    if (!cleaned) {
      return NaN;
    }
    return Number(cleaned);
  }

  function shouldUseCustomAmount(selectEl) {
    if (!selectEl) {
      return false;
    }

    var selectedOption = selectEl.options[selectEl.selectedIndex];
    var value = safeText(selectEl.value).toLowerCase();
    var label = selectedOption ? safeText(selectedOption.textContent).toLowerCase() : '';

    return (
      value === '' ||
      value === 'custom' ||
      value === 'other' ||
      value === 'own' ||
      value === 'vlastni' ||
      label.indexOf('vlast') !== -1
    );
  }

  function formatAmountCZK(amount) {
    return amount.toLocaleString('cs-CZ', {
      minimumFractionDigits: amount % 1 === 0 ? 0 : 2,
      maximumFractionDigits: 2
    }) + ' Kč';
  }

  function getAmount(selectEl, customEl) {
    var rawValue = shouldUseCustomAmount(selectEl) ? customEl && customEl.value : selectEl && selectEl.value;
    var amount = parseAmount(rawValue);

    if (!Number.isFinite(amount) || amount <= 0 || amount > 10000000) {
      return null;
    }

    return amount;
  }

  function buildModal(backgroundImagePath) {
    var modal = document.createElement('section');
    modal.className = 'voucher-modal';
    modal.hidden = true;
    modal.setAttribute('role', 'dialog');
    modal.setAttribute('aria-modal', 'true');
    modal.setAttribute('aria-labelledby', 'voucher-modal-title');

    modal.innerHTML = [
      '<div class="voucher-modal__backdrop" data-voucher-close="backdrop"></div>',
      '<div class="voucher-modal__content" role="document">',
      '  <h2 id="voucher-modal-title" class="voucher-sr-only">Náhled dárkového poukazu</h2>',
      '  <div class="voucher-actions">',
      '    <button type="button" data-voucher-action="print">Tisk poukazu</button>',
      '    <button type="button" data-voucher-action="pdf">Export PDF</button>',
      '    <button type="button" data-voucher-action="close">Zavřít</button>',
      '  </div>',
      '  <div class="voucher-canvas" aria-label="Náhled poukazu">',
      '    <img class="voucher-canvas__image" alt="Dárkový poukaz" src="' + backgroundImagePath + '">',
      '    <p class="voucher-amount-main" data-voucher-main>0 Kč</p>',
      '    <p class="voucher-amount-badge" data-voucher-badge>0 Kč</p>',
      '  </div>',
      '</div>'
    ].join('');

    document.body.appendChild(modal);
    return modal;
  }

  function openModal(modal) {
    modal.hidden = false;
    document.body.style.overflow = 'hidden';
    var closeButton = modal.querySelector('[data-voucher-action="close"]');
    if (closeButton) {
      closeButton.focus();
    }
  }

  function closeModal(modal) {
    modal.hidden = true;
    document.body.style.overflow = '';
    document.body.removeAttribute('data-voucher-printing');
    removePrintFrame();
  }

  function closeOpenVoucherModal() {
    var activeModal = document.querySelector('.voucher-modal:not([hidden])');
    if (activeModal) {
      closeModal(activeModal);
    }
  }

  function setAmountPreview(modal, amount) {
    var formatted = formatAmountCZK(amount);
    modal.querySelector('[data-voucher-main]').textContent = formatted;
    modal.querySelector('[data-voucher-badge]').textContent = formatted;
  }

  function buildPdfSource(modal) {
    var originalCanvas = modal.querySelector('.voucher-canvas');
    var clone = originalCanvas.cloneNode(true);

    clone.style.width = '1536px';
    clone.style.height = '1024px';
    clone.style.maxWidth = 'none';
    clone.style.position = 'fixed';
    clone.style.left = '-99999px';
    clone.style.top = '0';
    clone.style.margin = '0';

    document.body.appendChild(clone);
    return clone;
  }

  function getPrintCssVariables() {
    var rootStyles = window.getComputedStyle(document.documentElement);

    return PRINT_CUSTOM_PROPERTIES.map(function (name) {
      var value = rootStyles.getPropertyValue(name).trim();
      return value ? '  ' + name + ': ' + value + ';' : '';
    }).filter(Boolean).join('\n');
  }

  function getPrintStyles() {
    return [
      ':root {',
      getPrintCssVariables(),
      '}',
      '@page {',
      '  size: landscape;',
      '  margin: 0;',
      '}',
      'html, body {',
      '  margin: 0;',
      '  padding: 0;',
      '  width: 100%;',
      '  background: #fff;',
      '}',
      'body {',
      '  overflow: hidden;',
      '  -webkit-print-color-adjust: exact;',
      '  print-color-adjust: exact;',
      '}',
      '.voucher-print-root {',
      '  width: 16in;',
      '  max-width: 100%;',
      '  margin: 0 auto;',
      '  overflow: hidden;',
      '  break-before: avoid;',
      '  break-after: avoid;',
      '  page-break-before: avoid;',
      '  page-break-after: avoid;',
      '}',
      '.voucher-canvas {',
      '  position: relative;',
      '  width: 100%;',
      '  max-width: 100%;',
      '  margin: 0;',
      '  aspect-ratio: var(--voucher-aspect-ratio, 1536 / 1024);',
      '  overflow: hidden;',
      '  break-inside: avoid;',
      '  page-break-inside: avoid;',
      '  background: #fff;',
      '}',
      '.voucher-canvas__image {',
      '  position: absolute;',
      '  inset: 0;',
      '  width: 100%;',
      '  height: 100%;',
      '  object-fit: cover;',
      '}',
      '.voucher-amount-main,',
      '.voucher-amount-badge {',
      '  position: absolute;',
      '  margin: 0;',
      '  color: #111827;',
      '  font-family: "Segoe UI", Tahoma, Arial, sans-serif;',
      '  font-weight: 700;',
      '  line-height: 1;',
      '  letter-spacing: 0.01em;',
      '  text-align: center;',
      '  white-space: nowrap;',
      '  text-shadow: 0 1px 2px rgba(255, 255, 255, 0.35);',
      '}',
      '.voucher-amount-main {',
      '  left: var(--voucher-main-left);',
      '  top: var(--voucher-main-top);',
      '  width: var(--voucher-main-width);',
      '  font-size: var(--voucher-main-font);',
      '}',
      '.voucher-amount-badge {',
      '  left: var(--voucher-badge-left);',
      '  top: var(--voucher-badge-top);',
      '  width: var(--voucher-badge-width);',
      '  font-size: var(--voucher-badge-font);',
      '}'
    ].join('\n');
  }

  function waitForImage(image) {
    return new Promise(function (resolve) {
      if (!image || image.complete) {
        resolve();
        return;
      }

      function finish() {
        image.removeEventListener('load', finish);
        image.removeEventListener('error', finish);
        resolve();
      }

      image.addEventListener('load', finish, { once: true });
      image.addEventListener('error', finish, { once: true });
    });
  }

  function waitForFonts(frameDocument) {
    if (!frameDocument.fonts || typeof frameDocument.fonts.ready === 'undefined') {
      return Promise.resolve();
    }

    return frameDocument.fonts.ready.catch(function () {
      return undefined;
    });
  }

  function waitForNextFrame(frameWindow) {
    return new Promise(function (resolve) {
      var raf = frameWindow.requestAnimationFrame || function (callback) {
        return frameWindow.setTimeout(callback, 16);
      };

      raf(function () {
        raf(resolve);
      });
    });
  }

  function removePrintFrame() {
    var existingFrame = document.getElementById(PRINT_FRAME_ID);
    if (existingFrame) {
      existingFrame.remove();
    }
  }

  function createPrintFrame(modal) {
    removePrintFrame();

    var voucherCanvas = modal.querySelector('.voucher-canvas');
    var frame = document.createElement('iframe');
    frame.id = PRINT_FRAME_ID;
    frame.className = 'voucher-print-frame';
    frame.setAttribute('title', 'Tisk dárkového poukazu');

    document.body.appendChild(frame);

    var frameDoc = frame.contentWindow.document;
    frameDoc.open();
    frameDoc.write([
      '<!doctype html>',
      '<html lang="cs">',
      '<head>',
      '  <meta charset="utf-8">',
      '  <meta name="viewport" content="width=device-width, initial-scale=1">',
      '  <title>Tisk dárkového poukazu</title>',
      '  <style>' + getPrintStyles() + '</style>',
      '</head>',
      '<body>',
      '  <div class="voucher-print-root">' + voucherCanvas.outerHTML + '</div>',
      '</body>',
      '</html>'
    ].join(''));
    frameDoc.close();

    return frame;
  }

  function printVoucher(modal) {
    if (document.body.dataset.voucherPrinting === '1') {
      return;
    }

    document.body.dataset.voucherPrinting = '1';

    var printFrame = createPrintFrame(modal);
    var printWindow = printFrame.contentWindow;
    var finished = false;

    function cleanup() {
      if (finished) {
        return;
      }

      finished = true;
      document.body.removeAttribute('data-voucher-printing');
      removePrintFrame();
      window.removeEventListener('focus', handleFocus);
    }

    function handleFocus() {
      window.setTimeout(cleanup, 0);
    }

    printWindow.addEventListener('afterprint', cleanup, { once: true });
    window.addEventListener('focus', handleFocus, { once: true });

    waitForImage(printWindow.document.querySelector('.voucher-canvas__image'))
      .then(function () {
        return waitForFonts(printWindow.document);
      })
      .then(function () {
        return waitForNextFrame(printWindow);
      })
      .then(function () {
        printWindow.focus();
        printWindow.print();
      })
      .catch(function () {
        cleanup();
        window.alert('Nepodařilo se připravit tisk poukazu. Zkuste to prosím znovu.');
      });
  }

  function initVoucher() {
    var form = document.querySelector(SELECTORS.form);
    if (!form) {
      return;
    }

    var priceSelect = document.querySelector(SELECTORS.price);
    var customPriceInput = document.querySelector(SELECTORS.customPrice);

    if (!priceSelect || !customPriceInput) {
      return;
    }
    if (form.dataset.voucherInitialized === '1') {
      return;
    }
    form.dataset.voucherInitialized = '1';

    var openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'voucher-open-btn';
    openBtn.textContent = 'Zobrazit poukaz';

    var modal = buildModal(getBackgroundImagePath(form));

    openBtn.addEventListener('click', function () {
      var amount = getAmount(priceSelect, customPriceInput);
      if (amount == null) {
        window.alert('Zadejte prosím platnou částku poukazu.');
        return;
      }

      setAmountPreview(modal, amount);
      openModal(modal);
    });

    var submitAnchor = form.querySelector('button[type="submit"], input[type="submit"]');
    if (submitAnchor && submitAnchor.parentNode) {
      submitAnchor.parentNode.insertBefore(openBtn, submitAnchor.nextSibling);
    } else {
      form.appendChild(openBtn);
    }

    modal.addEventListener('click', function (event) {
      var target = event.target;
      if (!(target instanceof HTMLElement)) {
        return;
      }

      if (target.dataset.voucherClose === 'backdrop' || target.dataset.voucherAction === 'close') {
        closeModal(modal);
      }

      if (target.dataset.voucherAction === 'print') {
        printVoucher(modal);
      }

      if (target.dataset.voucherAction === 'pdf') {
        if (typeof window.html2pdf === 'function') {
          var canvas;
          try {
            canvas = buildPdfSource(modal);
            var worker = window.html2pdf()
              .set({
                margin: 0,
                filename: 'poukaz.pdf',
                image: { type: 'jpeg', quality: 0.95 },
                html2canvas: { scale: 2, useCORS: true },
                jsPDF: { unit: 'in', format: [16, 10.6667], orientation: 'landscape' }
              })
              .from(canvas)
              .save();

            if (worker && typeof worker.then === 'function') {
              worker.then(function () {
                canvas.remove();
              }, function () {
                canvas.remove();
              });
            } else if (canvas) {
              canvas.remove();
            }
          } catch (error) {
            if (canvas) {
              canvas.remove();
            }
            window.alert('Nepodařilo se vytvořit PDF. Zkuste to prosím znovu.');
          }
        } else {
          window.alert('PDF export je volitelný. Přidejte html2pdf.js přes CDN.');
        }
      }
    });

    if (!window[GLOBAL_EVENTS_BOUND]) {
      document.addEventListener('keydown', function (event) {
        if (event.key === 'Escape') {
          closeOpenVoucherModal();
        }
      });

      window[GLOBAL_EVENTS_BOUND] = true;
    }

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoucher);
  } else {
    initVoucher();
  }
})();
