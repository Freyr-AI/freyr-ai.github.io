# Freyr Model List Playground

This hidden page is an internal model catalog and API smoke-test playground for `test.token-exchange-ai.com`.

## Access

- The page is intentionally `noindex`.
- API origin is fixed to `https://test.token-exchange-ai.com`.
- Request headers are entered by the operator and stored only in browser local storage.
- `/models` requires an `Authorization` header. Cloudflare Access headers may also be required.

## Playground Layout

- Opening a model launches a near-full-screen foreground playground window.
- The foreground window has an `X` close button in the top-right corner.
- The left side of the window is ordered as prompt input, run controls, then response.
- Model selection, model parameters, and request preview are on the right side.
- Request preview can be switched between curl, Python, and TypeScript examples.
- While a request is running, the Run request button is disabled and the previous response is cleared.
- The response panel shows `Generating...` until the API response and any generated media URL are ready.
- Default prompts are scenario-oriented smoke-test prompts for each modality.
- Image generation starts with `Images = 10` and `Steps = 10`.
- Wan2.2 T2V A14B is text-to-video only, so the reference image upload control is hidden for that model.
- MOVA 360p uses `352x640` as its default playground size and shows queued job details while waiting for the output file URL to become readable.
- Qwen3.5 exposes a Reasoning checkbox that maps to `chat_template_kwargs.enable_thinking` in the chat request body.

## Model Capability Source

Model capability badges and feature hints are local frontend metadata in `MODEL_META` inside the active `model-list/app-playground-*.js` file. The live `/api/native/v1/model/info` response is used for model IDs and pricing fields, but it does not currently provide detailed capability metadata. Unknown models fall back to category inference from the model ID.

## Media Preview And Download

Image, music, and video endpoints may return either inline `data:` URLs or remote output URLs.

Remote media preview uses direct browser media loading:

- Images render through `<img src>`.
- Audio renders through `<audio src>`.
- Video renders through `<video src>`.

Generated file URLs under paths such as `/api/native/files/images/...` are configured for direct browser access. Preview and download links should use those returned URLs directly rather than adding `Authorization` or Cloudflare Access headers.

For generated image, audio, and video responses, the playground polls returned media URLs with native browser media loading before rendering the final response. This covers slower file-backed generation where the API may return a URL before the browser can load the file.
Media URL polling can wait up to two hours for slower queued video jobs.

The download button opens the returned media URL directly. If the browser cannot download inline media, the URL should still be usable in a new tab or through the browser's native save controls.

Media outputs show only preview controls and download buttons. Raw media URLs are intentionally hidden from the result panel.

## Pricing Page Convention

The public pricing page keeps token pricing only for text models. Image, music, and video model pricing is currently displayed as `Negotiable` until commercial terms are finalized.

Current public pricing categories are:

- Text: DeepSeek V4 Pro, DeepSeek V4 Flash, Qwen3.5 35B A3B FP8, and Nemotron 3 Nano Omni 30B Reasoning.
- Image: FLUX.2 Dev.
- Music: HeartMuLa OSS 3B Happy New Year.
- Video: LTX 2.3, Wan2.2 T2V A14B, and MOVA 360p.

Zero, missing, or unavailable token costs are displayed as `Negotiable` instead of a zero-dollar token price.
