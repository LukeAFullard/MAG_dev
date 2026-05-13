To ensure the product is truly valuable in a daily coaching environment, it must include practical extensions that give coaches ultimate control and provide robust tools for communication. AI must augment the coach, never replace or dictate to them.

---

## I. Manual Annotation Tools (The Override Principle)

AI will inevitably fail—a limb will be occluded, or tracking will jitter during a complex twist. Professional tools survive because users can override the system. Manual tools are not a fallback; they are a core feature for building trust.

* **Point Editing & Correction:** The ability for a coach to pause the video, click on an incorrectly tracked joint, and manually drag it to the correct position. The system should then interpolate this correction across adjacent frames.
* **Frame Stepping & Trimming:** High-precision, frame-by-frame scrubbing controls (e.g., using arrow keys or a jog wheel UI) to find the exact moment of impact. Coaches can manually adjust the start and end points of auto-detected clips.
* **Coach Overlays:** Drawing tools (lines, freehand, angles, circles) allowing a coach to draw directly on the video frame.
* **Tagging & Notes:** Adding text notes or custom tags (e.g., "Good height", "Needs tighter tuck") to specific clips or specific frames within a clip.

## II. Advanced Side-by-Side Comparison

Comparative review is often more valuable than absolute metric analysis. Comparing an athlete to their past self or to an ideal model is a foundational coaching technique.

* **Timeline Synchronization:** The crucial ability to sync two different videos to a common "anchor frame" (e.g., syncing a vault attempt from today and one from last month so that the moment the feet hit the springboard happens at the exact same time on playback).
* **Overlay Mode:** Placing two videos on top of each other with adjustable transparency, allowing a coach to see exactly where a trajectory deviates.
* **Pro-Reference Import:** Allowing coaches to import external videos of elite gymnasts to use as a side-by-side comparison standard.

## III. Environmental Resilience: The "Chalk & Noise" Filter

Gymnastics facilities are notoriously difficult environments for computer vision due to high-contrast lighting, reflective mats, and airborne chalk dust.

* **Dynamic Background Subtraction:** Utilizing simple background subtraction or bounding-box logic to ignore other gymnasts moving in the background or reflections on the apparatus, ensuring the AI stays locked onto the primary athlete.
* **Audio-Visual Fusion:** Because the environment is loud, integrating simple audio-threshold detection (e.g., the loud "thwack" of hitting a springboard or vault table) to help the auto-clipping algorithm pinpoint the start of an explosive movement.

## IV. Secure Peer-to-Peer (P2P) Synchronization

A "Local-First" architecture requires a way to share data between a laptop/desktop and a coach’s tablet without relying on unstable gym Wi-Fi or a central cloud server.

* **Opportunistic Sync:** Using local network transfer (Wi-Fi Direct or simple QR-code based local IP sharing) to quickly transfer an annotated clip or a session analytics dashboard from the main analysis laptop to a tablet for the coach to show the athlete on the floor.
* **Export Versatility:** Enabling the export of raw video, annotated clips (with drawings and pose data burned into the video), or simple PDF reports of session analytics, ensuring the data can leave the app in universally readable formats.

### The "Hardware Handshake" Checklist

Before full deployment of these features, run an on-device benchmarking suite to ensure the local laptop/desktop hardware can maintain performance:

1. **Latency Check**: Ensure auto-clip detection and extraction takes seconds, not minutes, after a video is imported.
2. **Resource Profile**: Monitor memory usage during side-by-side playback of two 60FPS high-definition videos with pose overlays.
3. **UI Responsiveness**: Ensure frame-stepping and manual annotation tools remain instantly responsive without lag.