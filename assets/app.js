const MODEL_FALLBACK = [
  {
    id: "deepseek-ai/DeepSeek-R1",
    displayName: "DeepSeek R1",
    category: "text",
    provider: "DeepSeek",
    description: "Reasoning-focused text model for complex analysis, coding, and structured problem solving.",
    capabilities: ["reasoning", "chat", "code"],
    contextWindow: "Long context",
    outputLimit: "Provider defined",
    pricing: "Contact sales",
    docsUrl: "api.html#text-generation",
    featured: true
  },
  {
    id: "gpt-5",
    displayName: "GPT-5",
    category: "text",
    provider: "OpenAI Compatible",
    description: "General-purpose frontier text model for enterprise assistants, document workflows, and coding tasks.",
    capabilities: ["chat", "reasoning", "tool use"],
    contextWindow: "Long context",
    outputLimit: "Provider defined",
    pricing: "Usage based",
    docsUrl: "api.html#text-generation",
    featured: true
  },
  {
    id: "models/gemini-2.5-pro",
    displayName: "Gemini 2.5 Pro",
    category: "text",
    provider: "Gemini Compatible",
    description: "Multimodal-ready model family for advanced generation, analysis, and agentic workflows.",
    capabilities: ["chat", "multimodal", "generateContent"],
    contextWindow: "Long context",
    outputLimit: "Provider defined",
    pricing: "Usage based",
    docsUrl: "api.html#model-list",
    featured: true
  },
  {
    id: "models/gemini-2.5-flash",
    displayName: "Gemini 2.5 Flash",
    category: "text",
    provider: "Gemini Compatible",
    description: "Fast-response text model for lightweight assistants, summarization, and interactive UX.",
    capabilities: ["chat", "fast", "generateContent"],
    contextWindow: "Long context",
    outputLimit: "Provider defined",
    pricing: "Usage based",
    docsUrl: "api.html#model-list",
    featured: false
  },
  {
    id: "gemini-2.5-flash-image",
    displayName: "Gemini 2.5 Flash Image",
    category: "image",
    provider: "Gemini Compatible",
    description: "Image generation model for concept exploration, campaign visuals, and rapid creative variants.",
    capabilities: ["text-to-image", "creative generation"],
    imageSizes: "Provider defined",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: true
  },
  {
    id: "gemini-3-pro-image",
    displayName: "Gemini 3 Pro Image",
    category: "image",
    provider: "Gemini Compatible",
    description: "Higher-fidelity image model for production-quality creative generation and visual exploration.",
    capabilities: ["text-to-image", "high fidelity"],
    imageSizes: "Provider defined",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: true
  },
  {
    id: "black-forest-labs/flux.1-dev",
    displayName: "FLUX.1 Dev",
    category: "image",
    provider: "Black Forest Labs",
    description: "Image generation model for prompt-driven visuals, art direction, and design exploration.",
    capabilities: ["text-to-image", "design exploration"],
    imageSizes: "Multiple sizes",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: true
  },
  {
    id: "black-forest-labs/flux-kontext-pro",
    displayName: "FLUX Kontext Pro",
    category: "image",
    provider: "Black Forest Labs",
    description: "Image model for context-aware generation and edit workflows where visual continuity matters.",
    capabilities: ["image editing", "context aware"],
    imageSizes: "Multiple sizes",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: false
  },
  {
    id: "Qwen/Qwen-Image",
    displayName: "Qwen Image",
    category: "image",
    provider: "Qwen",
    description: "Image generation model for multilingual prompt workflows and creative production.",
    capabilities: ["text-to-image", "multilingual"],
    imageSizes: "Multiple sizes",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: false
  },
  {
    id: "Qwen/Qwen-Image-Edit",
    displayName: "Qwen Image Edit",
    category: "image",
    provider: "Qwen",
    description: "Editing-focused image model for object changes, refinements, and creative iteration.",
    capabilities: ["image editing", "refinement"],
    imageSizes: "Multiple sizes",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: false
  },
  {
    id: "gpt-image-1.5",
    displayName: "GPT Image 1.5",
    category: "image",
    provider: "OpenAI Compatible",
    description: "Image generation and editing model for branded content, visual prototypes, and creative assets.",
    capabilities: ["text-to-image", "image editing"],
    imageSizes: "Provider defined",
    pricing: "Per image",
    docsUrl: "api.html#image-generation",
    featured: false
  }
];

const DEFAULT_API_BASE_URL = "https://test.token-exchange-ai.com/api/native/v1";
const PLAYGROUND_HEADERS_COOKIE = "freyrPlaygroundHeaders";

const EMPTY_PRICING = {
  updatedAt: "",
  currency: "USD",
  sourceNote: "",
  prices: []
};

const state = {
  models: MODEL_FALLBACK,
  pricing: EMPTY_PRICING,
  category: "all",
  query: "",
  sort: "recommended",
  priceCategory: "all",
  priceQuery: "",
  priceSort: "category",
  lang: "en",
  playgroundModelId: "deepseek-ai/DeepSeek-R1",
  playgroundHeaders: readCookie(PLAYGROUND_HEADERS_COOKIE),
  apiStatus: {
    models: { type: "loading", detail: "" },
    pricing: { type: "loading", detail: "" }
  }
};

const byId = (id) => document.getElementById(id);
const all = (selector, scope = document) => Array.from(scope.querySelectorAll(selector));

function readCookie(name) {
  const prefix = `${encodeURIComponent(name)}=`;
  const cookie = document.cookie
    .split(";")
    .map((part) => part.trim())
    .find((part) => part.startsWith(prefix));
  if (!cookie) return "";
  try {
    return decodeURIComponent(cookie.slice(prefix.length));
  } catch {
    return "";
  }
}

function writeCookie(name, value) {
  const secure = location.protocol === "https:" ? "; Secure" : "";
  document.cookie = `${encodeURIComponent(name)}=${encodeURIComponent(value)}; Path=/; Max-Age=2592000; SameSite=Lax${secure}`;
}

function applyTranslations() {
  document.documentElement.lang = "en";
}

function initChrome() {
  const header = document.querySelector(".site-header");
  const navLinks = document.querySelector(".nav-links");
  const menuButton = document.querySelector(".menu-button");
  const page = document.body.dataset.page;

  all(".nav-link").forEach((link) => {
    if (link.dataset.nav === page) link.classList.add("is-active");
  });

  if (menuButton && navLinks) {
    menuButton.addEventListener("click", () => {
      const isOpen = navLinks.classList.toggle("is-open");
      menuButton.setAttribute("aria-expanded", String(isOpen));
    });
  }

  const setScrolled = () => header?.classList.toggle("is-scrolled", window.scrollY > 8);
  setScrolled();
  window.addEventListener("scroll", setScrolled, { passive: true });

  all("[data-year]").forEach((node) => {
    node.textContent = new Date().getFullYear();
  });

}

function apiConfig() {
  return {
    baseUrl: DEFAULT_API_BASE_URL,
    ...(window.FREYR_API_CONFIG || {})
  };
}

function friendlyApiError(error) {
  const message = error instanceof Error ? error.message : String(error || "");
  if (/failed to fetch|load failed|network|cors/i.test(message)) {
    return "Browser direct request was blocked. Enable CORS in Cloudflare/API for this static origin.";
  }
  return message || "Unknown API error.";
}

function apiStatusText(scope) {
  const status = state.apiStatus[scope] || { type: "loading", detail: "" };
  if (status.type === "live") return label(scope === "pricing" ? "Live pricing API loaded." : "Live model API loaded.");
  if (status.type === "missing-config") return label("Missing static API config; live data is unavailable.");
  if (status.type === "fallback") return `${label("Live API unavailable.")} ${label(status.detail)}`;
  return label(scope === "pricing" ? "Loading live pricing API..." : "Loading live model API...");
}

function renderApiStatuses() {
  all("[data-api-status]").forEach((node) => {
    const scope = node.dataset.apiStatus;
    const type = state.apiStatus[scope]?.type || "loading";
    node.className = `api-status is-${type}`;
    node.textContent = apiStatusText(scope);
  });
}

function setApiStatus(scope, type, detail = "") {
  state.apiStatus[scope] = { type, detail };
  renderApiStatuses();
}

function categoryConfig() {
  return window.FREYR_MODEL_CATEGORIES || {
    defaultCategory: "text",
    text: [],
    image: [],
    featured: [],
    overrides: {}
  };
}

function hasStaticApiConfig() {
  const config = apiConfig();
  return Boolean(config.baseUrl);
}

function parseHeaderLines(value) {
  return String(value || "")
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean)
    .reduce((headers, line) => {
      const separatorIndex = line.indexOf(":");
      if (separatorIndex <= 0) return headers;
      const name = line.slice(0, separatorIndex).trim();
      const headerValue = line.slice(separatorIndex + 1).trim();
      if (name && headerValue) headers[name] = headerValue;
      return headers;
    }, {});
}

function playgroundHeaders() {
  return parseHeaderLines(byId("playgroundHeaders")?.value || state.playgroundHeaders);
}

function setPlaygroundHeaders(value) {
  state.playgroundHeaders = value;
  writeCookie(PLAYGROUND_HEADERS_COOKIE, value);
}

function providerFromModel(modelName) {
  return modelName.includes("/") ? modelName.split("/")[0] : "Freyr";
}

function titleFromModel(modelName) {
  return modelName.includes("/") ? modelName.split("/").slice(1).join("/") : modelName;
}

function pricePerMillion(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed * 1_000_000 : undefined;
}

function categoryFor(modelName, categories) {
  if (categories.image?.includes(modelName)) return "image";
  if (categories.text?.includes(modelName)) return "text";
  return categories.defaultCategory || "text";
}

function normalizeModelInfo(upstream) {
  const categories = categoryConfig();
  const rows = Array.isArray(upstream?.data) ? upstream.data : Array.isArray(upstream) ? upstream : [];
  const models = rows.map((row) => {
    const modelName = row.model_name || row.id || row.name;
    const category = categoryFor(modelName, categories);
    const override = categories.overrides?.[modelName] || {};
    const input = pricePerMillion(row.input_cost_per_token);
    const output = pricePerMillion(row.output_cost_per_token);
    const cacheRead = pricePerMillion(row.cache_read_input_token_cost);

    return {
      id: modelName,
      displayName: override.displayName || titleFromModel(modelName),
      category,
      provider: override.provider || providerFromModel(modelName),
      description: override.description || `${category === "image" ? "Image" : "Text"} model served through Freyr's native model API.`,
      capabilities: override.capabilities || (category === "image" ? ["image generation"] : ["chat"]),
      contextWindow: override.contextWindow || "Provider defined",
      outputLimit: override.outputLimit || "Provider defined",
      imageSizes: override.imageSizes || "Provider defined",
      pricing: category === "text" && input !== undefined && output !== undefined
        ? `$${input.toFixed(3)} input / $${output.toFixed(3)} output per 1M tokens`
        : "Usage based",
      cacheReadInputPerMillionTokens: cacheRead,
      docsUrl: category === "image" ? "api.html#image-generation" : "api.html#text-generation",
      featured: categories.featured?.includes(modelName) || false
    };
  });

  const prices = models.map((model) => {
    const row = rows.find((item) => (item.model_name || item.id || item.name) === model.id) || {};
    return {
      modelId: model.id,
      displayName: model.displayName,
      category: model.category,
      provider: model.provider,
      inputPerMillionTokens: pricePerMillion(row.input_cost_per_token),
      outputPerMillionTokens: pricePerMillion(row.output_cost_per_token),
      cacheReadInputPerMillionTokens: pricePerMillion(row.cache_read_input_token_cost),
      unit: model.category === "image" ? "image" : "1M tokens",
      status: "available"
    };
  });

  return {
    object: "list",
    updatedAt: new Date().toISOString(),
    currency: "USD",
    sourceNote: "Loaded directly from Freyr native model info API.",
    models,
    prices,
    raw: upstream
  };
}

async function fetchDirectModelInfo() {
  if (!hasStaticApiConfig()) throw new Error("Missing static API config");
  const config = apiConfig();
  const response = await fetch(`${config.baseUrl}/model/info`);
  if (!response.ok) throw new Error(`Model info request failed with status ${response.status}`);
  return normalizeModelInfo(await response.json());
}

async function loadModels() {
  setApiStatus("models", "loading");
  let lastError;

  if (hasStaticApiConfig()) {
    try {
      const data = await fetchDirectModelInfo();
      if (Array.isArray(data.prices)) state.pricing = { ...EMPTY_PRICING, ...data, prices: data.prices };
      setApiStatus("models", "live");
      return Array.isArray(data.models) ? data.models : MODEL_FALLBACK;
    } catch (error) {
      lastError = error;
      console.warn(error);
    }
  } else {
    setApiStatus("models", "missing-config");
  }

  if (lastError) setApiStatus("models", "fallback", friendlyApiError(lastError));
  if (!location.protocol.startsWith("http")) return MODEL_FALLBACK;

  try {
    const response = await fetch("assets/models.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Model catalog unavailable");
    const data = await response.json();
    return Array.isArray(data.models) ? data.models : MODEL_FALLBACK;
  } catch {
    return MODEL_FALLBACK;
  }
}

async function loadPricing() {
  setApiStatus("pricing", "loading");
  let lastError;

  if (hasStaticApiConfig()) {
    try {
      const data = await fetchDirectModelInfo();
      setApiStatus("pricing", "live");
      return data;
    } catch (error) {
      lastError = error;
      console.warn(error);
    }
  } else {
    setApiStatus("pricing", "missing-config");
  }

  if (lastError) setApiStatus("pricing", "fallback", friendlyApiError(lastError));
  return { ...EMPTY_PRICING, error: lastError ? friendlyApiError(lastError) : "Live pricing API is not configured." };
}

function label(text) {
  return text;
}

function modelMatches(model) {
  const categoryMatches = state.category === "all" || model.category === state.category;
  const haystack = [
    model.id,
    model.displayName,
    model.category,
    model.provider,
    model.description,
    ...(model.capabilities || [])
  ].join(" ").toLowerCase();
  return categoryMatches && haystack.includes(state.query.trim().toLowerCase());
}

function sortModels(models) {
  const list = [...models];
  if (state.sort === "name") {
    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  if (state.sort === "provider") {
    return list.sort((a, b) => a.provider.localeCompare(b.provider));
  }
  return list.sort((a, b) => Number(b.featured) - Number(a.featured));
}

function renderModelCard(model, compact = false) {
  const capabilities = (model.capabilities || [])
    .map((capability) => `<span>${capability}</span>`)
    .join("");
  const categoryLabel = model.category === "text" ? "Text" : "Image";
  const details = model.category === "text"
    ? `<div><strong>Context</strong> ${model.contextWindow || "Provider defined"}</div><div><strong>Output</strong> ${model.outputLimit || "Provider defined"}</div>`
    : `<div><strong>Sizes</strong> ${model.imageSizes || "Provider defined"}</div><div><strong>Pricing</strong> ${model.pricing || "Usage based"}</div>`;

  return `
    <article class="card model-card" data-model-id="${model.id}">
      <header>
        <div>
          <span class="badge ${model.category === "image" ? "badge-cyan" : ""}">${categoryLabel}</span>
          <h3>${model.displayName}</h3>
        </div>
        <span class="badge badge-amber">${model.provider}</span>
      </header>
      <p>${model.description}</p>
      <div class="capabilities">${capabilities}</div>
      <div class="model-meta">
        ${details}
        <div><strong>Model ID</strong> ${model.id}</div>
      </div>
      <div class="model-actions">
        ${compact ? "" : `<button class="btn btn-secondary" type="button" data-open-model="${model.id}">View details</button>`}
        ${compact ? "" : `<button class="btn btn-ghost" type="button" data-try-model="${model.id}">Try model</button>`}
        <a class="btn btn-ghost" href="${model.docsUrl || "api.html"}">API docs</a>
      </div>
    </article>
  `;
}

function renderModels() {
  const grids = all("[data-model-grid]");
  if (!grids.length) return;

  grids.forEach((grid) => {
    const mode = grid.dataset.modelGrid;
    let models = state.models;
    if (mode === "featured") {
      models = models.filter((model) => model.featured).slice(0, 6);
    } else {
      models = sortModels(models.filter(modelMatches));
    }

    grid.innerHTML = models.length
      ? models.map((model) => renderModelCard(model, mode === "featured")).join("")
      : `<div class="empty-state">No models match the current filters. Try another category or search term.</div>`;
  });

  applyTranslations();
}

function openModelDialog(modelId) {
  const dialog = byId("modelDialog");
  const body = byId("modelDialogBody");
  const model = state.models.find((item) => item.id === modelId);
  if (!dialog || !body || !model) return;

  body.innerHTML = `
    <span class="badge ${model.category === "image" ? "badge-cyan" : ""}">${model.category === "text" ? "Text model" : "Image model"}</span>
    <h2>${model.displayName}</h2>
    <p>${model.description}</p>
    <div class="table-wrap" style="margin-top: 20px;">
      <table>
        <tbody>
          <tr><th>Model ID</th><td>${model.id}</td></tr>
          <tr><th>Provider</th><td>${model.provider}</td></tr>
          <tr><th>Capabilities</th><td>${(model.capabilities || []).join(", ")}</td></tr>
          <tr><th>Limits</th><td>${model.contextWindow || model.imageSizes || "Provider defined"}</td></tr>
          <tr><th>Commercial</th><td>${model.pricing || "Usage based"}</td></tr>
        </tbody>
      </table>
    </div>
    <div class="section-actions">
      <button class="btn btn-primary" type="button" data-try-model="${model.id}">Try in playground</button>
      <a class="btn btn-primary" href="${model.docsUrl || "api.html"}">Open API docs</a>
    </div>
  `;

  if (typeof dialog.showModal === "function") {
    dialog.showModal();
  } else {
    dialog.setAttribute("open", "");
  }
}

function getSelectedPlaygroundModel() {
  return state.models.find((model) => model.id === state.playgroundModelId) || state.models[0] || MODEL_FALLBACK[0];
}

function isDeepSeekModel(model) {
  return [model.id, model.provider, model.displayName].some((value) => String(value || "").toLowerCase().includes("deepseek"));
}

function playgroundPayload() {
  const model = getSelectedPlaygroundModel();
  const prompt = byId("userPrompt")?.value || "";
  const temperature = Number(byId("temperature")?.value || 0.7);
  const thinkingEnabled = Boolean(byId("enableThinking")?.checked);

  if (model.category === "image") {
    return {
      endpoint: "POST /v1/images/generations",
      headers: {
        "Content-Type": "application/json",
        ...playgroundHeaders()
      },
      body: {
        model: model.id,
        prompt,
        size: byId("imageSize")?.value || "1024x1024",
        n: 1,
        temperature
      }
    };
  }

  return {
    endpoint: "POST /v1/chat/completions",
    headers: {
      "Content-Type": "application/json",
      ...playgroundHeaders()
    },
    body: {
      model: model.id,
      messages: [
        {
          role: "system",
          content: byId("systemPrompt")?.value || ""
        },
        {
          role: "user",
          content: prompt
        }
      ],
      max_tokens: Number(byId("maxTokens")?.value || 1024),
      temperature,
      top_p: Number(byId("topP")?.value || 0.9),
      stream: Boolean(byId("streamResponse")?.checked),
      stream_options: {
        include_usage: true
      },
      chat_template_kwargs: isDeepSeekModel(model) ? { thinking: thinkingEnabled } : { enable_thinking: thinkingEnabled }
    }
  };
}

function updatePlayground() {
  const select = byId("playgroundModel");
  const model = getSelectedPlaygroundModel();
  if (select && select.value !== model.id) select.value = model.id;

  const isImage = model.category === "image";
  all("[data-text-only]").forEach((node) => {
    node.hidden = isImage;
  });
  all("[data-image-only]").forEach((node) => {
    node.hidden = !isImage;
  });

  const valuePairs = [
    ["maxTokens", "maxTokensValue"],
    ["temperature", "temperatureValue"],
    ["topP", "topPValue"],
    ["imageSize", "imageSizeValue"]
  ];
  valuePairs.forEach(([inputId, outputId]) => {
    const input = byId(inputId);
    const output = byId(outputId);
    if (input && output) output.textContent = input.value;
  });

  const request = playgroundPayload();
  const requestNode = byId("playgroundRequest");
  if (requestNode) {
    requestNode.textContent = [
      request.endpoint,
      "",
      "Headers",
      JSON.stringify(request.headers, null, 2),
      "",
      "Body",
      JSON.stringify(request.body, null, 2)
    ].join("\n");
  }
}

function appendResult(text) {
  const output = byId("playgroundOutput");
  if (!output) return;
  output.textContent += text;
  output.scrollTop = output.scrollHeight;
}

function readDeltaFromChunk(json) {
  const choice = json.choices?.[0];
  return choice?.delta?.content || choice?.message?.content || choice?.text || "";
}

function renderUsage(usage) {
  const node = byId("playgroundUsage");
  if (!node || !usage) return;
  const entries = Object.entries(usage)
    .filter(([, value]) => value !== null && value !== undefined && typeof value !== "object")
    .map(([key, value]) => `${key}: ${value}`);
  node.textContent = entries.length ? `Usage: ${entries.join(" · ")}` : `Usage: ${JSON.stringify(usage, null, 2)}`;
}

async function readStreamingResponse(response) {
  const reader = response.body?.getReader();
  if (!reader) return;

  const decoder = new TextDecoder();
  let buffer = "";
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    const lines = buffer.split(/\r?\n/);
    buffer = lines.pop() || "";

    for (const line of lines) {
      const trimmed = line.trim();
      if (!trimmed || !trimmed.startsWith("data:")) continue;
      const data = trimmed.slice(5).trim();
      if (data === "[DONE]") continue;
      try {
        const json = JSON.parse(data);
        const delta = readDeltaFromChunk(json);
        if (delta) appendResult(delta);
        if (json.usage) renderUsage(json.usage);
      } catch {
        appendResult(data);
      }
    }
  }
}

async function readJsonResponse(response) {
  const json = await response.json();
  const content = readDeltaFromChunk(json) || JSON.stringify(json, null, 2);
  appendResult(content);
  if (json.usage) renderUsage(json.usage);
}

async function fetchChatCompletion(request) {
  const body = request.body;
  const payload = JSON.stringify(body);

  if (!hasStaticApiConfig()) throw new Error("Missing static API config");
  return fetch(`${apiConfig().baseUrl}/chat/completions`, {
    method: "POST",
    headers: request.headers,
    body: payload
  });
}

async function runPlaygroundPreview() {
  updatePlayground();
  const result = byId("playgroundResult");
  const model = getSelectedPlaygroundModel();
  if (!result) return;

  if (model.category === "image") {
    result.innerHTML = `
      <strong>Simulated image job</strong>
      <span>Ready to send a prompt to ${model.displayName}. Add the image generation endpoint when Freyr confirms the native image API shape.</span>
    `;
    return;
  }

  if (!hasStaticApiConfig()) {
    result.innerHTML = `
      <strong>API config required</strong>
      <span>Create <code>config/api.local.js</code> from <code>config/api.local.example.js</code> before calling the model API.</span>
    `;
    return;
  }

  const request = playgroundPayload();
  result.innerHTML = `
    <strong>Calling ${model.displayName}</strong>
    <pre id="playgroundOutput" class="playground-output"></pre>
    <span id="playgroundUsage"></span>
  `;

  try {
    const response = await fetchChatCompletion(request);

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || `Request failed with status ${response.status}`);
    }

    if (request.body.stream) {
      await readStreamingResponse(response);
    } else {
      await readJsonResponse(response);
    }
  } catch (error) {
    result.innerHTML = `
      <strong>Request failed</strong>
      <span>${error instanceof Error ? error.message : "Unknown error"}</span>
    `;
  }
}

function selectPlaygroundModel(modelId) {
  state.playgroundModelId = modelId;
  updatePlayground();
  byId("playground")?.scrollIntoView({ behavior: "smooth", block: "start" });
}

function initPlayground() {
  const playground = byId("playground");
  const select = byId("playgroundModel");
  if (!playground || !select) return;

  const headersInput = byId("playgroundHeaders");
  if (headersInput && !headersInput.value && state.playgroundHeaders) {
    headersInput.value = state.playgroundHeaders;
  }

  select.innerHTML = state.models
    .map((model) => `<option value="${model.id}">${model.displayName} · ${model.category === "text" ? "Text" : "Image"}</option>`)
    .join("");

  if (!state.models.some((model) => model.id === state.playgroundModelId)) {
    state.playgroundModelId = state.models[0]?.id || MODEL_FALLBACK[0].id;
  }

  select.addEventListener("change", () => {
    state.playgroundModelId = select.value;
    updatePlayground();
  });

  ["maxTokens", "temperature", "topP", "imageSize", "streamResponse", "enableThinking", "systemPrompt", "userPrompt", "playgroundHeaders"].forEach((id) => {
    const input = byId(id);
    input?.addEventListener("input", () => {
      if (id === "playgroundHeaders") setPlaygroundHeaders(input.value);
      updatePlayground();
    });
    input?.addEventListener("change", () => {
      if (id === "playgroundHeaders") setPlaygroundHeaders(input.value);
      updatePlayground();
    });
  });

  byId("runPlayground")?.addEventListener("click", runPlaygroundPreview);
  byId("resetPlayground")?.addEventListener("click", () => {
    if (byId("systemPrompt")) {
      byId("systemPrompt").value = "You are a precise enterprise AI assistant for GPU infrastructure and model API planning.";
    }
    if (byId("userPrompt")) {
      byId("userPrompt").value = "Summarize the best Freyr infrastructure option for a team serving a text model with high concurrency and predictable latency.";
    }
    if (byId("maxTokens")) byId("maxTokens").value = "1024";
    if (byId("temperature")) byId("temperature").value = "0.7";
    if (byId("topP")) byId("topP").value = "0.9";
    if (byId("imageSize")) byId("imageSize").value = "1024x1024";
    if (byId("streamResponse")) byId("streamResponse").checked = true;
    if (byId("enableThinking")) byId("enableThinking").checked = false;
    updatePlayground();
    const result = byId("playgroundResult");
    if (result) result.textContent = "Configure a model and generate a preview.";
  });

  updatePlayground();
}

function initModels() {
  if (!document.querySelector("[data-model-grid]")) return;

  all("[data-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.category = button.dataset.category || "all";
      all("[data-category]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderModels();
    });
  });

  const search = byId("modelSearch");
  search?.addEventListener("input", () => {
    state.query = search.value;
    renderModels();
  });

  const sort = byId("modelSort");
  sort?.addEventListener("change", () => {
    state.sort = sort.value;
    renderModels();
  });

  document.addEventListener("click", (event) => {
    const opener = event.target.closest("[data-open-model]");
    if (opener) openModelDialog(opener.dataset.openModel);

    const tryModel = event.target.closest("[data-try-model]");
    if (tryModel) {
      event.target.closest("dialog")?.close();
      selectPlaygroundModel(tryModel.dataset.tryModel);
    }

    const close = event.target.closest("[data-close-dialog]");
    if (close) close.closest("dialog")?.close();
  });

  loadModels().then((models) => {
    state.models = models;
    renderModels();
    initPlayground();
  });
}

function priceMatches(item) {
  const categoryMatches = state.priceCategory === "all" || item.category === state.priceCategory;
  const haystack = [item.modelId, item.displayName, item.category, item.provider].join(" ").toLowerCase();
  return categoryMatches && haystack.includes(state.priceQuery.trim().toLowerCase());
}

function sortPrices(prices) {
  const list = [...prices];
  if (state.priceSort === "name") {
    return list.sort((a, b) => a.displayName.localeCompare(b.displayName));
  }
  if (state.priceSort === "price") {
    return list.sort((a, b) => {
      const aPrice = a.category === "text" ? a.inputPerMillionTokens : a.pricePerImage;
      const bPrice = b.category === "text" ? b.inputPerMillionTokens : b.pricePerImage;
      if (aPrice === undefined) return 1;
      if (bPrice === undefined) return -1;
      return aPrice - bPrice;
    });
  }
  return list.sort((a, b) => a.category.localeCompare(b.category) || a.displayName.localeCompare(b.displayName));
}

function usd(value) {
  if (typeof value !== "number" || !Number.isFinite(value)) return "-";
  return `$${value.toFixed(value < 0.1 ? 3 : 2)}`;
}

function minDefined(values) {
  const defined = values.filter((value) => typeof value === "number" && Number.isFinite(value));
  return defined.length ? Math.min(...defined) : undefined;
}

function renderPricingSummary(prices) {
  const summary = document.querySelector("[data-pricing-summary]");
  if (!summary) return;

  if (state.apiStatus.pricing?.type === "loading") {
    summary.innerHTML = `
      <article class="card price-card price-card-loading" aria-busy="true">
        <span class="badge">${label("Text input")}</span>
        <strong>${label("Loading")}</strong>
        <p>${label("Fetching live pricing...")}</p>
      </article>
      <article class="card price-card price-card-loading" aria-busy="true">
        <span class="badge">${label("Text output")}</span>
        <strong>${label("Loading")}</strong>
        <p>${label("Fetching live pricing...")}</p>
      </article>
    `;
    return;
  }

  if (!prices.length) {
    summary.innerHTML = `
      <article class="card price-card price-card-empty">
        <span class="badge">${label("Text input")}</span>
        <strong>${label("Unavailable")}</strong>
        <p>${label("Live pricing has not loaded.")}</p>
      </article>
      <article class="card price-card price-card-empty">
        <span class="badge">${label("Text output")}</span>
        <strong>${label("Unavailable")}</strong>
        <p>${label("Live pricing has not loaded.")}</p>
      </article>
    `;
    return;
  }

  const textPrices = prices.filter((item) => item.category === "text");
  const lowestInput = minDefined(textPrices.map((item) => item.inputPerMillionTokens));
  const lowestOutput = minDefined(textPrices.map((item) => item.outputPerMillionTokens));

  summary.innerHTML = `
    <article class="card price-card">
      <span class="badge">${label("Text input")}</span>
      <strong>${label("From")} ${usd(lowestInput)}</strong>
      <p>${label("per 1M tokens")}</p>
    </article>
    <article class="card price-card">
      <span class="badge">${label("Text output")}</span>
      <strong>${label("From")} ${usd(lowestOutput)}</strong>
      <p>${label("per 1M tokens")}</p>
    </article>
  `;
}

function renderPricing() {
  const table = document.querySelector("[data-pricing-table]");
  if (!table) return;

  const pricingStatus = state.apiStatus.pricing?.type || "loading";
  const pricingRows = Array.isArray(state.pricing.prices) ? state.pricing.prices : [];
  const prices = sortPrices(pricingRows.filter(priceMatches));
  renderPricingSummary(pricingRows);

  const updated = byId("pricingUpdated");
  if (updated) {
    updated.textContent = pricingStatus === "loading"
      ? label("Loading live pricing...")
      : state.pricing.updatedAt
        ? `${label("Updated")} ${state.pricing.updatedAt} · ${state.pricing.currency}`
        : label("Live pricing unavailable");
  }

  all("[data-price-category]").forEach((button) => {
    button.disabled = pricingStatus === "loading";
  });
  const search = byId("pricingSearch");
  if (search) search.disabled = pricingStatus === "loading";
  const sort = byId("pricingSort");
  if (sort) sort.disabled = pricingStatus === "loading";

  if (pricingStatus === "loading") {
    table.innerHTML = Array.from({ length: 4 }).map(() => `
      <tr class="pricing-loading-row" aria-busy="true">
        <td><span></span><span></span></td>
        <td><span></span></td>
        <td><span></span></td>
        <td><span></span></td>
        <td><span></span></td>
        <td><span></span></td>
      </tr>
    `).join("");
    applyTranslations();
    return;
  }

  table.innerHTML = prices.length
    ? prices.map((item) => {
      const isText = item.category === "text";
      return `
        <tr>
          <td><strong>${item.displayName}</strong><br><span>${item.modelId}</span></td>
          <td><span class="badge ${isText ? "" : "badge-cyan"}">${label(isText ? "Text" : "Image")}</span></td>
          <td>${item.provider}</td>
          <td>${isText ? `${usd(item.inputPerMillionTokens)} / ${label("per 1M tokens")}` : "-"}</td>
          <td>${isText ? `${usd(item.outputPerMillionTokens)} / ${label("per 1M tokens")}` : item.pricePerImage === undefined ? "-" : `${usd(item.pricePerImage)} / ${label("per image")}`}</td>
          <td><span class="badge">${label("Available")}</span></td>
        </tr>
      `;
    }).join("")
    : `<tr><td colspan="6">${label(pricingRows.length ? "No pricing rows match the current filters." : "Live pricing is unavailable. Please try again after the API is reachable.")}</td></tr>`;

  applyTranslations();
}

function initPricing() {
  if (!document.querySelector("[data-pricing-table]")) return;

  all("[data-price-category]").forEach((button) => {
    button.addEventListener("click", () => {
      state.priceCategory = button.dataset.priceCategory || "all";
      all("[data-price-category]").forEach((item) => item.classList.toggle("is-active", item === button));
      renderPricing();
    });
  });

  const search = byId("pricingSearch");
  search?.addEventListener("input", () => {
    state.priceQuery = search.value;
    renderPricing();
  });

  const sort = byId("pricingSort");
  sort?.addEventListener("change", () => {
    state.priceSort = sort.value;
    renderPricing();
  });

  renderPricing();

  loadPricing().then((pricing) => {
    state.pricing = pricing;
    renderPricing();
  });
}

function initCopyButtons() {
  all("[data-copy]").forEach((button) => {
    button.addEventListener("click", async () => {
      const target = byId(button.dataset.copy);
      if (!target) return;
      await navigator.clipboard?.writeText(target.textContent.trim());
      const previous = button.textContent;
      button.textContent = "Copied";
      window.setTimeout(() => {
        button.textContent = previous;
      }, 1400);
    });
  });
}

document.addEventListener("DOMContentLoaded", () => {
  initChrome();
  initModels();
  initPricing();
  initCopyButtons();
  applyTranslations();
});
