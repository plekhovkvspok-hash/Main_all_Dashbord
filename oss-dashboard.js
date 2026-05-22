(function () {
  const ossApiUrl = '/api/sheet';
  const servicesApiUrl = '/api/services';
  const fallbackOssUrl = 'https://docs.google.com/spreadsheets/d/1xsd_YD_1k_SOgBm8LtvE9DUrTtvRwIlmwrj5_n2jUxQ/export?format=csv&gid=2111248717';
  const today = new Date(2026, 4, 22);

  const serviceDefinitions = [
    { key: 'indexDu', label: 'Индексация в ДУ', patterns: [/индексация в ду/] },
    { key: 'indexProtocol', label: 'Протокол с индексацией', patterns: [/протокол.*индексац/] },
    { key: 'gisAdmin', label: 'Администратор ГИС ЖКХ', patterns: [/администратор.*гис/] },
    { key: 'budgetLimit', label: 'Лимиты бюджета', patterns: [/лимит.*бюджет/] },
    { key: 'repair', label: 'Текремонт', patterns: [/тек.*ремонт/] },
    { key: 'municipalTariff', label: 'Муниципальный тариф', patterns: [/возможность.*мун/, /мун.*тариф/] },
    { key: 'commonTerritory', label: 'Общая территория', patterns: [/общая территория/] },
    { key: 'snowFact', label: 'Снег факт', patterns: [/вывоз снега.*факт/] },
    { key: 'snowTariff', label: 'Снег тариф', patterns: [/вывоз снега.*тариф/] },
    { key: 'snowContract', label: 'Снег 50 куб', patterns: [/вывоз снега 50/] },
    { key: 'vdgo', label: 'ВДГО', patterns: [/вдго/] },
    { key: 'providers', label: 'Провайдеры', patterns: [/провайдер/] },
    { key: 'capitalAccount', label: 'Спецсчет капремонт', patterns: [/спецсчет.*кап/] },
    { key: 'designCode', label: 'Вывески / дизайн-код', patterns: [/вывески/, /дизайн/] },
    { key: 'conditioners', label: 'ТУ кондиционеры', patterns: [/ту кондиц/] },
    { key: 'kgk', label: 'КГК', patterns: [/крупно/, /кгк/] },
  ];

  const state = {
    tab: 'oss',
    ossRows: [],
    ossFiltered: [],
    metricFilter: 'all',
    quorumFilter: '',
    serviceRows: [],
    serviceFiltered: [],
  };

  const els = {
    tabs: Array.from(document.querySelectorAll('.tab')),
    ossView: document.getElementById('ossView'),
    servicesView: document.getElementById('servicesView'),
    loadGoogleBtn: document.getElementById('loadGoogleBtn'),
    csvFileInput: document.getElementById('csvFileInput'),
    notice: document.getElementById('notice'),
    dateFrom: document.getElementById('dateFrom'),
    dateTo: document.getElementById('dateTo'),
    complexFilter: document.getElementById('complexFilter'),
    ownerFilter: document.getElementById('ownerFilter'),
    statusFilter: document.getElementById('statusFilter'),
    searchInput: document.getElementById('searchInput'),
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
    serviceComplexFilter: document.getElementById('serviceComplexFilter'),
    serviceNameFilter: document.getElementById('serviceNameFilter'),
    serviceStateFilter: document.getElementById('serviceStateFilter'),
    serviceSort: document.getElementById('serviceSort'),
    serviceSearchInput: document.getElementById('serviceSearchInput'),
    serviceHouseCount: document.getElementById('serviceHouseCount'),
    serviceWithAnyCount: document.getElementById('serviceWithAnyCount'),
    serviceEmptyCount: document.getElementById('serviceEmptyCount'),
    serviceCoverageAvg: document.getElementById('serviceCoverageAvg'),
    serviceAreaTotal: document.getElementById('serviceAreaTotal'),
    serviceTopGap: document.getElementById('serviceTopGap'),
    serviceCoverageSummary: document.getElementById('serviceCoverageSummary'),
    serviceCoverageList: document.getElementById('serviceCoverageList'),
    serviceGapSummary: document.getElementById('serviceGapSummary'),
    serviceGapList: document.getElementById('serviceGapList'),
    serviceRowsCount: document.getElementById('serviceRowsCount'),
    serviceRegistryBody: document.getElementById('serviceRegistryBody'),
  };

  init();

  function init() {
    const start = new Date(today);
    start.setMonth(start.getMonth() - 5);
    const end = new Date(today);
    end.setMonth(end.getMonth() + 5);
    els.dateFrom.value = toInputDate(start);
    els.dateTo.value = toInputDate(end);

    els.tabs.forEach((tab) => tab.addEventListener('click', () => switchTab(tab.dataset.tab)));
    document.querySelectorAll('[data-metric-filter]').forEach((card) => {
      card.addEventListener('click', () => toggleMetricFilter(card.dataset.metricFilter));
    });
    document.querySelectorAll('[data-quorum-filter]').forEach((button) => {
      button.addEventListener('click', () => toggleQuorumFilter(button.dataset.quorumFilter));
    });
    els.loadGoogleBtn.addEventListener('click', () => loadAll(true));
    els.csvFileInput.addEventListener('change', loadOssFromFile);
    [els.dateFrom, els.dateTo, els.complexFilter, els.ownerFilter, els.statusFilter, els.searchInput]
      .forEach((el) => el.addEventListener('input', applyOssFilters));
    [els.serviceComplexFilter, els.serviceNameFilter, els.serviceStateFilter, els.serviceSort, els.serviceSearchInput]
      .forEach((el) => el.addEventListener('input', applyServiceFilters));

    fillSelect(els.serviceNameFilter, serviceDefinitions.map((service) => service.label), 'Все услуги');
    showNotice('Загружаю данные из Google Sheets...');
    loadAll(false);
    setInterval(() => loadAll(false), 60 * 60 * 1000);
  }

  function switchTab(tabName) {
    state.tab = tabName;
    els.tabs.forEach((tab) => tab.classList.toggle('active', tab.dataset.tab === tabName));
    els.ossView.classList.toggle('active', tabName === 'oss');
    els.servicesView.classList.toggle('active', tabName === 'services');
  }

  function toggleMetricFilter(filter) {
    state.metricFilter = state.metricFilter === filter ? 'all' : filter;
    applyOssFilters();
  }

  function toggleQuorumFilter(filter) {
    state.quorumFilter = state.quorumFilter === filter ? '' : filter;
    applyOssFilters();
  }

  async function loadAll(forceRefresh) {
    const force = forceRefresh === true;
    showNotice(force ? 'Принудительно обновляю данные...' : 'Загружаю актуальные данные...');
    await Promise.allSettled([loadOss(force), loadServices(force)]);
    showNotice(force ? 'Данные обновлены из Google Sheets.' : 'Данные загружены. Автообновление выполняется раз в час.');
  }

  async function loadOss(force) {
    const text = await fetchText(ossApiUrl, fallbackOssUrl, force);
    ingestOss(text);
  }

  async function loadServices(force) {
    const text = await fetchText(servicesApiUrl, null, force);
    ingestServices(text);
  }

  async function fetchText(apiUrl, fallbackUrl, force) {
    const online = window.location.protocol !== 'file:';
    const url = online ? apiUrl : fallbackUrl;
    if (!url) throw new Error('Нет локального источника данных.');
    const finalUrl = online && force ? `${url}?refresh=${Date.now()}` : url;
    const response = await fetch(finalUrl, { cache: force ? 'no-store' : 'default' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.text();
  }

  function loadOssFromFile(event) {
    const file = event.target.files && event.target.files[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      ingestOss(String(reader.result || ''));
      showNotice('CSV ОСС загружен из файла.');
    };
    reader.readAsText(file, 'utf-8');
  }

  function ingestOss(text) {
    const matrix = parseCsv(text);
    const headerIndex = findOssHeaderIndex(matrix);
    if (headerIndex < 0) {
      showNotice('Не нашел строку заголовков ОСС. Нужны колонки "Регион", "ЖК" и "МКД".');
      return;
    }
    const headers = matrix[headerIndex].map(cleanHeader);
    const rows = matrix.slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell || '').trim()))
      .map((row, index) => normalizeOssRecord(headers, row, index))
      .filter((row) => row.region || row.complex || row.object);

    state.ossRows = rows;
    populateOssFilters(rows);
    applyOssFilters();
  }

  function findOssHeaderIndex(matrix) {
    const currentHeaderIndex = matrix.findIndex((row) => {
      const joined = row.map(cleanHeader).join('|');
      return joined.includes('регион')
        && joined.includes('жк')
        && joined.includes('мкд')
        && joined.includes('плановая дата начала осс')
        && joined.includes('статус кворума');
    });
    if (currentHeaderIndex >= 0) return currentHeaderIndex;

    return matrix.findIndex((row) => {
      const joined = row.map(cleanHeader).join('|');
      return joined.includes('регион') && joined.includes('жк') && joined.includes('мкд');
    });
  }

  function normalizeOssRecord(headers, row, index) {
    const get = (...patterns) => getByHeader(headers, row, patterns);
    const street = get(/улица/);
    const house = get(/дом/);
    const object = get(/^мкд$/, /адрес/) || [street, house].filter(Boolean).join(' ');
    const startRaw = get(/даты? начала/, /фактическая дата начала/) || get(/плановая дата начала/);
    const endRaw = get(/дата завершения/, /окончан/);
    const duration = toNumber(get(/срок голосования/));
    const startDate = parseDate(startRaw) || parseDate(get(/плановая дата начала/));
    const endDate = parseDate(endRaw) || addDays(startDate, duration || 30);
    const quorumRaw = get(/статус кворума/, /кворум/) || String(row[11] || '').trim();
    const resourceRisk = get(/отклонение/) || String(row[18] || '').trim();
    const owner = get(/отв.*сотрудник/, /ответственный/) || String(row[19] || '').trim();

    const record = {
      id: index + 1,
      region: get(/регион/),
      complex: get(/^жк$/),
      object,
      apartments: toNumber(get(/квартир/)),
      startDate,
      endDate,
      duration,
      type: get(/тип.*собрания/),
      status: get(/^статус$/),
      questions: get(/основные вопросы/),
      resources: toNumber(get(/^ресурсы/, /ресурсы.*человек/)) || 1,
      normHours: toNumber(get(/норматив.*час/)),
      planHours: toNumber(get(/план.*час/)),
      planDays: toNumber(get(/план.*дн/)),
      deviation: toNumber(resourceRisk),
      resourceRisk,
      owner,
      note: get(/примеч/),
      quorumRaw,
      quorumPercent: parsePercent(quorumRaw),
      areaTotal: toNumber(get(/общая площадь/, /площадь мкд/)),
      quorumTarget: parseQuorum(get(/целевой кворум/, /кворум.*%/)),
      areaCollected: toNumber(get(/собран.*площад/, /факт.*площад/)),
    };
    record.risk = assessRisk(record);
    return record;
  }

  function populateOssFilters(rows) {
    fillSelect(els.complexFilter, rows.map((row) => row.complex).filter(Boolean), 'Все ЖК');
    fillSelect(els.ownerFilter, rows.map((row) => row.owner || 'Без ответственного'), 'Все ответственные');
    fillSelect(els.statusFilter, rows.map((row) => row.status || 'Без статуса'), 'Все статусы');
  }

  function applyOssFilters() {
    const from = parseInputDate(els.dateFrom.value);
    const to = parseInputDate(els.dateTo.value);
    const complex = els.complexFilter.value;
    const owner = els.ownerFilter.value;
    const status = els.statusFilter.value;
    const query = els.searchInput.value.trim().toLowerCase();

    state.ossFiltered = state.ossRows.filter((row) => {
      if (complex && row.complex !== complex) return false;
      if (owner && (row.owner || 'Без ответственного') !== owner) return false;
      if (status && (row.status || 'Без статуса') !== status) return false;
      if (!matchesMetricFilter(row)) return false;
      if (!matchesQuorumFilter(row)) return false;
      if (query) {
        const haystack = [row.region, row.complex, row.object, row.status, row.questions, row.owner, row.note].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      if (from && to && row.startDate && row.endDate) return row.endDate >= from && row.startDate <= to;
      return true;
    });
    updateOssFilterControls();
    renderOss();
  }

  function matchesMetricFilter(row) {
    if (state.metricFilter === 'all') return true;
    if (state.metricFilter === 'active') return !isCompleted(row) && !row.status.toLowerCase().includes('не состоя');
    if (state.metricFilter === 'completed') return isCompleted(row);
    if (state.metricFilter === 'risk') return row.risk.hasRisk;
    if (state.metricFilter === 'hours') return (row.planHours || estimateHours(row)) > 0;
    if (state.metricFilter === 'resourceGap') {
      const hours = row.planHours || estimateHours(row);
      const available = (row.resources || 1) * 8 * Math.max(1, row.planDays || daysBetween(row.startDate, row.endDate) || 1);
      return hours > available;
    }
    return true;
  }

  function matchesQuorumFilter(row) {
    if (!state.quorumFilter) return true;
    return quorumBucket(row.quorumPercent) === state.quorumFilter;
  }

  function updateOssFilterControls() {
    document.querySelectorAll('[data-metric-filter]').forEach((card) => {
      card.classList.toggle('active-filter', card.dataset.metricFilter === state.metricFilter && state.metricFilter !== 'all');
    });
    document.querySelectorAll('[data-quorum-filter]').forEach((button) => {
      button.classList.toggle('active-filter', button.dataset.quorumFilter === state.quorumFilter);
    });
  }

  function renderOss() {
    renderOssMetrics();
    renderGantt();
    renderResources();
    renderRisks();
    renderOssTable();
  }

  function renderOssMetrics() {
    const rows = state.ossFiltered;
    const completed = rows.filter(isCompleted).length;
    const active = rows.filter((row) => !isCompleted(row) && !row.status.toLowerCase().includes('не состоя')).length;
    const risk = rows.filter((row) => row.risk.hasRisk).length;
    const hours = rows.reduce((sum, row) => sum + (row.planHours || estimateHours(row)), 0);
    const available = rows.reduce((sum, row) => sum + ((row.resources || 1) * 8 * Math.max(1, row.planDays || daysBetween(row.startDate, row.endDate) || 1)), 0);
    els.totalCount.textContent = rows.length;
    els.activeCount.textContent = active;
    els.completedCount.textContent = completed;
    els.riskCount.textContent = risk;
    els.hoursTotal.textContent = formatNumber(hours);
    els.resourceGap.textContent = formatNumber(Math.max(0, hours - available));
  }

  function renderGantt() {
    const from = parseInputDate(els.dateFrom.value) || today;
    const to = parseInputDate(els.dateTo.value) || addDays(today, 120);
    const days = Math.min(270, Math.max(1, daysBetween(from, to) + 1));
    const rows = state.ossFiltered.filter((row) => row.startDate && row.endDate).sort((a, b) => a.startDate - b.startDate).slice(0, 180);
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
        if (day >= row.startDate && day <= row.endDate) {
          const bar = document.createElement('div');
          bar.className = 'bar ' + statusClass(row);
          bar.title = `${row.complex || ''} ${row.object || ''}: ${formatDate(row.startDate)} - ${formatDate(row.endDate)}${row.quorumRaw ? ` · кворум ${row.quorumRaw}` : ''}`;
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
    state.ossFiltered.forEach((row) => {
      const owner = row.owner || 'Без ответственного';
      const current = byOwner.get(owner) || { hours: 0, active: 0 };
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
      return `<div class="resource-item"><header><strong>${escapeHtml(ownerName)}</strong><span>${formatNumber(value.hours)} ч · ${value.active} активных</span></header><div class="load-track"><div class="load-bar ${value.active > 5 || value.hours > 160 ? 'over' : ''}" style="width:${pct}%"></div></div></div>`;
    }).join('');
  }

  function renderRisks() {
    const risks = state.ossFiltered.filter((row) => row.risk.hasRisk);
    els.riskSummary.textContent = risks.length ? `${risks.length} объектов требуют внимания` : 'рисков в выборке нет';
    els.riskList.innerHTML = risks.length
      ? risks.slice(0, 40).map((row) => `<article class="risk-item"><header><strong>${escapeHtml(row.complex || 'Без ЖК')} · ${escapeHtml(row.object || 'Без МКД')}</strong><span>${escapeHtml(row.owner || 'без ответственного')}</span></header><p>${escapeHtml(row.risk.reasons.join('; '))}</p></article>`).join('')
      : '<div class="empty">По текущим правилам рисков не найдено.</div>';
  }

  function renderOssTable() {
    const rows = state.ossFiltered;
    els.rowsCount.textContent = `${rows.length} строк`;
    els.registryBody.innerHTML = rows.slice(0, 500).map((row) => `<tr><td>${escapeHtml(row.complex)}</td><td>${escapeHtml(row.object)}</td><td>${formatDate(row.startDate)} - ${formatDate(row.endDate)}</td><td>${escapeHtml(row.type)}</td><td><span class="pill ${statusClass(row)}">${escapeHtml(row.quorumRaw ? `Кворум ${row.quorumRaw}` : (row.status || 'Без статуса'))}</span></td><td>${escapeHtml(row.questions)}</td><td>${formatNumber(row.planHours || estimateHours(row))}</td><td>${escapeHtml(row.owner)}</td><td>${row.risk.hasRisk ? escapeHtml(row.risk.reasons[0]) : ''}</td></tr>`).join('');
  }

  function ingestServices(text) {
    const matrix = parseCsv(text);
    const headerIndex = findServiceHeaderIndex(matrix);
    if (headerIndex < 0) {
      showNotice('Не нашел строку заголовков услуг. Нужны колонки "ЖК" и "МКД".');
      return;
    }
    const headers = matrix[headerIndex].map(cleanHeader);
    const rows = matrix.slice(headerIndex + 1)
      .filter((row) => looksLikeServiceDataRow(row))
      .map((row, index) => normalizeServiceRecord(headers, row, index))
      .filter((row) => row.complex && row.object);
    state.serviceRows = rows;
    populateServiceFilters(rows);
    applyServiceFilters();
  }

  function findServiceHeaderIndex(matrix) {
    return matrix.findIndex((row) => {
      const joined = row.map(cleanHeader).join('|');
      return joined.includes('жк') && (joined.includes('мкд') || joined.includes('адрес'));
    });
  }

  function looksLikeServiceDataRow(row) {
    const first = String(row[0] || '').trim();
    return /^\d+$/.test(first) && String(row[1] || '').trim() && String(row[2] || '').trim();
  }

  function normalizeServiceRecord(headers, row, index) {
    const get = (...patterns) => getByHeader(headers, row, patterns);
    const services = {};
    serviceDefinitions.forEach((service) => {
      const raw = get(...service.patterns);
      services[service.key] = { label: service.label, raw, has: isTruthyService(raw) };
    });
    const installed = Object.values(services).filter((service) => service.has);
    const missing = Object.values(services).filter((service) => !service.has);
    const currentTariff = toNumber(get(/действующий тариф 2026/, /тариф 2026/));
    const proposedTariff = toNumber(get(/предлагаем.*тариф/));
    return {
      id: index + 1,
      complex: get(/^жк$/),
      object: get(/^мкд$/, /адрес/),
      area: toNumber(get(/площадь.*начислен/)),
      currentTariff,
      previousTariff: toNumber(get(/предыдущий тариф/)),
      proposedTariff,
      tariffGap: proposedTariff && currentTariff ? proposedTariff - currentTariff : 0,
      applyDate: get(/дата применения/),
      planMonth: get(/план месяц/),
      startOss: get(/начало.*осс/),
      endOss: get(/конец.*осс/),
      questions: get(/перечень вопросов/),
      execution: get(/исполнение/),
      territory: get(/общая территория/),
      services,
      installed,
      missing,
      coverage: installed.length / serviceDefinitions.length,
    };
  }

  function populateServiceFilters(rows) {
    fillSelect(els.serviceComplexFilter, rows.map((row) => row.complex).filter(Boolean), 'Все ЖК');
  }

  function applyServiceFilters() {
    const complex = els.serviceComplexFilter.value;
    const selectedServiceLabel = els.serviceNameFilter.value;
    const serviceDef = serviceDefinitions.find((service) => service.label === selectedServiceLabel);
    const stateFilter = els.serviceStateFilter.value;
    const query = els.serviceSearchInput.value.trim().toLowerCase();

    state.serviceFiltered = state.serviceRows.filter((row) => {
      if (complex && row.complex !== complex) return false;
      if (serviceDef && stateFilter === 'has' && !row.services[serviceDef.key].has) return false;
      if (serviceDef && stateFilter === 'missing' && row.services[serviceDef.key].has) return false;
      if (!serviceDef && stateFilter === 'empty' && row.installed.length > 0) return false;
      if (!serviceDef && stateFilter === 'has' && row.installed.length === 0) return false;
      if (!serviceDef && stateFilter === 'missing' && row.missing.length === 0) return false;
      if (query) {
        const haystack = [row.complex, row.object, row.questions, row.execution, row.territory, row.planMonth].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });

    sortServiceRows();
    renderServices();
  }

  function sortServiceRows() {
    const sort = els.serviceSort.value;
    state.serviceFiltered.sort((a, b) => {
      if (sort === 'coverageDesc') return b.coverage - a.coverage || a.complex.localeCompare(b.complex, 'ru');
      if (sort === 'coverageAsc') return a.coverage - b.coverage || a.complex.localeCompare(b.complex, 'ru');
      if (sort === 'areaDesc') return b.area - a.area;
      if (sort === 'tariffGapDesc') return b.tariffGap - a.tariffGap;
      return `${a.complex} ${a.object}`.localeCompare(`${b.complex} ${b.object}`, 'ru');
    });
  }

  function renderServices() {
    renderServiceMetrics();
    renderServiceCoverage();
    renderServiceTable();
  }

  function renderServiceMetrics() {
    const rows = state.serviceFiltered;
    const withAny = rows.filter((row) => row.installed.length > 0).length;
    const empty = rows.filter((row) => row.installed.length === 0).length;
    const avg = rows.length ? rows.reduce((sum, row) => sum + row.coverage, 0) / rows.length : 0;
    const area = rows.reduce((sum, row) => sum + row.area, 0);
    const gaps = serviceGapStats(rows);
    els.serviceHouseCount.textContent = rows.length;
    els.serviceWithAnyCount.textContent = withAny;
    els.serviceEmptyCount.textContent = empty;
    els.serviceCoverageAvg.textContent = `${Math.round(avg * 100)}%`;
    els.serviceAreaTotal.textContent = formatNumber(area);
    els.serviceTopGap.textContent = gaps[0] ? gaps[0].label : '-';
  }

  function renderServiceCoverage() {
    const rows = state.serviceFiltered;
    const total = Math.max(rows.length, 1);
    const stats = serviceDefinitions.map((definition) => {
      const count = rows.filter((row) => row.services[definition.key].has).length;
      return { ...definition, count, pct: Math.round((count / total) * 100) };
    }).sort((a, b) => a.pct - b.pct);
    els.serviceCoverageSummary.textContent = rows.length ? `${rows.length} домов` : 'нет домов';
    els.serviceCoverageList.innerHTML = stats.map((item) => `<div class="coverage-item"><header><strong>${escapeHtml(item.label)}</strong><span>${item.count} / ${rows.length} · ${item.pct}%</span></header><div class="load-track"><div class="load-bar ${item.pct < 50 ? 'over' : ''}" style="width:${item.pct}%"></div></div></div>`).join('');
    const gaps = serviceGapStats(rows);
    els.serviceGapSummary.textContent = gaps.length ? 'топ пробелов' : 'нет данных';
    els.serviceGapList.innerHTML = gaps.slice(0, 8).map((item) => `<div class="gap-item"><strong>${escapeHtml(item.label)}</strong><span>${item.missing} домов без услуги</span></div>`).join('');
  }

  function renderServiceTable() {
    const rows = state.serviceFiltered;
    els.serviceRowsCount.textContent = `${rows.length} строк`;
    els.serviceRegistryBody.innerHTML = rows.slice(0, 500).map((row) => {
      const installed = row.installed.slice(0, 6).map((service) => `<span class="service-chip has">${escapeHtml(service.label)}</span>`).join('');
      const missing = row.missing.slice(0, 5).map((service) => `<span class="service-chip missing">${escapeHtml(service.label)}</span>`).join('');
      return `<tr><td>${escapeHtml(row.complex)}</td><td>${escapeHtml(row.object)}</td><td>${formatNumber(row.area)}</td><td>${formatMoney(row.currentTariff)}</td><td>${formatMoney(row.proposedTariff)}</td><td><div class="chip-list">${installed || '<span class="muted">нет отметок</span>'}</div></td><td><div class="chip-list">${missing}</div></td><td>${escapeHtml([row.planMonth, row.startOss, row.endOss, row.questions, row.execution].filter(Boolean).join(' · '))}</td></tr>`;
    }).join('');
  }

  function serviceGapStats(rows) {
    return serviceDefinitions.map((definition) => ({
      label: definition.label,
      missing: rows.filter((row) => !row.services[definition.key].has).length,
    })).sort((a, b) => b.missing - a.missing);
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
    if (row.resourceRisk && !/^\s*[-\d,.%]*\s*$/.test(row.resourceRisk)) reasons.push(row.resourceRisk);
    if (!row.owner && !completed) reasons.push('Не назначен ответственный');
    if (row.quorumPercent > 0 && row.quorumPercent < 25) reasons.push(`Кворум ${formatPercent(row.quorumPercent)}: красная зона, ниже 25%`);
    if (row.quorumPercent >= 25 && row.quorumPercent < 40) reasons.push(`Кворум ${formatPercent(row.quorumPercent)}: желтая зона, ниже 40%`);
    if (row.quorumPercent >= 40 && row.quorumPercent < 51) reasons.push(`Кворум ${formatPercent(row.quorumPercent)}: оранжевая зона, не достигнут минимум 51%`);
    if (row.areaTotal && row.quorumTarget && row.areaCollected >= 0) {
      const targetArea = row.areaTotal * row.quorumTarget;
      const leftArea = targetArea - row.areaCollected;
      const leftDays = daysBetween(today, row.endDate);
      if (leftArea > 0 && leftDays <= 0) reasons.push('Кворум не достигнут, срок завершен');
      if (leftArea > 0 && leftDays > 0 && leftDays <= 3) reasons.push('До окончания 3 дня или меньше, кворум не достигнут');
    }
    return { hasRisk: reasons.length > 0, reasons };
  }

  function getByHeader(headers, row, patterns) {
    const idx = headers.findIndex((header) => patterns.some((pattern) => pattern.test(header)));
    return idx >= 0 ? String(row[idx] || '').trim() : '';
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
    const months = { янв: 0, фев: 1, мар: 2, апр: 3, мая: 4, май: 4, июн: 5, июл: 6, авг: 7, сен: 8, сент: 8, окт: 9, ноя: 10, нояб: 10, дек: 11 };
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

  function parsePercent(value) {
    const number = toNumber(value);
    if (!number) return 0;
    return number <= 1 ? number * 100 : number;
  }

  function isTruthyService(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (!raw || raw === '-' || raw === 'false' || raw === 'нет' || raw === '0' || raw === '#ref!') return false;
    return raw === 'true' || raw === 'да' || raw === 'есть' || Boolean(toNumber(raw)) || raw.length > 1;
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
    const quorumClass = quorumStatusClass(row.quorumPercent);
    if (quorumClass) return quorumClass;
    if (row.risk.hasRisk) return 'status-risk';
    if (status.includes('заверш')) return 'status-done';
    if (status.includes('план')) return 'status-plan';
    if (type.includes('гис')) return 'status-gis';
    if (type.includes('дод')) return 'status-dod';
    if (status.includes('подготов') || status.includes('провед') || status.includes('сбор')) return 'status-active';
    return 'status-default';
  }

  function quorumStatusClass(percent) {
    const bucket = quorumBucket(percent);
    return bucket ? `status-quorum-${bucket}` : '';
  }

  function quorumBucket(percent) {
    if (!percent) return '';
    if (percent >= 51) return 'green';
    if (percent >= 40) return 'orange';
    if (percent >= 25) return 'yellow';
    return 'red';
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

  function formatMoney(value) {
    return value ? value.toLocaleString('ru-RU', { maximumFractionDigits: 2 }) : '';
  }

  function formatPercent(value) {
    return `${Math.round(value)}%`;
  }

  function showNotice(message) {
    els.notice.hidden = false;
    els.notice.textContent = message;
  }

  function escapeHtml(value) {
    return String(value || '').replace(/[&<>"']/g, (ch) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[ch]));
  }

  function escapeAttr(value) {
    return escapeHtml(value).replace(/"/g, '&quot;');
  }
}());
