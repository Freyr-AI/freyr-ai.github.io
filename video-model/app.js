const DEFAULT_ORIGIN = "https://test.token-exchange-ai.com";
const API_NATIVE_ROOT = `${DEFAULT_ORIGIN}/api/native`;
const API_V1_ROOT = `${API_NATIVE_ROOT}/v1`;
const HEADERS_STORAGE_KEY = "freyrModelListHeaders";
const HISTORY_STORAGE_KEY = "freyrVideoModelHistoryV1";
const MAX_HISTORY_ITEMS = 50;
const MAX_ASSETS = { image: 9, video: 3, audio: 3 };
const MAX_TOTAL_ASSETS = 12;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
const H3_POLL_BASE_MS = 10_000;
const SR_POLL_BASE_MS = 3_000;
const JOB_TIMEOUT_MS = 40 * 60 * 1000;
const TRANSIENT_STATUS_CODES = new Set([500, 502, 503, 504]);
const TERMINAL_STATUSES = new Set(["completed", "failed", "cancelled"]);
const ALLOWED_MIME = {
  "image/jpeg": "image",
  "image/png": "image",
  "image/webp": "image",
  "video/mp4": "video",
  "video/quicktime": "video",
  "video/webm": "video",
  "audio/mpeg": "audio",
  "audio/wav": "audio",
  "audio/mp4": "audio",
  "audio/x-m4a": "audio"
};

function loadHistory() {
  try {
    const records = JSON.parse(localStorage.getItem(HISTORY_STORAGE_KEY) || "[]");
    return Array.isArray(records) ? records.filter((record) => record?.id && record?.model).slice(0, MAX_HISTORY_ITEMS) : [];
  } catch {
    return [];
  }
}

const state = {
  headerText: localStorage.getItem(HEADERS_STORAGE_KEY) || "",
  assets: [],
  busy: false,
  brief: null,
  preparedAssets: [],
  preparedSettings: null,
  currentJob: null,
  h3Job: null,
  srJob: null,
  desiredQuality: "768P",
  abortController: null,
  resultObjectUrl: "",
  uploadedAssets: new Map(),
  history: loadHistory()
};

const $ = (selector) => document.querySelector(selector);
const $$ = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function parseHeaderLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((headers, line) => {
      const separator = line.indexOf(":");
      if (separator <= 0) return headers;
      const name = line.slice(0, separator).trim();
      const headerValue = line.slice(separator + 1).trim();
      if (name && headerValue) headers[name] = headerValue;
      return headers;
    }, {});
}

function findHeader(headers, name) {
  const match = Object.entries(headers).find(([key]) => key.toLowerCase() === name.toLowerCase());
  return match?.[1] || "";
}

function authHeaders({ json = false } = {}) {
  const parsed = parseHeaderLines(state.headerText);
  const headers = {};
  for (const [name, value] of Object.entries(parsed)) {
    if (name.toLowerCase() !== "content-type") headers[name] = value;
  }
  if (json) headers["Content-Type"] = "application/json";
  return headers;
}

function authIsComplete() {
  const headers = parseHeaderLines(state.headerText);
  return Boolean(
    findHeader(headers, "Authorization")
    && findHeader(headers, "CF-Access-Client-Id")
    && findHeader(headers, "CF-Access-Client-Secret")
  );
}

function updateAuthState() {
  const ready = authIsComplete();
  $("#authDot").classList.toggle("ready", ready);
  $("#authToggle").title = ready ? "Request headers 已配置" : "需要配置 Request headers";
  $("#authSaveStatus").textContent = state.headerText.trim() ? "已自动保存" : "等待输入";
}

function formatBytes(bytes) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${Math.round(bytes / 1024)} KiB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MiB`;
}

function randomUuid() {
  if (crypto.randomUUID) return crypto.randomUUID();
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (character) => {
    const random = crypto.getRandomValues(new Uint8Array(1))[0] % 16;
    const value = character === "x" ? random : (random & 0x3) | 0x8;
    return value.toString(16);
  });
}

function friendlyError(error) {
  if (error?.name === "AbortError") return "请求已停止。";
  if (error instanceof ApiError) {
    const nestedDetail = error.detail?.detail ?? error.detail?.error ?? error.detail;
    let detail = nestedDetail;
    if (nestedDetail && typeof nestedDetail === "object") {
      const code = typeof nestedDetail.code === "string" ? nestedDetail.code : "";
      const message = typeof nestedDetail.message === "string" ? nestedDetail.message : "";
      const reasons = Array.isArray(nestedDetail.errors) ? nestedDetail.errors.join("; ") : "";
      detail = [code, message, reasons].filter(Boolean).join(" · ");
      if (!detail) {
        try {
          detail = JSON.stringify(nestedDetail);
        } catch {
          detail = String(nestedDetail);
        }
      }
    }
    return scrubSensitiveText([`HTTP ${error.status}`, detail].filter(Boolean).join(" · "));
  }
  return scrubSensitiveText(error instanceof Error ? error.message : String(error || "未知错误"));
}

function scrubSensitiveText(value) {
  return String(value || "")
    .replace(/data:[^;,\s]+;base64,[A-Za-z0-9+/=]+/gi, "[media data redacted]")
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [redacted]")
    .replace(/light[\s_-]*x2v(?:[_-][a-z0-9]+)*/gi, "视频生成中");
}

class ApiError extends Error {
  constructor(status, detail, retryAfter = "") {
    super(`Request failed with status ${status}`);
    this.name = "ApiError";
    this.status = status;
    this.detail = detail;
    this.retryAfter = retryAfter;
  }
}

async function parseResponseBody(response) {
  const text = await response.text();
  if (!text) return null;
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  const body = await parseResponseBody(response);
  if (!response.ok) {
    throw new ApiError(response.status, body, response.headers.get("Retry-After") || "");
  }
  return body;
}

async function fetchPersistentIr(briefBody, signal) {
  // Scope recovery to the exact request and credential, without storing either.
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(
    JSON.stringify(authHeaders()) + "\n" + briefBody));
  const recoveryKey = "freyr-ir-task-" + Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
  let saved;
  try { saved = JSON.parse(sessionStorage.getItem(recoveryKey) || "null"); } catch { saved = null; }
  saved ||= { key: crypto.randomUUID(), id: null };
  // Fail before submission if recovery storage is unavailable: do not risk an
  // orphaned submission followed by a duplicate, newly billed task.
  sessionStorage.setItem(recoveryKey, JSON.stringify(saved));
  const request = (url, options = {}) => irShortRequest(url, options, signal);
  if (!saved.id) {
    const task = await request(`${API_V1_ROOT}/h3-ir/tasks`, { method: "POST",
      headers: { ...authHeaders({ json: true }), "Idempotency-Key": saved.key }, body: briefBody });
    saved.id = task.id;
    sessionStorage.setItem(recoveryKey, JSON.stringify(saved));
  }
  await saveIrResume(saved.id);
  try {
    const brief = await pollPersistentIr(saved.id, signal);
    sessionStorage.removeItem(recoveryKey);
    return brief;
  } catch (error) {
    if (error.irTerminal || (error instanceof ApiError && error.status === 410)) {
      sessionStorage.removeItem(recoveryKey);
    }
    throw error;
  }
}

async function irShortRequest(url, options, signal) {
    for (let attempt = 0; ; attempt++) {
      try {
        return await fetchJson(url, { ...options,
          signal: signal ? AbortSignal.any([signal, AbortSignal.timeout(30000)]) : AbortSignal.timeout(30000) });
      } catch (error) {
        if (signal?.aborted || attempt >= 3 ||
            (error instanceof ApiError && error.status !== 429 && error.status < 500)) throw error;
        await delay(1500 * (attempt + 1), signal);
      }
    }
}

async function pollPersistentIr(taskId, signal) {
  const request = (url, options = {}) => irShortRequest(url, options, signal);
  const url = `${API_V1_ROOT}/h3-ir/tasks/${encodeURIComponent(taskId)}`;
  setDiagnostics({ phase: "ir", task_id: taskId });
  for (let poll = 0; poll < 1200; poll++) {
    const task = await request(url, { headers: authHeaders() });
    if (task.status === "completed") {
      const brief = await request(`${url}/result`, { headers: authHeaders() });
      return brief;
    }
    if (task.status === "failed" || task.status === "expired") {
      const error = new Error(`IR任务 ${taskId} ${task.status}: ${task.error?.errors?.join("；") || task.error?.message || "结果已过期，请重新生成"}`);
      error.irTerminal = true;
      throw error;
    }
    setStatus(task.status === "queued" ? "IR 任务排队中" : "IR 任务处理中",
      `${taskId} · 任务已持久化；停止等待不会取消后台处理。`, 42);
    await delay(3000, signal);
  }
  throw new Error(`已停止等待 IR 任务 ${taskId}；后台任务保留，可点击“恢复 IR 任务”继续查询。`);
}

const IR_RESUME_STORAGE_KEY = "freyr-ir-resume-v1";

async function irCredentialDigest() {
  const digest = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(JSON.stringify(authHeaders())));
  return Array.from(new Uint8Array(digest), x => x.toString(16).padStart(2, "0")).join("");
}

function loadIrResume() {
  try {
    const record = JSON.parse(localStorage.getItem(IR_RESUME_STORAGE_KEY) || "null");
    if (!record || !/^irjob_[a-f0-9]{32}$/.test(record.id) || !Array.isArray(record.assets) ||
        !record.settings || !Number.isFinite(record.savedAt)) return null;
    return record;
  } catch { return null; }
}

function renderIrResume() {
  const record = loadIrResume();
  $("#irResumePanel").hidden = !record;
  $("#irResumeId").textContent = record?.id || "";
}

async function saveIrResume(taskId) {
  const record = { id: taskId, credentialDigest: await irCredentialDigest(), savedAt: Date.now(),
    settings: state.preparedSettings,
    assets: state.preparedAssets.map(asset => ({type: asset.type, sha256: asset.sha256,
      file: {name: asset.file.name}})) };
  localStorage.setItem(IR_RESUME_STORAGE_KEY, JSON.stringify(record));
  renderIrResume();
}

async function resumeIrTask() {
  if (state.busy) return;
  const record = loadIrResume();
  if (!record) return;
  const controller = new AbortController();
  state.abortController = controller;
  setBusy(true);
  try {
    if (record.credentialDigest !== await irCredentialDigest()) {
      throw new Error("请使用提交该 IR 任务时的相同鉴权配置，再恢复查询。");
    }
    state.preparedSettings = record.settings;
    state.preparedAssets = record.assets;
    state.brief = null;
    state.irVerified = false;
    $("#irReview").hidden = true;
    updatePipeline("ir", ["assets"], record.settings.quality === "2K" ? [] : ["sr"]);
    state.brief = await pollPersistentIr(record.id, controller.signal);
    updatePipeline("", ["assets", "ir"], record.settings.quality === "2K" ? [] : ["sr"]);
    renderIrReview(state.brief);
    setStatus("IR 任务已恢复", "请核对原任务的提示词与素材映射后再提交视频。", 50, "success");
  } catch (error) {
    if (controller.signal.aborted) return;
    setStatus("IR 恢复失败", friendlyError(error), 0, "error");
  } finally {
    if (state.abortController === controller) setBusy(false);
  }
}

async function fetchEventStreamResult(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const body = await parseResponseBody(response);
    throw new ApiError(response.status, body, response.headers.get("Retry-After") || "");
  }
  if (!response.body) throw new Error("浏览器无法读取 IR 事件流。");

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { value, done } = await reader.read();
    buffer += decoder.decode(value || new Uint8Array(), { stream: !done });
    const frames = buffer.replaceAll("\r\n", "\n").split("\n\n");
    buffer = frames.pop() || "";
    if (done && buffer.trim()) {
      frames.push(buffer);
      buffer = "";
    }
    for (const frame of frames) {
      const lines = frame.split("\n");
      const event = lines.find((line) => line.startsWith("event:"))?.slice(6).trim();
      if (event !== "result") continue;
      const data = lines
        .filter((line) => line.startsWith("data:"))
        .map((line) => line.slice(5).trimStart())
        .join("\n");
      const result = JSON.parse(data);
      if (Number(result.status) >= 400) throw new ApiError(Number(result.status), result.body);
      return result.body;
    }
    if (done) break;
  }
  throw new Error("IR 事件流在返回结果前已结束。");
}

function historyStatusLabel(status) {
  return {
    queued: "排队中",
    retrying: "等待重试",
    running: "生成中",
    completed: "已完成",
    failed: "失败",
    cancelled: "已取消"
  }[String(status || "").toLowerCase()] || status || "未知";
}

function formatHistoryTime(value) {
  const numeric = typeof value === "number" ? value : Number(value);
  const normalized = Number.isFinite(numeric) && numeric > 0 && numeric < 1e12 ? numeric * 1000 : value;
  const date = new Date(normalized);
  return Number.isNaN(date.getTime()) ? "" : date.toLocaleString("zh-CN", { hour12: false });
}

function persistHistory() {
  try {
    localStorage.setItem(HISTORY_STORAGE_KEY, JSON.stringify(state.history.slice(0, MAX_HISTORY_ITEMS)));
  } catch {
    setHistoryMessage("浏览器无法保存本地历史记录，请检查隐私模式或存储空间。", true);
  }
}

function snapshotIr(brief, settings) {
  const prompt = brief?.ir?.prompt || brief?.ir?.final_prompt || brief?.final_prompt || brief?.prompt;
  return typeof prompt === "string" && prompt ? {
    prompt, briefId: brief.id, provider: brief.provider || settings?.irProvider || "OpenH3-IR"
  } : null;
}

function irSnapshotMarkup(snapshot) {
  if (!snapshot?.prompt) return '<small>此任务未保存 IR prompt（旧记录无法自动补回）。</small>';
  return `<details class="final-prompt"><summary>查看本次使用的 IR prompt</summary>
    <small>${escapeHtml(snapshot.provider)} · ${escapeHtml(snapshot.briefId)}</small>
    <p>${escapeHtml(snapshot.prompt)}</p></details>`;
}

function rememberJob(job, model, phase, irSnapshot = null) {
  if (!job?.id || !model) return;
  const previous = state.history.find((record) => record.id === job.id) || {};
  const settings = state.preparedSettings || {};
  const record = {
    ...previous,
    irSnapshot: previous.irSnapshot || irSnapshot,
    id: job.id,
    model,
    phase,
    quality: phase === "sr" ? "2K" : "768P",
    status: job.status || previous.status || "queued",
    progress: Number(job.progress) || 0,
    currentStage: scrubSensitiveText(job.current_stage || previous.currentStage || ""),
    seconds: settings.seconds ?? previous.seconds ?? null,
    ratio: settings.ratio || previous.ratio || "",
    sourceJobId: phase === "sr" ? (job.source_job_id || state.h3Job?.id || previous.sourceJobId || "") : "",
    createdAt: previous.createdAt || job.created_at || new Date().toISOString(),
    updatedAt: new Date().toISOString()
  };
  state.history = [record, ...state.history.filter((item) => item.id !== record.id)].slice(0, MAX_HISTORY_ITEMS);
  persistHistory();
  renderHistory();
}

function setHistoryMessage(message = "", error = false) {
  const node = $("#historyMessage");
  if (!node) return;
  node.textContent = message;
  node.classList.toggle("error", error);
  node.hidden = !message;
}

function renderHistory() {
  const list = $("#historyList");
  if (!list) return;
  $("#clearHistory").disabled = !state.history.length;
  if (!state.history.length) {
    list.innerHTML = '<p class="history-empty">此浏览器还没有保存视频任务。</p>';
    return;
  }
  list.innerHTML = state.history.map((record) => {
    const completed = String(record.status).toLowerCase() === "completed";
    const details = [
      record.quality,
      record.ratio,
      Number.isFinite(record.seconds) ? `${record.seconds} 秒` : "",
      formatHistoryTime(record.createdAt)
    ].filter(Boolean).join(" · ");
    return `
      <article class="history-item" data-history-id="${escapeHtml(record.id)}">
        <div class="history-copy">
          <strong>${escapeHtml(record.phase === "sr" ? "2K 超分" : "H3 生成")} · ${escapeHtml(record.id)}</strong>
          <span>${escapeHtml(details)}</span>
          <small>${escapeHtml(record.model)}</small>
        </div>
        <span class="history-status">${escapeHtml(historyStatusLabel(record.status))}</span>
        <div class="history-actions">
          <button class="button ghost compact" type="button" data-history-refresh="${escapeHtml(record.id)}">刷新状态</button>
          <button class="button primary compact" type="button" data-history-download="${escapeHtml(record.id)}" ${completed ? "" : "disabled"}>下载</button>
          <button class="button ghost compact" type="button" data-history-remove="${escapeHtml(record.id)}">移除记录</button>
        </div>
        <div style="grid-column: 1 / -1; min-width: 0; overflow-wrap: anywhere">${irSnapshotMarkup(record.irSnapshot)}</div>
      </article>`;
  }).join("");
}

async function refreshHistoryJob(record, button) {
  if (!record) return;
  button.disabled = true;
  setHistoryMessage(`正在刷新 ${record.id}…`);
  try {
    const job = await fetchJobWithRetry(record.id, record.model);
    rememberJob(job, record.model, record.phase);
    setHistoryMessage(`${record.id}：${historyStatusLabel(job.status)}`);
  } catch (error) {
    setHistoryMessage(`${record.id}：${friendlyError(error)}`, true);
  } finally {
    button.disabled = false;
  }
}

async function downloadHistoryJob(record, button) {
  if (!record) return;
  button.disabled = true;
  setHistoryMessage(`正在下载 ${record.id}…`);
  try {
    const response = await fetch(contentUrl(record, record.model), { headers: authHeaders() });
    if (!response.ok) throw new ApiError(response.status, await parseResponseBody(response));
    const objectUrl = URL.createObjectURL(await response.blob());
    const anchor = document.createElement("a");
    anchor.href = objectUrl;
    anchor.download = `${record.id}-${String(record.quality || "video").toLowerCase()}.mp4`;
    anchor.click();
    window.setTimeout(() => URL.revokeObjectURL(objectUrl), 30_000);
    setHistoryMessage(`${record.id}：下载已开始。`);
  } catch (error) {
    setHistoryMessage(`${record.id}：${friendlyError(error)}`, true);
  } finally {
    button.disabled = false;
  }
}

function showFormMessage(message = "") {
  const node = $("#formMessage");
  node.textContent = message;
  node.hidden = !message;
}

function assetTypeLabel(type) {
  return type === "image" ? "图片" : type === "video" ? "视频" : "音频";
}

function numberedAssets() {
  const counters = { image: 0, video: 0, audio: 0 };
  return state.assets.map((asset) => ({ ...asset, number: ++counters[asset.type] }));
}

function renderAssets() {
  const assets = numberedAssets();
  const counts = assets.reduce((result, asset) => {
    result[asset.type] += 1;
    return result;
  }, { image: 0, video: 0, audio: 0 });
  $("#imageCount").textContent = `图片 ${counts.image}/${MAX_ASSETS.image}`;
  $("#videoCount").textContent = `视频 ${counts.video}/${MAX_ASSETS.video}`;
  $("#audioCount").textContent = `音频 ${counts.audio}/${MAX_ASSETS.audio}`;

  $("#assetList").innerHTML = assets.map((asset, index) => {
    const preview = asset.type === "image"
      ? `<img src="${escapeHtml(asset.previewUrl)}" alt="">`
      : asset.type === "video"
        ? `<video src="${escapeHtml(asset.previewUrl)}" muted preload="metadata"></video>`
        : "AUDIO";
    return `
      <article class="asset-item">
        <div class="asset-preview">${preview}</div>
        <div class="asset-copy">
          <strong>${assetTypeLabel(asset.type)} ${asset.number} · ${escapeHtml(asset.file.name)}</strong>
          <span>${escapeHtml(asset.file.type)} · ${formatBytes(asset.file.size)}</span>
          ${asset.type === "audio" ? '<small>H3Offical-IR 根据提示词和文件名判断用途，无需单独填写。建议使用“林雪音色.wav”等清晰命名。</small>' : ""}
        </div>
        <div class="asset-actions">
          <button class="icon-button" type="button" data-move="up" data-id="${asset.id}" aria-label="向前移动" ${index === 0 ? "disabled" : ""}>↑</button>
          <button class="icon-button" type="button" data-move="down" data-id="${asset.id}" aria-label="向后移动" ${index === assets.length - 1 ? "disabled" : ""}>↓</button>
          <button class="icon-button" type="button" data-remove="${asset.id}" aria-label="移除 ${escapeHtml(asset.file.name)}">×</button>
        </div>
      </article>`;
  }).join("");
}

function addFiles(files) {
  showFormMessage();
  const next = [...state.assets];
  const errors = [];
  for (const file of files) {
    const type = ALLOWED_MIME[file.type];
    if (!type) {
      errors.push(`${file.name}：不支持的文件类型`);
      continue;
    }
    if (next.length >= MAX_TOTAL_ASSETS) {
      errors.push(`参考素材合计最多 ${MAX_TOTAL_ASSETS} 项`);
      break;
    }
    const typeCount = next.filter((asset) => asset.type === type).length;
    if (typeCount >= MAX_ASSETS[type]) {
      errors.push(`${assetTypeLabel(type)}最多上传 ${MAX_ASSETS[type]} 个`);
      continue;
    }
    const previewUrl = URL.createObjectURL(file);
    next.push({ id: randomUuid(), file, type, previewUrl });
  }
  state.assets = next;
  renderAssets();
  if (errors.length) showFormMessage(errors[0]);
}

function removeAsset(id) {
  const asset = state.assets.find((item) => item.id === id);
  if (asset?.previewUrl) URL.revokeObjectURL(asset.previewUrl);
  state.uploadedAssets.delete(id);
  state.assets = state.assets.filter((item) => item.id !== id);
  renderAssets();
}

function moveAsset(id, direction) {
  const index = state.assets.findIndex((item) => item.id === id);
  const target = direction === "up" ? index - 1 : index + 1;
  if (index < 0 || target < 0 || target >= state.assets.length) return;
  [state.assets[index], state.assets[target]] = [state.assets[target], state.assets[index]];
  renderAssets();
}

function validateInput() {
  if ($("#irProvider").value === "H3Offical-IR" && $("#ratioInput").value === "adaptive") {
    return "H3Offical-IR 请明确选择画面比例（如 16:9 或 9:16），暂不支持自动比例。";
  }
  if (!authIsComplete()) return "请先配置 Authorization 和两项 Cloudflare Access headers。";
  if (!$("#intentInput").value.trim()) return "请填写创作意图。";
  if (!state.assets.length) return "请至少上传一项参考素材。";
  if (state.assets.length > MAX_TOTAL_ASSETS) return `参考素材合计不能超过 ${MAX_TOTAL_ASSETS} 项。`;
  const totalBytes = state.assets.reduce((sum, asset) => sum + asset.file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return "IR 引用的原始素材合计不能超过 60 MiB。";
  return "";
}

async function sha256Hex(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setBusy(busy) {
  state.busy = busy;
  $("#prepareButton").disabled = busy;
  $("#confirmGenerate").disabled = busy || !state.brief?.id || !state.irVerified;
  $("#irProvider").disabled = busy;
  $("#rebuildIr").disabled = busy;
}

function showTaskView() {
  $("#emptyState").hidden = true;
  $("#taskView").hidden = false;
}

function updatePipeline(stage, completeStages = [], skippedStages = []) {
  $$(".pipeline li").forEach((item) => {
    const name = item.dataset.stage;
    item.classList.toggle("active", name === stage);
    item.classList.toggle("complete", completeStages.includes(name));
    item.classList.toggle("skipped", skippedStages.includes(name));
  });
}

function setStatus(title, detail, percent = 0, type = "") {
  showTaskView();
  $("#statusTitle").textContent = scrubSensitiveText(title);
  $("#statusDetail").textContent = scrubSensitiveText(detail);
  $("#statusPercent").textContent = `${Math.max(0, Math.min(100, Math.round(percent)))}%`;
  $("#progressBar").style.width = `${Math.max(0, Math.min(100, percent))}%`;
  $("#statusCard").className = `status-card ${type}`.trim();
}

function setJobMeta(job, label) {
  if (!job) {
    $("#jobMeta").innerHTML = "";
    return;
  }
  const entries = [
    label && ["阶段", label],
    job.id && ["Job", job.id],
    job.status && ["状态", job.status],
    job.current_stage && ["处理", job.current_stage]
  ].filter(Boolean);
  $("#jobMeta").innerHTML = entries.map(([name, value]) => `<span>${escapeHtml(name)}: ${escapeHtml(scrubSensitiveText(value))}</span>`).join("");
}

function safeDiagnosticValue(value) {
  if (typeof value === "string") return scrubSensitiveText(value);
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(safeDiagnosticValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    const safeKey = scrubSensitiveText(key);
    if (/authorization|secret|client.?id|uri|data/i.test(key)) return [safeKey, "[redacted]"];
    return [safeKey, safeDiagnosticValue(item)];
  }));
}

function setDiagnostics(value) {
  $("#diagnosticOutput").textContent = JSON.stringify(safeDiagnosticValue(value), null, 2);
}

function setCancelVisible(visible) {
  $("#cancelTask").hidden = !visible;
}

async function uploadAsset(asset, index, total) {
  const sha256 = await sha256Hex(asset.file);
  const cached = state.uploadedAssets.get(asset.id);
  if (cached?.sha256 === sha256) {
    setStatus("正在复用参考素材", `${assetTypeLabel(asset.type)} ${asset.number} · ${asset.file.name}`, (index / total) * 35);
    return { ...asset, sha256 };
  }

  setStatus("正在检查参考素材", `${assetTypeLabel(asset.type)} ${asset.number} · ${asset.file.name}`, (index / total) * 35);
  const assetUrl = `${API_V1_ROOT}/h3-ir/assets/${sha256}`;
  const existing = await fetch(assetUrl, {
    headers: authHeaders(),
    signal: state.abortController.signal
  });
  if (existing.ok) {
    state.uploadedAssets.set(asset.id, { sha256 });
    setStatus("正在复用参考素材", `${assetTypeLabel(asset.type)} ${asset.number} · ${asset.file.name}`, (index / total) * 35);
    return { ...asset, sha256 };
  }
  if (existing.status !== 404) {
    throw new ApiError(existing.status, await parseResponseBody(existing), existing.headers.get("Retry-After") || "");
  }

  setStatus("正在上传参考素材", `${assetTypeLabel(asset.type)} ${asset.number} · ${asset.file.name}`, (index / total) * 35);
  await fetchJson(assetUrl, {
    method: "PUT",
    headers: { ...authHeaders(), "Content-Type": asset.file.type },
    body: asset.file,
    signal: state.abortController.signal
  });
  state.uploadedAssets.set(asset.id, { sha256 });
  return { ...asset, sha256 };
}

function expectedManifest(preparedAssets) {
  const counters = { image: 0, video: 0, audio: 0 };
  return preparedAssets.map((asset) => {
    const number = ++counters[asset.type];
    const prefix = asset.type === "image" ? "Picture" : asset.type === "video" ? "Video" : "Audio";
    return { label: `<${prefix} ${number}>`, kind: asset.type, sha256: asset.sha256, name: asset.file.name };
  });
}

function manifestFromBrief(brief) {
  const manifest = brief?.ir?.manifest || brief?.manifest || [];
  return Array.isArray(manifest) ? manifest : [];
}

function manifestEntrySha(entry) {
  return String(entry?.sha256 || entry?.hash || entry?.asset_sha256 || "").toLowerCase();
}

function manifestEntryKind(entry) {
  return String(entry?.kind || entry?.type || "").toLowerCase();
}

function manifestEntryLabel(entry) {
  return String(entry?.label || entry?.tag || entry?.name || "");
}

function renderIrReview(brief) {
  const expected = expectedManifest(state.preparedAssets);
  const actual = manifestFromBrief(brief);
  const rows = expected.map((item, index) => {
    const match = actual[index];
    const shaMatches = manifestEntrySha(match) === item.sha256;
    const kindMatches = manifestEntryKind(match) === item.kind;
    const label = manifestEntryLabel(match) || item.label;
    const matches = shaMatches && kindMatches && label === item.label;
    return { ...item, returnedLabel: label, matches };
  });
  const manifestVerifiable = actual.length === expected.length && rows.every((row) => row.matches);
  const degraded = String(brief?.status || "").toLowerCase() === "degraded";
  state.irVerified = manifestVerifiable && (state.preparedSettings?.irProvider !== "H3Offical-IR" ||
    (brief?.provider === "H3Offical-IR" && brief?.validation?.passed === true && !degraded));
  $("#irReview").hidden = false;
  $("#irStatus").textContent = `${state.preparedSettings?.irProvider || "OpenH3-IR"} · ${degraded ? "Degraded · 请仔细核对" : state.irVerified ? "映射一致" : "校验失败，禁止提交"}`;
  $("#irStatus").classList.toggle("warning", degraded || !manifestVerifiable);
  $("#manifestList").innerHTML = rows.map((row) => `
    <div class="manifest-item ${row.matches ? "" : "mismatch"}">
      <strong>${escapeHtml(row.returnedLabel)}</strong>
      <code title="${escapeHtml(row.sha256)}">${escapeHtml(row.name)} · ${escapeHtml(row.sha256)}</code>
      <span>${row.matches ? "SHA / 类型一致" : "请人工核对"}</span>
    </div>`).join("");
  const prompt = brief?.ir?.prompt || brief?.ir?.final_prompt || brief?.final_prompt || brief?.prompt || "";
  $("#finalPrompt").hidden = !prompt;
  $("#finalPrompt p").textContent = prompt;
  const audio = Array.isArray(brief.audio_resolution) ? brief.audio_resolution : [];
  $("#audioResolution").hidden = !audio.length;
  $("#audioResolution").textContent = audio.map((item) =>
    `${item.label} · ${item.filename || "未提供文件名"} · ${item.role} · ${item.note}（${item.inferred ? "自动推断，请核对" : "显式指定"}）`
  ).join("\n");
  $("#confirmGenerate").disabled = state.busy || !brief?.id || !state.irVerified;
  setDiagnostics({ brief: safeDiagnosticValue(brief), expected_manifest: expected });
}

function irAssetPayload(asset, provider) {
  return {sha256: asset.sha256, kind: asset.type,
    ...(provider === "H3Offical-IR" && asset.type === "audio" ? {filename: asset.file.name} : {})};
}

async function prepareIr() {
  const validationMessage = validateInput();
  if (validationMessage) {
    showFormMessage(validationMessage);
    if (!authIsComplete()) {
      $("#authPanel").hidden = false;
      $("#authToggle").setAttribute("aria-expanded", "true");
    }
    return;
  }

  showFormMessage();
  setBusy(true);
  state.abortController = new AbortController();
  state.brief = null;
  state.preparedAssets = [];
  state.currentJob = null;
  setJobMeta(null);
  const seedValue = $("#seedInput").value.trim();
  state.preparedSettings = {
    irProvider: $("#irProvider").value,
    model: $("#modelSelect").value,
    seconds: Number($("#secondsInput").value),
    ratio: $("#ratioInput").value || "16:9",
    quality: state.desiredQuality,
    seed: seedValue ? Number(seedValue) : null
  };
  $("#irReview").hidden = true;
  $("#resultCard").hidden = true;
  updatePipeline("assets", [], state.desiredQuality === "2K" ? [] : ["sr"]);
  setStatus("正在准备参考素材", "计算内容 SHA-256 并上传到 IR 素材缓存。", 2);

  try {
    const assets = numberedAssets();
    for (let index = 0; index < assets.length; index += 1) {
      state.preparedAssets.push(await uploadAsset(assets[index], index, assets.length));
    }

    updatePipeline("ir", ["assets"], state.desiredQuality === "2K" ? [] : ["sr"]);
    setStatus("正在生成 IR 方案", "IR 会根据创作意图编排最终提示词和素材映射。", 42);
    const briefPayload = {
      model: "IR",
      ir_provider: state.preparedSettings.irProvider,
      intent: $("#intentInput").value.trim(),
      assets: state.preparedAssets.map((asset) => irAssetPayload(asset, state.preparedSettings.irProvider)),
      seconds: state.preparedSettings.seconds,
      aspect: state.preparedSettings.ratio,
      creativity: "restrained",
      ...(state.preparedSettings.seed !== null ? { seed: state.preparedSettings.seed } : {})
    };
    const briefBody = JSON.stringify(briefPayload);
    state.brief = await fetchPersistentIr(briefBody, state.abortController.signal);
    updatePipeline("", ["assets", "ir"], state.preparedSettings.quality === "2K" ? [] : ["sr"]);
    setStatus("IR 方案已生成", "请核对素材标签、类型与 SHA-256，确认后再提交 H3。", 50, "success");
    renderIrReview(state.brief);
  } catch (error) {
    if (error?.name === "AbortError" && !state.abortController) return;
    updatePipeline("ir", ["assets"], state.desiredQuality === "2K" ? [] : ["sr"]);
    setStatus("IR 准备失败", friendlyError(error), 0, "error");
    setDiagnostics({ phase: "ir", error: friendlyError(error) });
  } finally {
    setBusy(false);
  }
}

function jobUrl(jobId, model) {
  return `${API_V1_ROOT}/videos/${encodeURIComponent(jobId)}?model=${encodeURIComponent(model)}`;
}

function retryAfterMs(error, fallback) {
  const seconds = Number(error?.retryAfter);
  return Number.isFinite(seconds) && seconds >= 0 ? seconds * 1000 : fallback;
}

function delay(milliseconds, signal) {
  return new Promise((resolve, reject) => {
    const timeout = window.setTimeout(resolve, milliseconds);
    signal?.addEventListener("abort", () => {
      window.clearTimeout(timeout);
      reject(new DOMException("Aborted", "AbortError"));
    }, { once: true });
  });
}

async function fetchJobWithRetry(jobId, model) {
  const url = jobUrl(jobId, model);
  for (let attempt = 0; attempt < 4; attempt += 1) {
    try {
      return await fetchJson(url, {
        headers: authHeaders(),
        cache: "no-store",
        signal: state.abortController?.signal
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        await delay(retryAfterMs(error, 15_000), state.abortController?.signal);
        continue;
      }
      if (!(error instanceof ApiError) || !TRANSIENT_STATUS_CODES.has(error.status) || attempt === 3) throw error;
      await delay([500, 1_000, 2_000][attempt] || 2_000, state.abortController?.signal);
    }
  }
  throw new Error("状态查询失败。");
}

async function pollJob(initialJob, model, phase) {
  let job = initialJob;
  const startedAt = Date.now();
  const baseDelay = phase === "sr" ? SR_POLL_BASE_MS : H3_POLL_BASE_MS;
  while (!TERMINAL_STATUSES.has(String(job.status || "").toLowerCase())) {
    rememberJob(job, model, phase);
    if (Date.now() - startedAt > JOB_TIMEOUT_MS) throw new Error(`等待 ${phase === "sr" ? "2K 超分" : "H3"} 任务超过 40 分钟。Job ID: ${job.id}`);
    state.currentJob = { ...job, model, phase };
    const progress = Number(job.progress) || 0;
    const title = phase === "sr" ? "正在生成 2K 视频" : "正在生成 768P 视频";
    setStatus(title, job.current_stage || (job.status === "queued" ? "任务正在排队" : "模型正在处理"), phase === "sr" ? 75 + progress * 0.24 : 50 + progress * 0.25);
    setJobMeta(job, phase === "sr" ? "Video SR" : "MiniMax H3");
    setCancelVisible(["queued", "retrying"].includes(String(job.status || "").toLowerCase()));
    const jitter = phase === "sr" ? Math.random() * 2_000 : Math.random() * 3_000;
    await delay(baseDelay + jitter, state.abortController.signal);
    job = await fetchJobWithRetry(job.id, model);
  }
  rememberJob(job, model, phase);
  setCancelVisible(false);
  if (String(job.status).toLowerCase() !== "completed") {
    const detail = job.error?.message || job.error?.code || `任务状态：${job.status}`;
    throw new Error(detail);
  }
  return job;
}

async function createH3Job() {
  if (!state.brief?.id || !state.preparedSettings || !state.irVerified || state.busy) return;
  // Capture before awaiting submission; later edits and historical refreshes must
  // never replace this job's actual submitted brief with another task's prompt.
  const submittedIr = snapshotIr(state.brief, state.preparedSettings);
  setBusy(true);
  state.abortController = new AbortController();
  $("#irReview").hidden = true;
  updatePipeline("h3", ["assets", "ir"], state.preparedSettings.quality === "2K" ? [] : ["sr"]);
  setStatus("正在提交 H3 任务", "使用已核对的 brief 创建异步视频任务。", 51);
  try {
    const model = state.preparedSettings.model;
    const payload = {
      model,
      brief_id: state.brief.id,
      ...(state.preparedSettings.seed !== null ? { seed: state.preparedSettings.seed } : {})
    };
    const created = await fetchJson(`${API_V1_ROOT}/videos`, {
      method: "POST",
      // The browser CORS policy for /videos does not currently allow the
      // optional Idempotency-Key header. This UI never retries a POST.
      headers: authHeaders({ json: true }),
      body: JSON.stringify(payload),
      signal: state.abortController.signal
    });
    rememberJob(created, model, "h3", submittedIr);
    state.h3Job = await pollJob(created, model, "h3");
    updatePipeline(state.preparedSettings.quality === "2K" ? "sr" : "", ["assets", "ir", "h3"], state.preparedSettings.quality === "2K" ? [] : ["sr"]);
    if (state.preparedSettings.quality === "2K") {
      await createSrJob(state.h3Job.id);
    } else {
      await showCompletedVideo(state.h3Job, "768P");
    }
  } catch (error) {
    if (error?.name === "AbortError" && !state.abortController) return;
    setStatus("视频任务失败", friendlyError(error), 0, "error");
    setDiagnostics({ phase: state.currentJob?.phase || "h3", job: state.currentJob, error: friendlyError(error) });
  } finally {
    setBusy(false);
    setCancelVisible(false);
  }
}

async function createSrJob(sourceJobId) {
  const model = "FreyrAI/SR-D3-2K";
  setStatus("正在提交 2K 超分任务", "768P 视频已完成，正在创建独立的 Video SR 任务。", 76);
  const created = await fetchJson(`${API_V1_ROOT}/videos`, {
    method: "POST",
    headers: authHeaders({ json: true }),
    body: JSON.stringify({ model, source_job_id: sourceJobId }),
    signal: state.abortController.signal
  });
  rememberJob(created, model, "sr", state.history.find((record) => record.id === sourceJobId)?.irSnapshot);
  state.srJob = await pollJob(created, model, "sr");
  updatePipeline("", ["assets", "ir", "h3", "sr"]);
  await showCompletedVideo(state.srJob, "2K");
}

function contentUrl(job, model) {
  // file_url requires authenticated bytes but its static-file route does not
  // answer browser preflight. The documented compatibility endpoint does.
  return `${API_V1_ROOT}/videos/${encodeURIComponent(job.id)}/content?model=${encodeURIComponent(model)}`;
}

async function showCompletedVideo(job, quality) {
  setStatus("视频生成完成", quality === "2K" ? "2K 超分视频已准备好。" : "768P 视频已准备好。", 100, "success");
  setJobMeta(job, quality === "2K" ? "Video SR" : "MiniMax H3");
  const model = quality === "2K" ? "FreyrAI/SR-D3-2K" : state.preparedSettings.model;
  const response = await fetch(contentUrl(job, model), {
    headers: authHeaders(),
    signal: state.abortController.signal
  });
  if (!response.ok) throw new ApiError(response.status, await parseResponseBody(response));
  const blob = await response.blob();
  if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
  state.resultObjectUrl = URL.createObjectURL(blob);
  $("#resultVideo").src = state.resultObjectUrl;
  $("#resultCard").hidden = false;
  $("#resultQuality").textContent = `${quality} output`;
  const cost = Number(job.cost?.total_cost);
  const duration = Number(job.duration_seconds || job.usage?.output_seconds);
  $("#resultSummary").textContent = [
    Number.isFinite(duration) ? `${duration.toFixed(2)} 秒` : "",
    Number.isFinite(cost) ? `USD $${cost.toFixed(4)}` : "",
    job.id
  ].filter(Boolean).join(" · ");
  $("#resultIrPrompt").innerHTML = irSnapshotMarkup(state.history.find((record) => record.id === job.id)?.irSnapshot);
  $("#downloadVideo").dataset.filename = `${job.id || "freyr-minimax-h3"}-${quality.toLowerCase()}.mp4`;
  setDiagnostics({ h3_job: state.h3Job, sr_job: state.srJob });
}

async function cancelCurrentJob() {
  const current = state.currentJob;
  if (!current?.id) return;
  $("#cancelTask").disabled = true;
  try {
    const response = await fetchJson(jobUrl(current.id, current.model), {
      method: "DELETE",
      headers: authHeaders(),
      signal: state.abortController.signal
    });
    setStatus("已请求取消任务", "服务会继续返回最终状态；取消只保证对排队或重试中的任务生效。", Number(response?.progress) || 0);
    setDiagnostics(response);
  } catch (error) {
    setStatus("取消请求未确认", `${friendlyError(error)}。将继续保留 Job ID。`, Number(current.progress) || 0, "error");
  } finally {
    $("#cancelTask").disabled = false;
  }
}

function resetTask() {
  state.abortController?.abort();
  state.abortController = null;
  state.brief = null;
  state.preparedAssets = [];
  state.preparedSettings = null;
  state.currentJob = null;
  state.h3Job = null;
  state.srJob = null;
  if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
  state.resultObjectUrl = "";
  $("#resultVideo").removeAttribute("src");
  $("#resultVideo").load();
  $("#taskView").hidden = true;
  $("#emptyState").hidden = false;
  $("#irReview").hidden = true;
  $("#resultCard").hidden = true;
  setJobMeta(null);
  setCancelVisible(false);
  setBusy(false);
  showFormMessage();
}

function bindSegmentedControl(name, inputSelector) {
  $$(`[data-control="${name}"] button`).forEach((button) => {
    button.addEventListener("click", () => {
      $$(`[data-control="${name}"] button`).forEach((item) => item.classList.toggle("active", item === button));
      $(inputSelector).value = button.dataset.value;
      if (name === "quality") state.desiredQuality = button.dataset.value;
    });
  });
}

function bindEvents() {
  renderIrResume();
  $("#resumeIrTask").addEventListener("click", resumeIrTask);
  $("#forgetIrTask").addEventListener("click", () => {
    localStorage.removeItem(IR_RESUME_STORAGE_KEY);
    renderIrResume();
  });
  $("#authHeaders").value = state.headerText;
  updateAuthState();
  $("#authToggle").addEventListener("click", () => {
    const nextHidden = !$("#authPanel").hidden;
    $("#authPanel").hidden = nextHidden;
    $("#authToggle").setAttribute("aria-expanded", String(!nextHidden));
  });
  $("#accessForm").addEventListener("submit", (event) => event.preventDefault());
  $("#authHeaders").addEventListener("input", () => {
    state.headerText = $("#authHeaders").value;
    if (state.headerText) {
      localStorage.setItem(HEADERS_STORAGE_KEY, state.headerText);
    } else {
      localStorage.removeItem(HEADERS_STORAGE_KEY);
    }
    updateAuthState();
  });
  $("#clearHeaders").addEventListener("click", () => {
    state.headerText = "";
    $("#authHeaders").value = "";
    localStorage.removeItem(HEADERS_STORAGE_KEY);
    updateAuthState();
  });
  $("#intentInput").addEventListener("input", () => {
    $("#promptCount").textContent = `${$("#intentInput").value.length} / 7000`;
  });
  $("#irProvider").addEventListener("change", () => {
    state.brief = null;
    state.irVerified = false;
    $("#irReview").hidden = true;
    $("#confirmGenerate").disabled = true;
    showFormMessage("IR 已切换，请重新生成方案。已有视频任务不受影响。");
  });
  $("#dropzone").addEventListener("click", () => $("#assetInput").click());
  $("#assetInput").addEventListener("change", (event) => {
    addFiles(Array.from(event.target.files || []));
    event.target.value = "";
  });
  ["dragenter", "dragover"].forEach((name) => $("#dropzone").addEventListener(name, (event) => {
    event.preventDefault();
    $("#dropzone").classList.add("dragging");
  }));
  ["dragleave", "drop"].forEach((name) => $("#dropzone").addEventListener(name, (event) => {
    event.preventDefault();
    $("#dropzone").classList.remove("dragging");
  }));
  $("#dropzone").addEventListener("drop", (event) => addFiles(Array.from(event.dataTransfer?.files || [])));
  $("#assetList").addEventListener("click", (event) => {
    const remove = event.target.closest("[data-remove]");
    if (remove) removeAsset(remove.dataset.remove);
    const move = event.target.closest("[data-move]");
    if (move) moveAsset(move.dataset.id, move.dataset.move);
  });
  $("#secondsInput").addEventListener("input", () => {
    $("#secondsOutput").textContent = `${$("#secondsInput").value} 秒`;
  });
  bindSegmentedControl("quality", "#qualityInput");
  bindSegmentedControl("ratio", "#ratioInput");
  $("#generationForm").addEventListener("submit", (event) => {
    event.preventDefault();
    prepareIr();
  });
  $("#confirmGenerate").addEventListener("click", createH3Job);
  $("#rebuildIr").addEventListener("click", prepareIr);
  $("#cancelTask").addEventListener("click", cancelCurrentJob);
  $("#resetTask").addEventListener("click", resetTask);
  $("#clearHistory").addEventListener("click", () => {
    state.history = [];
    localStorage.removeItem(HISTORY_STORAGE_KEY);
    setHistoryMessage("已清空此浏览器中的任务记录。所有服务端任务和文件均未删除。");
    renderHistory();
  });
  $("#historyList").addEventListener("click", (event) => {
    const refresh = event.target.closest("[data-history-refresh]");
    const download = event.target.closest("[data-history-download]");
    const remove = event.target.closest("[data-history-remove]");
    const id = refresh?.dataset.historyRefresh || download?.dataset.historyDownload || remove?.dataset.historyRemove;
    if (!id) return;
    const record = state.history.find((item) => item.id === id);
    if (refresh) refreshHistoryJob(record, refresh);
    if (download) downloadHistoryJob(record, download);
    if (remove) {
      state.history = state.history.filter((item) => item.id !== id);
      persistHistory();
      setHistoryMessage(`已从此浏览器移除 ${id}。服务端任务和文件未删除。`);
      renderHistory();
    }
  });
  $("#downloadVideo").addEventListener("click", () => {
    if (!state.resultObjectUrl) return;
    const anchor = document.createElement("a");
    anchor.href = state.resultObjectUrl;
    anchor.download = $("#downloadVideo").dataset.filename || "freyr-minimax-h3.mp4";
    anchor.click();
  });
  window.addEventListener("beforeunload", () => {
    state.assets.forEach((asset) => asset.previewUrl && URL.revokeObjectURL(asset.previewUrl));
    if (state.resultObjectUrl) URL.revokeObjectURL(state.resultObjectUrl);
  });
}

bindEvents();
renderAssets();
renderHistory();
