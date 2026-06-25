const state = {
  events: loadEvents(),
  visibleDate: startOfMonth(new Date()),
  selectedDate: startOfDay(new Date()),
  editingId: null,
  fileHandle: null,
  activeAlarmId: null,
  audioContext: null,
  soundEnabled: false,
  soundTimer: null,
  vibrationTimer: null,
  alarmSettings: loadAlarmSettings(),
  deferredInstallPrompt: null,
};

const els = {
  noteInput: document.querySelector("#noteInput"),
  parseButton: document.querySelector("#parseButton"),
  parseStatus: document.querySelector("#parseStatus"),
  fileInput: document.querySelector("#fileInput"),
  watchFileButton: document.querySelector("#watchFileButton"),
  bridgeStatus: document.querySelector("#bridgeStatus"),
  bridgeHint: document.querySelector("#bridgeHint"),
  appStatus: document.querySelector("#appStatus"),
  installButton: document.querySelector("#installButton"),
  exportBackupButton: document.querySelector("#exportBackupButton"),
  backupInput: document.querySelector("#backupInput"),
  todayLabel: document.querySelector("#todayLabel"),
  monthLabel: document.querySelector("#monthLabel"),
  prevMonth: document.querySelector("#prevMonth"),
  nextMonth: document.querySelector("#nextMonth"),
  todayButton: document.querySelector("#todayButton"),
  calendarGrid: document.querySelector("#calendarGrid"),
  selectedDateLabel: document.querySelector("#selectedDateLabel"),
  eventList: document.querySelector("#eventList"),
  todayCount: document.querySelector("#todayCount"),
  weekCount: document.querySelector("#weekCount"),
  totalCount: document.querySelector("#totalCount"),
  alarmCount: document.querySelector("#alarmCount"),
  soundButton: document.querySelector("#soundButton"),
  notificationButton: document.querySelector("#notificationButton"),
  notificationStatus: document.querySelector("#notificationStatus"),
  alarmThemeSelect: document.querySelector("#alarmThemeSelect"),
  alarmAccentInput: document.querySelector("#alarmAccentInput"),
  clearDoneButton: document.querySelector("#clearDoneButton"),
  editDialog: document.querySelector("#editDialog"),
  editForm: document.querySelector("#editForm"),
  editTitle: document.querySelector("#editTitle"),
  editDate: document.querySelector("#editDate"),
  editTime: document.querySelector("#editTime"),
  editReminder: document.querySelector("#editReminder"),
  editSource: document.querySelector("#editSource"),
  deleteEventButton: document.querySelector("#deleteEventButton"),
  toastStack: document.querySelector("#toastStack"),
  alarmOverlay: document.querySelector("#alarmOverlay"),
  alarmTitle: document.querySelector("#alarmTitle"),
  alarmDateChip: document.querySelector("#alarmDateChip"),
  alarmHourChip: document.querySelector("#alarmHourChip"),
  alarmSource: document.querySelector("#alarmSource"),
  dismissAlarmButton: document.querySelector("#dismissAlarmButton"),
  closeAlarmButton: document.querySelector("#closeAlarmButton"),
};

const monthFormatter = new Intl.DateTimeFormat("pt-BR", { month: "long", year: "numeric" });
const fullDateFormatter = new Intl.DateTimeFormat("pt-BR", {
  weekday: "long",
  day: "2-digit",
  month: "long",
  year: "numeric",
});

render();
applyAlarmSettings();
updateNotificationStatus();
registerServiceWorker();
window.setInterval(checkReminders, 15000);
checkReminders();

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  state.deferredInstallPrompt = event;
  els.installButton.disabled = false;
  els.appStatus.textContent = "Instalavel";
});

els.parseButton.addEventListener("click", () => {
  const created = importText(els.noteInput.value, "Texto colado");
  els.noteInput.value = "";
  showImportStatus(created);
});

els.fileInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  const text = await file.text();
  const created = importText(text, file.name);
  event.target.value = "";
  showImportStatus(created);
});

els.watchFileButton.addEventListener("click", async () => {
  if (!window.showOpenFilePicker) {
    els.bridgeHint.textContent =
      "Este navegador nao permite leitura recorrente de arquivo local. Use o botao Importar arquivo.";
    return;
  }

  const [handle] = await window.showOpenFilePicker({
    types: [{ description: "Notas em texto", accept: { "text/plain": [".txt", ".md", ".csv"] } }],
  });
  state.fileHandle = handle;
  els.bridgeStatus.textContent = "Conectado";
  els.bridgeHint.textContent = `Arquivo selecionado: ${handle.name}. Clique novamente para reimportar quando a nota mudar.`;
  const file = await handle.getFile();
  const created = importText(await file.text(), handle.name);
  showImportStatus(created);
});

els.prevMonth.addEventListener("click", () => {
  state.visibleDate = addMonths(state.visibleDate, -1);
  render();
});

els.nextMonth.addEventListener("click", () => {
  state.visibleDate = addMonths(state.visibleDate, 1);
  render();
});

els.todayButton.addEventListener("click", () => {
  state.visibleDate = startOfMonth(new Date());
  state.selectedDate = startOfDay(new Date());
  render();
});

els.clearDoneButton.addEventListener("click", () => {
  state.events = state.events.filter((event) => !event.done);
  persist();
  render();
});

els.installButton.addEventListener("click", async () => {
  if (!state.deferredInstallPrompt) {
    showToast("Instalacao pelo navegador.", "No iPhone, use Compartilhar e Adicionar a Tela de Inicio.");
    return;
  }

  state.deferredInstallPrompt.prompt();
  const choice = await state.deferredInstallPrompt.userChoice;
  state.deferredInstallPrompt = null;
  if (choice.outcome === "accepted") {
    els.appStatus.textContent = "Instalado";
  }
});

els.exportBackupButton.addEventListener("click", () => {
  exportBackup();
});

els.backupInput.addEventListener("change", async (event) => {
  const file = event.target.files?.[0];
  if (!file) return;
  try {
    const backup = JSON.parse(await file.text());
    importBackup(backup);
    showToast("Backup importado.", "Seus compromissos e preferencias foram restaurados.");
  } catch {
    showToast("Backup invalido.", "Escolha um arquivo exportado por esta agenda.");
  } finally {
    event.target.value = "";
  }
});

els.soundButton.addEventListener("click", async () => {
  await unlockAlarmSound();
  state.soundEnabled = true;
  els.soundButton.textContent = "Som ativado";
  els.soundButton.disabled = true;
  showToast("Som ativado.", "Os alarmes vao tocar enquanto a agenda estiver aberta.");
});

els.notificationButton.addEventListener("click", async () => {
  if (!("Notification" in window)) {
    showToast("Este navegador nao suporta notificacoes.", "Use os avisos dentro do app.");
    updateNotificationStatus();
    return;
  }

  const permission = await Notification.requestPermission();
  updateNotificationStatus();
  if (permission === "granted") {
    showToast("Notificacoes ativadas.", "Deixe a agenda aberta para os alarmes funcionarem.");
  }
});

els.alarmThemeSelect.addEventListener("change", () => {
  state.alarmSettings.theme = els.alarmThemeSelect.value;
  saveAlarmSettings();
  applyAlarmSettings();
});

els.alarmAccentInput.addEventListener("input", () => {
  state.alarmSettings.accent = els.alarmAccentInput.value;
  saveAlarmSettings();
  applyAlarmSettings();
});

els.dismissAlarmButton.addEventListener("click", () => {
  dismissActiveAlarm();
});

els.closeAlarmButton.addEventListener("click", () => {
  dismissActiveAlarm();
});

document.querySelectorAll("[data-snooze]").forEach((button) => {
  button.addEventListener("click", () => {
    snoozeActiveAlarm(Number(button.dataset.snooze));
  });
});

els.editForm.addEventListener("submit", (event) => {
  event.preventDefault();
  if (event.submitter?.value === "cancel") {
    els.editDialog.close();
    return;
  }
  const item = state.events.find((entry) => entry.id === state.editingId);
  if (!item) return;
  item.title = els.editTitle.value.trim();
  item.date = els.editDate.value;
  item.time = els.editTime.value;
  item.reminderMinutes = normalizeReminder(els.editReminder.value);
  item.reminderNotifiedAt = "";
  item.source = els.editSource.value.trim();
  persist();
  els.editDialog.close();
  render();
});

els.deleteEventButton.addEventListener("click", () => {
  state.events = state.events.filter((entry) => entry.id !== state.editingId);
  persist();
  els.editDialog.close();
  render();
});

function importText(text, sourceName) {
  const parsed = parseNote(text, sourceName);
  const existingKeys = new Set(state.events.map(eventKey));
  const created = [];

  for (const event of parsed) {
    if (existingKeys.has(eventKey(event))) continue;
    created.push(event);
    state.events.push(event);
    existingKeys.add(eventKey(event));
  }

  state.events.sort(compareEvents);
  persist();
  render();
  return created.length;
}

function parseNote(text, sourceName) {
  const lines = text
    .split(/\r?\n/)
    .map((line) => line.replace(/^[-*•]\s*/, "").trim())
    .filter(Boolean);

  return lines
    .map((line) => parseLine(line, sourceName))
    .filter(Boolean);
}

function parseLine(line, sourceName) {
  const base = startOfDay(new Date());
  let date = null;
  let title = line;
  const reminderMinutes = parseReminder(line);

  const datePatterns = [
    /\b(\d{1,2})[/-](\d{1,2})(?:[/-](\d{2,4}))?\b/,
    /\b(\d{4})-(\d{1,2})-(\d{1,2})\b/,
    /\bdia\s+(\d{1,2})\b/i,
    /\b(\d{1,2})\s+de\s+(janeiro|fevereiro|marco|março|abril|maio|junho|julho|agosto|setembro|outubro|novembro|dezembro)\b/i,
    /\b(\d{1,2})(?=\s*,?\s+(?:as|às|@|\d{1,2}\s*(?:h|horas?|hrs?)))\b/i,
  ];

  const brDate = line.match(datePatterns[0]);
  const isoDate = line.match(datePatterns[1]);
  const dayOnlyDate = line.match(datePatterns[2]);
  const monthNameDate = line.match(datePatterns[3]);
  const contextualDayDate = line.match(datePatterns[4]);

  if (brDate) {
    const day = Number(brDate[1]);
    const month = Number(brDate[2]) - 1;
    const year = normalizeYear(brDate[3] ? Number(brDate[3]) : base.getFullYear());
    date = new Date(year, month, day);
    title = title.replace(brDate[0], "").trim();
  } else if (isoDate) {
    date = new Date(Number(isoDate[1]), Number(isoDate[2]) - 1, Number(isoDate[3]));
    title = title.replace(isoDate[0], "").trim();
  } else if (dayOnlyDate) {
    date = dateFromDayOfMonth(Number(dayOnlyDate[1]), base);
    title = title.replace(dayOnlyDate[0], "").trim();
  } else if (monthNameDate) {
    date = dateFromDayAndMonthName(Number(monthNameDate[1]), monthNameDate[2], base);
    title = title.replace(monthNameDate[0], "").trim();
  } else if (contextualDayDate) {
    date = dateFromDayOfMonth(Number(contextualDayDate[1]), base);
    title = title.replace(contextualDayDate[0], "").trim();
  } else {
    const lower = normalizeText(line);
    if (/\bhoje\b/.test(lower)) {
      date = base;
      title = removeWord(title, "hoje");
    } else if (/\bamanha\b/.test(lower)) {
      date = addDays(base, 1);
      title = removeWord(title, "amanha|amanhã");
    } else {
      const weekday = findWeekday(lower);
      if (weekday !== null) {
        date = nextWeekday(base, weekday);
        title = title.replace(new RegExp(weekdayWords[weekday].join("|"), "i"), "").trim();
      }
    }
  }

  if (!date || Number.isNaN(date.getTime())) return null;

  const timeMatch = line.match(
    /\b(?:(?:as|às|@)\s*(\d{1,2})(?::(\d{2}))?\s*(?:horas?|hrs?)?(?:\s*da\s*(manha|manhã|tarde|noite))?|(\d{1,2})(?::|h)(\d{2})?\s*(?:da\s*(manha|manhã|tarde|noite))?|(\d{1,2})\s*(?:horas?|hrs?)\s*(?:da\s*(manha|manhã|tarde|noite))?)\b/i
  );
  const parsedTime = timeMatch ? normalizeTimeMatch(timeMatch) : null;
  const time = parsedTime || "";
  if (timeMatch) title = title.replace(timeMatch[0], "").trim();

  title = title
    .replace(/\b(?:me avise|avisar|lembrete)\b/gi, " ")
    .replace(/\balarme\s+(?=\d+\s*(?:min|mins|minuto|minutos|h|hora|horas|dia|dias)\s*antes|na hora)/gi, " ")
    .replace(/\b\d+\s*(?:min|mins|minuto|minutos|h|hora|horas|dia|dias)\s*antes\b/gi, " ")
    .replace(/\bna hora\b/gi, " ")
    .replace(/\b(horas?|hrs?)\b/gi, " ")
    .replace(/\b(dia|em|para|no|na|as|às)\b/gi, " ")
    .replace(/\s{2,}/g, " ")
    .replace(/^[,.;:-]+|[,.;:-]+$/g, "")
    .trim();

  return {
    id: crypto.randomUUID(),
    title: title || line,
    date: toDateInput(date),
    time,
    reminderMinutes,
    reminderNotifiedAt: "",
    snoozedUntil: "",
    source: `${sourceName}: ${line}`,
    done: false,
    createdAt: new Date().toISOString(),
  };
}

function render() {
  els.todayLabel.textContent = fullDateFormatter.format(new Date());
  els.monthLabel.textContent = capitalize(monthFormatter.format(state.visibleDate));
  els.selectedDateLabel.textContent = capitalize(fullDateFormatter.format(state.selectedDate));
  renderCalendar();
  renderEvents();
  renderStats();
}

function renderCalendar() {
  els.calendarGrid.innerHTML = "";
  const monthStart = startOfMonth(state.visibleDate);
  const gridStart = addDays(monthStart, -monthStart.getDay());

  for (let index = 0; index < 42; index += 1) {
    const date = addDays(gridStart, index);
    const button = document.createElement("button");
    button.type = "button";
    button.className = "day-cell";
    if (date.getMonth() !== state.visibleDate.getMonth()) button.classList.add("is-muted");
    if (isSameDay(date, new Date())) button.classList.add("is-today");
    if (isSameDay(date, state.selectedDate)) button.classList.add("is-selected");
    button.addEventListener("click", () => {
      state.selectedDate = startOfDay(date);
      if (date.getMonth() !== state.visibleDate.getMonth()) state.visibleDate = startOfMonth(date);
      render();
    });

    const dayNumber = document.createElement("span");
    dayNumber.className = "day-number";
    dayNumber.textContent = date.getDate();
    button.append(dayNumber);

    const events = eventsForDate(date).slice(0, 3);
    for (const event of events) {
      const chip = document.createElement("span");
      chip.className = "event-chip";
      chip.textContent = `${event.time ? `${event.time} ` : ""}${event.title}`;
      button.append(chip);
    }

    els.calendarGrid.append(button);
  }
}

function renderEvents() {
  els.eventList.innerHTML = "";
  const events = eventsForDate(state.selectedDate);

  if (!events.length) {
    const empty = document.createElement("div");
    empty.className = "empty";
    empty.textContent = "Nenhum compromisso para esta data.";
    els.eventList.append(empty);
    return;
  }

  for (const event of events) {
    const card = document.createElement("article");
    card.className = `event-card${event.done ? " is-done" : ""}`;

    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = event.done;
    checkbox.setAttribute("aria-label", "Marcar como concluido");
    checkbox.addEventListener("change", () => {
      event.done = checkbox.checked;
      persist();
      render();
    });

    const body = document.createElement("div");
    const title = document.createElement("div");
    title.className = "event-title";
    title.textContent = event.title;
    const source = document.createElement("div");
    source.className = "event-source";
    source.textContent = event.source;
    const reminder = document.createElement("div");
    reminder.className = "event-reminder";
    reminder.textContent = reminderLabel(event);
    body.append(title, reminder, source);

    const time = document.createElement("div");
    time.className = "event-time";
    time.textContent = event.time || "--:--";

    const edit = document.createElement("button");
    edit.type = "button";
    edit.textContent = "Editar";
    edit.addEventListener("click", () => openEdit(event));

    card.append(checkbox, body, time, edit);
    els.eventList.append(card);
  }
}

function renderStats() {
  const today = startOfDay(new Date());
  const nextWeek = addDays(today, 7);
  els.todayCount.textContent = eventsForDate(today).length;
  els.weekCount.textContent = state.events.filter((event) => {
    const date = fromDateInput(event.date);
    return date >= today && date <= nextWeek;
  }).length;
  els.totalCount.textContent = state.events.length;
  els.alarmCount.textContent = state.events.filter((event) => event.time && event.reminderMinutes !== "").length;
}

function openEdit(event) {
  state.editingId = event.id;
  els.editTitle.value = event.title;
  els.editDate.value = event.date;
  els.editTime.value = event.time;
  els.editReminder.value = event.reminderMinutes ?? "";
  els.editSource.value = event.source;
  els.editDialog.showModal();
}

function showImportStatus(count) {
  els.parseStatus.textContent = count === 1 ? "1 item" : `${count} itens`;
  window.setTimeout(() => {
    els.parseStatus.textContent = "Pronto";
  }, 2400);
}

function eventsForDate(date) {
  return state.events
    .filter((event) => event.date === toDateInput(date))
    .sort(compareEvents);
}

function compareEvents(a, b) {
  return `${a.date} ${a.time || "99:99"}`.localeCompare(`${b.date} ${b.time || "99:99"}`);
}

function eventKey(event) {
  return `${event.date}|${event.time}|${normalizeText(event.title)}`;
}

function persist() {
  localStorage.setItem("smart-agenda-events", JSON.stringify(state.events));
}

function exportBackup() {
  const backup = {
    app: "Agenda Inteligente",
    version: 1,
    exportedAt: new Date().toISOString(),
    events: state.events,
    alarmSettings: state.alarmSettings,
  };
  const blob = new Blob([JSON.stringify(backup, null, 2)], { type: "application/json" });
  const url = URL.createObjectURL(blob);
  const anchor = document.createElement("a");
  anchor.href = url;
  anchor.download = `agenda-backup-${toDateInput(new Date())}.json`;
  document.body.append(anchor);
  anchor.click();
  anchor.remove();
  URL.revokeObjectURL(url);
}

function importBackup(backup) {
  if (!backup || !Array.isArray(backup.events)) throw new Error("Invalid backup");
  state.events = backup.events.map((event) => ({
    reminderMinutes: "",
    reminderNotifiedAt: "",
    snoozedUntil: "",
    ...event,
  }));
  if (backup.alarmSettings) {
    state.alarmSettings = {
      theme: "ios-light",
      accent: "#14a89e",
      ...backup.alarmSettings,
    };
    saveAlarmSettings();
    applyAlarmSettings();
  }
  persist();
  render();
}

async function registerServiceWorker() {
  if (!("serviceWorker" in navigator)) {
    els.appStatus.textContent = "Local";
    return;
  }

  try {
    const registration = await navigator.serviceWorker.register("./sw.js");
    els.appStatus.textContent = registration.active ? "Offline" : "Pronto";
  } catch {
    els.appStatus.textContent = "Local";
  }
}

function loadEvents() {
  try {
    return JSON.parse(localStorage.getItem("smart-agenda-events") || "[]").map((event) => ({
      reminderMinutes: "",
      reminderNotifiedAt: "",
      snoozedUntil: "",
      ...event,
    }));
  } catch {
    return [];
  }
}

function loadAlarmSettings() {
  try {
    return {
      theme: "ios-light",
      accent: "#14a89e",
      ...JSON.parse(localStorage.getItem("smart-agenda-alarm-settings") || "{}"),
    };
  } catch {
    return { theme: "ios-light", accent: "#14a89e" };
  }
}

function saveAlarmSettings() {
  localStorage.setItem("smart-agenda-alarm-settings", JSON.stringify(state.alarmSettings));
}

function applyAlarmSettings() {
  document.body.dataset.alarmTheme = state.alarmSettings.theme;
  document.documentElement.style.setProperty("--alarm-accent", state.alarmSettings.accent);
  els.alarmThemeSelect.value = state.alarmSettings.theme;
  els.alarmAccentInput.value = state.alarmSettings.accent;
}

function checkReminders() {
  const now = new Date();
  let changed = false;

  for (const event of state.events) {
    if (state.activeAlarmId) break;
    if (event.done || !event.time || event.reminderMinutes === "") continue;
    const snoozedAt = event.snoozedUntil ? new Date(event.snoozedUntil) : null;
    const reminderAt = snoozedAt || reminderDate(event);
    if (!reminderAt || reminderAt > now) continue;

    const marker = snoozedAt ? `snooze:${event.snoozedUntil}` : reminderAt.toISOString();
    if (event.reminderNotifiedAt === marker) continue;

    const details = `${formatEventDateTime(event)} - ${event.title}`;
    showToast("Alarme de compromisso", details);
    sendBrowserNotification(event, details);
    showAlarmScreen(event);
    event.reminderNotifiedAt = marker;
    changed = true;
  }

  if (changed) persist();
}

function sendBrowserNotification(event, details) {
  if (!("Notification" in window) || Notification.permission !== "granted") return;
  new Notification("Agenda: " + event.title, {
    body: details,
    tag: event.id,
  });
}

function showAlarmScreen(event) {
  state.activeAlarmId = event.id;
  els.alarmTitle.textContent = event.title;
  els.alarmDateChip.textContent = formatEventDate(event);
  els.alarmHourChip.textContent = event.time || "--:--";
  els.alarmSource.textContent = event.source;
  els.alarmOverlay.hidden = false;
  els.dismissAlarmButton.focus();
  startAlarmEffects();
}

function dismissActiveAlarm() {
  const event = state.events.find((entry) => entry.id === state.activeAlarmId);
  if (event) {
    event.snoozedUntil = "";
    persist();
  }
  closeAlarmScreen();
}

function snoozeActiveAlarm(minutes) {
  const event = state.events.find((entry) => entry.id === state.activeAlarmId);
  if (!event) {
    closeAlarmScreen();
    return;
  }

  event.snoozedUntil = new Date(Date.now() + minutes * 60000).toISOString();
  event.reminderNotifiedAt = "";
  persist();
  closeAlarmScreen();
  showToast("Alarme adiado.", `${event.title} vai repetir em ${minutes} min.`);
}

function closeAlarmScreen() {
  stopAlarmEffects();
  state.activeAlarmId = null;
  els.alarmOverlay.hidden = true;
}

async function unlockAlarmSound() {
  const AudioContextClass = window.AudioContext || window.webkitAudioContext;
  if (!AudioContextClass) {
    showToast("Som indisponivel.", "Este navegador nao suporta audio para alarmes.");
    return;
  }

  if (!state.audioContext) state.audioContext = new AudioContextClass();
  if (state.audioContext.state === "suspended") await state.audioContext.resume();
  playShortBeep(0.08);
}

function startAlarmEffects() {
  stopAlarmEffects();
  startVibration();

  if (!state.soundEnabled) return;
  playShortBeep(0.35);
  state.soundTimer = window.setInterval(() => playShortBeep(0.35), 1200);
}

function stopAlarmEffects() {
  if (state.soundTimer) {
    window.clearInterval(state.soundTimer);
    state.soundTimer = null;
  }
  if (state.vibrationTimer) {
    window.clearInterval(state.vibrationTimer);
    state.vibrationTimer = null;
  }
  if ("vibrate" in navigator) navigator.vibrate(0);
}

function playShortBeep(durationSeconds) {
  if (!state.audioContext) return;
  const context = state.audioContext;
  const oscillator = context.createOscillator();
  const gain = context.createGain();
  oscillator.type = "sine";
  oscillator.frequency.setValueAtTime(880, context.currentTime);
  oscillator.frequency.setValueAtTime(660, context.currentTime + durationSeconds / 2);
  gain.gain.setValueAtTime(0.001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(0.25, context.currentTime + 0.02);
  gain.gain.exponentialRampToValueAtTime(0.001, context.currentTime + durationSeconds);
  oscillator.connect(gain);
  gain.connect(context.destination);
  oscillator.start();
  oscillator.stop(context.currentTime + durationSeconds + 0.03);
}

function startVibration() {
  if (!("vibrate" in navigator)) return;
  navigator.vibrate([500, 250, 500]);
  state.vibrationTimer = window.setInterval(() => {
    navigator.vibrate([500, 250, 500]);
  }, 1800);
}

function showToast(title, message) {
  const toast = document.createElement("div");
  toast.className = "toast";
  const heading = document.createElement("strong");
  heading.textContent = title;
  const body = document.createElement("span");
  body.textContent = message;
  const close = document.createElement("button");
  close.type = "button";
  close.setAttribute("aria-label", "Fechar aviso");
  close.textContent = "x";
  close.addEventListener("click", () => toast.remove());
  toast.append(heading, body, close);
  els.toastStack.append(toast);
  window.setTimeout(() => toast.remove(), 9000);
}

function updateNotificationStatus() {
  if (!("Notification" in window)) {
    els.notificationStatus.textContent = "Indisponivel";
    els.notificationButton.disabled = true;
    return;
  }

  const labels = {
    default: "Pendente",
    granted: "Ativo",
    denied: "Bloqueado",
  };
  els.notificationStatus.textContent = labels[Notification.permission] || "Local";
  els.notificationButton.disabled = Notification.permission === "granted";
}

function reminderDate(event) {
  const start = eventDateTime(event);
  if (!start) return null;
  return new Date(start.getTime() - Number(event.reminderMinutes) * 60000);
}

function eventDateTime(event) {
  if (!event.date || !event.time) return null;
  const [year, month, day] = event.date.split("-").map(Number);
  const [hours, minutes] = event.time.split(":").map(Number);
  return new Date(year, month - 1, day, hours, minutes);
}

function formatEventDateTime(event) {
  const date = fromDateInput(event.date);
  const dateText = new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit" }).format(date);
  return `${dateText} ${event.time}`;
}

function formatEventDate(event) {
  const date = fromDateInput(event.date);
  return new Intl.DateTimeFormat("pt-BR", { day: "2-digit", month: "2-digit", year: "numeric" }).format(date);
}

function reminderLabel(event) {
  if (!event.time) return "Sem horario definido";
  if (event.reminderMinutes === "") return "Sem alarme";
  const value = Number(event.reminderMinutes);
  if (value === 0) return "Alarme na hora";
  if (value < 60) return `Alarme ${value} min antes`;
  if (value === 60) return "Alarme 1 hora antes";
  if (value === 1440) return "Alarme 1 dia antes";
  if (value % 60 === 0) return `Alarme ${value / 60} horas antes`;
  return `Alarme ${value} min antes`;
}

function parseReminder(line) {
  const lower = normalizeText(line);
  if (/\bna hora\b/.test(lower)) return 0;

  const match = lower.match(/\b(\d+)\s*(min|mins|minuto|minutos|h|hora|horas|dia|dias)\s*antes\b/);
  if (!match) return "";

  const amount = Number(match[1]);
  const unit = match[2];
  if (unit.startsWith("dia")) return amount * 1440;
  if (unit === "h" || unit.startsWith("hora")) return amount * 60;
  return amount;
}

function normalizeReminder(value) {
  if (value === "" || value === null || value === undefined) return "";
  return Number(value);
}

function startOfDay(date) {
  return new Date(date.getFullYear(), date.getMonth(), date.getDate());
}

function startOfMonth(date) {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addDays(date, days) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}

function addMonths(date, months) {
  return new Date(date.getFullYear(), date.getMonth() + months, 1);
}

function isSameDay(a, b) {
  return toDateInput(a) === toDateInput(b);
}

function toDateInput(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-${String(date.getDate()).padStart(2, "0")}`;
}

function fromDateInput(value) {
  const [year, month, day] = value.split("-").map(Number);
  return new Date(year, month - 1, day);
}

function dateFromDayOfMonth(day, base) {
  let candidate = new Date(base.getFullYear(), base.getMonth(), day);
  if (candidate < base) {
    candidate = new Date(base.getFullYear(), base.getMonth() + 1, day);
  }
  return candidate;
}

function dateFromDayAndMonthName(day, monthName, base) {
  const months = {
    janeiro: 0,
    fevereiro: 1,
    marco: 2,
    março: 2,
    abril: 3,
    maio: 4,
    junho: 5,
    julho: 6,
    agosto: 7,
    setembro: 8,
    outubro: 9,
    novembro: 10,
    dezembro: 11,
  };
  const month = months[normalizeText(monthName)];
  let candidate = new Date(base.getFullYear(), month, day);
  if (candidate < base) {
    candidate = new Date(base.getFullYear() + 1, month, day);
  }
  return candidate;
}

function normalizeTimeMatch(match) {
  const hour = Number(match[1] || match[4] || match[7]);
  const minutes = match[2] || match[5] || "00";
  const period = normalizeText(match[3] || match[6] || match[8] || "");
  let normalizedHour = hour;

  if (period === "tarde" || period === "noite") {
    normalizedHour = hour < 12 ? hour + 12 : hour;
  }
  if (period === "manha" && hour === 12) {
    normalizedHour = 0;
  }

  if (normalizedHour > 23 || Number(minutes) > 59) return "";
  return `${String(normalizedHour).padStart(2, "0")}:${String(minutes).padStart(2, "0")}`;
}

function normalizeYear(year) {
  return year < 100 ? 2000 + year : year;
}

function normalizeText(value) {
  return value
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
}

function removeWord(value, pattern) {
  return value.replace(new RegExp(`\\b(${pattern})\\b`, "gi"), "").trim();
}

const weekdayWords = [
  ["domingo"],
  ["segunda", "segunda-feira"],
  ["terca", "terça", "terca-feira", "terça-feira"],
  ["quarta", "quarta-feira"],
  ["quinta", "quinta-feira"],
  ["sexta", "sexta-feira"],
  ["sabado", "sábado"],
];

function findWeekday(text) {
  for (let index = 0; index < weekdayWords.length; index += 1) {
    if (weekdayWords[index].some((word) => text.includes(normalizeText(word)))) return index;
  }
  return null;
}

function nextWeekday(base, weekday) {
  const diff = (weekday + 7 - base.getDay()) % 7 || 7;
  return addDays(base, diff);
}

function capitalize(value) {
  return value.charAt(0).toUpperCase() + value.slice(1);
}
