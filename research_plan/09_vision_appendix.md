# Vision Appendix: Automated Skill Recognition & D-Score

The features described in this document represent a multi-year research vision and are explicitly excluded from the 2-year product roadmap and investor-facing timelines. Achieving these capabilities requires solving profound challenges in temporal action recognition and data labeling at scale.

---

## 1. Automated Skill Recognition (ASR)

While Phase 1 and 2 track joint angles and apply deductive rules, ASR identifies the **identity** of the movement itself (e.g., distinguishing a double layout from a double pike).

* **The Core Challenge:** Automating skill recognition is a research-level problem. There are no open, labeled datasets for FIG gymnastics elements. Standard temporal sequence models (Action Recognition Transformers) require hundreds of hours of labeled gymnastics video per apparatus to train reliably.
* **Proposed Implementation with Transformers.js**: Utilize temporal sequence models to analyze the trajectory of the 3D landmarks over time.
* **Gymnastics Grammar**: Develop a logic layer that understands the sequence of common high-value routines, ignoring rare elements to minimize the dataset requirements and editorial burden early on.

## 2. The Virtual Judge: D-Score (Difficulty)

Once skills are reliably identified, the app could automate the Difficulty component of gymnastics scoring.

* **D-Score Summation**: The app would automatically sum the difficulty values of recognized elements to calculate the start value of a routine as it is performed.
* **Element Mapping**: Each recognized skill would be mapped to its specific FIG difficulty value (e.g., A-value, D-value) using a pared-down local SQLite database that is easier to maintain.

## Feasibility and Dependencies

Integrating the FIG Code of Points for D-Score calculation is ranked as a **Multi-Year Research Feasibility** because it requires:
1. **Academic Partnerships**: Likely partnering with universities or national governing bodies to secure funding and access to video.
2. **Data Labeling Pipeline**: A massive effort to build a proprietary dataset of labeled skills.
3. **Model Fine-Tuning**: Dealing with the severe motion blur and self-occlusion present in high-level gymnastics, which degrades monocular 3D tracking.

This should be treated strictly as an aspirational goal until the MVP and Phase 1 have demonstrated product-market fit.