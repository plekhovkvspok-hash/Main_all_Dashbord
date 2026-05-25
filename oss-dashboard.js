(function () {
  const ossApiUrl = '/api/sheet';
  const servicesApiUrl = '/api/services';
  const repairsApiUrl = '/api/repairs';
  const aiPresentationApiUrl = '/api/ai-presentation';
  const estimateApiUrl = '/api/estimate';
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
      const actButton = event.target.closest('[data-act-id]');
      if (actButton) openRepairAct(Number(actButton.dataset.actId));
      const estimateButton = event.target.closest('[data-estimate-id]');
      if (estimateButton) openRepairEstimate(Number(estimateButton.dataset.estimateId));
      const aiPresentationButton = event.target.closest('[data-ai-presentation-id]');
      if (aiPresentationButton) openAiRepairPresentation(Number(aiPresentationButton.dataset.aiPresentationId));
      const notebookButton = event.target.closest('[data-notebook-id]');
      if (notebookButton) downloadNotebookPackage(Number(notebookButton.dataset.notebookId));
    });
    window.ossDashboardOpenRepairPresentation = openRepairPresentation;
    window.ossDashboardOpenRepairAct = openRepairAct;

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
    const startRaw = String(row[4] || '').trim() || get(/плановая дата начала/);
    const endRaw = get(/дата завершения/, /окончан/);
    const duration = toNumber(get(/срок голосования/));
    const startDate = parseDate(startRaw);
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
          annualBudget: toNumber(row[5]),
          balance: toNumber(row[5]),
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
    els.repairBudgetSummary.textContent = stats.length ? `${risky} рисков из ${stats.length} домов · красный = дефицит бюджета` : 'нет домов';
    els.repairBudgetList.innerHTML = stats.slice(0, 24).map((item) => {
      const pct = item.budget > 0 ? Math.min(100, Math.round((item.planned / item.budget) * 100)) : 100;
      return `<div class="budget-item ${item.risk ? 'risk' : 'ok'}"><header><strong>${escapeHtml(shortRepairHouseName(item.house))}</strong><span>${formatNumber(item.works)} работ</span></header><div class="load-track"><div class="load-bar ${item.risk ? 'over' : ''}" style="width:${pct}%"></div></div><dl class="budget-lines"><div><dt>Бюджет</dt><dd>${formatMoney(item.budget) || 0} руб.</dd></div><div><dt>План</dt><dd>${formatMoney(item.planned) || 0} руб.</dd></div><div><dt>Факт</dt><dd>${formatMoney(item.fact) || 0} руб.</dd></div><div><dt>Дефицит</dt><dd class="${item.gap > 0 ? 'risk-text' : 'ok-text'}">${formatMoney(item.gap) || 0} руб.</dd></div></dl></div>`;
    }).join('') || '<div class="empty">Нет данных по бюджету в выбранной выборке.</div>';
  }

  function renderRepairTable() {
    const rows = state.repairFiltered;
    els.repairRowsCount.textContent = `${rows.length} строк`;
    els.repairRegistryBody.innerHTML = rows.slice(0, 700).map((row) => {
      const risk = row.riskText ? `<span class="risk-text">${escapeHtml(row.riskText)}</span>` : '<span class="ok-text">Бюджет ок</span>';
      const estimate = row.budgetRisk ? `<button class="row-action" type="button" data-estimate-id="${row.id}">Смета</button>` : '';
      const notebook = row.budgetRisk ? `<button class="row-action" type="button" data-notebook-id="${row.id}">NotebookLM</button>` : '';
      const aiPresentation = row.budgetRisk ? `<button class="row-action" type="button" data-ai-presentation-id="${row.id}">AI-презентация</button>` : '';
      return `<tr><td>${escapeHtml(row.complex)}</td><td>${escapeHtml(row.house || row.address)}</td><td>${escapeHtml(row.workType)}</td><td>${escapeHtml(row.deadlineRaw || '')}</td><td><span class="pill ${repairStatusClass(row)}">${escapeHtml(repairStatusLabel(row.statusKey))}</span></td><td>${formatMoney(row.plannedCost)}</td><td>${formatMoney(row.budget ? row.budget.annualBudget : 0)}</td><td>${risk}</td><td><button class="row-action" type="button" data-act-id="${row.id}">Акт</button> ${estimate} ${aiPresentation} ${notebook}</td></tr>`;
    }).join('');
  }

  function repairHouseStats(rows) {
    const map = new Map();
    rows.forEach((row) => {
      const key = row.houseKey || normalizeRepairAddress(row.house || row.address);
      const current = map.get(key) || {
        house: row.budget ? row.budget.house : row.house || row.address,
        planned: 0,
        fact: 0,
        budget: row.budget ? row.budget.annualBudget : 0,
        works: 0,
      };
      current.planned += row.plannedCost;
      if (row.statusKey === 'done') current.fact += row.plannedCost;
      current.works += 1;
      current.risk = current.budget <= 0 || current.planned > current.budget;
      current.gap = Math.max(0, current.planned - current.budget);
      map.set(key, current);
    });
    return Array.from(map.values()).sort((a, b) => Number(b.risk) - Number(a.risk) || b.gap - a.gap || b.planned - a.planned);
  }

  function shortRepairHouseName(value) {
    return String(value || '')
      .replace(/Дмитрия\s+Козулева/gi, 'Козулева')
      .replace(/Капитана\s+Дорофеева/gi, 'Дорофеева')
      .replace(/К\.\s*Дорофеева/gi, 'Дорофеева')
      .replace(/\s+/g, ' ')
      .trim();
  }

  function downloadNotebookPackage(id) {
    const row = state.repairRows.find((item) => item.id === id);
    if (!row) return;
    const budget = row.budget ? row.budget.annualBudget : 0;
    const deficit = Math.max(0, row.housePlanTotal - budget);
    const house = shortRepairHouseName(row.budget ? row.budget.house : row.house || row.address);
    const monthly3 = deficit ? deficit / 3 : 0;
    const monthly6 = deficit ? deficit / 6 : 0;
    const fileName = safeFileName(`notebooklm_${house}_${row.workType || 'remont'}.md`);
    const markdown = `# Материалы для NotebookLM: ${house}

## Контекст
- Дом: ${row.address || row.house || ''}
- ЖК: ${row.complex || ''}
- Вид работ: ${row.workType || ''}
- Плановый срок: ${row.deadlineRaw || 'не указан'}
- Статус работ: ${repairStatusLabel(row.statusKey)}

## Финансы
- Бюджет дома по текущему ремонту: ${formatMoney(budget) || 0} руб.
- План по дому: ${formatMoney(row.housePlanTotal) || 0} руб.
- Стоимость выбранного вида работ: ${formatMoney(row.plannedCost) || 0} руб.
- Дефицит бюджета: ${formatMoney(deficit) || 0} руб.
- Ориентир сбора на 3 месяца: ${formatMoney(monthly3) || 0} руб. в месяц на дом
- Ориентир сбора на 6 месяцев: ${formatMoney(monthly6) || 0} руб. в месяц на дом

## Объем и расчет
- Объем: ${row.amount ? formatNumber(row.amount) : 'уточнить'} ${row.unit || ''}
- Цена за единицу: ${formatMoney(row.unitPrice) || 'уточнить'} руб.
- Расчетная сумма: ${formatMoney(row.plannedCost) || 0} руб.

## Что нужно добавить инженеру
- Фото дефектов с пояснениями.
- Краткое описание текущего состояния.
- Последствия, если работы не выполнить.
- Техническое решение и материалы.
- Срок выполнения и ограничения по доступу.

## Посыл для собственников
Бюджета текущего ремонта недостаточно для проведения работ. Чтобы выполнить работы планово и прозрачно, необходимо провести общее собрание собственников, принять решение о выполнении работ и утвердить порядок сбора средств.

## Структура презентации
1. Титульный слайд: дом, вид работ, причина обращения.
2. Проблема: что обнаружено, какие дефекты есть.
3. Риски: что будет, если работы не выполнить.
4. Решение: какие работы предлагаются и почему.
5. Стоимость: бюджет, план, дефицит, варианты сбора.
6. Решение ОСС: что собственникам нужно проголосовать.

## Задание для NotebookLM
На основе этих материалов подготовь понятную презентацию для жителей многоквартирного дома. Тон: спокойный, экспертный, без давления. Цель: объяснить, почему нужно провести ОСС, принять решение о работах и утвердить сбор средств. Используй структуру: проблема, риски, решение, стоимость, что голосуем. Отдельно сформируй короткий FAQ для жителей и список тезисов для выступления инженера на собрании.
`;
    downloadTextFile(fileName, markdown, 'text/markdown;charset=utf-8');
  }

  function openRepairEstimate(id) {
    const row = state.repairRows.find((item) => item.id === id);
    if (!row) return;
    const budget = row.budget ? row.budget.annualBudget : 0;
    const deficit = Math.max(0, (row.housePlanTotal || row.plannedCost || 0) - budget);
    const data = {
      id,
      address: row.address || row.house || '',
      house: row.house || row.address || '',
      complex: row.complex || '',
      workType: row.workType || '',
      deadline: row.deadlineRaw || '',
      plannedCost: row.plannedCost || 0,
      housePlanTotal: row.housePlanTotal || row.plannedCost || 0,
      budget,
      deficit,
      amount: row.amount || '',
      unit: row.unit || '',
      unitPrice: row.unitPrice || '',
    };
    const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Смета текущего ремонта</title><style>body{margin:0;background:#f3f5f7;color:#111827;font-family:Arial,Helvetica,sans-serif}.toolbar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#fff;border-bottom:1px solid #d5dde7;padding:10px 14px}.toolbar button,.toolbar label{border:1px solid #9aa7b4;border-radius:8px;background:#f7fafc;padding:9px 12px;font-weight:700;cursor:pointer}.toolbar .primary{background:#fff1e8;border-color:#ff4b12}.toolbar input[type=file]{display:none}.wrap{max-width:1180px;margin:18px auto 40px;padding:0 16px}.panel{background:#fff;border:1px solid #d8e0ea;border-radius:10px;box-shadow:0 2px 10px rgb(15 23 42 / .08);padding:18px;margin-bottom:14px}.grid{display:grid;grid-template-columns:repeat(2,minmax(0,1fr));gap:12px}.grid label{display:grid;gap:6px;font-weight:700;color:#475569}.grid input,.grid select,.grid textarea{min-height:38px;border:1px solid #cbd5e1;border-radius:8px;padding:8px 10px;font:inherit}.grid textarea{min-height:86px;resize:vertical}.full{grid-column:1/-1}.summary{display:grid;grid-template-columns:repeat(4,1fr);gap:12px}.metric{border-left:5px solid #ff4b12;background:#f8fafc;border-radius:8px;padding:12px}.metric span{display:block;color:#64748b;font-size:13px}.metric strong{font-size:24px}.notice{border:1px solid #f4b84a;background:#fff7df;border-radius:8px;padding:12px;margin-bottom:14px;color:#7a4b00}.status{font-weight:700;color:#475569}.table{width:100%;border-collapse:collapse;margin-top:12px}.table th,.table td{border-bottom:1px solid #e2e8f0;padding:9px 8px;text-align:left;vertical-align:top}.table th{background:#f8fafc;color:#475569}.right{text-align:right}.sources a{display:block;color:#0f5fb7;margin:5px 0}.photo-list{display:flex;flex-wrap:wrap;gap:8px;color:#475569}.photo-list img{width:110px;height:82px;object-fit:cover;border-radius:8px;border:1px solid #d8e0ea}.client-toggle{display:flex;gap:8px;align-items:center;font-weight:700}@media print{.toolbar,.form-panel{display:none}.wrap{margin:0;max-width:none}.panel{box-shadow:none;border:0}}</style></head><body><div class="toolbar"><button class="primary" onclick="generateEstimate()">Рассчитать смету</button><label>Фото дефекта<input id="photoInput" type="file" accept="image/*" multiple onchange="previewPhotos(event)"></label><button onclick="downloadEstimate()">Скачать смету</button><button onclick="openPresentation()">Презентация со сметой</button><button onclick="openAct()">Акт со сметой</button><button onclick="window.print()">Печать / PDF</button></div><main class="wrap"><div id="notice" class="notice">Смета использует региональный поиск Gemini/Google Search. Это предварительный расчет: перед отправкой клиенту инженер должен проверить объемы, цены и источники.</div><section class="panel form-panel"><h1>Смета текущего ремонта</h1><div class="grid"><label>Регион<select id="region"><option>Кировская область</option><option>Республика Татарстан</option><option>Нижегородская область</option><option>Пермский край</option><option>Удмуртская Республика</option><option>Москва и Московская область</option><option>Санкт-Петербург и Ленинградская область</option></select></label><label>Адрес<input id="address" value="${escapeAttr(data.address)}"></label><label>Вид работ<input id="workType" value="${escapeAttr(data.workType)}"></label><label>Объем<input id="amount" value="${escapeAttr(data.amount)}" placeholder="например 35"></label><label>Ед. изм.<input id="unit" value="${escapeAttr(data.unit || 'ед.')}" placeholder="м.п., м2, шт."></label><label>План из борда, руб.<input id="plannedCost" value="${escapeAttr(Math.round(data.plannedCost || 0))}"></label><label class="full">Крупное описание дефекта<textarea id="defectDescription" placeholder="Что сломано, где находится, какие последствия, насколько срочно"></textarea></label><label class="full">Что и как хотим отремонтировать<textarea id="repairGoal">${escapeHtml(data.workType)}</textarea></label></div><div id="photos" class="photo-list"></div></section><section class="panel"><div class="summary"><div class="metric"><span>Бюджет дома</span><strong>${formatMoney(data.budget)} руб.</strong></div><div class="metric"><span>План дома</span><strong>${formatMoney(data.housePlanTotal)} руб.</strong></div><div class="metric"><span>Дефицит</span><strong>${formatMoney(data.deficit)} руб.</strong></div><div class="metric"><span>Показывать клиенту</span><label class="client-toggle"><input id="showClient" type="checkbox" checked> да</label></div></div><p id="status" class="status">Расчет еще не запускался.</p><div id="result"></div></section></main><script>const baseData=${dataJson};const estimateApiUrl=${JSON.stringify(estimateApiUrl)};let currentEstimate=null;let photoPayload=[];function money(value){return Number(value||0).toLocaleString('ru-RU',{maximumFractionDigits:2})}function escapeHtml(value){return String(value||'').replace(/[&<>"']/g,(ch)=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[ch]))}function collectInput(){return {...baseData,region:document.getElementById('region').value,address:document.getElementById('address').value,workType:document.getElementById('workType').value,amount:document.getElementById('amount').value,unit:document.getElementById('unit').value,plannedCost:Number(String(document.getElementById('plannedCost').value).replace(/\\s/g,'').replace(',','.'))||baseData.plannedCost,defectDescription:document.getElementById('defectDescription').value,repairGoal:document.getElementById('repairGoal').value,photos:photoPayload}}function previewPhotos(event){const files=Array.from(event.target.files||[]).slice(0,3);photoPayload=[];const box=document.getElementById('photos');box.innerHTML='';files.forEach((file)=>{const img=document.createElement('img');img.src=URL.createObjectURL(file);img.alt=file.name;box.appendChild(img);const reader=new FileReader();reader.onload=()=>{const result=String(reader.result||'');photoPayload.push({mimeType:file.type,data:result.split(',')[1]||''})};reader.readAsDataURL(file)})}async function generateEstimate(){document.getElementById('status').textContent='Ищу региональные цены и собираю смету...';try{const response=await fetch(estimateApiUrl,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify(collectInput())});if(!response.ok)throw new Error('HTTP '+response.status);currentEstimate=await response.json();renderEstimate(currentEstimate);document.getElementById('status').textContent=currentEstimate.aiGenerated?'Смета сформирована через Gemini с региональным поиском.':'Смета открыта в шаблонном режиме: '+(currentEstimate.error||'нет доступа к Gemini/поиску');}catch(error){document.getElementById('status').textContent='Не удалось сформировать смету: '+(error.message||error)}}function rowHtml(row){return '<tr><td>'+escapeHtml(row.name)+'</td><td>'+escapeHtml(row.quantity)+'</td><td>'+escapeHtml(row.unit)+'</td><td class="right">'+money(row.unitPrice)+'</td><td class="right">'+money(row.total)+'</td><td>'+escapeHtml(row.sourceNote)+'</td></tr>'}function renderEstimate(estimate){const totals=estimate.totals||{};const materials=Array.isArray(estimate.materials)?estimate.materials:[];const works=Array.isArray(estimate.works)?estimate.works:[];const assumptions=Array.isArray(estimate.assumptions)?estimate.assumptions:[];const sources=Array.isArray(estimate.sources)?estimate.sources:[];document.getElementById('result').innerHTML='<h2>'+escapeHtml(estimate.title||baseData.workType)+'</h2><p>'+escapeHtml(estimate.clientSummary||'')+'</p><h3>Допущения</h3><ul>'+assumptions.map((item)=>'<li>'+escapeHtml(item)+'</li>').join('')+'</ul><h3>Материалы</h3><table class="table"><thead><tr><th>Материал</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th><th>Источник/заметка</th></tr></thead><tbody>'+(materials.map(rowHtml).join('')||'<tr><td colspan="6">Нет данных</td></tr>')+'</tbody></table><h3>Работы</h3><table class="table"><thead><tr><th>Работа</th><th>Кол-во</th><th>Ед.</th><th>Цена</th><th>Сумма</th><th>Источник/заметка</th></tr></thead><tbody>'+(works.map(rowHtml).join('')||'<tr><td colspan="6">Нет данных</td></tr>')+'</tbody></table><h3>Итог</h3><div class="summary"><div class="metric"><span>Материалы</span><strong>'+money(totals.materials)+' руб.</strong></div><div class="metric"><span>Работы</span><strong>'+money(totals.labor)+' руб.</strong></div><div class="metric"><span>Накладные/доставка</span><strong>'+money(totals.overhead)+' руб.</strong></div><div class="metric"><span>Итого</span><strong>'+money(totals.total)+' руб.</strong></div></div><h3>Заметки инженеру</h3><p>'+escapeHtml(estimate.engineerNotes||'')+'</p><h3>Источники</h3><div class="sources">'+(sources.map((source)=>'<a href="'+escapeHtml(source.url)+'" target="_blank" rel="noreferrer">'+escapeHtml(source.title||source.url)+'</a>').join('')||'Источники не вернулись. Проверьте расценки вручную.')+'</div>'}function estimateText(){return document.querySelector('.wrap').innerText.trim()}function downloadEstimate(){const blob=new Blob(['<!doctype html>\\n'+document.documentElement.outerHTML],{type:'text/html;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='smeta-tekushiy-remont.html';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}function publicEstimate(){return document.getElementById('showClient').checked?currentEstimate:null}function openPresentation(){if(window.opener&&window.opener.ossDashboardOpenRepairPresentation){window.opener.ossDashboardOpenRepairPresentation(baseData.id,null,publicEstimate());return}alert('Не удалось открыть презентацию из окна сметы.')}function openAct(){if(window.opener&&window.opener.ossDashboardOpenRepairAct){window.opener.ossDashboardOpenRepairAct(baseData.id,publicEstimate());return}alert('Не удалось открыть акт из окна сметы.')}</script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      showNotice('Браузер заблокировал открытие сметы. Разрешите всплывающие окна для сайта.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  async function openAiRepairPresentation(id) {
    const row = state.repairRows.find((item) => item.id === id);
    if (!row) return;
    const budget = row.budget ? row.budget.annualBudget : 0;
    const input = {
      address: row.address || row.house || '',
      house: shortRepairHouseName(row.budget ? row.budget.house : row.house || row.address),
      complex: row.complex || '',
      workType: row.workType || '',
      deadline: row.deadlineRaw || '',
      status: repairStatusLabel(row.statusKey),
      budget,
      housePlanTotal: row.housePlanTotal,
      plannedCost: row.plannedCost,
      deficit: Math.max(0, row.housePlanTotal - budget),
      amount: row.amount,
      unit: row.unit || '',
      price: row.unitPrice || row.plannedCost,
    };

    showNotice('Генерирую AI-презентацию через Gemini...');
    try {
      const response = await fetch(aiPresentationApiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(input),
      });
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      const ai = await response.json();
      openRepairPresentation(id, ai);
      if (ai.aiGenerated) {
        showNotice(`AI-презентация сформирована через Gemini${ai.model ? ` (${ai.model})` : ''}.`);
      } else if (ai.setupRequired) {
        showNotice('AI-презентация открыта в шаблонном режиме. GEMINI_API_KEY не найден в Vercel для текущего деплоя.');
      } else if (ai.error) {
        showNotice(`Gemini не сформировал презентацию: ${ai.error}. Открываю шаблон.`);
      } else {
        showNotice('AI-презентация открыта в шаблонном режиме. Gemini не вернул готовый текст.');
      }
    } catch (error) {
      showNotice(`Не удалось вызвать AI API: ${error.message || error}. Открываю обычную презентацию.`);
      openRepairPresentation(id);
    }
  }

  function openRepairPresentation(id, aiContent) {
    const row = state.repairRows.find((item) => item.id === id);
    if (!row) return;
    const budget = row.budget ? row.budget.annualBudget : 0;
    const deficit = Math.max(0, row.housePlanTotal - budget);
    const data = {
      address: row.address || row.house || '',
      house: shortRepairHouseName(row.budget ? row.budget.house : row.house || row.address),
      workType: row.workType || '',
      deadline: row.deadlineRaw || '',
      plannedCost: row.plannedCost,
      housePlanTotal: row.housePlanTotal,
      budget,
      deficit,
      amount: row.amount,
      unit: row.unit || '',
      price: row.unitPrice || row.plannedCost,
    };
    const ai = aiContent || {};
    const problemTitle = ai.problemTitle || 'Почему нужно вынести вопрос на ОСС?';
    const problemText = ai.problemText || 'По дому недостаточно бюджета для выполнения работ. Чтобы провести ремонт, собственникам нужно принять решение на общем собрании и утвердить сбор средств.';
    const solutionText = ai.solutionText || 'Утвердить выполнение работ, стоимость и порядок финансирования через решение ОСС.';
    const residentBenefit = ai.residentBenefit || 'Плановое решение позволяет контролировать стоимость, сроки и качество работ.';
    const voteText = ai.voteText || 'Утвердить проведение работ, стоимость, порядок сбора средств и поручить управляющей организации организовать выполнение.';
    const riskBullets = Array.isArray(ai.riskBullets) && ai.riskBullets.length ? ai.riskBullets : [
      'Работы могут перейти в аварийный сценарий.',
      'Срочное устранение обычно дороже планового ремонта.',
      'Затягивание решения повышает риск ущерба общему имуществу.',
    ];
    const faq = Array.isArray(ai.faq) ? ai.faq.slice(0, 3) : [];
    const aiBadge = ai.aiGenerated ? 'Содержание подготовлено Gemini' : 'Шаблон презентации';
    const dataJson = JSON.stringify(data).replace(/</g, '\\u003c');
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Презентация для ОСС</title><style>@page{size:landscape;margin:0}body{margin:0;background:#f4f4f4;color:#2f2f2f;font-family:Arial,Helvetica,sans-serif}.toolbar{position:sticky;top:0;z-index:5;display:flex;flex-wrap:wrap;gap:8px;align-items:center;background:#fff;border-bottom:1px solid #d5dde7;padding:10px 14px}.toolbar button,.toolbar label{border:1px solid #b8b8b8;border-radius:8px;background:#f7fafc;padding:9px 12px;font-weight:700;cursor:pointer}.toolbar .primary{background:#fff1e8;border-color:#ff4b12;color:#2f2f2f}.toolbar input[type=file]{display:none}.deck{max-width:1280px;margin:18px auto 40px}.slide{position:relative;min-height:680px;margin:0 0 18px;background:linear-gradient(135deg,#fff 0%,#fff 58%,#f2f2f2 100%);border-radius:18px;box-shadow:0 8px 28px rgb(47 47 47 / .14);padding:48px;overflow:hidden}.brand-logo{position:absolute;right:34px;top:24px;display:flex;align-items:center;gap:14px;color:#2f2f2f}.brand-mark{position:relative;width:48px;height:48px}.brand-mark:before{content:"";position:absolute;left:5px;top:3px;width:30px;height:30px;border-left:12px solid #ff4b12;border-top:12px solid #ff4b12;transform:rotate(45deg)}.brand-mark:after{content:"";position:absolute;left:18px;bottom:4px;width:12px;height:12px;background:#ff4b12;transform:rotate(45deg)}.brand-title{font-size:44px;font-weight:900;letter-spacing:6px}.brand-subtitle{font-size:15px;font-weight:800;letter-spacing:2px;color:#555}.slide h1{margin:0 0 24px;font-size:50px;line-height:1.04;color:#2f2f2f}.slide h2{margin:0 0 22px;font-size:36px;color:#2f2f2f}.slide p{font-size:22px;line-height:1.35}.accent{color:#f05a28}.blue{color:#2f2f2f}.grid{display:grid;grid-template-columns:1fr 1fr;gap:34px}.cards{display:grid;grid-template-columns:repeat(3,1fr);gap:18px}.card{border:2px solid #d8d8d8;border-radius:16px;padding:20px;background:#fff}.card strong{display:block;font-size:30px;margin-top:10px}.risk-card{border-color:#f05a28;background:#fff5ef}.ok-card{border-color:#606060;background:#f5f5f5}.photo-grid{display:grid;grid-template-columns:repeat(3,1fr);gap:14px;margin-top:20px}.photo-grid img{width:100%;height:180px;object-fit:cover;border-radius:10px;border:1px solid #d6d6d6}.placeholder{display:flex;align-items:center;justify-content:center;height:180px;border:2px dashed #b8b8b8;border-radius:10px;color:#666;background:#f7f7f7}.calc{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:18px}.calc label{display:grid;gap:6px;font-weight:700;color:#555}.calc input{min-height:42px;border:1px solid #c8c8c8;border-radius:8px;padding:8px 10px;font:inherit}.big-number{font-size:74px;font-weight:900;color:#ff4b12}.decision{font-size:28px;font-weight:800}.footer{position:absolute;left:48px;right:48px;bottom:24px;display:flex;justify-content:space-between;color:#666;font-size:14px}@media print{body{background:#fff}.toolbar{display:none}.deck{margin:0;max-width:none}.slide{box-shadow:none;border-radius:0;margin:0;page-break-after:always;min-height:100vh}}</style></head><body><div class="toolbar"><button class="primary" onclick="window.print()">Печать / PDF</button><label>Добавить фото дефектов<input id="photoInput" type="file" accept="image/*" multiple onchange="loadPhotos(event)"></label><button onclick="recalculate()">Пересчитать</button><button onclick="downloadPresentation()">Скачать HTML</button><button onclick="sendEmail()">Email</button><button onclick="sharePresentation()">Поделиться</button></div><main class="deck"><section class="slide"><div class="brand-logo"><span class="brand-mark"></span><span><span class="brand-title">АЗБУКА</span><br><span class="brand-subtitle">СЕРВИСНАЯ КОМПАНИЯ</span></span></div><h1>${escapeHtml(data.workType)}<br><span class="blue">${escapeHtml(data.house)}</span></h1><div class="grid"><div><h2 class="accent">${escapeHtml(problemTitle)}</h2><p>${escapeHtml(problemText)}</p><p class="decision">${escapeHtml(residentBenefit)}</p></div><div class="card risk-card"><span>Дефицит бюджета</span><strong id="heroDeficit">${formatMoney(deficit)} руб.</strong><p>${escapeHtml(riskBullets[0] || "Красная зона означает, что план работ превышает доступный бюджет дома.")}</p></div></div><div class="footer"><span>ООО Сервисная компания "Азбука"</span><span>${escapeHtml(aiBadge)}</span></div></section><section class="slide"><div class="brand-logo"><span class="brand-mark"></span><span><span class="brand-title">АЗБУКА</span><br><span class="brand-subtitle">СЕРВИСНАЯ КОМПАНИЯ</span></span></div><h2>Фото дефектов и состояние объекта</h2><p>Инженер загружает фотографии дефектов перед отправкой презентации клиенту.</p><div id="photoGrid" class="photo-grid"><div class="placeholder">Фото 1</div><div class="placeholder">Фото 2</div><div class="placeholder">Фото 3</div></div><div class="footer"><span>${escapeHtml(data.address)}</span><span>Основание для работ</span></div></section><section class="slide"><div class="brand-logo"><span class="brand-mark"></span><span><span class="brand-title">АЗБУКА</span><br><span class="brand-subtitle">СЕРВИСНАЯ КОМПАНИЯ</span></span></div><h2>Объем и расчет стоимости</h2><div class="calc"><label>Объем<input id="amountInput" type="number" value="${data.amount || 1}" step="0.01"></label><label>Ед. изм.<input id="unitInput" value="${escapeAttr(data.unit || 'ед.')}"></label><label>Цена за ед., руб.<input id="priceInput" type="number" value="${Math.round(data.price || data.plannedCost || 0)}" step="0.01"></label><label>Месяцев сбора<input id="monthsInput" type="number" value="6" min="1"></label></div><div class="cards"><div class="card"><span>Бюджет дома</span><strong id="budgetValue">${formatMoney(budget)} руб.</strong></div><div class="card"><span>План работ</span><strong id="planValue">${formatMoney(row.housePlanTotal)} руб.</strong></div><div class="card risk-card"><span>Нужно собрать</span><strong id="deficitValue">${formatMoney(deficit)} руб.</strong></div></div><p id="monthlyText" class="decision"></p><div class="footer"><span>Предварительный расчет</span><span>Данные можно уточнить перед печатью</span></div></section><section class="slide"><div class="brand-logo"><span class="brand-mark"></span><span><span class="brand-title">АЗБУКА</span><br><span class="brand-subtitle">СЕРВИСНАЯ КОМПАНИЯ</span></span></div><h2>Предлагаемое решение для голосования</h2><p>${escapeHtml(solutionText)}</p><p>1. Утвердить проведение работ: <strong>${escapeHtml(data.workType)}</strong>.</p><p>2. Утвердить стоимость работ и порядок сбора средств.</p><p>3. ${escapeHtml(voteText)}</p><p class="decision">${escapeHtml(residentBenefit)}</p><div class="footer"><span>${escapeHtml(data.address)}</span><span>Проект решения для ОСС</span></div><div class="card"><span>FAQ для жителей</span><p>${escapeHtml((faq[0] && faq[0].q) || "Почему нужно голосование?")}</p><p>${escapeHtml((faq[0] && faq[0].a) || "ОСС нужно, чтобы собственники утвердили работы и финансирование.")}</p></div></section></main><script>const repairData=${dataJson};function money(value){return Math.round(Number(value)||0).toLocaleString('ru-RU')}function recalculate(){const amount=Number(document.getElementById('amountInput').value)||0;const price=Number(document.getElementById('priceInput').value)||0;const months=Math.max(1,Number(document.getElementById('monthsInput').value)||1);const currentCost=amount*price;const plan=Math.max(currentCost,repairData.housePlanTotal||0);const deficit=Math.max(0,plan-(repairData.budget||0));document.getElementById('planValue').textContent=money(plan)+' руб.';document.getElementById('deficitValue').textContent=money(deficit)+' руб.';document.getElementById('heroDeficit').textContent=money(deficit)+' руб.';document.getElementById('monthlyText').textContent='Ориентир сбора: '+money(deficit/months)+' руб. в месяц на весь дом при рассрочке на '+months+' мес.'}function loadPhotos(event){const files=Array.from(event.target.files||[]).slice(0,6);const grid=document.getElementById('photoGrid');grid.innerHTML='';files.forEach((file)=>{const img=document.createElement('img');img.alt=file.name;img.src=URL.createObjectURL(file);grid.appendChild(img)});if(!files.length){grid.innerHTML='<div class="placeholder">Фото 1</div><div class="placeholder">Фото 2</div><div class="placeholder">Фото 3</div>'}}function cleanClone(){const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('.toolbar,script').forEach((el)=>el.remove());return clone}function downloadPresentation(){const blob=new Blob(['<!doctype html>\\n'+cleanClone().outerHTML],{type:'text/html;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='presentation-oss-remont.html';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}function sendEmail(){const subject='Презентация для ОСС: '+repairData.house+' - '+repairData.workType;const body='Добрый день. Направляем материалы для проведения ОСС по работам: '+repairData.workType+'. Дефицит бюджета: '+money(repairData.deficit)+' руб. Для отправки PDF нажмите Печать / PDF и приложите файл к письму.';location.href='mailto:?subject='+encodeURIComponent(subject)+'&body='+encodeURIComponent(body)}async function sharePresentation(){if(navigator.share){await navigator.share({title:document.title,text:'Материалы для ОСС: '+repairData.workType});return}await navigator.clipboard.writeText(document.body.innerText);alert('Текст презентации скопирован')}recalculate()</script></body></html>`;
    const win = window.open('', '_blank');
    if (!win) {
      showNotice('Браузер заблокировал открытие презентации. Разрешите всплывающие окна для сайта.');
      return;
    }
    win.document.open();
    win.document.write(html);
    win.document.close();
  }

  function openRepairAct(id) {
    const row = state.repairRows.find((item) => item.id === id);
    if (!row) return;
    const date = new Date().toLocaleDateString('ru-RU');
    const address = row.address || row.house || '';
    const workName = row.workType || '';
    const quantity = row.amount ? formatNumber(row.amount) : '';
    const price = row.unitPrice ? formatMoney(row.unitPrice) : formatMoney(row.plannedCost);
    const total = formatMoney(row.plannedCost);
    const employees = Array.from(new Set([
      'Исполнительный директор — Плехов Константин Валерьевич',
      'Генеральный директор — Демина Татьяна Викторовна',
      ...state.ossRows.map((item) => item.owner).filter(Boolean),
    ].map((name) => name.includes('—') ? name : `Ответственный сотрудник — ${name}`))).sort((a, b) => a.localeCompare(b, 'ru'));
    const employeeOptions = employees.map((name) => `<option value="${escapeAttr(name)}">${escapeHtml(name)}</option>`).join('');
    const html = `<!doctype html><html lang="ru"><head><meta charset="utf-8"><title>Акт приемки оказанных услуг и выполненных работ</title><style>@page{size:A4;margin:14mm 12mm}body{margin:0;background:#f3f5f7;color:#000;font-family:"Times New Roman",Times,serif;font-size:13px;line-height:1.2}.toolbar{position:relative;display:flex;flex-wrap:wrap;gap:8px;background:#fff;border-bottom:1px solid #d0d7de;padding:10px 14px;font-family:Arial,sans-serif}.toolbar button,.toolbar label{display:inline-flex;align-items:center;justify-content:center;border:1px solid #9aa7b4;border-radius:6px;background:#f5f7f9;color:#111;padding:9px 12px;font:700 14px Arial,sans-serif;line-height:1.2;cursor:pointer;white-space:nowrap}.toolbar input[type=file]{display:none}.toolbar .primary{background:#e8f2ff;border-color:#7aa7d9}.sign-tools{display:none;gap:8px;align-items:center;width:100%;padding-top:8px}.sign-tools.open{display:flex}.sign-tools select{min-width:280px;padding:8px;border:1px solid #9aa7b4;border-radius:6px}.signature-name{margin-top:4px;font-weight:700}.signature-facsimile{font-family:"Segoe Script","Comic Sans MS",cursive;font-size:20px;color:#184a8b;transform:rotate(-3deg);margin-top:4px}.seal{position:absolute;left:30mm;bottom:18mm;width:32mm;height:32mm;border:3px double #1f5fae;border-radius:50%;display:none;align-items:center;justify-content:center;text-align:center;color:#1f5fae;font:bold 10px Arial,sans-serif;transform:rotate(-10deg);opacity:.78}.seal img{width:100%;height:100%;object-fit:contain}.seal.visible{display:flex}.sheet{position:relative;width:190mm;min-height:267mm;margin:18px auto;background:#fff;padding:8mm 8mm 10mm;box-shadow:0 2px 12px rgb(15 23 42 / .12)}.approved{width:78mm;margin-left:auto;text-align:left;white-space:pre-line;font-size:12px}.center{text-align:center}.title{margin-top:20mm;font-size:17px;font-weight:700;letter-spacing:.2px}.subtitle{font-size:14px}.spacer{height:12px}.line-row{display:grid;grid-template-columns:1fr 38mm 33mm;margin-top:6px;align-items:end}.cell-line{border-bottom:1px solid #000;min-height:17px;text-align:center}.act-field{display:inline-block;border:0;border-bottom:1px solid #000;background:transparent;min-height:17px;text-align:center;font:inherit;padding:0 4px}.act-field:focus{outline:1px solid #8bb9e8;background:#f3f9ff}.paragraph{margin:8px 0}.indent{text-indent:8mm}.two-col{display:grid;grid-template-columns:1fr 1fr;gap:8mm}.work-table{width:100%;border-collapse:collapse;margin:14px 0 8px;font-size:11px}.work-table th,.work-table td{border:1px solid #000;padding:5px 4px;vertical-align:middle}.work-table th{text-align:center;font-weight:400}.work-table .num{width:10mm;text-align:center}.work-table .qty{width:26mm;text-align:center}.work-table .money{width:32mm;text-align:right}.work-table .period{width:35mm}.total-row td{font-weight:700}.sum-line{display:flex;align-items:flex-end;gap:5px;margin:10px 0;white-space:nowrap}.sum-line .fill{flex:1;border-bottom:1px solid #000;min-height:17px}.sum-line .amount{min-width:34mm;border-bottom:1px solid #000;text-align:center;font-weight:700}.signature-title{margin-top:16px}.sign-grid{display:grid;grid-template-columns:1fr 1fr;gap:18mm;margin-top:20px}.sign-line{height:20px;border-bottom:1px solid #000}.sign-caption{display:grid;grid-template-columns:1fr 1fr;gap:10mm;text-align:center;font-size:11px}.muted-note{font-size:11px;text-align:center}@media print{body{background:#fff}.toolbar{display:none}.sheet{margin:0;box-shadow:none;width:auto;min-height:auto;padding:0}}</style></head><body><div class="toolbar"><button class="primary" onclick="window.print()">Печать / PDF</button><button onclick="toggleSignTools()">Подгрузить сотрудников</button><button onclick="applySignature()">Поставить подпись</button><button onclick="applySeal()">Поставить печать</button><label class="file-action">Загрузить оттиск<input id="sealInput" type="file" accept="image/*" onchange="loadSeal(event)"></label><button onclick="downloadAct()">Скачать акт</button><button onclick="sendEmail()">Email</button><button onclick="shareAct()">Поделиться</button><button onclick="copyActText()">Копировать текст</button><div id="signTools" class="sign-tools"><span>Сотрудник:</span><select id="employeeSelect">${employeeOptions}</select><span>Юрлицо:</span><select id="orgSelect" onchange="updateOrganization()"><option>ООО Сервисная компания &quot;Азбука&quot;</option><option>ООО УК &quot;Азбука&quot;</option><option>ООО &quot;Азбука&quot;</option></select><input id="customOrg" placeholder="Иное юрлицо" oninput="updateOrganization()" style="min-width:220px;padding:8px;border:1px solid #9aa7b4;border-radius:6px"></div></div><main class="sheet"><div class="approved">УТВЕРЖДЕНО
приказом Министерства строительства и жилищно-коммунального хозяйства Российской Федерации от 26.10.2015 № 761/пр</div><div class="title center">АКТ</div><div class="subtitle center">приемки оказанных услуг и выполненных работ</div><div class="subtitle center">по текущему ремонту общего имущества в многоквартирном доме</div><div class="spacer"></div><div class="line-row"><div>г. Киров</div><div>дата приемки работ:</div><div class="cell-line">${escapeHtml(date)}</div></div><p class="paragraph">Собственники помещений в многоквартирном доме, расположенном по адресу:</p><p class="paragraph"><strong>${escapeHtml(address)}</strong></p><p class="paragraph">именуемые в дальнейшем “Заказчик”, в лице <input class="act-field" data-field="customerName" style="width:78mm"></p><p class="paragraph">являющегося собственником квартиры № <input class="act-field" data-field="flatNumber" style="width:22mm">, находящейся в данном многоквартирном доме, действующего на основании протокола ОСС № <input class="act-field" data-field="protocolNumber" style="width:50mm"></p><p class="paragraph">с одной стороны, и <span id="organizationName">ООО Сервисная компания "Азбука"</span>, именуемое в дальнейшем “Исполнитель”, в лице</p><p class="paragraph">исполнительного директора Плехова Константина Валерьевича, действующего на основании приказа № 2 от 01.02.2022г., с другой стороны, совместно именуемые “Стороны”, составили настоящий Акт о нижеследующем:</p><p class="paragraph indent">1. Исполнителем предъявлены к приемке следующие оказанные на основании договора управления многоквартирным домом № <input class="act-field" data-field="contractNumber" style="width:30mm"> от <input class="act-field" data-field="contractDate" style="width:24mm"> г., <strong>${escapeHtml(address)}</strong> (далее - "Договор") услуги и выполненные работы по текущему ремонту общего имущества в вышеуказанном многоквартирном доме:</p><table class="work-table"><thead><tr><th class="num">№п</th><th>Наименование вида работы (услуги)</th><th class="period">Периодичность выполненной работы (оказанной услуги)</th><th class="qty">Количественный показатель выполненной работы (оказанной услуги)</th><th class="money">Цена выполненной работы (оказанной услуги), в рублях</th><th class="money">Стоимость/сметная стоимость выполненной работы (оказанной услуги) за единицу</th></tr></thead><tbody><tr><td class="num">1.</td><td>${escapeHtml(workName)}</td><td>${escapeHtml(row.deadlineRaw || '')}</td><td class="qty">${escapeHtml(quantity)}${row.unit ? ` ${escapeHtml(row.unit)}` : ''}</td><td class="money">${escapeHtml(price)}</td><td class="money">${escapeHtml(total)}</td></tr><tr class="total-row"><td></td><td>ИТОГО</td><td></td><td></td><td></td><td class="money">${escapeHtml(total)}</td></tr></tbody></table><div class="sum-line"><span>2. Всего выполнено работ (оказано услуг) на общую сумму</span><span class="fill"></span><span class="amount">${escapeHtml(total)}</span><span>руб.</span></div><p class="paragraph">3. Работы (услуги) выполнены (оказаны) полностью, в установленные сроки, с надлежащим качеством.</p><p class="paragraph">4. Претензий по выполнению условий Договора Стороны друг к другу не имеют.</p><p class="paragraph">Настоящий Акт составлен в 2-х экземплярах, имеющих одинаковую юридическую силу, по одному для каждой из Сторон.</p><p class="signature-title">Подписи Сторон:</p><div class="sign-grid"><div><p>Исполнитель -</p><div id="signaturePlace" class="sign-line"></div><div id="signatureName" class="signature-name"></div><div id="signatureFacsimile" class="signature-facsimile"></div><div class="sign-caption"><span>(Ф.И.О.)</span><span>(подпись)</span></div></div><div><p>Заказчик -</p><div class="sign-line"></div><div class="sign-caption"><span>(Ф.И.О.)</span><span>(подпись)</span></div></div></div><div id="sealStamp" class="seal">ООО СК<br>АЗБУКА<br>КИРОВ</div></main><script>const actTitle=document.title;const storageKey="repair-act-fields:"+${JSON.stringify(address)};function selectedEmployee(){const select=document.getElementById("employeeSelect");return select&&select.value?select.value:"Исполнительный директор — Плехов Константин Валерьевич"}function selectedOrg(){const custom=document.getElementById("customOrg");const select=document.getElementById("orgSelect");return custom&&custom.value.trim()?custom.value.trim():(select?select.value:"ООО Сервисная компания \\\"Азбука\\\"")}function updateOrganization(){const org=selectedOrg();document.getElementById("organizationName").textContent=org;const seal=document.getElementById("sealStamp");if(!seal.querySelector("img")){seal.innerHTML=org.replace(/ООО|Общество с ограниченной ответственностью|[\\"«»]/g,"").trim().replace(/\\s+/g,"<br>")+"<br>КИРОВ"}saveActFields()}function loadSeal(event){const file=event.target.files&&event.target.files[0];if(!file)return;const reader=new FileReader();reader.onload=()=>{const seal=document.getElementById("sealStamp");seal.innerHTML="<img alt=\\"Оттиск печати\\" src=\\""+reader.result+"\\">";seal.classList.add("visible")};reader.readAsDataURL(file)}function saveActFields(){const data={};document.querySelectorAll(".act-field").forEach((field)=>data[field.dataset.field]=field.value);data.organization=selectedOrg();localStorage.setItem(storageKey,JSON.stringify(data))}function restoreActFields(){try{const data=JSON.parse(localStorage.getItem(storageKey)||"{}");document.querySelectorAll(".act-field").forEach((field)=>{if(data[field.dataset.field])field.value=data[field.dataset.field]});if(data.organization){document.getElementById("customOrg").value=data.organization}updateOrganization()}catch(error){}}function toggleSignTools(){document.getElementById("signTools").classList.toggle("open")}document.querySelectorAll(".act-field").forEach((field)=>field.addEventListener("input",saveActFields));restoreActFields();function applySignature(){const name=selectedEmployee();document.getElementById("signatureName").textContent=name;document.getElementById("signatureFacsimile").textContent=name.split(" ").map((part,index)=>index===0?part:part[0]+".").join(" ")}function applySeal(){document.getElementById("sealStamp").classList.toggle("visible")}function actText(){return document.querySelector('.sheet').innerText.trim()}function downloadAct(){const clone=document.documentElement.cloneNode(true);clone.querySelectorAll('.toolbar,script').forEach((el)=>el.remove());const blob=new Blob(['<!doctype html>\\n'+clone.outerHTML],{type:'text/html;charset=utf-8'});const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download='akt-tekushiy-remont.html';link.click();setTimeout(()=>URL.revokeObjectURL(link.href),1000)}function sendEmail(){const body=actText()+'\\n\\nДля отправки подписанного акта сохраните форму в PDF и прикрепите файл к письму.';location.href='mailto:?subject='+encodeURIComponent(actTitle)+'&body='+encodeURIComponent(body.slice(0,1800))}async function shareAct(){if(navigator.share){await navigator.share({title:actTitle,text:actText()});return}copyActText()}async function copyActText(){await navigator.clipboard.writeText(actText());alert('Текст акта скопирован')}</script></body></html>`;
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
      .replace(/(^|[\s.,])к\.?\s*дорофеева/g, '$1капитана дорофеева')
      .replace(/\bжк\b/g, '')
      .replace(/(^|[\s.,])д\.?\s*(?=\d)/g, '$1')
      .replace(/(^|[\s.,])к\.?\s*/g, '$1к')
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

  function downloadTextFile(fileName, content, type) {
    const blob = new Blob([content], { type });
    const link = document.createElement('a');
    link.href = URL.createObjectURL(blob);
    link.download = fileName;
    link.click();
    setTimeout(() => URL.revokeObjectURL(link.href), 1000);
  }

  function safeFileName(value) {
    return String(value || 'file')
      .replace(/[\\/:*?"<>|]+/g, '_')
      .replace(/\s+/g, '_')
      .slice(0, 140);
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















