Phase 2 builds upon the reliable clip extraction and visualization of Phase 1 by making the underlying tracking significantly smarter, smoother, and more context-aware. It explicitly avoids jumping into "true biomechanics" or "automated judging," focusing instead on drastically reducing AI errors.

---

## Phase 2: Enhanced Motion Intelligence

### 1. Multi-Frame Depth Stabilization

Single-camera depth is notoriously noisy and inconsistent frame-to-frame. Phase 2 fundamentally changes how depth is utilized.

* **Temporal Depth Consistency:** Instead of treating each frame independently, the system analyzes sequences of frames. In gymnastics, with its fast motion, blur, and frequent self-occlusion (e.g., tucks), understanding the temporal flow is critical.
* **Relative Body Configuration:** Multi-frame depth analysis helps the system confidently answer relative spatial questions (e.g., "Is the gymnast piked or tucked?", "Are the arms crossing in front of or behind the torso?"), which is far more reliable than extracting absolute metric distances.

### 2. Advanced Temporal Smoothing

The biggest problem in sports AI is frame-to-frame instability (jitter). Phase 2 introduces robust algorithms to smooth the data without destroying the peaks of fast motion.

* **Filtering Techniques:** Implementing Kalman filtering and trajectory smoothing across the 2D keypoints and relative depth estimations.
* **Temporal Transformers:** Utilizing lightweight temporal sequence models that understand the "flow" of human movement, allowing the system to accurately predict limb positions even when they are temporarily occluded during a rapid spin or flip.
* **The Result:** Trajectory traces look like smooth arcs rather than jagged lines, dramatically increasing coach trust in the data.

### 3. Apparatus-Aware Constraints

A massive opportunity to improve stability is teaching the system about the environment it is observing.

* **Environmental Logic:**
    * The floor is a rigid plane; feet cannot pass through it.
    * The high bar is a fixed horizontal line in space; the gymnast's hands must pivot around it.
    * The vault table has fixed dimensions and a known surface.
* **Optimization Enforcements:** By feeding these fixed environmental constraints into the tracking algorithm, the AI's "search space" is drastically reduced. If the AI "thinks" a hand is floating 2 feet above the high bar during a giant swing, the apparatus constraint corrects it back to the bar.

### 4. Human Biomechanical Constraints

Similar to apparatus constraints, the system is upgraded to enforce the rules of human anatomy.

* **Skeletal Rules:**
    * Limb lengths are fixed (proportions remain stable).
    * Joints have maximum angle limits.
    * Motion is continuous (teleportation is physically impossible).
* **Optimization:** The tracking engine uses these constraints to penalize impossible poses, further smoothing the data and ensuring realistic motion continuity even in highly blurred frames.

### Summary

By the end of Phase 2, the application transforms from a "good visualizer" into an incredibly robust tracking engine. It rarely loses track of the gymnast, handles occlusion gracefully, and produces buttery-smooth trajectory data, all while running locally and avoiding dangerous claims of medical-grade accuracy.