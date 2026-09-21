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
    document.body.classList.remove('voucher-print-mode');
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
        document.body.classList.add('voucher-print-mode');
        try {
          window.print();
        } finally {
          document.body.classList.remove('voucher-print-mode');
        }
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

      window.addEventListener('afterprint', function () {
        document.body.classList.remove('voucher-print-mode');
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
