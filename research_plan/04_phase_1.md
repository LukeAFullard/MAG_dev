Phase 1 focuses on delivering immediate, reliable utility to coaches by solving their biggest workflow bottleneck: organizing and reviewing video footage. It avoids unfulfillable "true 3D" promises and instead establishes a robust 2D/relative-geometry foundation.

---

## Phase 1: Reliable Core (Months 1–4)

### 1. Auto Clip Detection & Extraction

This is the highest-value, most achievable feature for a coach's daily workflow.

* **The Problem:** Coaches waste hours scrolling through long practice recordings to find specific attempts.
* **The Solution:** The system automatically processes a raw video file or live stream, detects the athlete, identifies movement start/end points using pose velocity and motion thresholds, and trims attempts into distinct clips.
* **Organization:** Clips are automatically grouped by broad categories (e.g., "Vaults", "Tumbling Passes", "Dismounts") based on apparatus constraint markers or simple motion profiles.

### 2. 2D Pose Tracking & Overlay

A visual foundation for movement analysis, explicitly marketed as "consistency tracking" rather than medical-grade measurement.

* **Tracking Model:** Deploying robust 2D keypoint extraction (e.g., YOLO-Pose via Transformers.js WebGPU) running locally.
* **Visualizations:** The player displays skeletal joints, major joint angles, a Center of Mass (COM) approximation, and trajectory traces (e.g., the path of the hips during a flip).
* **Relative Depth (Stabilization):** Utilizing lightweight monocular depth maps strictly to reduce joint jitter, handle occlusion, and improve the temporal consistency of the 2D tracking.

### 3. Side-by-Side Comparison Tools

A killer feature that leverages the power of comparative analysis, which is far more forgiving of slight AI inaccuracies than absolute measurement.

* **Workflows:**
    * Comparing an athlete today vs. last month.
    * Comparing a successful attempt against a failed attempt.
    * Comparing the athlete to an imported "ideal reference" video.
* **Metrics:** Focuses on timing differences (body angle timing, tuck duration), landing deviation, and rotation height relative to the reference.
* **Synchronization:** Tools to manually or automatically sync two clips to a specific "anchor frame" (e.g., the moment feet leave the floor).

### 4. Specialized Landing Analysis

Landing quality impacts execution scoring, consistency, and injury prevention. Because the ground plane provides a strong physical constraint, this is an ideal application for monocular video analysis.

* **Metrics Evaluated:**
    * **Landing Stability:** Tracking time-to-stabilization.
    * **Step Count & Lateral Drift:** Automatically quantifying movement after impact.
    * **Knee Collapse Tendency:** Monitoring the minimum knee angle upon impact to flag potentially dangerous or heavily deducted "soft" landings.
    * **Torso Lean:** Angle of the trunk relative to vertical upon impact.

### 5. Session Analytics

Transforming raw clips into actionable, daily coaching insights.

* **Dashboards:** Simple visualizations showing attempts per skill category, success/failure tagging (manual or semi-automated), and consistency scores across a session.
* **Video-Linked Drill-Down:** Tapping any data point on a graph instantly opens the specific video clip of that attempt.
* **Longitudinal Tracking:** Tracking landing stability or consistency scores across weeks to flag fatigue or monitor progression.

### 6. Manual Annotation & Correction Tools

Trust requires control. The AI will fail occasionally, and professional tools must allow for human override.

* **Frame Stepping:** High-precision, frame-by-frame scrubbing.
* **Correction:** The ability to manually correct an AI-tracked joint point or edit the start/end time of an auto-generated clip.
* **Tagging & Notes:** Adding manual coach notes, drawing tools (lines, angles, circles) over specific frames, and custom tagging (e.g., "Needs tighter tuck").

### Realistic Milestone

By the end of Phase 1, the app operates as a powerful "Personal Coaching Assistant" on a laptop. A coach can record an hour of practice, drop the file into the app, and instantly receive an organized dashboard of trimmed clips, ready for side-by-side comparison, landing evaluation, and annotation—all processed completely offline.