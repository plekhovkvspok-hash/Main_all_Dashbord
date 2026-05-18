(function () {
  const sheetUrl = 'https://docs.google.com/spreadsheets/d/1xsd_YD_1k_SOgBm8LtvE9DUrTtvRwIlmwrj5_n2jUxQ/export?format=csv&gid=2111248717';
  const sheetProxyUrl = '/api/sheet';
  const today = new Date(2026, 4, 18);
  const state = {
    rows: [],
    filtered: [],
    headerMap: {},
  };

  const els = {
    loadGoogleBtn: document.getElementById('loadGoogleBtn'),
    csvFileInput: document.getElementById('csvFileInput'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    complexFilter: document.getElementById('complexFilter'),
    ownerFilter: document.getElementById('ownerFilter'),
    statusFilter: document.getElementById('statusFilter'),
    searchInput: document.getElementById('searchInput'),
    notice: document.getElementById('notice'),
    totalCount: document.getElementById('totalCount'),
    activeCount: document.getElementById('activeCount'),
    completedCount: document.getElementById('completedCount'),
    riskCount: document.getElementById('riskCount'),
    hoursTotal: document.getElementById('hoursTotal'),
    resourceGap: document.getElementById('resourceGap'),
    gantt: document.getElementById('gantt'),
    ganttRange: document.getElementById('ganttRange'),
    resourceList: document.getElementById('resourceList'),
    riskList: document.getElementById('riskList'),
    riskSummary: document.getElementById('riskSummary'),
    registryBody: document.getElementById('registryBody'),
    rowsCount: document.getElementById('rowsCount'),
  };

  init();

  function init() {
    const start = new Date(today);
    start.setDate(1);
    const end = new Date(today);
    end.setMonth(end.getMonth() + 5);
    els.dateFrom.value = toInputDate(start);
    els.dateTo.value = toInputDate(end);

    els.loadGoogleBtn.addEventListener('click', () => loadFromGoogle(true));
    els.csvFileInput.addEventListener('change', loadFromFile);
    [els.dateFrom, els.dateTo, els.complexFilter, els.ownerFilter, els.statusFilter, els.searchInput].forEach((el) => {
      el.addEventListener('input', applyFilters);
    });

    showNotice('Загрузите данные из Google Sheets или выберите CSV-файл. Инструмент не изменяет исходную таблицу.');
    loadFromGoogle(false);
    setInterval(() => loadFromGoogle(false), 60 * 60 * 1000);
  }

  async function loadFromGoogle(forceRefresh) {
    const force = forceRefresh === true;
    if (window.location.protocol !== 'file:') {
      showNotice('Загружаю свежие данные из Google Sheets через Netlify Function...');
      try {
        const url = force ? `${sheetProxyUrl}?refresh=${Date.now()}` : sheetProxyUrl;
        const response = await fetch(url, { cache: force ? 'no-store' : 'default' });
        if (!response.ok) throw new Error(`HTTP ${response.status}`);
        const text = await response.text();
        ingest(text);
        showNotice('Данные загружены напрямую из Google Sheets через Netlify Function.');
        return;
      } catch (error) {
        if (window.OSS_CSV_DATA) {
          ingest(window.OSS_CSV_DATA);
          showNotice('Онлайн-загрузка сейчас недоступна, показан локальный снимок данных. Ошибка: ' + error.message);
          return;
        }
      }
    }

    if (window.OSS_CSV_DATA) {
      ingest(window.OSS_CSV_DATA);
      showNotice('Данные загружены из локального снимка Google Sheets. Для обновления снимка скачайте свежий CSV или обновите файл oss-data.js.');
      return;
    }

    showNotice('Загружаю данные из публичного CSV-экспорта Google Sheets...');
    try {
      const response = await fetch(sheetUrl, { cache: 'no-store' });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const text = await response.text();
      ingest(text);
      showNotice('Данные загружены. Если в таблице появятся колонки по площади и факту голосования, риск по кворуму начнет считаться автоматически.');
    } catch (error) {
      showNotice('Не удалось загрузить таблицу напрямую из браузера. Скачайте вкладку как CSV и загрузите файл через кнопку "Загрузить CSV". Ошибка: ' + error.message);
    }
  }

  function loadFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      ingest(String(reader.result || ''));
      showNotice('CSV загружен из файла.');
    };
    reader.readAsText(file, 'utf-8');
  }

  function ingest(text) {
    const matrix = parseCsv(text);
    const headerIndex = findHeaderIndex(matrix);
    if (headerIndex < 0) {
      showNotice('Не нашел строку заголовков. Нужна строка с колонками "Регион", "ЖК" и "МКД".');
      return;
    }

    const headers = matrix[headerIndex].map(cleanHeader);
    const rows = matrix.slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell || '').trim()))
      .map((row, index) => normalizeRecord(headers, row, index))
      .filter((row) => row.region || row.complex || row.object);

    state.rows = rows;
    populateFilters(rows);
    applyFilters();
  }

  function findHeaderIndex(matrix) {
    let candidate = -1;
    matrix.forEach((row, index) => {
      const joined = row.map(cleanHeader).join('|');
      if (joined.includes('регион') && joined.includes('жк') && joined.includes('мкд')) {
        candidate = index;
      }
    });
    if (candidate >= 0) return candidate;

    return matrix.findIndex((row) => {
      const joined = row.map(cleanHeader).join('|');
      return joined.includes('регион') && joined.includes('жк') && joined.includes('улица');
    });
  }

  function normalizeRecord(headers, row, index) {
    const get = (...patterns) => {
      const idx = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
      return idx >= 0 ? String(row[idx] || '').trim() : '';
    };

    const street = get(/улица/);
    const house = get(/дом/);
    const object = get(/^мкд$/, /адрес/) || [street, house].filter(Boolean).join(' ');
    const startRaw = get(/даты? начала/, /фактическая дата начала/) || get(/плановая дата начала/);
    const endRaw = get(/дата завершения/, /окончан/);
    const duration = toNumber(get(/срок голосования/));
    const startDate = parseDate(startRaw) || parseDate(get(/плановая дата начала/));
    const endDate = parseDate(endRaw) || addDays(startDate, duration || 30);
    const planHours = toNumber(get(/план.*час/));
    const resources = toNumber(get(/^ресурсы/, /ресурсы.*человек/)) || 1;
    const areaTotal = toNumber(get(/общая площадь/, /площадь мкд/));
    const quorumTarget = parseQuorum(get(/целевой кворум/, /кворум.*%/));
    const areaCollected = toNumber(get(/собран.*площад/, /факт.*площад/));

    const record = {
      id: index + 1,
      region: get(/регион/),
      complex: get(/^жк$/),
      object,
      apartments: toNumber(get(/квартир/)),
      planStartRaw: get(/плановая дата начала/),
      startRaw,
      endRaw,
      startDate,
      endDate,
      duration,
      type: get(/тип.*собрания/),
      status: get(/^статус$/),
      protocol: get(/реквизиты/),
      initiator: get(/инициатор/),
      questions: get(/основные вопросы/),
      resources,
      normHours: toNumber(get(/норматив.*час/)),
      planHours,
      planDays: toNumber(get(/план.*дн/)),
      everyDays: toNumber(get(/выход каждые/)),
      deviation: toNumber(get(/отклонение/)),
      owner: get(/отв.*сотрудник/, /ответственный/),
      note: get(/примеч/),
      areaTotal,
      quorumTarget,
      areaCollected,
    };

    record.risk = assessRisk(record);
    return record;
  }

  function assessRisk(row) {
    const reasons = [];
    const status = row.status.toLowerCase();
    const note = row.note.toLowerCase();
    const completed = isCompleted(row);

    if (status.includes('не состоя')) reasons.push('ОСС не состоялось');
    if (status.includes('риск') || note.includes('не успеваем')) reasons.push('Отмечен риск в таблице');
    if (row.endDate && row.endDate < today && !completed) reasons.push('Дата завершения прошла');
    if (row.deviation > 0) reasons.push('Есть отклонение от срока');
    if (!row.owner && !completed) reasons.push('Не назначен ответственный');

    if (row.areaTotal && row.quorumTarget && row.areaCollected >= 0) {
      const targetArea = row.areaTotal * row.quorumTarget;
      const leftArea = targetArea - row.areaCollected;
      const leftDays = daysBetween(today, row.endDate);
      if (leftArea > 0 && leftDays <= 0) reasons.push('Кворум не достигнут, срок завершен');
      if (leftArea > 0 && leftDays > 0 && leftDays <= 3) reasons.push('До окончания 3 дня или меньше, кворум не достигнут');
    }

    return {
      hasRisk: reasons.length > 0,
      reasons,
    };
  }

  function populateFilters(rows) {
    fillSelect(els.complexFilter, rows.map((row) => row.complex).filter(Boolean), 'Все ЖК');
    fillSelect(els.ownerFilter, rows.map((row) => row.owner || 'Без ответственного'), 'Все ответственные');
    fillSelect(els.statusFilter, rows.map((row) => row.status || 'Без статуса'), 'Все статусы');
  }

  function applyFilters() {
    const from = parseInputDate(els.dateFrom.value);
    const to = parseInputDate(els.dateTo.value);
    const complex = els.complexFilter.value;
    const owner = els.ownerFilter.value;
    const status = els.statusFilter.value;
    const query = els.searchInput.value.trim().toLowerCase();

    state.filtered = state.rows.filter((row) => {
      if (complex && row.complex !== complex) return false;
      if (owner && (row.owner || 'Без ответственного') !== owner) return false;
      if (status && (row.status || 'Без статуса') !== status) return false;
      if (query) {
        const haystack = [row.region, row.complex, row.object, row.status, row.questions, row.owner, row.note].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (from && to && row.startDate && row.endDate) {
        return row.endDate >= from && row.startDate <= to;
      }
      return true;
    });

    render();
  }

  function render() {
    renderMetrics();
    renderGantt();
    renderResources();
    renderRisks();
    renderTable();
  }

  function renderMetrics() {
    const rows = state.filtered;
    const completed = rows.filter(isCompleted).length;
    const active = rows.filter((row) => !isCompleted(row) && !row.status.toLowerCase().includes('не состоя')).length;
    const risk = rows.filter((row) => row.risk.hasRisk).length;
    const hours = rows.reduce((sum, row) => sum + (row.planHours || estimateHours(row)), 0);
    const available = rows.reduce((sum, row) => sum + ((row.resources || 1) * 8 * Math.max(1, row.planDays || daysBetween(row.startDate, row.endDate) || 1)), 0);
    const gap = Math.max(0, hours - available);

    els.totalCount.textContent = rows.length;
    els.activeCount.textContent = active;
    els.completedCount.textContent = completed;
    els.riskCount.textContent = risk;
    els.hoursTotal.textContent = formatNumber(hours);
    els.resourceGap.textContent = formatNumber(gap);
  }

  function renderGantt() {
    const from = parseInputDate(els.dateFrom.value) || today;
    const to = parseInputDate(els.dateTo.value) || addDays(today, 120);
    const days = Math.min(270, Math.max(1, daysBetween(from, to) + 1));
    const rows = state.filtered
      .filter((row) => row.startDate && row.endDate)
      .sort((a, b) => a.startDate - b.startDate)
      .slice(0, 180);

    els.ganttRange.textContent = `${formatDate(from)} - ${formatDate(addDays(from, days - 1))}`;
    if (!rows.length) {
      els.gantt.innerHTML = '<div class="empty">Нет строк с датами в выбранном периоде.</div>';
      return;
    }

    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.setProperty('--days', days);

    const corner = document.createElement('div');
    corner.className = 'gantt-head';
    corner.textContent = 'Объект';
    grid.appendChild(corner);

    for (let i = 0; i < days; i += 1) {
      const day = addDays(from, i);
      const head = document.createElement('div');
      head.className = 'gantt-head';
      head.textContent = day.getDate() === 1 ? formatShortMonth(day) : String(day.getDate());
      grid.appendChild(head);
    }

    rows.forEach((row) => {
      const name = document.createElement('div');
      name.className = 'gantt-name';
      name.innerHTML = `<strong>${escapeHtml(row.complex || 'Без ЖК')}</strong><span>${escapeHtml(row.object || 'Без МКД')} · ${escapeHtml(row.owner || 'без ответственного')}</span>`;
      grid.appendChild(name);

      for (let i = 0; i < days; i += 1) {
        const day = addDays(from, i);
        const cell = document.createElement('div');
        cell.className = 'gantt-cell' + (isWeekend(day) ? ' weekend' : '');
        const inRange = day >= row.startDate && day <= row.endDate;
        if (inRange) {
          const bar = document.createElement('div');
          bar.className = 'bar ' + statusClass(row);
          bar.title = `${row.complex || ''} ${row.object || ''}: ${formatDate(row.startDate)} - ${formatDate(row.endDate)}`;
          cell.appendChild(bar);
        }
        grid.appendChild(cell);
      }
    });

    els.gantt.innerHTML = '';
    els.gantt.appendChild(grid);
  }

  function renderResources() {
    const byOwner = new Map();
    state.filtered.forEach((row) => {
      const owner = row.owner || 'Без ответственного';
      const current = byOwner.get(owner) || { count: 0, hours: 0, active: 0 };
      current.count += 1;
      current.hours += row.planHours || estimateHours(row);
      if (!isCompleted(row)) current.active += 1;
      byOwner.set(owner, current);
    });

    const items = Array.from(byOwner.entries()).sort((a, b) => b[1].hours - a[1].hours);
    if (!items.length) {
      els.resourceList.innerHTML = '<div class="empty">Нет данных по ответственным.</div>';
      return;
    }

    const max = Math.max(...items.map(([, value]) => value.hours), 1);
    els.resourceList.innerHTML = items.map(([ownerName, value]) => {
      const pct = Math.min(100, Math.round((value.hours / max) * 100));
      const over = value.active > 5 || value.hours > 160;
      return `
        <div class="resource-item">
          <header><strong>${escapeHtml(ownerName)}</strong><span>${formatNumber(value.hours)} ч · ${value.active} активных</span></header>
          <div class="load-track"><div class="load-bar ${over ? 'over' : ''}" style="width:${pct}%"></div></div>
        </div>
      `;
    }).join('');
  }

  function renderRisks() {
    const risks = state.filtered.filter((row) => row.risk.hasRisk);
    els.riskSummary.textContent = risks.length ? `${risks.length} объектов требуют внимания` : 'рисков в выборке нет';
    if (!risks.length) {
      els.riskList.innerHTML = '<div class="empty">По текущим правилам рисков не найдено.</div>';
      return;
    }

    els.riskList.innerHTML = risks.slice(0, 40).map((row) => `
      <article class="risk-item">
        <header>
          <strong>${escapeHtml(row.complex || 'Без ЖК')} · ${escapeHtml(row.object || 'Без МКД')}</strong>
          <span>${escapeHtml(row.owner || 'без ответственного')}</span>
        </header>
        <p>${escapeHtml(row.risk.reasons.join('; '))}</p>
      </article>
    `).join('');
  }

  function renderTable() {
    const rows = state.filtered;
    els.rowsCount.textContent = `${rows.length} строк`;
    els.registryBody.innerHTML = rows.slice(0, 500).map((row) => `
      <tr>
        <td>${escapeHtml(row.complex)}</td>
        <td>${escapeHtml(row.object)}</td>
        <td>${formatDate(row.startDate)} - ${formatDate(row.endDate)}</td>
        <td>${escapeHtml(row.type)}</td>
        <td><span class="pill ${statusClass(row)}">${escapeHtml(row.status || 'Без статуса')}</span></td>
        <td>${escapeHtml(row.questions)}</td>
        <td>${formatNumber(row.planHours || estimateHours(row))}</td>
        <td>${escapeHtml(row.owner)}</td>
        <td>${row.risk.hasRisk ? escapeHtml(row.risk.reasons[0]) : ''}</td>
      </tr>
    `).join('');
  }

  function parseCsv(text) {
    const rows = [];
    let row = [];
    let cell = '';
    let quote = false;

    for (let i = 0; i < text.length; i += 1) {
      const ch = text[i];
      const next = text[i + 1];
      if (quote) {
        if (ch === '"' && next === '"') {
          cell += '"';
          i += 1;
        } else if (ch === '"') {
          quote = false;
        } else {
          cell += ch;
        }
      } else if (ch === '"') {
        quote = true;
      } else if (ch === ',') {
        row.push(cell);
        cell = '';
      } else if (ch === '\n') {
        row.push(cell.replace(/\r$/, ''));
        rows.push(row);
        row = [];
        cell = '';
      } else {
        cell += ch;
      }
    }
    row.push(cell);
    rows.push(row);
    return rows;
  }

  function cleanHeader(value) {
    return String(value || '').replace(/\s+/g, ' ').trim().toLowerCase();
  }

  function fillSelect(select, values, allLabel) {
    const selected = select.value;
    const unique = Array.from(new Set(values)).sort((a, b) => a.localeCompare(b, 'ru'));
    select.innerHTML = `<option value="">${allLabel}</option>` + unique.map((value) => `<option value="${escapeAttr(value)}">${escapeHtml(value)}</option>`).join('');
    if (unique.includes(selected)) select.value = selected;
  }

  function parseDate(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw) return null;
    const dateMatch = raw.match(/(\d{1,2})[.\-/](\d{1,2})[.\-/](\d{2,4})/);
    if (dateMatch) {
      const year = Number(dateMatch[3].length === 2 ? '20' + dateMatch[3] : dateMatch[3]);
      return new Date(year, Number(dateMatch[2]) - 1, Number(dateMatch[1]));
    }
    const months = {
      'янв': 0, 'фев': 1, 'мар': 2, 'апр': 3, 'мая': 4, 'май': 4, 'июн': 5,
      'июл': 6, 'авг': 7, 'сен': 8, 'сент': 8, 'окт': 9, 'ноя': 10, 'нояб': 10, 'дек': 11,
    };
    const monthMatch = raw.match(/([а-яё]{3,5})\.?\s+(\d{4})/);
    if (monthMatch) {
      const key = monthMatch[1].replace('.', '');
      const monthKey = Object.keys(months).find((month) => key.startsWith(month));
      if (monthKey) return new Date(Number(monthMatch[2]), months[monthKey], 1);
    }
    return null;
  }

  function parseInputDate(value) {
    if (!value) return null;
    const parts = value.split('-').map(Number);
    return new Date(parts[0], parts[1] - 1, parts[2]);
  }

  function toInputDate(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
  }

  function addDays(date, days) {
    if (!date || !Number.isFinite(days)) return null;
    const next = new Date(date);
    next.setDate(next.getDate() + days);
    return next;
  }

  function daysBetween(a, b) {
    if (!a || !b) return 0;
    return Math.ceil((b - a) / 86400000);
  }

  function isWeekend(date) {
    const day = date.getDay();
    return day === 0 || day === 6;
  }

  function toNumber(value) {
    const normalized = String(value || '').replace(/\s/g, '').replace(',', '.').replace(/[^\d.-]/g, '');
    const number = Number(normalized);
    return Number.isFinite(number) ? number : 0;
  }

  function parseQuorum(value) {
    const number = toNumber(value);
    if (!number) return 0;
    return number > 1 ? number / 100 : number;
  }

  function estimateHours(row) {
    if (row.apartments && row.normHours) return row.apartments * row.normHours;
    return 0;
  }

  function isCompleted(row) {
    const status = row.status.toLowerCase();
    return status.includes('заверш') || status.includes('решение принято');
  }

  function statusClass(row) {
    const status = row.status.toLowerCase();
    const type = row.type.toLowerCase();
    if (row.risk.hasRisk) return 'status-risk';
    if (status.includes('заверш')) return 'status-done';
    if (status.includes('план')) return 'status-plan';
    if (type.includes('гис')) return 'status-gis';
    if (type.includes('дод')) return 'status-dod';
    if (status.includes('подготов') || status.includes('провед') || status.includes('сбор')) return 'status-active';
    return 'status-default';
  }

  function formatDate(date) {
    if (!date) return '';
    return `${String(date.getDate()).padStart(2, '0')}.${String(date.getMonth() + 1).padStart(2, '0')}.${date.getFullYear()}`;
  }

  function formatShortMonth(date) {
    return date.toLocaleDateString('ru-RU', { month: 'short' }).replace('.', '');
  }

  function formatNumber(value) {
    return Math.round(value || 0).toLocaleString('ru-RU');
  }

  function showNotice(message) {
    els.notice.hidden = false;
    els.notice.textContent = message;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({
      '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;',
    }[ch]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }
}());
