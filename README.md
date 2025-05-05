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
---

## 🛠️ Installation

To run MultiFlow locally, make sure you have the following installed:

* [Docker](https://www.docker.com/)
* [Node.js](https://nodejs.org/)

### 1. Clone the Repository

Open a terminal and clone the repo:

```bash
git clone https://github.com/davidecarneiro/multiflow.git
```

### 2. Install Node Dependencies

Navigate to the `app/` folder and install dependencies in the following subfolders:

```bash
cd multiflow/app

cd node
npm install

cd ../react-app
npm install

cd ../ws
npm install
```

### 3. Start the Backend with Docker

In a **new terminal**, run:

```bash
docker compose up
```

> ⚠️ Make sure Docker is running in the background before you run this command.

This will pull and launch the required containers.

### 4. Verify the Containers

Check that all containers are up and running. If any are failing, try restarting them or double-check if additional dependencies are needed.

### 5. Start the Frontend (React)

The React frontend is **not yet containerized** to simplify development during active changes.
To launch it manually:

```bash
cd multiflow/app/react-app
npm start
```

This should open the app in your browser at `http://localhost:3000`.

---

🎉 You’re all set! Happy prototyping! 🤓
(And hey — if things feel confusing, check out the [Quick Start Guide](#) to get up to speed quickly.)
