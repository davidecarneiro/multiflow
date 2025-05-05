<img src="assets/mf-logo.png" alt="MultiFlow Logo" width="300"/>

# ℹ️ What is MultiFlow?

**MultiFlow** is a tool built to simulate **real-time industrial data streams**, allowing developers and researchers to test machine learning algorithms in a **controlled and risk-free environment**.  
Instead of waiting for unpredictable real-world data — or risking disruptions in live systems — MultiFlow provides a virtual space to **prototype, validate, and fine-tune** ML solutions with realistic streaming behavior.

By mimicking operational conditions without the actual risks, MultiFlow helps streamline the **optimization of industrial processes** while minimizing computational overhead and experimentation time.

## 🚀 Key Features

- **Stream any dataset** in real time with fully customizable parameters like lines-per-second or stream duration.
- **Start, pause, or replay** your simulations on demand — perfect for iterative testing.
- **Create and plug in custom Python algorithms ("Apps")** to consume the stream and generate live outputs.  
  *(Note: Apps must follow the MultiFlow structure and meet streaming compatibility requirements. See the [Apps Tutorial](#) for details.)*
- **Test multiple versions** of your Apps ("Instances") effortlessly — tweak parameters, switch input streams, and compare results.
- **Get real-time dashboards via Grafana** for each Instance, giving you immediate feedback on algorithm performance.  
  *(Note: Grafana setup is required before first use.)*
