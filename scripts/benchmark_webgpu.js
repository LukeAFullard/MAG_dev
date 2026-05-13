import { pipeline, env } from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers';

// Log utility
function log(message, type = 'info') {
    const logEl = document.getElementById('log');
    const entry = document.createElement('div');
    entry.textContent = `[${new Date().toLocaleTimeString()}] ${message}`;
    if (type === 'error') entry.className = 'error';
    if (type === 'success') entry.className = 'success';
    if (type === 'warning') entry.className = 'warning';

    logEl.appendChild(entry);
    logEl.scrollTop = logEl.scrollHeight;
}

// Check WebGPU support
async function checkWebGPU() {
    const statusEl = document.getElementById('webgpu-status');

    if (!navigator.gpu) {
        const msg = "WebGPU is not supported in this browser.";
        statusEl.textContent = `WebGPU Status: ${msg}`;
        statusEl.className = 'error';
        log(msg, 'error');
        return false;
    }

    try {
        const adapter = await navigator.gpu.requestAdapter();
        if (!adapter) {
            const msg = "WebGPU is supported, but no adapter was found.";
            statusEl.textContent = `WebGPU Status: ${msg}`;
            statusEl.className = 'error';
            log(msg, 'error');
            return false;
        }

        const msg = `WebGPU is supported! (Adapter: ${adapter.name || 'Unknown'})`;
        statusEl.textContent = `WebGPU Status: ${msg}`;
        statusEl.className = 'success';
        log(msg, 'success');

        // Log adapter info if available
        if (adapter.isFallbackAdapter) {
            log("Warning: Using a fallback adapter (software rendering). Performance will be degraded.", "warning");
        }

        return true;
    } catch (e) {
        statusEl.textContent = `WebGPU Status: Error requesting adapter`;
        statusEl.className = 'error';
        log(`Error requesting adapter: ${e.message}`, 'error');
        return false;
    }
}

// Run actual benchmark using Transformers.js
async function runBenchmark() {
    document.getElementById('start-btn').disabled = true;
    log("Starting hardware profile...", "info");

    const hasWebGPU = await checkWebGPU();

    // Enable WebGPU for transformers.js
    if (!hasWebGPU) {
        log("Cannot run full benchmark without WebGPU. Using WASM fallback.", "warning");
    }

    log("Initializing Transformers.js framework...", "info");

    try {
        log("Loading small test model weights (Xenova/resnet-50)...", "info");
        // Use a lightweight model for benchmarking
        // resnet-50 is standard for vision benchmarking
        let classifier = await pipeline('image-classification', 'Xenova/resnet-50', {
            device: hasWebGPU ? 'webgpu' : 'wasm',
        });

        log("Model loaded. Running warmup inference passes...", "info");
        // Dummy image url for testing
        const dummyUrl = 'https://huggingface.co/datasets/Xenova/transformers.js-docs/resolve/main/tiger.jpg';

        // Warmup
        await classifier(dummyUrl);
        await classifier(dummyUrl);

        log("Running 10 benchmark iterations...", "info");

        let times = [];
        for(let i=0; i<10; i++) {
            const start = performance.now();
            await classifier(dummyUrl);
            const end = performance.now();

            const duration = end - start;
            times.push(duration);
            log(`Iteration batch ${i+1}/10 complete: ${duration.toFixed(2)} ms`, "info");
        }

        const avgTime = times.reduce((a, b) => a + b, 0) / times.length;
        const estimatedFps = 1000 / avgTime;

        log("-----------------------------------------", "info");
        log("Benchmark Complete", "success");
        log(`Average Inference Time: ${avgTime.toFixed(2)} ms`, "info");
        log(`Estimated Target FPS: ${estimatedFps.toFixed(1)} fps`, "info");

        if (hasWebGPU) {
            if (estimatedFps > 30) {
                log("Recommendation: Hardware is capable of running RTMPose-l or RTMPose-m.", "success");
            } else if (estimatedFps > 10) {
                log("Recommendation: Hardware is capable of running RTMPose-m or lightweight models.", "warning");
            } else {
                log("Recommendation: Hardware may struggle. Consider RTMPose-nano or offloading.", "error");
            }
        } else {
             log("Recommendation: System requires lightweight WASM models (RTMPose-nano).", "warning");
        }

    } catch (e) {
        log(`Error during benchmark: ${e.message}`, "error");
    }

    document.getElementById('start-btn').disabled = false;
}

document.getElementById('start-btn').addEventListener('click', runBenchmark);

// Initial check on load
window.onload = () => {
    log("Profiler initialized. Ready to test.");
    checkWebGPU();
};
