1. **Update `CaptureVideo` to include an option for analysis mode.**
   - Add a `mode` selector to the `CaptureVideo` component (e.g. Fast, Detailed).
   - "Fast" will use MoveNet (faster, without depth).
   - "Detailed" will use RTMPose/BlazePose + Depth (current, slower but accurate).
   - Update `onVideoCaptured` prop to pass the selected analysis mode: `(file: File, apparatus: string, analysisMode: 'fast' | 'detailed') => void`.

2. **Update `App.tsx` and `PipelineManager` to accept the `analysisMode`.**
   - Update `handleVideoCaptured` in `App.tsx` to receive the `analysisMode` and pass it to `PipelineManager.startJob`.
   - Update `startJob` in `PipelineManager` to save the `analysisMode` in the `VideoProcessingJob` object.

3. **Update `PipelineManager` pass 2 to conditionally load models and execute depth extraction.**
   - If `job.analysisMode === 'fast'`, do not load the depth model and do not run `depthExtractor`.
   - For 'fast' mode, change the pose estimation call to use MoveNet (via `@tensorflow-models/pose-detection`).
   - For 'detailed' mode, use the existing RTMPose and `onnx-community/depth-anything-v2-small`.

4. **Implement MoveNet Pose Extractor.**
   - Update `src/inference.ts` to support loading and running MoveNet.
   - We might need to handle MoveNet directly in `PoseExtractor` if it's easier due to TFJS being a direct import, but adding it to `InferenceEngine` is cleaner. Since TFJS supports WASM/WebGL directly on the main thread, it fits well where RTMPose currently sits.

5. **Pre-commit checks.**
   - Follow instructions from `pre_commit_instructions` tool.
