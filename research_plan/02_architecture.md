A **Local-First** data architecture is a design paradigm where the primary copy of application data—and the logic required to process it—resides on the user’s local device (specifically, a desktop or laptop computer) rather than a remote server. In this model, the network is treated as an optional synchronization layer rather than a constant requirement for functionality.

For a high-performance video analysis application, this architecture leverages the superior processing power of laptops/desktops to ensure sub-millisecond response times, rapid clip generation, and ironclad data privacy.

---

## Core Pillars of the Architecture

### 1. Local Device Sovereignty & Storage

Unlike cloud-centric apps that treat the browser or mobile app as a "thin client," a local-first app treats the desktop/laptop as the **Source of Truth**.

*
**Persistent Local Database:** High-resolution video and performance metrics are stored in local engines like **SQLite** or **Realm** by default. Crucially, the database stores the **raw per-session metric distributions (variance across attempts)**, not just session averages. This allows coaches to track longitudinal consistency.


*
**Asset Management:** Large video files are processed and "pruned" locally into short, manageable clips. The system groups these clips by skill without ever uploading raw, sensitive footage to a server.



### 2. Local Hardware Inference

The "intelligence" of the app—auto clip detection, pose tracking, and depth stabilization—happens entirely on the local hardware.

*
**Deferred Batch Processing & Hardware Acceleration:** The app utilizes the laptop/desktop's **GPU** (via WebGPU and Transformers.js) to perform calculations. Crucially, heavy pose inference is NOT real-time. By moving to a deferred batch processing model (extracting fast clips first, then running deeper pose analysis in the background), we unlock the ability to use higher-quality models (like RTMPose-m or RTMPose-l) without thermal throttling or performance stuttering.


*
**The Role of Depth Sensing (Stabilization, Not Metric Reconstruction):** Lifting 2D video into 3D space from a single camera introduces significant depth ambiguity. Instead of trying to use depth for exact metric distances (which is unreliable), the architecture integrates a Depth Map model (e.g., **Depth Anything v2 Small** or **MiDaS v2.1 Small**) to provide **relative geometry and stabilization**. It is used to:
    * Reduce joint jitter and improve temporal consistency.
    * Separate limbs from the background (handling occlusion).
    * Determine approximate relative body configurations (e.g., are knees in front of the torso?).
    * Estimate landing planes and relative floor height.


*
**Asynchronous Workflow:** Because data doesn't travel to a server and back, the coach receives immediate feedback and instant clip extraction (Pass 1) while still on the floor. Deeper pose estimation (Pass 2) and constraint smoothing (Pass 3) run seamlessly in the background over a few minutes.



### 3. Privacy by Design

This architecture serves as a proactive guardian for sensitive environments like gymnastics clubs.

*
**Data Isolation:** Performance data, analysis notes, and training videos never leave the device, satisfying the privacy concerns of parents and regulatory requirements.


*
**Offline Resilience:** The app remains 100% functional in "shielded" environments or gym facilities with poor Wi-Fi connectivity.



---

## Technical Stack for Local-First Execution

| Layer | Technology | Role in Local-First |
| --- | --- | --- |
| **Data Logic** | **WASM / Transformers.js** | Runs complex logic (like temporal smoothing algorithms) at near-native speeds in the browser/client. |
| **Inference (Pose)** | **ONNX / RTMPose** | Offloads pose estimation to the GPU, extracting 2D keypoints efficiently in a deferred batch pass (e.g., RTMPose-m or RTMPose-l). |
| **Inference (Depth)**| **Depth Anything V2 Small** | Generates relative depth maps used for multi-frame depth stabilization and occlusion handling. (Must be Small model to comply with Apache 2.0 license). |
| **Storage & Video** | **SQLite / FFmpegKit** | Manages the local relational data and performs frame manipulation (auto-clipping) without cloud APIs. (Note: use LGPL version, never `--enable-gpl`). |
| **Sync (Optional)** | **Local Network Transfer** | Simple QR-code or local network transfer for syncing data (e.g., sharing a session to another coach's device). |

## Revised Processing Model

```
Video Import
    → Pass 1 (fast): Motion detection + auto-clip extraction   [seconds]
    → Pass 2 (slow): Full pose estimation per clip             [minutes]
    → Pass 3: Constraint engine smoothing + metric calculation [seconds]
    → Ready for review
```

## Why it Matters for Gymnastics

In Men's Artistic Gymnastics (MAG), coaching requires rapid iteration. A local-first approach ensures that the app can process high frame rate video instantly, organize clips automatically (Pass 1), and allow a coach to perform side-by-side comparisons of attempts without waiting for large video files to upload, process, and return from the cloud. The deferred background analysis (Pass 2 & 3) ensures deep tracking without interrupting the live coaching session. This transforms the app from a passive recording tool into an **active coaching assistant**.
