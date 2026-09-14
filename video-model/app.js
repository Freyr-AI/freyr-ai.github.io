const DEFAULT_ORIGIN = "https://test.token-exchange-ai.com";
const API_NATIVE_ROOT = `${DEFAULT_ORIGIN}/api/native`;
const API_V1_ROOT = `${API_NATIVE_ROOT}/v1`;
const HEADERS_STORAGE_KEY = "freyrModelListHeaders";
const MAX_ASSETS = { image: 9, video: 3, audio: 3 };
const MAX_TOTAL_ASSETS = 12;
const MAX_TOTAL_BYTES = 60 * 1024 * 1024;
const MAX_JSON_BODY_BYTES = 11 * 1024 * 1024;
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
  resultObjectUrl: ""
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
      detail = [code, message].filter(Boolean).join(" · ");
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
    .replace(/Bearer\s+[A-Za-z0-9._~+/-]+/gi, "Bearer [redacted]");
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
  if (!authIsComplete()) return "请先配置 Authorization 和两项 Cloudflare Access headers。";
  if (!$("#intentInput").value.trim()) return "请填写创作意图。";
  if (!state.assets.length) return "请至少上传一项参考素材。";
  if (state.assets.length > MAX_TOTAL_ASSETS) return `参考素材合计不能超过 ${MAX_TOTAL_ASSETS} 项。`;
  const totalBytes = state.assets.reduce((sum, asset) => sum + asset.file.size, 0);
  if (totalBytes > MAX_TOTAL_BYTES) return "IR 引用的原始素材合计不能超过 60 MiB。";
  return "";
}

function fileToDataUri(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error(`无法读取 ${file.name}`));
    reader.readAsDataURL(file);
  });
}

async function sha256Hex(file) {
  const bytes = await file.arrayBuffer();
  const digest = await crypto.subtle.digest("SHA-256", bytes);
  return Array.from(new Uint8Array(digest), (byte) => byte.toString(16).padStart(2, "0")).join("");
}

function setBusy(busy) {
  state.busy = busy;
  $("#prepareButton").disabled = busy;
  $("#confirmGenerate").disabled = busy;
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
  $("#statusTitle").textContent = title;
  $("#statusDetail").textContent = detail;
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
  $("#jobMeta").innerHTML = entries.map(([name, value]) => `<span>${escapeHtml(name)}: ${escapeHtml(value)}</span>`).join("");
}

function safeDiagnosticValue(value) {
  if (!value || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(safeDiagnosticValue);
  return Object.fromEntries(Object.entries(value).map(([key, item]) => {
    if (/authorization|secret|client.?id|uri|data/i.test(key)) return [key, "[redacted]"];
    return [key, safeDiagnosticValue(item)];
  }));
}

function setDiagnostics(value) {
  $("#diagnosticOutput").textContent = JSON.stringify(safeDiagnosticValue(value), null, 2);
}

function setCancelVisible(visible) {
  $("#cancelTask").hidden = !visible;
}

async function uploadAsset(asset, index, total) {
  setStatus("正在上传参考素材", `${assetTypeLabel(asset.type)} ${asset.number} · ${asset.file.name}`, (index / total) * 35);
  const [sha256, dataUri] = await Promise.all([sha256Hex(asset.file), fileToDataUri(asset.file)]);
  const body = JSON.stringify({ data: dataUri });
  if (new Blob([body]).size > MAX_JSON_BODY_BYTES) {
    throw new Error(`${asset.file.name} 编码后的上传请求超过 11 MB，请压缩素材后重试。`);
  }
  await fetchJson(`${API_V1_ROOT}/h3-ir/assets/${sha256}`, {
    method: "PUT",
    headers: authHeaders({ json: true }),
    body,
    signal: state.abortController.signal
  });
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
    const match = actual.find((entry) => manifestEntrySha(entry) === item.sha256) || actual[index];
    const shaMatches = manifestEntrySha(match) === item.sha256;
    const kindMatches = manifestEntryKind(match) === item.kind;
    const label = manifestEntryLabel(match) || item.label;
    const matches = shaMatches && kindMatches;
    return { ...item, returnedLabel: label, matches };
  });
  const manifestVerifiable = actual.length === expected.length && rows.every((row) => row.matches);
  const degraded = String(brief?.status || "").toLowerCase() === "degraded";
  $("#irReview").hidden = false;
  $("#irStatus").textContent = degraded ? "Degraded · 请仔细核对" : manifestVerifiable ? "映射一致" : "需要人工核对";
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
  $("#confirmGenerate").disabled = state.busy || !brief?.id;
  setDiagnostics({ brief: safeDiagnosticValue(brief), expected_manifest: expected });
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
  const seedValue = $("#seedInput").value.trim();
  state.preparedSettings = {
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
      intent: $("#intentInput").value.trim(),
      assets: state.preparedAssets.map((asset) => ({
        sha256: asset.sha256,
        kind: asset.type
      })),
      seconds: state.preparedSettings.seconds,
      aspect: state.preparedSettings.ratio,
      creativity: "restrained",
      ...(state.preparedSettings.seed !== null ? { seed: state.preparedSettings.seed } : {})
    };
    const briefBody = JSON.stringify(briefPayload);
    state.brief = await fetchEventStreamResult(`${API_V1_ROOT}/h3-ir/briefs`, {
      method: "POST",
      headers: { ...authHeaders({ json: true }), Accept: "text/event-stream" },
      body: briefBody,
      signal: state.abortController.signal
    });
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
        signal: state.abortController.signal
      });
    } catch (error) {
      if (error instanceof ApiError && error.status === 429) {
        await delay(retryAfterMs(error, 15_000), state.abortController.signal);
        continue;
      }
      if (!(error instanceof ApiError) || !TRANSIENT_STATUS_CODES.has(error.status) || attempt === 3) throw error;
      await delay([500, 1_000, 2_000][attempt] || 2_000, state.abortController.signal);
    }
  }
  throw new Error("状态查询失败。");
}

async function pollJob(initialJob, model, phase) {
  let job = initialJob;
  const startedAt = Date.now();
  const baseDelay = phase === "sr" ? SR_POLL_BASE_MS : H3_POLL_BASE_MS;
  while (!TERMINAL_STATUSES.has(String(job.status || "").toLowerCase())) {
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
  setCancelVisible(false);
  if (String(job.status).toLowerCase() !== "completed") {
    const detail = job.error?.message || job.error?.code || `任务状态：${job.status}`;
    throw new Error(detail);
  }
  return job;
}

async function createH3Job() {
  if (!state.brief?.id || !state.preparedSettings || state.busy) return;
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
