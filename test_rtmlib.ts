import { PoseDetector } from 'rtmlib-ts';

async function main() {
    console.log("rtmlib loaded");
    const detectorConfig: any = {
        backend: 'wasm',
        detModel: 'https://huggingface.co/demon2233/rtmlib-ts/resolve/main/yolo/yolov12n.onnx',
        poseModel: 'https://huggingface.co/demon2233/rtmlib-ts/resolve/main/rtmpose/end2end.onnx'
    };
    const detector = new PoseDetector(detectorConfig);
    await detector.init();
    console.log("detector initialized");
    const arr = new Uint8Array(10 * 10 * 4);
    const results = await detector.detect(arr, 10, 10);
    console.log("Results: ", results);
}

main().catch(console.error);
