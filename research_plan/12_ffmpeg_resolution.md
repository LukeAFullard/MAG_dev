# FFmpeg Licensing Resolution for Mobile

To ensure full compliance with App Store policies and LGPL v3.0 without the complexity of providing object files for relinking, the mobile implementation (Phase 7+) will prioritize:

1. **Native OS APIs:**
   - **iOS:** Use AVFoundation for video trimming, composition, and metadata extraction.
   - **Android:** Use MediaCodec, MediaMuxer, and MediaExtractor.
2. **FFmpeg (Fallback):** If FFmpeg is strictly required for specific codecs, it will be compiled as a dynamic library (shared framework) with LGPL v3.0. A "compliance statement" will be included in the app, and the project will maintain a build system capable of producing relinkable object files if requested.

By prioritizing native APIs, we avoid the LGPL "relinking" headache entirely for the core MVP features (clipping and metadata).
