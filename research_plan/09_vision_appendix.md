# Vision Appendix: Long-Term Research Problems

The features described in this document represent a multi-year research vision. They are explicitly excluded from the core product roadmap. Attempting to build these features too early represents a dangerous time sink. The focus must remain on reliable, practical coaching tools first.

---

## 1. Automated Skill Recognition (ASR) & Judging

Automating the role of a gymnastics judge (D-Score and E-Score calculation) requires profound breakthroughs in temporal action recognition.

* **The Core Challenge:** There are no open, labeled datasets for FIG gymnastics elements. Standard temporal sequence models require hundreds of hours of labeled gymnastics video per apparatus to train reliably.
* **The "Virtual Judge":** Once skills are reliably identified, mapping them to the FIG Code of Points and automatically summing difficulty values or flagging execution deductions is a massive editorial and data-labeling burden.
* **Why Delay:** Coaches need workflow tools today; they do not need an imperfect AI judging their athletes incorrectly, which destroys trust.

## 2. Full 3D Skeletal Reconstruction & True Physics Simulation

Extracting medical-grade biomechanical data from single-camera video is an "ill-posed problem" fraught with depth ambiguity.

* **The Core Challenge:** Monocular video cannot robustly support exact force estimation, precise joint torque calculations, or exact real-world distances without highly controlled, multi-camera environments and calibration markers.
* **Physics Simulation:** Building a true physics engine that calculates exact moments of inertia or ground reaction forces based on video requires a level of precision that standard webcams and smartphones cannot provide in a chaotic gym environment.
* **Why Delay:** "True 3D" promises are technically and legally dangerous. Focus instead on relative geometry and consistency tracking.

## 3. Advanced Predictive Injury Modeling

Moving from "workload monitoring" to "injury prediction."

* **The Core Challenge:** Predicting injuries requires massive datasets correlating specific biomechanical deviations with actual injury occurrences over years.
* **Wearable Integration:** Integrating with Apple HealthKit or Garmin APIs to combine HRV, sleep data, and tracking data to build individual susceptibility models.
* **Why Delay:** The medical and legal implications of predicting (or failing to predict) an injury are immense.

## 4. Multi-Athlete Scene Analysis & Apparatus-Wide Automation

* **The Core Challenge:** Tracking multiple athletes simultaneously across a crowded gym floor, determining who is performing what skill on which apparatus without manual coach input.
* **Why Delay:** It introduces massive computational overhead and complexity for marginal workflow gains over a simple manual "Apparatus Selection" toggle.

## 5. Advanced Generative AI Coaching

* **The Core Challenge:** An AI system that not only tracks the body but generates natural language coaching cues (e.g., "Tell the athlete to drop their shoulders earlier in the swing").
* **Why Delay:** Generative models are prone to hallucination. A wrong coaching cue in gymnastics can lead to catastrophic injury. Coaches must remain the sole voice of technical instruction.

---

### Feasibility and Dependencies

Pursuing these research goals requires:
1. **Academic Partnerships**: Partnering with universities or national governing bodies to secure funding and access to massive video datasets.
2. **Data Labeling Pipeline**: A massive effort to build a proprietary dataset of labeled skills and deductions.
3. **Multi-Camera R&D**: Moving beyond the local-first, monocular limitation to process synchronized multi-angle video.

These should be treated strictly as aspirational goals until the core product has demonstrated undeniable product-market fit.