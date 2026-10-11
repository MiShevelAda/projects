# Third-party software

This repository includes, unmodified:

- **MediaPipe Tasks Vision 0.10.35** in `vendor/mediapipe/`, by Google, under the Apache License
  2.0 (`vendor/mediapipe/LICENSE`). The bundle and WebAssembly files from the npm package
  `@mediapipe/tasks-vision`.
- **MediaPipe Pose Landmarker (Full)** in `models/pose_landmarker_full.task`, downloaded from
  Google's MediaPipe model storage on 2026-10-09 (sha256
  `4eaa5eb7a98365221087693fcc286334cf0858e2eb6e15b506aa4a7ecdcec4ad`). Its model card and terms are
  linked from https://ai.google.dev/edge/mediapipe/solutions/vision/pose_landmarker.

The coach's voice clips in `assets/voice/` were made with **Kokoro-82M v1.0** (by hexgrad, open
weights under the Apache License 2.0), voice `af_heart`, run with the `kokoro-onnx` Python package
(tools/voice/render.py). Only the recorded clips are in this repository, not the model.
