window.FREYR_MODEL_CATEGORIES = {
  defaultCategory: "text",
  text: [
    "deepseek-ai/DeepSeek-V4-Pro",
    "nvidia/Qwen3.5-397B-A17B-NVFP4",
    "deepseek-ai/DeepSeek-V4-Flash"
  ],
  image: [],
  featured: [
    "nvidia/Qwen3.5-397B-A17B-NVFP4",
    "deepseek-ai/DeepSeek-V4-Pro",
    "deepseek-ai/DeepSeek-V4-Flash"
  ],
  overrides: {
    "deepseek-ai/DeepSeek-V4-Pro": {
      description: "DeepSeek text model for high-quality reasoning, analysis, and enterprise assistant workloads.",
      capabilities: ["chat", "reasoning", "code"]
    },
    "nvidia/Qwen3.5-397B-A17B-NVFP4": {
      description: "NVIDIA-hosted Qwen text model optimized for large-scale chat and production inference.",
      capabilities: ["chat", "long context", "cache"]
    },
    "deepseek-ai/DeepSeek-V4-Flash": {
      description: "Fast DeepSeek text model for low-latency chat, summarization, and interactive workflows.",
      capabilities: ["chat", "fast", "cost efficient"]
    }
  }
};
