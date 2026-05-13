# Model Updates (2025 Review)

To maintain the "best gymnastics app in the world" status, the project has updated its recommended AI models to the latest state-of-the-art versions that maintain commercial compliance.

## 1. Depth Estimation: Depth Anything 3 (DA3)
- **Previous:** Depth Anything V2 Small
- **Update:** **Depth Anything 3 (DA3) Small**
- **License:** Apache 2.0
- **Why:** DA3 significantly outperforms DA2 in monocular depth estimation. It introduces a unified depth-ray representation that improves spatial consistency, which is critical for gymnastics landing analysis and floor plane estimation.
- **Hugging Face:** `depth-anything/DA3-SMALL`

## 2. Pose Estimation: RTMW
- **Previous:** RTMPose-m / RTMPose-l
- **Update:** **RTMW-m / RTMW-l** (Real-Time Multi-person Whole-body)
- **License:** Apache 2.0
- **Why:** RTMW is the next evolution in the RTMPose family, specifically optimized for 2D/3D whole-body pose estimation. It achieves superior accuracy (exceeding 70 mAP on COCO-Wholebody) while maintaining real-time efficiency. This is ideal for capturing fine-grained gymnastics movements including hand and foot orientation.
- **Hugging Face:** `openmmlab/rtmw-l`

## 3. Implementation Impact
- **Pass 2 (Pose):** The pipeline will prioritize RTMW-m for the deferred batch pass to ensure high-fidelity skeletal tracking.
- **Pass 3 (Constraints):** DA3-Small will provide the relative geometry needed for landing stability and occlusion handling.
- **Transformers.js:** Ensure compatibility with the newer DINO-based backbones used in DA3.
