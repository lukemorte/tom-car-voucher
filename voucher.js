(function () {
  'use strict';

  var SELECTORS = {
    form: '#frm-bsgrid-col126858-fullForm',
    person: '#frm-bsgrid-col126858-fullForm-person',
    email: '#frm-bsgrid-col126858-fullForm-email',
    phone: '#frm-bsgrid-col126858-fullForm-phone',
    price: '#frm-bsgrid-col126858-fullForm-price',
    customPrice: '#frm-bsgrid-col126858-fullForm-customprice'
  };

  var BACKGROUND_IMAGE_PATH = 'voucher-background.jpg';

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

  function buildModal() {
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
      '    <img class="voucher-canvas__image" alt="Dárkový poukaz" src="' + BACKGROUND_IMAGE_PATH + '">',
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

  function setAmountPreview(modal, amount) {
    var formatted = formatAmountCZK(amount);
    modal.querySelector('[data-voucher-main]').textContent = formatted;
    modal.querySelector('[data-voucher-badge]').textContent = formatted;
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

    var openBtn = document.createElement('button');
    openBtn.type = 'button';
    openBtn.className = 'voucher-open-btn';
    openBtn.textContent = 'Zobrazit poukaz';

    var modal = buildModal();

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
        window.print();
      }

      if (target.dataset.voucherAction === 'pdf') {
        if (typeof window.html2pdf === 'function') {
          var canvas = modal.querySelector('.voucher-canvas');
          window.html2pdf()
            .set({
              margin: 0,
              filename: 'poukaz.pdf',
              image: { type: 'jpeg', quality: 0.95 },
              html2canvas: { scale: 2, useCORS: true },
              jsPDF: { unit: 'px', format: [1536, 1024], orientation: 'landscape' }
            })
            .from(canvas)
            .save();
        } else {
          window.alert('PDF export je volitelný. Přidejte html2pdf.js přes CDN.');
        }
      }
    });

    document.addEventListener('keydown', function (event) {
      if (event.key === 'Escape' && !modal.hidden) {
        closeModal(modal);
      }
    });

    window.addEventListener('afterprint', function () {
      document.body.classList.remove('voucher-print-mode');
    });

  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initVoucher);
  } else {
    initVoucher();
  }
})();
