const DEFAULT_ORIGIN = "https://test.token-exchange-ai.com";
const ORIGIN_STORAGE_KEY = "freyrModelListApiOriginTest";
const HEADERS_STORAGE_KEY = "freyrModelListHeaders";
const CATEGORY_ORDER = ["music", "image", "video", "text"];

const MODEL_META = {
  "deepseek-ai/DeepSeek-V4-Pro": {
    category: "text",
    displayName: "DeepSeek V4 Pro",
    description: "High-quality reasoning and coding chat model for production assistants and complex analysis.",
    capabilities: ["reasoning", "chat", "code"],
    context: "Long context"
  },
  "deepseek-ai/DeepSeek-V4-Flash": {
    category: "text",
    displayName: "DeepSeek V4 Flash",
    description: "Fast DeepSeek chat model for low-latency answers, summarization, and interactive workflows.",
    capabilities: ["chat", "fast", "cost efficient"],
    context: "Long context"
  },
  "Qwen/Qwen3.6-35B-A3B-FP8": {
    category: "text",
    displayName: "Qwen3.6 35B A3B FP8",
    description: "Efficient large chat model for multilingual assistant workloads and production inference.",
    capabilities: ["chat", "multilingual", "low latency"],
    context: "Provider defined"
  },
  "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16": {
    category: "text",
    displayName: "Nemotron 3 Nano Omni 30B",
    description: "Reasoning-capable text model for chat, analysis, and structured enterprise tasks.",
    capabilities: ["chat", "reasoning", "analysis"],
    context: "Provider defined"
  },
  "black-forest-labs/FLUX.2-dev": {
    category: "image",
    displayName: "FLUX.2 Dev",
    description: "Text-to-image generation model for visual exploration, campaign concepts, and design assets.",
    capabilities: ["text-to-image", "creative generation"],
    sizes: "1024x1024 default"
  },
  "Lightricks/LTX-2.3": {
    category: "video",
    displayName: "LTX 2.3",
    description: "Video generation model for short text-to-video and image-guided motion experiments.",
    capabilities: ["text-to-video", "image-to-video", "motion"],
    sizes: "768x512 default"
  },
  "Wan-AI/Wan2.2-T2V-A14B-Diffusers": {
    category: "video",
    displayName: "Wan2.2 T2V A14B",
    description: "Text-to-video diffusion model for prompt-driven short video generation.",
    capabilities: ["text-to-video", "diffusion"],
    sizes: "1280x720 default"
  },
  "OpenMOSS-Team/MOVA-360p": {
    category: "video",
    displayName: "MOVA 360p",
    description: "Reference-image video model for compact 360p motion generation.",
    capabilities: ["image-to-video", "reference image", "360p"],
    sizes: "640x360 default",
    requiresReference: true
  },
  "HeartMuLa/HeartMuLa-oss-3B-happy-new-year": {
    category: "music",
    displayName: "HeartMuLa OSS 3B",
    description: "Music generation model for short lyric- and style-guided audio clips.",
    capabilities: ["music generation", "lyrics", "style tags"],
    audioLength: "30s default"
  }
};

const FALLBACK_IDS = Object.keys(MODEL_META);

const state = {
  apiOrigin: localStorage.getItem(ORIGIN_STORAGE_KEY) || DEFAULT_ORIGIN,
  headerText: localStorage.getItem(HEADERS_STORAGE_KEY) || "",
  models: [],
  selectedId: "",
  category: "all",
  query: "",
  sort: "category",
  lastPromptCategory: ""
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

function normalizeOrigin(value) {
  const trimmed = String(value || "").trim().replace(/\/+$/, "");
  if (!trimmed) return DEFAULT_ORIGIN;
  return trimmed.replace(/\/api\/native\/v1$/, "");
}

function apiBase() {
  return `${normalizeOrigin(state.apiOrigin)}/api/native/v1`;
}

function mediaBase() {
  return normalizeOrigin(state.apiOrigin);
}

function parseHeaderLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((headers, line) => {
      const index = line.indexOf(":");
      if (index <= 0) return headers;
      const key = line.slice(0, index).trim();
      const headerValue = line.slice(index + 1).trim();
      if (key && headerValue) headers[key] = headerValue;
      return headers;
    }, {});
}

function redactHeader(name, value) {
  if (!/authorization|secret|client-id/i.test(name)) return value;
  const text = String(value);
  if (text.length <= 12) return "••••";
  return `${text.slice(0, 8)}…${text.slice(-4)}`;
}

function playgroundHeaders(includeJson = true) {
  const headers = parseHeaderLines(state.headerText);
  if (includeJson) headers["Content-Type"] = "application/json";
  return headers;
}

function redactedHeaders(includeJson = true) {
  return Object.fromEntries(
    Object.entries(playgroundHeaders(includeJson)).map(([key, value]) => [key, redactHeader(key, value)])
  );
}

function providerFromId(id) {
  return id.includes("/") ? id.split("/")[0] : "Freyr";
}

function titleFromId(id) {
  return id.includes("/") ? id.split("/").slice(1).join("/") : id;
}

function inferCategory(id) {
  const known = MODEL_META[id]?.category;
  if (known) return known;
  const lower = id.toLowerCase();
  if (/heartmula|music|audio|song/.test(lower)) return "music";
  if (/flux|image|t2i|stable|black-forest/.test(lower)) return "image";
  if (/video|t2v|i2v|wan|ltx|mova/.test(lower)) return "video";
  return "text";
}

function endpointFor(category) {
  if (category === "image") return "/freyr/v1/images/generations";
  if (category === "video") return "/freyr/v1/videos";
  if (category === "music") return "/freyr/v1/music/generations";
  return "/api/native/v1/chat/completions";
}

function categoryRank(category) {
  const index = CATEGORY_ORDER.indexOf(category);
  return index === -1 ? CATEGORY_ORDER.length : index;
}

function pricePerMillion(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * 1_000_000 : undefined;
}

function priceLabel(model) {
  if (model.category === "text") {
    const input = model.inputPerMillionTokens;
    const output = model.outputPerMillionTokens;
    if (input === undefined || output === undefined) return "Pricing unavailable";
    return `$${input.toFixed(input < 0.1 ? 3 : 2)} input / $${output.toFixed(output < 0.1 ? 3 : 2)} output per 1M tokens`;
  }
  return "Usage and cost are returned by the media adapter response.";
}

function normalizeModel(id, priceRow = {}, source = "public model info") {
  const meta = MODEL_META[id] || {};
  const category = meta.category || inferCategory(id);
  const endpoint = endpointFor(category);
  return {
    id,
    category,
    endpoint,
    source,
    displayName: meta.displayName || titleFromId(id),
    provider: meta.provider || providerFromId(id),
    description: meta.description || `${category} model served through Freyr's production API.`,
    capabilities: meta.capabilities || [category],
    context: meta.context,
    sizes: meta.sizes,
    audioLength: meta.audioLength,
    requiresReference: Boolean(meta.requiresReference),
    inputPerMillionTokens: pricePerMillion(priceRow.input_cost_per_token),
    outputPerMillionTokens: pricePerMillion(priceRow.output_cost_per_token),
    cacheReadInputPerMillionTokens: pricePerMillion(priceRow.cache_read_input_token_cost)
  };
}

function rowsByModelName(rows) {
  return rows.reduce((map, row) => {
    const id = row.model_name || row.id || row.name;
    if (id) map.set(id, row);
    return map;
  }, new Map());
}

async function fetchJson(url, options = {}) {
  const response = await fetch(url, options);
  if (!response.ok) {
    const detail = await response.text().catch(() => "");
    throw new Error(detail || `Request failed with status ${response.status}`);
  }
  return response.json();
}

async function fetchPublicModelInfo() {
  const data = await fetchJson(`${apiBase()}/model/info`, { cache: "no-store" });
  return Array.isArray(data.data) ? data.data : [];
}

async function fetchAuthorizedModels() {
  const headers = parseHeaderLines(state.headerText);
  if (!headers.Authorization) throw new Error("Authorization header is required for /models.");
  const data = await fetchJson(`${apiBase()}/models`, { headers, cache: "no-store" });
  return Array.isArray(data.data) ? data.data : [];
}

function setStatus(message, type = "") {
  const node = $("#apiStatus");
  if (!node) return;
  node.textContent = message;
  node.className = `api-state ${type}`.trim();
}

async function loadModels({ authorized = false } = {}) {
  setStatus(authorized ? "Loading authorized /models and public pricing..." : "Loading public model info...");
  let modelRows = [];
  let status = "Loaded public model info from production.";

  try {
    const priceRows = await fetchPublicModelInfo();
    modelRows = priceRows.map((row) => ({ id: row.model_name || row.id || row.name }));
    let source = "public model info";

    if (authorized) {
      try {
        const authorizedRows = await fetchAuthorizedModels();
        if (authorizedRows.length) {
          modelRows = authorizedRows;
          source = "authorized /models";
          status = `Loaded ${authorizedRows.length} authorized models from /models.`;
        }
      } catch (error) {
        status = `Loaded public model info. Authorized /models request failed: ${error instanceof Error ? error.message : String(error)}`;
      }
    }

    const priceMap = rowsByModelName(priceRows);
    const seen = new Set();
    state.models = modelRows
      .map((row) => row.id || row.model_name || row.name)
      .filter(Boolean)
      .filter((id) => {
        if (seen.has(id)) return false;
        seen.add(id);
        return true;
      })
      .map((id) => normalizeModel(id, priceMap.get(id), source));

    setStatus(status, source === "authorized /models" ? "live" : authorized ? "error" : "live");
  } catch (error) {
    state.models = FALLBACK_IDS.map((id) => normalizeModel(id, {}, "local fallback"));
    setStatus(`Live API unavailable. Showing fallback catalog. ${error instanceof Error ? error.message : ""}`, "error");
  }

  if (!state.selectedId || !state.models.some((model) => model.id === state.selectedId)) {
    state.selectedId = state.models.find((model) => model.category === "text")?.id || state.models[0]?.id || "";
  }

  render();
}

function modelMatches(model) {
  const categoryMatches = state.category === "all" || model.category === state.category;
  const needle = state.query.trim().toLowerCase();
  const haystack = [
    model.id,
    model.displayName,
    model.provider,
    model.category,
    model.description,
    model.endpoint,
    ...model.capabilities
  ].join(" ").toLowerCase();
  return categoryMatches && haystack.includes(needle);
}

function sortedModels(models) {
  const list = [...models];
  if (state.sort === "name") return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  if (state.sort === "provider") return list.sort((a, b) => a.provider.localeCompare(b.provider));
  return list.sort((a, b) => categoryRank(a.category) - categoryRank(b.category) || a.displayName.localeCompare(b.displayName));
}

function renderCounts() {
  const counts = state.models.reduce((map, model) => {
    map[model.category] = (map[model.category] || 0) + 1;
    return map;
  }, {});
  $("#totalCount").textContent = String(state.models.length);
  $("#musicCount").textContent = String(counts.music || 0);
  $("#imageCount").textContent = String(counts.image || 0);
  $("#videoCount").textContent = String(counts.video || 0);
  $("#textCount").textContent = String(counts.text || 0);
}

function renderModels() {
  const grid = $("#modelGrid");
  if (!grid) return;
  const models = sortedModels(state.models.filter(modelMatches));
  grid.innerHTML = models.length
    ? models.map((model) => `
      <article class="model-card">
        <header>
          <div>
            <span class="badge ${escapeHtml(model.category)}">${escapeHtml(model.category)}</span>
            <h3>${escapeHtml(model.displayName)}</h3>
          </div>
          <span class="pill">${escapeHtml(model.provider)}</span>
        </header>
        <p>${escapeHtml(model.description)}</p>
        <div class="capabilities">${model.capabilities.map((item) => `<span>${escapeHtml(item)}</span>`).join("")}</div>
        <div class="endpoint"><strong>Endpoint</strong> ${escapeHtml(model.endpoint)}</div>
        <div class="price"><strong>Pricing</strong> ${escapeHtml(priceLabel(model))}</div>
        <div class="model-id">${escapeHtml(model.id)}</div>
        <div class="card-actions">
          <button class="button primary" type="button" data-select-model="${escapeHtml(model.id)}">Open playground</button>
        </div>
      </article>
    `).join("")
    : `<div class="empty">No models match the current filters.</div>`;
}

function selectedModel() {
  return state.models.find((model) => model.id === state.selectedId) || state.models[0];
}

function defaultPrompt(category) {
  if (category === "image") return "small reliable smoke test image through Freyr model list";
  if (category === "video") return "small reliable smoke test video through Freyr model list";
  if (category === "music") return "[verse]\nshort model list smoke test";
  return "Reply with exactly: model-list-ok";
}

function endpointUrl(model) {
  if (model.category === "text") return `${apiBase()}/chat/completions`;
  return `${mediaBase()}${model.endpoint}`;
}

function numberValue(id, fallback) {
  const parsed = Number($(id)?.value);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function textValue(id, fallback = "") {
  const value = $(id)?.value;
  return value === undefined || value === "" ? fallback : value;
}

function buildTextRequest(model) {
  return {
    kind: "json",
    url: endpointUrl(model),
    method: "POST",
    headers: playgroundHeaders(true),
    body: {
      model: model.id,
      messages: [
        { role: "system", content: textValue("#systemPrompt") },
        { role: "user", content: textValue("#promptInput") }
      ],
      max_tokens: numberValue("#maxTokens", 256),
      temperature: numberValue("#temperature", 0.2),
      top_p: numberValue("#topP", 0.9),
      stream: Boolean($("#streamResponse")?.checked)
    }
  };
}

function buildImageRequest(model) {
  return {
    kind: "json",
    url: endpointUrl(model),
    method: "POST",
    headers: playgroundHeaders(true),
    body: {
      model: model.id,
      prompt: textValue("#promptInput"),
      size: textValue("#imageSize", "1024x1024"),
      n: numberValue("#imageCountInput", 1),
      num_inference_steps: numberValue("#imageSteps", 1),
      response_format: textValue("#imageFormat", "url")
    }
  };
}

function buildVideoRequest(model) {
  const body = {
    model: model.id,
    prompt: textValue("#promptInput"),
    size: textValue("#videoSize", "512x512"),
    fps: numberValue("#videoFps", 8),
    num_frames: numberValue("#videoFrames", 9),
    num_inference_steps: numberValue("#videoSteps", 1)
  };
  const file = $("#referenceImage")?.files?.[0];
  if (!file) {
    return {
      kind: "json",
      url: endpointUrl(model),
      method: "POST",
      headers: playgroundHeaders(true),
      body
    };
  }

  const formData = new FormData();
  Object.entries(body).forEach(([key, value]) => formData.append(key, String(value)));
  formData.append("input_reference", file);
  return {
    kind: "form",
    url: endpointUrl(model),
    method: "POST",
    headers: playgroundHeaders(false),
    body: formData,
    previewBody: { ...body, input_reference: file.name }
  };
}

function buildMusicRequest(model) {
  return {
    kind: "json",
    url: endpointUrl(model),
    method: "POST",
    headers: playgroundHeaders(true),
    body: {
      model: model.id,
      lyrics: textValue("#promptInput"),
      music_tags: textValue("#musicTags", "ambient"),
      max_audio_length_ms: numberValue("#musicLength", 1000),
      temperature: numberValue("#musicTemperature", 0.8),
      topk: numberValue("#musicTopK", 50),
      cfg_scale: numberValue("#musicCfg", 4),
      return_base64: false
    }
  };
}

function buildRequest() {
  const model = selectedModel();
  if (!model) return null;
  if (model.category === "image") return buildImageRequest(model);
  if (model.category === "video") return buildVideoRequest(model);
  if (model.category === "music") return buildMusicRequest(model);
  return buildTextRequest(model);
}

function previewRequest(request) {
  if (!request) return "";
  return JSON.stringify({
    method: request.method,
    url: request.url,
    headers: request.kind === "form" ? redactedHeaders(false) : redactedHeaders(true),
    body: request.previewBody || request.body
  }, null, 2);
}

function updatePlayground() {
  const model = selectedModel();
  if (!model) return;

  $("#playgroundTitle").textContent = model.displayName;
  $("#playgroundCategory").textContent = model.category;
  $("#playgroundCategory").className = `pill badge ${model.category}`;
  $("#promptLabel").textContent = model.category === "music" ? "Lyrics / prompt" : "Prompt";

  $$("[data-panel]").forEach((panel) => {
    panel.hidden = panel.dataset.panel !== model.category;
  });

  const prompt = $("#promptInput");
  if (prompt && state.lastPromptCategory !== model.category) {
    prompt.value = defaultPrompt(model.category);
    state.lastPromptCategory = model.category;
  }

  const request = buildRequest();
  $("#requestPreview").textContent = previewRequest(request);
}

function renderModelSelect() {
  const select = $("#modelSelect");
  if (!select) return;
  const options = sortedModels(state.models)
    .map((model) => `<option value="${escapeHtml(model.id)}">${escapeHtml(model.displayName)} · ${escapeHtml(model.category)}</option>`)
    .join("");
  select.innerHTML = options;
  select.value = state.selectedId;
}

function render() {
  renderCounts();
  renderModels();
  renderModelSelect();
  updatePlayground();
}

function setResult(html) {
  const result = $("#resultBox");
  if (result) result.innerHTML = html;
}

function friendlyError(error) {
  const message = error instanceof Error ? error.message : String(error);
  if (/failed to fetch|load failed|network/i.test(message)) {
    return "Browser request was blocked or the network is unavailable. Confirm that the API allows this page origin for OPTIONS and CORS on the selected endpoint.";
  }
  return message;
}

function readContent(json) {
  const choice = json.choices?.[0];
  return choice?.message?.content || choice?.delta?.content || choice?.text || "";
}

function usageHtml(json) {
  const parts = [];
  if (json.usage) parts.push(`<strong>Usage</strong><pre>${escapeHtml(JSON.stringify(json.usage, null, 2))}</pre>`);
  if (json.cost) parts.push(`<strong>Cost</strong><pre>${escapeHtml(JSON.stringify(json.cost, null, 2))}</pre>`);
  return parts.join("");
}

function absoluteUrl(value) {
  try {
    return new URL(value, mediaBase()).href;
  } catch {
    return value;
  }
}

function stringsFromObject(value, matches, found = []) {
  if (typeof value === "string") {
    if (matches(value)) found.push(value);
    return found;
  }
  if (!value || typeof value !== "object") return found;
  Object.values(value).forEach((item) => stringsFromObject(item, matches, found));
  return found;
}

function renderMedia(json, category) {
  if (category === "image") {
    const items = Array.isArray(json.data) ? json.data : [];
    const images = items
      .map((item) => item.b64_json ? `data:image/png;base64,${item.b64_json}` : item.url)
      .filter(Boolean);
    if (images.length) {
      return `<div class="media-output">${images.map((url) => `<img alt="Generated image" src="${escapeHtml(absoluteUrl(url))}">`).join("")}</div>`;
    }
  }

  const mediaMatches = category === "music"
    ? (value) => /\.(mp3|wav|m4a)(\?|$)/i.test(value) || /\/outputs\//.test(value)
    : (value) => /\.(mp4|webm|mov)(\?|$)/i.test(value) || /\/outputs\//.test(value);
  const urls = stringsFromObject(json, mediaMatches).map(absoluteUrl);

  if (!urls.length) return "";
  if (category === "music") {
    return `<div class="media-output">${urls.map((url) => `<audio controls src="${escapeHtml(url)}"></audio><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`).join("")}</div>`;
  }
  return `<div class="media-output">${urls.map((url) => `<video controls src="${escapeHtml(url)}"></video><a href="${escapeHtml(url)}" target="_blank" rel="noreferrer">${escapeHtml(url)}</a>`).join("")}</div>`;
}

async function readStream(response) {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const decoder = new TextDecoder();
  let buffer = "";
  let output = "";

  while (true) {
    const { value, done } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (!data || data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        output += readContent(json);
        setResult(`<strong>Streaming response</strong><pre>${escapeHtml(output)}</pre>${usageHtml(json)}`);
      } catch {
        output += data;
      }
    }
  }

  return output;
}

async function runPlayground() {
  const model = selectedModel();
  const request = buildRequest();
  if (!model || !request) return;

  const headers = parseHeaderLines(state.headerText);
  if (!headers.Authorization) {
    setResult("Add Authorization and Cloudflare Access headers before running the playground.");
    return;
  }

  if (model.requiresReference && !$("#referenceImage")?.files?.[0]) {
    setResult("This model requires a reference image. Choose an image file before running the request.");
    return;
  }

  setResult("Calling model API...");

  try {
    const response = await fetch(request.url, {
      method: request.method,
      headers: request.headers,
      body: request.kind === "json" ? JSON.stringify(request.body) : request.body
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      throw new Error(detail || `Request failed with status ${response.status}`);
    }

    if (model.category === "text" && request.body.stream) {
      const output = await readStream(response);
      if (!output) setResult("Stream completed without text content.");
      return;
    }

    const json = await response.json();
    const content = readContent(json);
    const media = renderMedia(json, model.category);
    setResult([
      content ? `<strong>Response</strong><pre>${escapeHtml(content)}</pre>` : "",
      media,
      usageHtml(json),
      `<strong>Raw JSON</strong><pre>${escapeHtml(JSON.stringify(json, null, 2))}</pre>`
    ].filter(Boolean).join(""));
  } catch (error) {
    setResult(`<strong>Request failed</strong><pre>${escapeHtml(friendlyError(error))}</pre>`);
  }
}

function resetPlayground() {
  state.lastPromptCategory = "";
  $("#systemPrompt").value = "You are a concise AI infrastructure assistant.";
  $("#maxTokens").value = "256";
  $("#temperature").value = "0.2";
  $("#topP").value = "0.9";
  $("#streamResponse").checked = false;
  $("#imageSize").value = "1024x1024";
  $("#imageCountInput").value = "1";
  $("#imageSteps").value = "1";
  $("#imageFormat").value = "url";
  $("#videoSize").value = "512x512";
  $("#videoFps").value = "8";
  $("#videoFrames").value = "9";
  $("#videoSteps").value = "1";
  $("#musicTags").value = "ambient, cinematic";
  $("#musicLength").value = "1000";
  $("#musicTemperature").value = "0.8";
  $("#musicTopK").value = "50";
  $("#musicCfg").value = "4";
  if ($("#referenceImage")) $("#referenceImage").value = "";
  setResult("Ready.");
  updatePlayground();
}

function bindEvents() {
  $("#apiOrigin").value = state.apiOrigin;
  $("#authHeaders").value = state.headerText;

  $("#accessForm").addEventListener("submit", (event) => {
    event.preventDefault();
    state.apiOrigin = normalizeOrigin($("#apiOrigin").value);
    state.headerText = $("#authHeaders").value;
    localStorage.setItem(ORIGIN_STORAGE_KEY, state.apiOrigin);
    localStorage.setItem(HEADERS_STORAGE_KEY, state.headerText);
    loadModels({ authorized: true });
  });

  $("#clearHeaders").addEventListener("click", () => {
    state.headerText = "";
    $("#authHeaders").value = "";
    localStorage.removeItem(HEADERS_STORAGE_KEY);
    updatePlayground();
  });

  $$(".segmented button").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category || "all";
      $$(".segmented button").forEach((item) => item.classList.toggle("active", item === button));
      renderModels();
    });
  });

  $("#searchModels").addEventListener("input", (event) => {
    state.query = event.target.value;
    renderModels();
  });

  $("#sortModels").addEventListener("change", (event) => {
    state.sort = event.target.value;
    renderModels();
    renderModelSelect();
  });

  $("#modelGrid").addEventListener("click", (event) => {
    const button = event.target.closest("[data-select-model]");
    if (!button) return;
    state.selectedId = button.dataset.selectModel;
    renderModelSelect();
    updatePlayground();
    $("#playground").scrollIntoView({ behavior: "smooth", block: "start" });
  });

  $("#modelSelect").addEventListener("change", (event) => {
    state.selectedId = event.target.value;
    updatePlayground();
  });

  [
    "#promptInput",
    "#systemPrompt",
    "#maxTokens",
    "#temperature",
    "#topP",
    "#streamResponse",
    "#imageSize",
    "#imageCountInput",
    "#imageSteps",
    "#imageFormat",
    "#videoSize",
    "#videoFps",
    "#videoFrames",
    "#videoSteps",
    "#referenceImage",
    "#musicTags",
    "#musicLength",
    "#musicTemperature",
    "#musicTopK",
    "#musicCfg"
  ].forEach((selector) => {
    const node = $(selector);
    node?.addEventListener("input", updatePlayground);
    node?.addEventListener("change", updatePlayground);
  });

  $("#runPlayground").addEventListener("click", runPlayground);
  $("#resetPlayground").addEventListener("click", resetPlayground);
  $("#copyRequest").addEventListener("click", async () => {
    await navigator.clipboard?.writeText($("#requestPreview").textContent);
    $("#copyRequest").textContent = "Copied";
    window.setTimeout(() => {
      $("#copyRequest").textContent = "Copy";
    }, 1200);
  });
}

document.addEventListener("DOMContentLoaded", () => {
  bindEvents();
  loadModels({ authorized: Boolean(state.headerText.trim()) });
});
