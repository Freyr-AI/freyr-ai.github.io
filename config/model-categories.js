window.FREYR_MODEL_CATEGORIES = {
  defaultCategory: "text",
  text: [
    "deepseek-ai/DeepSeek-V4-Pro",
    "deepseek-ai/DeepSeek-V4-Flash",
    "Qwen/Qwen3.6-35B-A3B-FP8",
    "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16"
  ],
  image: [
    "black-forest-labs/FLUX.2-dev"
  ],
  music: [
    "HeartMuLa/HeartMuLa-oss-3B-happy-new-year"
  ],
  video: [
    "Lightricks/LTX-2.3",
    "Wan-AI/Wan2.2-T2V-A14B-Diffusers",
    "OpenMOSS-Team/MOVA-360p"
  ],
  featured: [
    "deepseek-ai/DeepSeek-V4-Pro",
    "deepseek-ai/DeepSeek-V4-Flash",
    "Qwen/Qwen3.6-35B-A3B-FP8",
    "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16",
    "black-forest-labs/FLUX.2-dev",
    "Lightricks/LTX-2.3",
    "Wan-AI/Wan2.2-T2V-A14B-Diffusers",
    "OpenMOSS-Team/MOVA-360p",
    "HeartMuLa/HeartMuLa-oss-3B-happy-new-year"
  ],
  overrides: {
    "deepseek-ai/DeepSeek-V4-Pro": {
      displayName: "DeepSeek V4 Pro",
      provider: "DeepSeek",
      description: "DeepSeek text model for high-quality reasoning, analysis, and enterprise assistant workloads.",
      capabilities: ["chat", "reasoning", "code"]
    },
    "deepseek-ai/DeepSeek-V4-Flash": {
      displayName: "DeepSeek V4 Flash",
      provider: "DeepSeek",
      description: "Fast DeepSeek text model for low-latency chat, summarization, and interactive workflows.",
      capabilities: ["chat", "fast", "cost efficient"]
    },
    "Qwen/Qwen3.6-35B-A3B-FP8": {
      displayName: "Qwen3.6 35B A3B FP8",
      provider: "Qwen",
      description: "Qwen text model for chat, multilingual reasoning, and production assistant workloads.",
      capabilities: ["chat", "reasoning", "multilingual"]
    },
    "nvidia/Nemotron-3-Nano-Omni-30B-A3B-Reasoning-BF16": {
      displayName: "Nemotron 3 Nano Omni 30B Reasoning",
      provider: "NVIDIA",
      description: "NVIDIA reasoning-oriented text model for assistant, analysis, and structured generation use cases.",
      capabilities: ["chat", "reasoning", "analysis"]
    },
    "black-forest-labs/FLUX.2-dev": {
      displayName: "FLUX.2 Dev",
      provider: "Black Forest Labs",
      description: "Image generation model for prompt-driven visuals, art direction, and design exploration.",
      capabilities: ["text-to-image", "image generation", "creative generation"]
    },
    "Lightricks/LTX-2.3": {
      displayName: "LTX 2.3",
      provider: "Lightricks",
      description: "Video generation model for text-to-video and reference-guided motion workflows.",
      capabilities: ["text-to-video", "image-to-video", "video generation"]
    },
    "Wan-AI/Wan2.2-T2V-A14B-Diffusers": {
      displayName: "Wan2.2 T2V A14B",
      provider: "Wan-AI",
      description: "Text-to-video model for short-form video generation and motion exploration.",
      capabilities: ["text-to-video", "video generation"]
    },
    "OpenMOSS-Team/MOVA-360p": {
      displayName: "MOVA 360p",
      provider: "OpenMOSS Team",
      description: "Video generation model targeting 360p motion outputs.",
      capabilities: ["text-to-video", "video generation", "360p"]
    },
    "HeartMuLa/HeartMuLa-oss-3B-happy-new-year": {
      displayName: "HeartMuLa OSS 3B Happy New Year",
      provider: "HeartMuLa",
      description: "Music generation model for prompt-based audio and song creation workflows.",
      capabilities: ["music generation", "audio generation"]
    }
  }
};
