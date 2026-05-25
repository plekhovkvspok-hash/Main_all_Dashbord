(function () {
  const ossApiUrl = '/api/sheet';
  const servicesApiUrl = '/api/services';
  const repairsApiUrl = '/api/repairs';
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
    repairRows: [],
    repairFiltered: [],
    repairMetricFilter: 'all',
    repairStatusFilter: '',
  };

  const els = {
    tabs: Array.from(document.querySelectorAll('.tab')),
    ossView: document.getElementById('ossView'),
    servicesView: document.getElementById('servicesView'),
    repairsView: document.getElementById('repairsView'),
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
    repairComplexFilter: document.getElementById('repairComplexFilter'),
    repairStatusFilter: document.getElementById('repairStatusFilter'),
    repairBudgetFilter: document.getElementById('repairBudgetFilter'),
    repairSort: document.getElementById('repairSort'),
    repairSearchInput: document.getElementById('repairSearchInput'),
    repairWorkCount: document.getElementById('repairWorkCount'),
    repairInProgressCount: document.getElementById('repairInProgressCount'),
    repairDoneCount: document.getElementById('repairDoneCount'),
    repairRiskCount: document.getElementById('repairRiskCount'),
    repairPlanTotal: document.getElementById('repairPlanTotal'),
    repairBudgetGap: document.getElementById('repairBudgetGap'),
    repairGantt: document.getElementById('repairGantt'),
    repairGanttRange: document.getElementById('repairGanttRange'),
    repairBudgetSummary: document.getElementById('repairBudgetSummary'),
    repairBudgetList: document.getElementById('repairBudgetList'),
    repairRowsCount: document.getElementById('repairRowsCount'),
    repairRegistryBody: document.getElementById('repairRegistryBody'),
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
    document.querySelectorAll('[data-repair-filter]').forEach((card) => {
      card.addEventListener('click', () => toggleRepairMetricFilter(card.dataset.repairFilter));
    });
    document.querySelectorAll('[data-repair-status-filter]').forEach((button) => {
      button.addEventListener('click', () => toggleRepairStatusFilter(button.dataset.repairStatusFilter));
    });
    els.loadGoogleBtn.addEventListener('click', () => loadAll(true));
    els.csvFileInput.addEventListener('change', loadOssFromFile);
    [els.dateFrom, els.dateTo, els.complexFilter, els.ownerFilter, els.statusFilter, els.searchInput]
      .forEach((el) => el.addEventListener('input', applyOssFilters));
    [els.serviceComplexFilter, els.serviceNameFilter, els.serviceStateFilter, els.serviceSort, els.serviceSearchInput]
      .forEach((el) => el.addEventListener('input', applyServiceFilters));
    [els.repairComplexFilter, els.repairStatusFilter, els.repairBudgetFilter, els.repairSort, els.repairSearchInput]
      .forEach((el) => el.addEventListener('input', applyRepairFilters));
    document.addEventListener('click', (event) => {
      const button = event.target.closest('[data-act-id]');
      if (button) openRepairAct(Number(button.dataset.actId));
    });

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
    els.repairsView.classList.toggle('active', tabName === 'repairs');
  }

  function toggleMetricFilter(filter) {
    state.metricFilter = state.metricFilter === filter ? 'all' : filter;
    applyOssFilters();
  }

  function toggleQuorumFilter(filter) {
    state.quorumFilter = state.quorumFilter === filter ? '' : filter;
    applyOssFilters();
  }

  function toggleRepairMetricFilter(filter) {
    state.repairMetricFilter = state.repairMetricFilter === filter ? 'all' : filter;
    applyRepairFilters();
  }

  function toggleRepairStatusFilter(filter) {
    state.repairStatusFilter = state.repairStatusFilter === filter ? '' : filter;
    els.repairStatusFilter.value = state.repairStatusFilter;
    applyRepairFilters();
  }

  async function loadAll(forceRefresh) {
    const force = forceRefresh === true;
    showNotice(force ? 'Принудительно обновляю данные...' : 'Загружаю актуальные данные...');
    await Promise.allSettled([loadOss(force), loadServices(force), loadRepairs(force)]);
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

  async function loadRepairs(force) {
    const online = window.location.protocol !== 'file:';
    if (!online) {
      state.repairRows = [];
      applyRepairFilters();
      return;
    }
    const response = await fetch(force ? `${repairsApiUrl}?refresh=${Date.now()}` : repairsApiUrl, { cache: force ? 'no-store' : 'default' });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    ingestRepairs(payload.planCsv || '', payload.budgetCsv || '');
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

  function ingestRepairs(planText, budgetText) {
    const budgetRows = parseRepairBudget(budgetText);
    const rows = parseRepairPlan(planText, budgetRows);
    state.repairRows = rows;
    populateRepairFilters(rows);
    applyRepairFilters();
  }

  function parseRepairBudget(text) {
    const matrix = parseCsv(text);
    const headerIndex = matrix.findIndex((row) => row.map(cleanHeader).join('|').includes('мкд'));
    if (headerIndex < 0) return [];
    const headers = matrix[headerIndex].map(cleanHeader);
    return matrix.slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell || '').trim()))
      .map((row, index) => {
        const get = (...patterns) => getByHeader(headers, row, patterns);
        const house = get(/^мкд$/, /адрес/);
        return {
          id: index + 1,
          house,
          key: normalizeRepairAddress(house),
          annualBudget: toNumber(get(/сумма на год.*перенос/)) || toNumber(get(/сумма, руб\/год/)),
          balance: toNumber(get(/сумма остатка.*перенос/)) || toNumber(get(/остаток/)),
        };
      })
      .filter((row) => row.house);
  }

  function parseRepairPlan(text, budgets) {
    const matrix = parseCsv(text);
    const headerIndex = matrix.findIndex((row) => {
      const joined = row.map(cleanHeader).join('|');
      return joined.includes('адрес') && joined.includes('вид работ') && joined.includes('статус работ');
    });
    if (headerIndex < 0) return [];
    const headers = matrix[headerIndex].map(cleanHeader);
    const budgetMap = new Map(budgets.map((budget) => [budget.key, budget]));
    const rows = matrix.slice(headerIndex + 1)
      .filter((row) => row.some((cell) => String(cell || '').trim()))
      .map((row, index) => normalizeRepairRecord(headers, row, index, budgetMap, budgets))
      .filter((row) => row.address || row.workType);
    attachRepairBudgetTotals(rows);
    return rows;
  }

  function normalizeRepairRecord(headers, row, index, budgetMap, budgets) {
    const get = (...patterns) => getByHeader(headers, row, patterns);
    const address = get(/^адрес$/);
    const complex = detectRepairComplex(address);
    const house = stripRepairComplex(address, complex);
    const status = get(/статус работ/);
    const deadlineRaw = get(/срок/);
    const year = toNumber(get(/^год$/)) || 2026;
    const budget = findRepairBudget(address, house, budgetMap, budgets);
    return {
      id: index + 1,
      address,
      complex,
      house,
      houseKey: normalizeRepairAddress(budget ? budget.house : house || address),
      workType: get(/вид работ/),
      status,
      statusKey: repairStatusKey(status),
      deadlineRaw,
      year,
      startDate: repairMonthDate(deadlineRaw, year, false),
      endDate: repairMonthDate(deadlineRaw, year, true),
      amount: toNumber(get(/объ[её]м/)),
      unit: get(/ед\.?\s*изм|единиц/),
      unitPrice: toNumber(get(/цена/)),
      plannedCost: toNumber(get(/сумма/)),
      budget,
    };
  }

  function attachRepairBudgetTotals(rows) {
    const totals = new Map();
    rows.forEach((row) => {
      const current = totals.get(row.houseKey) || { planned: 0, works: 0 };
      current.planned += row.plannedCost;
      current.works += 1;
      totals.set(row.houseKey, current);
    });
    rows.forEach((row) => {
      const current = totals.get(row.houseKey) || { planned: 0, works: 0 };
      const annualBudget = row.budget ? row.budget.annualBudget : 0;
      row.housePlanTotal = current.planned;
      row.houseWorkCount = current.works;
      row.budgetGap = Math.max(0, current.planned - annualBudget);
      row.budgetRisk = !row.budget || (current.planned > 0 && current.planned > annualBudget);
      row.riskText = !row.budget
        ? 'Бюджет по дому не найден'
        : row.budgetGap > 0
          ? `Не хватает ${formatMoney(row.budgetGap)} руб.`
          : '';
    });
  }

  function populateRepairFilters(rows) {
    fillSelect(els.repairComplexFilter, rows.map((row) => row.complex).filter(Boolean), 'Все ЖК');
  }

  function applyRepairFilters() {
    const complex = els.repairComplexFilter.value;
    const status = els.repairStatusFilter.value;
    const budget = els.repairBudgetFilter.value;
    const query = els.repairSearchInput.value.trim().toLowerCase();
    state.repairFiltered = state.repairRows.filter((row) => {
      if (complex && row.complex !== complex) return false;
      if (status && row.statusKey !== status) return false;
      if (budget === 'risk' && !row.budgetRisk) return false;
      if (budget === 'ok' && row.budgetRisk) return false;
      if (budget === 'noBudget' && row.budget) return false;
      if (!matchesRepairMetricFilter(row)) return false;
      if (query) {
        const haystack = [row.complex, row.house, row.address, row.workType, row.status].join(' ').toLowerCase();
        if (!haystack.includes(query)) return false;
      }
      return true;
    });
    sortRepairRows();
    updateRepairFilterControls();
    renderRepairs();
  }

  function matchesRepairMetricFilter(row) {
    if (state.repairMetricFilter === 'all') return true;
    if (state.repairMetricFilter === 'progress') return row.statusKey === 'progress';
    if (state.repairMetricFilter === 'done') return row.statusKey === 'done';
    if (state.repairMetricFilter === 'risk') return row.budgetRisk;
    if (state.repairMetricFilter === 'planned') return row.plannedCost > 0;
    if (state.repairMetricFilter === 'gap') return row.budgetGap > 0 || !row.budget;
    return true;
  }

  function sortRepairRows() {
    const sort = els.repairSort.value;
    state.repairFiltered.sort((a, b) => {
      if (sort === 'costDesc') return b.plannedCost - a.plannedCost;
      if (sort === 'dateAsc') return (a.startDate || new Date(2100, 0, 1)) - (b.startDate || new Date(2100, 0, 1));
      if (sort === 'complex') return `${a.complex} ${a.house}`.localeCompare(`${b.complex} ${b.house}`, 'ru');
      return Number(b.budgetRisk) - Number(a.budgetRisk)
        || b.budgetGap - a.budgetGap
        || `${a.complex} ${a.house}`.localeCompare(`${b.complex} ${b.house}`, 'ru');
    });
  }

  function updateRepairFilterControls() {
    document.querySelectorAll('[data-repair-filter]').forEach((card) => {
      card.classList.toggle('active-filter', card.dataset.repairFilter === state.repairMetricFilter && state.repairMetricFilter !== 'all');
    });
    document.querySelectorAll('[data-repair-status-filter]').forEach((button) => {
      button.classList.toggle('active-filter', button.dataset.repairStatusFilter === state.repairStatusFilter);
    });
  }

  function renderRepairs() {
    renderRepairMetrics();
    renderRepairGantt();
    renderRepairBudget();
    renderRepairTable();
  }

  function renderRepairMetrics() {
    const rows = state.repairFiltered;
    const progress = rows.filter((row) => row.statusKey === 'progress').length;
    const done = rows.filter((row) => row.statusKey === 'done').length;
    const risk = rows.filter((row) => row.budgetRisk).length;
    const plan = rows.reduce((sum, row) => sum + row.plannedCost, 0);
    const gap = repairHouseStats(rows).reduce((sum, item) => sum + Math.max(0, item.gap), 0);
    els.repairWorkCount.textContent = rows.length;
    els.repairInProgressCount.textContent = progress;
    els.repairDoneCount.textContent = done;
    els.repairRiskCount.textContent = risk;
    els.repairPlanTotal.textContent = formatMoney(plan) || '0';
    els.repairBudgetGap.textContent = formatMoney(gap) || '0';
  }

  function renderRepairGantt() {
    const rows = state.repairFiltered.filter((row) => row.startDate && row.endDate).slice(0, 220);
    els.repairGanttRange.textContent = '2026';
    if (!rows.length) {
      els.repairGantt.innerHTML = '<div class="empty">Нет работ со сроками в выбранной выборке.</div>';
      return;
    }
    const months = Array.from({ length: 12 }, (_, month) => new Date(2026, month, 1));
    const grid = document.createElement('div');
    grid.className = 'gantt-grid';
    grid.style.setProperty('--days', months.length);
    const corner = document.createElement('div');
    corner.className = 'gantt-head';
    corner.textContent = 'Работа';
    grid.appendChild(corner);
    months.forEach((month) => {
      const head = document.createElement('div');
      head.className = 'gantt-head';
      head.textContent = formatShortMonth(month);
      grid.appendChild(head);
    });
    rows.forEach((row) => {
      const name = document.createElement('div');
      name.className = 'gantt-name';
      name.innerHTML = `<strong>${escapeHtml(row.complex || 'Без ЖК')} · ${escapeHtml(row.house || row.address)}</strong><span>${escapeHtml(row.workType || 'Без вида работ')}</span>`;
      grid.appendChild(name);
      months.forEach((month) => {
        const cell = document.createElement('div');
        cell.className = 'gantt-cell';
        if (row.startDate.getMonth() === month.getMonth()) {
          const bar = document.createElement('div');
          bar.className = 'bar ' + repairStatusClass(row);
          bar.title = `${row.address}: ${row.workType}. ${repairStatusLabel(row.statusKey)}`;
          cell.appendChild(bar);
        }
        grid.appendChild(cell);
      });
    });
    els.repairGantt.innerHTML = '';
    els.repairGantt.appendChild(grid);
  }

  function renderRepairBudget() {
    const stats = repairHouseStats(state.repairFiltered);
    const risky = stats.filter((item) => item.risk).length;
    els.repairBudgetSummary.textContent = stats.length ? `${risky} рисков из ${stats.length} домов` : 'нет домов';
    els.repairBudgetList.innerHTML = stats.slice(0, 24).map((item) => {
      const pct = item.budget > 0 ? Math.min(100, Math.round((item.planned / item.budget) * 100)) : 100;
      return `<div class="budget-item ${item.risk ? 'risk' : 'ok'}"><header><strong>${escapeHtml(item.house)}</strong><span>${formatNumber(item.works)} работ</span></header><div class="load-track"><div class="load-bar ${item.risk ? 'over' : ''}" style="width:${pct}%"></div></div><p>План ${formatMoney(item.planned) || 0} руб. · бюджет ${formatMoney(item.budget) || 0} руб.${item.gap > 0 ? ` · дефицит ${formatMoney(item.gap)} руб.` : ''}</p></div>`;
    }).join('') || '<div class="empty">Нет данных по бюджету в выбранной выборке.</div>';
  }

  function renderRepairTable() {
    const rows = state.repairFiltered;
    els.repairRowsCount.textContent = `${rows.length} строк`;
    els.repairRegistryBody.innerHTML = rows.slice(0, 700).map((row) => {
      const risk = row.riskText ? `<span class="risk-text">${escapeHtml(row.riskText)}</span>` : '<span class="ok-text">Бюджет ок</span>';
      return `<tr><td>${escapeHtml(row.complex)}</td><td>${escapeHtml(row.house || row.address)}</td><td>${escapeHtml(row.workType)}</td><td>${escapeHtml(row.deadlineRaw || '')}</td><td><span class="pill ${repairStatusClass(row)}">${escapeHtml(repairStatusLabel(row.statusKey))}</span></td><td>${formatMoney(row.plannedCost)}</td><td>${formatMoney(row.budget ? row.budget.annualBudget : 0)}</td><td>${risk}</td><td><button class="row-action" type="button" data-act-id="${row.id}">Акт</button></td></tr>`;
    }).join('');
  }

  function repairHouseStats(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.houseKey || normalizeRepairAddress(row.house || row.address);
      const current = map.get(key) || {
        house: row.budget ? row.budget.house : row.house || row.address,
        planned: 0,
        budget: row.budget ? row.budget.annualBudget : 0,
        works: 0,
      };
      current.planned += row.plannedCost;
      current.works += 1;
      current.risk = current.budget <= 0 || current.planned > current.budget;
      current.gap = Math.max(0, current.planned - current.budget);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => Number(b.risk) - Number(a.risk) || b.gap - a.gap || b.planned - a.planned);
  }

  function openRepairAct(id) {
    const row = state.repairRows.find((item) => item.id === id);
    if (!row) return;
    const date = new Date().toLocaleDateString('ru-RU');
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Акт выполненных работ</title><style>body{font-family:Arial,sans-serif;color:#111;padding:32px;line-height:1.45}.toolbar{margin-bottom:24px}@media print{.toolbar{display:none}}button{padding:10px 14px;border:1px solid #9aa7b4;border-radius:6px;background:#f5f7f9;font-weight:700}.doc{max-width:860px;margin:auto}h1{text-align:center;font-size:20px}.row{display:flex;justify-content:space-between;gap:24px;margin:18px 0}.muted{color:#667085}table{width:100%;border-collapse:collapse;margin:22px 0}th,td{border:1px solid #9aa7b4;padding:9px;text-align:left}.sign{display:grid;grid-template-columns:1fr 1fr;gap:48px;margin-top:48px}.line{border-bottom:1px solid #111;height:32px}</style></head><body><div class="toolbar"><button onclick="window.print()">Печать / сохранить PDF</button></div><main class="doc"><h1>АКТ приемки оказанных услуг и выполненных работ по текущему ремонту</h1><div class="row"><span>Дата: ${escapeHtml(date)}</span><span>Объект: ${escapeHtml(row.house || row.address)}</span></div><p>Комиссия произвела приемку работ по текущему ремонту на объекте <strong>${escapeHtml(row.address)}</strong>.</p><table><thead><tr><th>Вид работ</th><th>Объем</th><th>Ед. изм.</th><th>Цена за ед.</th><th>Сумма</th><th>Статус</th></tr></thead><tbody><tr><td>${escapeHtml(row.workType)}</td><td>${formatNumber(row.amount)}</td><td>${escapeHtml(row.unit)}</td><td>${formatMoney(row.unitPrice)}</td><td>${formatMoney(row.plannedCost)}</td><td>${escapeHtml(repairStatusLabel(row.statusKey))}</td></tr></tbody></table><p>Работы выполнены в соответствии с заявленным видом работ. Замечания по качеству и объему работ указываются комиссией при подписании акта.</p><div class="sign"><div><p class="muted">Представитель управляющей организации</p><div class="line"></div></div><div><p class="muted">Представитель собственников / заказчика</p><div class="line"></div></div></div></main></body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      showNotice('Браузер заблокировал открытие акта. Разрешите всплывающие окна для сайта.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function repairStatusKey(value) {
    const raw = String(value || '').trim().toLowerCase();
    if (raw.includes('выполн')) return 'done';
    if (raw.includes('работ') || raw.includes('процесс')) return 'progress';
    return 'new';
  }

  function repairStatusLabel(key) {
    if (key === 'done') return 'Выполнено';
    if (key === 'progress') return 'В работе';
    return 'Не начали / нет информации';
  }

  function repairStatusClass(row) {
    if (row.statusKey === 'done') return 'status-repair-done';
    if (row.statusKey === 'progress') return 'status-repair-progress';
    return 'status-repair-new';
  }

  function detectRepairComplex(address) {
    const raw = String(address || '').trim();
    const lower = raw.toLowerCase();
    if (lower.startsWith('метроград')) return 'Метроград';
    if (lower.startsWith('васильки')) return 'Васильки';
    if (lower.startsWith('точки')) return 'Точки';
    if (lower.startsWith('знак') || lower.startsWith('жк знак')) return 'Знак';
    if (lower.startsWith('елки') || lower.startsWith('ёлки')) return 'Елки';
    if (lower.startsWith('зарядное')) return 'Зарядное';
    return raw.split(/\s+/).slice(0, 1).join(' ') || 'Без ЖК';
  }

  function stripRepairComplex(address, complex) {
    let value = String(address || '').trim();
    if (complex && complex !== 'Без ЖК') {
      value = value.replace(new RegExp(`^(жк\\s+)?${escapeRegExp(complex)}\\s*`, 'i'), '').trim();
    }
    return value || address;
  }

  function normalizeRepairAddress(value) {
    return String(value || '')
      .toLowerCase()
      .replace(/ё/g, 'е')
      .replace(/\bжк\b/g, '')
      .replace(/\bд\.?\b/g, '')
      .replace(/метроград|васильки|точки|знак|елки|зарядное/g, '')
      .replace(/[^а-яa-z0-9]/g, '');
  }

  function findRepairBudget(address, house, budgetMap, budgets) {
    const keys = [normalizeRepairAddress(house), normalizeRepairAddress(address)].filter(Boolean);
    for (const key of keys) {
      if (budgetMap.has(key)) return budgetMap.get(key);
    }
    return budgets.find((budget) => keys.some((key) => key.includes(budget.key) || budget.key.includes(key))) || null;
  }

  function repairMonthDate(monthRaw, year, endOfMonth) {
    const months = {
      январ: 0, феврал: 1, март: 2, апрел: 3, май: 4, мая: 4, июн: 5,
      июл: 6, август: 7, сентябр: 8, октябр: 9, ноябр: 10, декабр: 11,
    };
    const raw = String(monthRaw || '').trim().toLowerCase();
    const key = Object.keys(months).find((month) => raw.startsWith(month));
    if (!key) return null;
    const month = months[key];
    return endOfMonth ? new Date(year, month + 1, 0) : new Date(year, month, 1);
  }

  function escapeRegExp(value) {
    return String(value || '').replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
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
