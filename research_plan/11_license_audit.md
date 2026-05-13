# Tech Stack & License Audit

## 🚨 Critical Issues First

### YOLO-Pose (Ultralytics YOLOv8 / YOLO11) — **RESOLVED: SWITCHED TO RTMPOSE**

Initially, YOLO-Pose was considered as the primary pose model, but it has a serious licensing problem. Ultralytics offers two licensing options: the AGPL-3.0 license for open-source/research use, and a paid Enterprise License for commercial use. Because AGPL-3.0 is highly restrictive and requires open-sourcing the entire application, and the Enterprise License introduces an unpredictable business cost, YOLO-Pose is blocked for this project's commercial B2B SaaS model.

**Resolution:** The project has officially switched to **RTMPose** (OpenMMLab). RTMPose is released under the **Apache 2.0 License**, which is fully permissive for commercial use. Furthermore, RTMPose is specifically designed for high-motion sports scenarios, making it an excellent technical fit alongside resolving the licensing blocker.

### Depth Anything V2 — **RESOLVED: V2 SMALL IS SAFE**

Depth-Anything-V2-Small is under the Apache-2.0 license. Depth-Anything-V2-Base/Large/Giant models are under the CC-BY-NC-4.0 license.

The plan references "Depth Anything v2" without specifying which size. This is a critical distinction:

*   **Small model only** → Apache 2.0 → ✅ commercial use allowed
*   **Base / Large / Giant** → CC-BY-NC-4.0 → ❌ **No commercial use permitted**

The current best commercially allowed model according to the original project's licensing terms is the V2 Small model.

There is also a secondary concern that has been raised by the community: while the model weight itself is Apache 2.0, the "data-derived" license risk is a critical concern for commercial deployment — specifically whether any non-commercial training datasets flow through into the Small model's weights.

**Resolution:** Legal analysis confirms that using the pre-trained Depth-Anything-V2-Small model strictly for inference within the application is a typical commercial practice under the Apache 2.0 license. Since the application does not redistribute or train on the original datasets, the risk profile is extremely low. The project will proceed with Depth-Anything-V2-Small. Ensure that the Apache 2.0 license and model attribution are included in the application.

---

## 🟡 Watch-List Items

### FFmpegKit — **Usable with Compliance Requirements**

FFmpegKit library and build scripts are licensed under LGPL v3.0. FFmpeg libraries created by FFmpegKit are licensed under LGPL v3.0 by default. However, if the `--enable-gpl` flag is used during compilation, then GPL licensed parts are enabled and FFmpeg becomes subject to GPL v3.0.

LGPL v3.0 permits commercial use, but with obligations. The most important part is that users of the commercial application should be able to and allowed to replace FFmpegKit library with another version. It can be hard to achieve that in Apple App Store and Google Play Store, so be aware of this situation. When static LGPL libraries are used, developers must either publish their commercial application source code under LGPL v3.0 or provide the application in an object format so that users can modify and relink.

This is a real practical headache for App Store/Play Store distribution. The standard solution is dynamic linking, but this is often not compatible with App Store distribution rules.

**Recommended action:** Use the default LGPL build (never enable `--enable-gpl`). Consult a lawyer on the App Store dynamic linking exception. Alternatively, consider **MediaInfo** for metadata and a purpose-built Swift/Kotlin video trimming library to avoid FFmpeg entirely for basic clip operations.

### MoveNet (Google / TensorFlow Hub) — **Usable, but Verify**

Except as otherwise noted, the content of this page is licensed under the Creative Commons Attribution 4.0 License, and code samples are licensed under the Apache 2.0 License. The TF.js models and TFLite binaries appear to be under Apache 2.0, and Google has widely deployed MoveNet for commercial fitness applications without restriction. However, the TF Hub model page itself doesn't prominently state "Apache 2.0" for the model weights — the Apache reference applies to the code samples. You should explicitly verify the model card on TF Hub before commercial deployment.

**Recommended action:** Confirm with Google's TF Hub terms directly, but this is very likely clean for commercial use given Google's stated intent ("live fitness, health, and wellness applications").

---

## ✅ Clean Components

| Component | License | Commercial? | Notes |
| :--- | :--- | :--- | :--- |
| **ONNX Runtime** | MIT License | ✅ Yes | Zero restrictions |
| **Transformers.js** | Apache 2.0 | ✅ Yes | Library is clean; individual model licenses still apply per-model |
| **TensorFlow Lite** | Apache 2.0 | ✅ Yes | Framework is clean |
| **CoreML** | Apple proprietary | ✅ Yes | Included in iOS SDK, no separate license |
| **Flutter** | BSD 3-Clause License | ✅ Yes | Fully permissive |
| **SQLite** | Public Domain | ✅ Yes | No restrictions whatsoever |
| **Realm (MongoDB)** | Apache 2.0 | ✅ Yes | Core library is clean |
| **WebGPU / WASM** | Browser/W3C standard | ✅ Yes | Not a licensed product |

---

## Recommended Replacements

### For YOLO-Pose (if you want to avoid the Enterprise License cost):

**RTMPose** (OpenMMLab) — Apache 2.0, fully commercial, specifically designed for high-motion sports scenarios, outperforms MoveNet Thunder on difficult poses. Available as ONNX. This is your best option.

**ViTPose** — Apache 2.0, ONNX-exportable, strong on fast-motion, good COCO keypoint coverage.

**MoveNet Thunder** — Apache 2.0 (verify), excellent mobile performance, Google-supported.

### For Depth (if V2 Small proves insufficient):

**MiDaS v2.1 Small** — MIT License, clean for commercial use, well-supported on mobile via ONNX, adequate for the relative depth/stabilization use case described.

---

## Summary of License Risk by Priority

| Risk Level | Component | Issue |
| :--- | :--- | :--- |
| 🟢 Resolved | YOLO-Pose (Ultralytics) | Switched to RTMPose (Apache 2.0) to avoid AGPL-3.0 |
| 🟢 Resolved | Depth Anything V2 Small | Confirmed Apache 2.0 is safe for inference use case |
| 🟠 Significant | Depth Anything V2 Base/Large/Giant | CC-BY-NC-4.0 — no commercial use allowed |
| 🟡 Manageable | FFmpegKit | LGPL v3.0 App Store compliance is complex but solvable |
| 🟡 Verify | MoveNet model weights | Likely Apache 2.0 but verify on TF Hub model card |
| 🟢 Clean | Everything else | ONNX Runtime, Flutter, SQLite, Realm, Transformers.js, CoreML, TFLite |
