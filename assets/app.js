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

const PRICING_FALLBACK = {
  updatedAt: "2026-05-13",
  currency: "USD",
  sourceNote: "Prototype pricing endpoint for the static Freyr website. Replace with Freyr-approved live pricing before production.",
  prices: [
    { modelId: "deepseek-ai/DeepSeek-R1", displayName: "DeepSeek R1", category: "text", provider: "DeepSeek", inputPerMillionTokens: 0.55, outputPerMillionTokens: 2.19, unit: "1M tokens", status: "available" },
    { modelId: "gpt-5", displayName: "GPT-5", category: "text", provider: "OpenAI Compatible", inputPerMillionTokens: 1.25, outputPerMillionTokens: 10, unit: "1M tokens", status: "available" },
    { modelId: "models/gemini-2.5-pro", displayName: "Gemini 2.5 Pro", category: "text", provider: "Gemini Compatible", inputPerMillionTokens: 1.25, outputPerMillionTokens: 10, unit: "1M tokens", status: "available" },
    { modelId: "models/gemini-2.5-flash", displayName: "Gemini 2.5 Flash", category: "text", provider: "Gemini Compatible", inputPerMillionTokens: 0.3, outputPerMillionTokens: 2.5, unit: "1M tokens", status: "available" },
    { modelId: "gemini-2.5-flash-image", displayName: "Gemini 2.5 Flash Image", category: "image", provider: "Gemini Compatible", pricePerImage: 0.04, unit: "image", status: "available" },
    { modelId: "gemini-3-pro-image", displayName: "Gemini 3 Pro Image", category: "image", provider: "Gemini Compatible", pricePerImage: 0.08, unit: "image", status: "available" },
    { modelId: "black-forest-labs/flux.1-dev", displayName: "FLUX.1 Dev", category: "image", provider: "Black Forest Labs", pricePerImage: 0.035, unit: "image", status: "available" },
    { modelId: "black-forest-labs/flux-kontext-pro", displayName: "FLUX Kontext Pro", category: "image", provider: "Black Forest Labs", pricePerImage: 0.06, unit: "image", status: "available" },
    { modelId: "Qwen/Qwen-Image", displayName: "Qwen Image", category: "image", provider: "Qwen", pricePerImage: 0.03, unit: "image", status: "available" },
    { modelId: "Qwen/Qwen-Image-Edit", displayName: "Qwen Image Edit", category: "image", provider: "Qwen", pricePerImage: 0.045, unit: "image", status: "available" },
    { modelId: "gpt-image-1.5", displayName: "GPT Image 1.5", category: "image", provider: "OpenAI Compatible", pricePerImage: 0.08, unit: "image", status: "available" }
  ]
};

const state = {
  models: MODEL_FALLBACK,
  pricing: PRICING_FALLBACK,
  category: "all",
  query: "",
  sort: "recommended",
  priceCategory: "all",
  priceQuery: "",
  priceSort: "category",
  lang: localStorage.getItem("freyrLang") || "en",
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

const TEXT_ZH = {
  "Home": "首页",
  "Models": "模型",
  "Pricing": "价格",
  "API Docs": "API 文档",
  "Solutions": "解决方案",
  "Privacy": "隐私",
  "Contact": "联系",
  "Contact Sales": "联系销售",
  "Company": "公司",
  "Developers": "开发者",
  "Legal": "法律",
  "Text Models": "文本模型",
  "Image Generation": "图片生成",
  "Model List": "模型列表",
  "Privacy Policy": "隐私政策",
  "Your trusted partner for GPU high performance computing and AI model infrastructure.": "高性能 GPU 计算与 AI 模型基础设施的可信伙伴。",
  "Freyr Technology AI": "Freyr Technology AI",
  "GPU infrastructure for AI inference and training": "面向 AI 推理与训练的 GPU 基础设施",
  "Freyr provides advanced, customized computing resources for model training, inference, and enterprise AI deployment, with a model API experience built for production teams.": "Freyr 为模型训练、推理和企业 AI 部署提供先进、可定制的计算资源，并提供面向生产团队的模型 API 体验。",
  "Explore Models": "浏览模型",
  "Read API Docs": "查看 API 文档",
  "Dedicated infrastructure for AI workloads": "面向 AI 工作负载的专用基础设施",
  "Text and image model access patterns": "文本与图片模型接入方式",
  "Training, inference, rendering, analytics": "训练、推理、渲染与分析",
  "Singapore-based enterprise contact path": "新加坡企业支持渠道",
  "Model API control plane": "模型 API 控制台",
  "Ready": "就绪",
  "Model classes": "模型分类",
  "GPU tiers": "GPU 层级",
  "Workload path": "工作负载路径",
  "One catalog for production-ready AI models": "一个目录管理可用于生产的 AI 模型",
  "Browse text models for reasoning and chat, plus image generation models for visual production workflows. The catalog is loaded through a static JSON endpoint in this prototype.": "浏览用于推理和对话的文本模型，以及用于视觉生产流程的图片生成模型。本原型通过静态 JSON 接口加载目录。",
  "Model availability and commercial terms should be confirmed against the approved Freyr or provider model API before launch.": "上线前应以 Freyr 或供应商批准的模型 API 确认可用性与商业条款。",
  "Infrastructure services for the full AI workload path": "覆盖完整 AI 工作负载路径的基础设施服务",
  "Freyr combines GPU capacity, bare metal leasing, and deployment support for teams building AI products, training pipelines, and inference systems.": "Freyr 将 GPU 资源、裸金属租赁和部署支持结合起来，服务构建 AI 产品、训练流水线和推理系统的团队。",
  "GPU Solution": "GPU 解决方案",
  "Bare Metal Leasing": "裸金属租赁",
  "Delivery Service": "交付服务",
  "Learn more": "了解更多",
  "GPU platforms for training and inference scale": "支撑训练与推理规模化的 GPU 平台",
  "Use the product matrix as a compact entry point for sales conversations, capacity planning, and datasheet handoff.": "用产品矩阵作为销售沟通、容量规划和资料交接的简洁入口。",
  "API documentation built for integration teams": "为集成团队设计的 API 文档",
  "The API docs page presents authentication, model list retrieval, text generation, image generation, and error handling in a compact developer layout.": "API 文档页以紧凑的开发者布局呈现鉴权、模型列表、文本生成、图片生成和错误处理。",
  "Browse Models": "浏览模型",
  "Talk to Freyr about your AI workload": "与 Freyr 沟通你的 AI 工作负载",
  "Tell us about your model, GPU requirements, deployment timeline, and expected traffic. Freyr will help map the right infrastructure and API path.": "告诉我们你的模型、GPU 需求、部署时间表和预期流量。Freyr 将帮助匹配合适的基础设施与 API 路径。",
  "Plan your AI workload path": "规划你的 AI 工作负载路径",
  "Review the model catalog, GPU solution paths, and API surface to choose the right infrastructure direction.": "查看模型目录、GPU 方案路径和 API 能力，选择合适的基础设施方向。",
  "View Solutions": "查看方案",
  "Model catalog": "模型目录",
  "Browse text and image generation models": "浏览文本与图片生成模型",
  "Loading live model API...": "正在加载实时模型 API...",
  "Live model API loaded.": "实时模型 API 已加载。",
  "Live API unavailable; showing built-in fallback data.": "实时 API 不可用，正在显示内置兜底数据。",
  "Missing static API config; showing built-in fallback data.": "缺少静态 API 配置，正在显示内置兜底数据。",
  "Browser direct request was blocked. Enable CORS in Cloudflare/API for this static origin.": "浏览器直连请求被拦截。请在 Cloudflare/API 中为当前静态来源开启 CORS。",
  "Filter by category, provider, and capability. This static prototype reads from a local JSON model endpoint and can later point to an approved public catalog API.": "按分类、供应商和能力筛选。本静态原型从本地 JSON 模型接口读取，后续可替换为批准的公开目录 API。",
  "Filter by category, provider, and capability. The page loads model data through a local proxy backed by Freyr's native model info API.": "按分类、供应商和能力筛选。页面通过本地代理加载 Freyr native model info API 的模型数据。",
  "Playground": "调试台",
  "Test model parameters before integration": "集成前测试模型参数",
  "Choose a model, write a prompt, adjust generation parameters, and inspect the request payload. This static prototype generates a safe request preview and simulated response without sending secrets from the browser.": "选择模型、编写 prompt、调整生成参数并检查请求 payload。本静态原型只生成安全的请求预览和模拟响应，不从浏览器发送密钥。",
  "Choose a model, write a prompt, adjust generation parameters, inspect the request payload, and call chat completions through the local proxy without exposing secrets in the browser.": "选择模型、编写 prompt、调整生成参数、检查请求 payload，并通过本地代理调用 chat completions，不在浏览器暴露密钥。",
  "Choose a model, write a prompt, adjust generation parameters, inspect the request payload, and call chat completions directly from the static page with pasted request headers.": "选择模型、编写 prompt、调整生成参数、检查请求 payload，并用粘贴的请求头从静态页面直接调用 chat completions。",
  "Model": "模型",
  "System prompt": "系统提示词",
  "Prompt": "提示词",
  "Generate preview": "生成预览",
  "Reset": "重置",
  "Max tokens": "最大 tokens",
  "Temperature": "Temperature",
  "Top P": "Top P",
  "Image size": "图片尺寸",
  "Stream response": "流式响应",
  "Enable thinking": "启用思考",
  "Request headers": "请求头",
  "Proxy required": "需要本地代理",
  "API config required": "需要 API 配置",
  "Request failed": "请求失败",
  "Configure a model and generate a preview.": "配置模型并生成预览。",
  "All": "全部",
  "Text": "文本",
  "Image": "图片",
  "Recommended": "推荐",
  "Name A-Z": "名称 A-Z",
  "Provider": "供应商",
  "View details": "查看详情",
  "Try model": "试用模型",
  "Try in playground": "在调试台试用",
  "Open API docs": "打开 API 文档",
  "Context": "上下文",
  "Output": "输出",
  "Sizes": "尺寸",
  "Model ID": "模型 ID",
  "Commercial": "商业信息",
  "Text model": "文本模型",
  "Image model": "图片模型",
  "No models match the current filters. Try another category or search term.": "没有模型匹配当前筛选条件。请尝试其他分类或搜索词。",
  "Production should use a Freyr-approved public endpoint or a build-time synced static catalog.": "生产环境应使用 Freyr 批准的公开接口，或构建时同步的静态目录。",
  "Model pricing": "模型价格",
  "Transparent pricing for text and image generation models": "文本与图片生成模型的透明价格",
  "Loading live pricing API...": "正在加载实时价格 API...",
  "Live pricing API loaded.": "实时价格 API 已加载。",
  "Pricing is loaded from a static JSON endpoint in this prototype. Replace it with a Freyr-approved pricing API before production launch.": "本原型从静态 JSON 接口加载价格。生产上线前请替换为 Freyr 批准的价格 API。",
  "Live endpoint shape": "接口数据结构",
  "Model price list": "模型价格列表",
  "Loading pricing...": "正在加载价格...",
  "Category": "分类",
  "Input": "输入",
  "Output / Image": "输出 / 图片",
  "Status": "状态",
  "Lowest price": "最低价格",
  "Search by model or provider": "按模型或供应商搜索",
  "Search by model, provider, or capability": "按模型、供应商或能力搜索",
  "available": "可用",
  "Available": "可用",
  "Updated": "已更新",
  "No pricing rows match the current filters.": "没有价格行匹配当前筛选条件。",
  "Text input": "文本输入",
  "Text output": "文本输出",
  "Image generation": "图片生成",
  "Enterprise": "企业方案",
  "From": "起",
  "per 1M tokens": "每 100 万 tokens",
  "per image": "每张图片",
  "Contact sales for committed capacity, private deployment, and discounted volume pricing.": "联系销售获取承诺容量、私有部署和批量折扣价格。",
  "The numeric values on this prototype are loaded from": "本原型中的价格数值加载自",
  "Confirm official Freyr pricing, discounts, minimums, taxes, and currency rules before publishing.": "发布前请确认 Freyr 官方价格、折扣、最低消费、税费和币种规则。",
  "API docs": "API 文档",
  "Integrate text and image models with a clear API surface": "通过清晰的 API 接入文本与图片模型",
  "Developer-facing reference for authentication, model discovery, text generation, image generation, and support. Final endpoint domains and authentication must be confirmed before production.": "面向开发者的鉴权、模型发现、文本生成、图片生成和支持参考。生产前必须确认最终接口域名与鉴权方式。",
  "Solutions": "解决方案",
  "GPU infrastructure and deployment services for enterprise AI": "面向企业 AI 的 GPU 基础设施与部署服务",
  "Privacy Policy": "隐私政策",
  "Draft policy structure for Freyr's static website and model API services. This page should be reviewed by Freyr before publication.": "面向 Freyr 静态网站和模型 API 服务的隐私政策草案结构。发布前应由 Freyr 审核。",
  "Tell Freyr about your AI workload": "告诉 Freyr 你的 AI 工作负载",
  "Share model, GPU, traffic, and timeline requirements. Freyr will help map the right infrastructure, leasing, or model API path.": "分享模型、GPU、流量和时间需求。Freyr 将帮助匹配合适的基础设施、租赁或模型 API 路径。",
  "Get in touch": "联系我们",
  "Send inquiry": "发送咨询",
  "No database is used in this prototype. Submitting opens a mail draft addressed to Freyr.": "本原型不使用数据库。提交后会打开写给 Freyr 的邮件草稿。",
  "Overview": "概览",
  "Authentication": "鉴权",
  "Text Generation": "文本生成",
  "Errors": "错误",
  "Support": "支持",
  "Model API service": "模型 API 服务",
  "Freyr's public API documentation should describe the stable request pattern, supported model IDs, generation parameters, and support channels. This prototype uses UModelVerse-style endpoint examples as a reference shape.": "Freyr 的公开 API 文档应说明稳定的请求模式、支持的模型 ID、生成参数和支持渠道。本原型使用 UModelVerse 风格的接口示例作为参考结构。",
  "Do not place private API keys, signatures, or provider secrets in static front-end code. Browser-visible pages should only call public no-secret endpoints.": "不要在静态前端代码中放置私有 API Key、签名或供应商密钥。浏览器可见页面只应调用无需密钥的公开接口。",
  "Use server-side key handling for protected calls": "受保护调用应在服务端处理密钥",
  "Production applications should send protected generation requests from a backend or trusted runtime. Static pages can document the flow, but should not execute secret-bearing requests directly.": "生产应用应从后端或可信运行环境发送受保护的生成请求。静态页面可以说明流程，但不应直接执行带密钥的请求。",
  "Model discovery": "模型发现",
  "Retrieve available models": "获取可用模型",
  "Text model list references commonly use an OpenAI-compatible model list shape. UModelVerse documents": "文本模型列表通常采用 OpenAI 兼容的模型列表结构。UModelVerse 文档提供",
  "for text generation models and": "用于文本生成模型，以及",
  "for Gemini-compatible models.": "用于 Gemini 兼容模型。",
  "Image generation model discovery may need a separate approved endpoint or a build-time synced catalog. Do not expose signed cloud API credentials from a static page.": "图片生成模型发现可能需要单独批准的接口或构建时同步的目录。不要从静态页面暴露云 API 签名凭证。",
  "Generate text with chat-style requests": "使用对话式请求生成文本",
  "Use this section for chat completions, reasoning models, streaming behavior, temperature, max output length, and model-specific capabilities.": "本节用于说明对话补全、推理模型、流式行为、temperature、最大输出长度和模型专属能力。",
  "Generate images from prompts": "根据提示词生成图片",
  "Image model references include Gemini image models, FLUX models, Qwen image models, and GPT image models. The production docs should list supported sizes, aspect ratios, edit modes, and billing units.": "图片模型参考包括 Gemini 图片模型、FLUX 模型、Qwen 图片模型和 GPT 图片模型。生产文档应列出支持的尺寸、宽高比、编辑模式和计费单位。",
  "Return clear, actionable error messages": "返回清晰、可执行的错误信息",
  "Meaning": "含义",
  "Recommended handling": "建议处理方式",
  "Invalid request body or unsupported parameter": "请求体无效或参数不支持",
  "Show field-level validation and retry guidance.": "展示字段级校验和重试建议。",
  "Missing or invalid credentials": "缺少凭证或凭证无效",
  "Ask the user to verify API key configuration.": "提示用户检查 API Key 配置。",
  "Rate limit or capacity limit reached": "达到速率限制或容量限制",
  "Back off and contact sales for higher capacity.": "退避重试，并联系销售获取更高容量。",
  "Provider or infrastructure error": "供应商或基础设施错误",
  "Retry safely and report the request ID to support.": "安全重试，并将请求 ID 提供给支持团队。",
  "Need production access?": "需要生产访问权限？",
  "Contact Freyr with your expected model mix, request volume, latency target, region, and GPU requirements.": "请将预期模型组合、请求量、延迟目标、区域和 GPU 需求发送给 Freyr。",
  "Contact Freyr": "联系 Freyr",
  "Review the model catalog and API examples before planning production access for your expected model mix, request volume, latency target, region, and GPU requirements.": "在规划生产访问前，请先查看模型目录和 API 示例，并结合预期模型组合、请求量、延迟目标、区域和 GPU 需求进行评估。",
  "Review Pricing": "查看价格",
  "We are here to answer your questions": "我们会协助解答你的问题",
  "Use the form or contact Freyr directly. The prototype form opens your email client with a structured inquiry draft.": "你可以使用表单或直接联系 Freyr。原型表单会打开结构化邮件草稿。",
  "Email address": "邮箱地址",
  "Phone number": "电话号码",
  "Singapore office": "新加坡办公室",
  "Location": "地点",
  "Singapore enterprise support": "新加坡企业支持",
  "Map imagery can be replaced with an approved static map or embedded map once privacy and third-party loading policy is finalized.": "隐私和第三方加载策略确认后，可将地图图像替换为批准的静态地图或嵌入地图。",
  "Name *": "姓名 *",
  "Company *": "公司 *",
  "Email *": "邮箱 *",
  "Phone": "电话",
  "Country/region": "国家/地区",
  "Use case *": "使用场景 *",
  "Select one": "请选择",
  "Model API access": "模型 API 接入",
  "GPU training cluster": "GPU 训练集群",
  "Bare metal leasing": "裸金属租赁",
  "Data center deployment": "数据中心部署",
  "Other enterprise AI workload": "其他企业 AI 工作负载",
  "GPU or model requirement": "GPU 或模型需求",
  "Expected timeline": "预计时间",
  "Select timeline": "选择时间",
  "Immediate": "立即",
  "Within 1 month": "1 个月内",
  "Within 3 months": "3 个月内",
  "Planning stage": "规划阶段",
  "Message *": "留言 *",
  "I agree that Freyr may contact me about this inquiry.": "我同意 Freyr 就本次咨询联系我。",
  "Scope": "适用范围",
  "Information we collect": "我们收集的信息",
  "API request data": "API 请求数据",
  "How we use information": "我们如何使用信息",
  "Vendors": "供应商",
  "Retention": "保留期限",
  "Security": "安全",
  "Your rights": "你的权利",
  "Last updated:": "最后更新：",
  "This is implementation-ready placeholder copy, not final legal advice. Freyr should confirm logging, retention, subprocessors, and user-rights language before publishing.": "这是可实现的占位政策文案，不构成最终法律意见。发布前 Freyr 应确认日志、保留期限、子处理方和用户权利相关表述。",
  "1. Scope and acceptance": "1. 适用范围与接受",
  "This Privacy Policy explains how Freyr Technology AI may collect, use, disclose, and protect information when visitors use this website, contact Freyr, or evaluate Freyr model API and GPU infrastructure services.": "本隐私政策说明访问者使用本网站、联系 Freyr 或评估 Freyr 模型 API 与 GPU 基础设施服务时，Freyr Technology AI 可能如何收集、使用、披露和保护信息。",
  "This Privacy Policy explains how Freyr Technology AI may collect, use, disclose, and protect information when visitors use this website or evaluate Freyr model API and GPU infrastructure services.": "本隐私政策说明访问者使用本网站或评估 Freyr 模型 API 与 GPU 基础设施服务时，Freyr Technology AI 可能如何收集、使用、披露和保护信息。",
  "2. Information we collect": "2. 我们收集的信息",
  "We may collect information that you provide directly, including name, company, business email, phone number, country or region, workload requirements, and messages submitted through contact forms or email.": "我们可能收集你直接提供的信息，包括姓名、公司、商务邮箱、电话号码、国家或地区、工作负载需求，以及通过联系表单或电子邮件提交的信息。",
  "We may collect information that you provide directly, including name, company, business email, phone number, country or region, workload requirements, and messages submitted through business inquiry channels.": "我们可能收集你直接提供的信息，包括姓名、公司、商务邮箱、电话号码、国家或地区、工作负载需求，以及通过业务咨询渠道提交的信息。",
  "We may also collect limited technical information such as browser type, pages visited, timestamps, and device information when needed to operate and secure the website.": "为运营和保护网站，我们也可能收集有限的技术信息，例如浏览器类型、访问页面、时间戳和设备信息。",
  "3. API request and response data": "3. API 请求与响应数据",
  "For model API services, prompts, inputs, generated outputs, metadata, request IDs, usage volume, latency, and error information may be processed to provide the service, troubleshoot issues, prevent abuse, and support billing or capacity planning.": "对于模型 API 服务，我们可能处理提示词、输入、生成输出、元数据、请求 ID、用量、延迟和错误信息，以提供服务、排查问题、防止滥用，并支持计费或容量规划。",
  "Freyr should publish the final retention and logging policy for prompts and generated outputs before launch.": "上线前，Freyr 应发布针对提示词和生成输出的最终保留与日志政策。",
  "4. How we use information": "4. 我们如何使用信息",
  "We use information to respond to inquiries, evaluate workload requirements, provide and improve services, secure systems, diagnose errors, communicate about services, and comply with applicable obligations.": "我们使用信息来回复咨询、评估工作负载需求、提供和改进服务、保护系统、诊断错误、沟通服务事项并履行适用义务。",
  "5. Model providers and infrastructure vendors": "5. 模型供应商与基础设施供应商",
  "Freyr may work with model providers, cloud infrastructure providers, data center partners, payment or billing providers, and support tools. Information may be shared with these vendors when required to provide the service.": "Freyr 可能与模型供应商、云基础设施供应商、数据中心合作伙伴、支付或计费服务商以及支持工具合作。在提供服务所需时，信息可能会与这些供应商共享。",
  "6. Retention": "6. 保留期限",
  "We retain information only for as long as reasonably necessary for the purposes described in this policy, unless a longer retention period is required by law, contract, security, or legitimate business needs. Final retention periods should be confirmed by Freyr.": "除非法律、合同、安全或正当业务需要要求更长保留期限，我们仅在本政策所述目的合理必要的期间内保留信息。最终保留期限应由 Freyr 确认。",
  "7. Security": "7. 安全",
  "We use reasonable administrative, technical, and organizational safeguards designed to protect information. No internet or infrastructure service can be guaranteed to be completely secure.": "我们采用合理的管理、技术和组织保护措施来保护信息。但任何互联网或基础设施服务都无法保证绝对安全。",
  "8. Your rights and choices": "8. 你的权利与选择",
  "Depending on where you are located, you may have rights to access, correct, delete, restrict, or object to certain processing of personal information. Contact Freyr to submit a privacy request.": "根据你所在地区，你可能有权访问、更正、删除、限制或反对某些个人信息处理。请联系 Freyr 提交隐私请求。",
  "Depending on where you are located, you may have rights to access, correct, delete, restrict, or object to certain processing of personal information.": "根据你所在地区，你可能有权访问、更正、删除、限制或反对某些个人信息处理。",
  "For privacy questions, contact Freyr at": "如有隐私问题，请联系 Freyr：",
  "GPU infrastructure and deployment services for enterprise AI": "面向企业 AI 的 GPU 基础设施与部署服务",
  "Freyr supports customers from infrastructure planning through GPU capacity, bare metal leasing, data center deployment, and production model inference.": "Freyr 从基础设施规划、GPU 容量、裸金属租赁、数据中心部署到生产模型推理，为客户提供支持。",
  "From capacity planning to production operations": "从容量规划到生产运营",
  "Freyr's services are designed for teams that need practical access to GPU systems, not just a marketing promise. The static website should make it easy for technical buyers to understand which service to discuss first.": "Freyr 的服务面向真正需要 GPU 系统访问能力的团队，而不只是营销承诺。静态网站应帮助技术买家快速判断应优先沟通哪项服务。",
  "Reserve capacity": "预留容量",
  "View models": "查看模型",
  "AI-ready GPU systems": "面向 AI 的 GPU 系统",
  "Use this visual area for approved rack photography, cluster diagrams, or Freyr infrastructure imagery in the production site.": "生产站点可在此使用批准的机柜照片、集群图或 Freyr 基础设施图像。",
  "Dedicated GPU resources for AI model training, deep learning, inference, high-performance computing, visualization, and rendering workloads.": "为 AI 模型训练、深度学习、推理、高性能计算、可视化和渲染工作负载提供专用 GPU 资源。",
  "Training": "训练",
  "Inference": "推理",
  "Rendering": "渲染",
  "Flexible access to physical GPU servers for teams that need predictable performance, direct hardware control, and custom deployment topology.": "为需要可预测性能、直接硬件控制和自定义部署拓扑的团队提供物理 GPU 服务器访问。",
  "Monthly plans": "月度方案",
  "Dedicated nodes": "专用节点",
  "Enterprise packages": "企业套餐",
  "End-to-end delivery support for hardware logistics, cluster setup, network planning, data center deployment, and operations handoff.": "为硬件物流、集群搭建、网络规划、数据中心部署和运维交接提供端到端交付支持。",
  "Deployment": "部署",
  "Networking": "网络",
  "Handoff": "交接",
  "GPU matrix": "GPU 矩阵",
  "Match infrastructure to the workload": "将基础设施匹配到工作负载",
  "Use this section to support buying conversations without overwhelming the visitor with a full datasheet.": "本节用于支持采购沟通，而不让访客被完整数据表淹没。",
  "Workload": "工作负载",
  "Recommended discussion": "建议沟通方向",
  "Freyr support angle": "Freyr 支持重点",
  "Frontier model training": "前沿模型训练",
  "GB200 NVL72 or B200 cluster planning": "GB200 NVL72 或 B200 集群规划",
  "Capacity, networking, and deployment design": "容量、网络和部署设计",
  "Production inference": "生产推理",
  "H200/H100 capacity or model API route": "H200/H100 容量或模型 API 路径",
  "Latency, concurrency, and usage planning": "延迟、并发和用量规划",
  "Computer vision and rendering": "计算机视觉与渲染",
  "Dedicated bare metal GPU nodes": "专用裸金属 GPU 节点",
  "Direct hardware access and predictable throughput": "直接硬件访问和可预测吞吐",
  "Enterprise evaluation": "企业评估",
  "Short-term GPU leasing and API tests": "短期 GPU 租赁与 API 测试",
  "Evaluation support before full deployment": "完整部署前的评估支持",
  "Next step": "下一步",
  "Send Freyr your workload profile": "发送你的工作负载画像给 Freyr",
  "Share model size, target throughput, region, deployment timing, and whether you prefer model API access or dedicated GPU infrastructure.": "分享模型规模、目标吞吐、区域、部署时间，以及你偏好模型 API 接入还是专用 GPU 基础设施。",
  "Review your workload path": "查看你的工作负载路径",
  "Compare model API access, dedicated GPU infrastructure, and deployment services before choosing a production route.": "在选择生产路线前，对比模型 API 接入、专用 GPU 基础设施和部署服务。",
  "Review API Docs": "查看 API 文档"
};

const PLACEHOLDER_ZH = {
  "Search by model, provider, or capability": "按模型、供应商或能力搜索",
  "Search by model or provider": "按模型或供应商搜索",
  "H100, H200, GB200, text/image models": "H100、H200、GB200、文本/图片模型",
  "Tell us about workload size, traffic, latency target, region, deployment constraints, and budget range if available.": "请说明工作负载规模、流量、延迟目标、区域、部署约束和预算范围。",
  "CF-Access-Client-Id: YOUR_CLIENT_ID\nCF-Access-Client-Secret: YOUR_CLIENT_SECRET\nAuthorization: Bearer YOUR_API_KEY": "CF-Access-Client-Id: YOUR_CLIENT_ID\nCF-Access-Client-Secret: YOUR_CLIENT_SECRET\nAuthorization: Bearer YOUR_API_KEY"
};

function translateText(text, lang) {
  if (lang === "en") return text;
  const trimmed = text.trim();
  if (!trimmed || !TEXT_ZH[trimmed]) return text;
  const leading = text.match(/^\s*/)?.[0] || "";
  const trailing = text.match(/\s*$/)?.[0] || "";
  return `${leading}${TEXT_ZH[trimmed]}${trailing}`;
}

function applyTranslations() {
  const lang = state.lang;
  document.documentElement.lang = lang === "zh" ? "zh-CN" : "en";

  all(".language-select").forEach((select) => {
    select.value = lang;
  });

  const walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      const parent = node.parentElement;
      if (!parent || parent.closest("script, style, code, pre")) return NodeFilter.FILTER_REJECT;
      return node.textContent.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT;
    }
  });

  const nodes = [];
  while (walker.nextNode()) nodes.push(walker.currentNode);
  nodes.forEach((node) => {
    node.freyrEnglish ||= node.textContent;
    node.textContent = lang === "en" ? node.freyrEnglish : translateText(node.freyrEnglish, lang);
  });

  all("input[placeholder], textarea[placeholder]").forEach((input) => {
    input.dataset.enPlaceholder ||= input.getAttribute("placeholder") || "";
    const english = input.dataset.enPlaceholder;
    input.setAttribute("placeholder", lang === "zh" ? PLACEHOLDER_ZH[english] || english : english);
  });
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

  all(".language-select").forEach((select) => {
    select.value = state.lang;
    select.addEventListener("change", () => {
      state.lang = select.value;
      localStorage.setItem("freyrLang", state.lang);
      renderModels();
      updatePlayground();
      renderPricing();
      applyTranslations();
    });
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
  if (status.type === "missing-config") return label("Missing static API config; showing built-in fallback data.");
  if (status.type === "fallback") return `${label("Live API unavailable; showing built-in fallback data.")} ${label(status.detail)}`;
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
      if (Array.isArray(data.prices)) state.pricing = { ...PRICING_FALLBACK, ...data, prices: data.prices };
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
  if (!location.protocol.startsWith("http")) return PRICING_FALLBACK;

  try {
    const response = await fetch("assets/pricing.json", { cache: "no-store" });
    if (!response.ok) throw new Error("Pricing unavailable");
    const data = await response.json();
    return Array.isArray(data.prices) ? data : PRICING_FALLBACK;
  } catch {
    return PRICING_FALLBACK;
  }
}

function label(text) {
  return state.lang === "zh" ? TEXT_ZH[text] || text : text;
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

  const textPrices = prices.filter((item) => item.category === "text");
  const imagePrices = prices.filter((item) => item.category === "image");
  const lowestInput = minDefined(textPrices.map((item) => item.inputPerMillionTokens));
  const lowestOutput = minDefined(textPrices.map((item) => item.outputPerMillionTokens));
  const lowestImage = minDefined(imagePrices.map((item) => item.pricePerImage));

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
    <article class="card price-card">
      <span class="badge badge-cyan">${label("Image generation")}</span>
      <strong>${label("From")} ${usd(lowestImage)}</strong>
      <p>${label("per image")}</p>
    </article>
    <article class="card price-card">
      <span class="badge badge-amber">${label("Enterprise")}</span>
      <strong>${label("Contact Sales")}</strong>
      <p>${label("Contact sales for committed capacity, private deployment, and discounted volume pricing.")}</p>
    </article>
  `;
}

function renderPricing() {
  const table = document.querySelector("[data-pricing-table]");
  if (!table) return;

  const prices = sortPrices(state.pricing.prices.filter(priceMatches));
  renderPricingSummary(state.pricing.prices);

  const updated = byId("pricingUpdated");
  if (updated) {
    updated.textContent = `${label("Updated")} ${state.pricing.updatedAt} · ${state.pricing.currency}`;
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
    : `<tr><td colspan="6">${label("No pricing rows match the current filters.")}</td></tr>`;

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
