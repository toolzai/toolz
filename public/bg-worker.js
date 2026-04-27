/**
 * Background Removal Web Worker (ES Module)
 * Uses dynamic import() from CDN to load @huggingface/transformers v3.
 * Must be created with { type: 'module' }.
 */

let segmenter = null;

async function getSegmenter(progressCallback) {
  if (segmenter) return segmenter;

  const { pipeline, env } = await import(
    'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.4.1'
  );

  env.allowLocalModels = false;

  segmenter = await pipeline('image-segmentation', 'briaai/RMBG-1.4', {
    progress_callback: progressCallback,
    device: 'wasm',
  });

  return segmenter;
}

self.addEventListener('message', async (event) => {
  const { image } = event.data;

  try {
    const model = await getSegmenter((x) => {
      self.postMessage({ status: 'progress', data: x });
    });

    const result = await model(image);
    
    // Serialize the RawImage mask for transfer to main thread
    if (Array.isArray(result) && result.length > 0 && result[0].mask) {
      const mask = result[0].mask;
      self.postMessage({
        status: 'complete',
        mask: {
          data: mask.data,
          width: mask.width,
          height: mask.height,
          channels: mask.channels,
        },
      });
    } else {
      self.postMessage({ status: 'error', error: 'Unexpected model output format.' });
    }
  } catch (error) {
    self.postMessage({ status: 'error', error: error.message || String(error) });
  }
});
