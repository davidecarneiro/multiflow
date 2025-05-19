<picture>
  <source media="(prefers-color-scheme: dark)" srcset="assets/mf-logo-light.png">
  <source media="(prefers-color-scheme: light)" srcset="assets/mf-logo.png">
  <img alt="MultiFlow Logo" src="assets/mf-logo.png" width="300"/>
</picture>

# ℹ️ What is MultiFlow?

**MultiFlow** is a tool built to simulate **real-time industrial data streams**, allowing developers and researchers to test machine learning algorithms in a **controlled and risk-free environment**.  
Instead of waiting for unpredictable real-world data — or risking disruptions in live systems — MultiFlow provides a virtual space to **prototype, validate, and fine-tune** ML solutions with realistic streaming behavior.

By mimicking operational conditions without the actual risks, MultiFlow helps streamline the **optimization of industrial processes** while minimizing computational overhead and experimentation time.

## 🚀 Key Features

- **Stream any dataset** in real time with fully customizable parameters like lines-per-second or stream duration.
- **Start, pause, or replay** your simulations on demand — perfect for iterative testing.
- **Create and plug in custom Python algorithms ("Apps")** to consume the stream and generate live outputs.  
  *(Note: Apps must follow the MultiFlow structure and meet streaming compatibility requirements. See the [Apps Tutorial](#-apps-in-multiflow) for details.)*
- **Test multiple versions** of your Apps ("Instances") effortlessly — tweak parameters, switch input streams, and compare results.
- **Get real-time dashboards via Grafana** for each Instance, giving you immediate feedback on algorithm performance.  
  *(Note: Grafana setup is required before first use.)*
---

## 🛠️ Installation

To run MultiFlow locally, make sure you have the following installed:

* [Docker](https://www.docker.com/)
* [Node.js](https://nodejs.org/)

#### 1. Clone the Repository

Open a terminal and clone the repo:

```bash
git clone https://github.com/davidecarneiro/multiflow.git
```

#### 2. Install Node Dependencies

Navigate to the `app/` folder and install dependencies in the following subfolders:

```bash
cd multiflow/app
```

```
cd node
npm install
```

```
cd ../react-app
npm install
```

```
cd ../ws
npm install
```

#### 3. Start the Backend with Docker

In a **new terminal**, run:

```bash
docker compose up
```

> ⚠️ Make sure Docker is running in the background before you run this command.

This will pull and launch the required containers.

#### 4. Verify the Containers

Check that all containers are up and running. If any are failing, try restarting them or double-check if additional dependencies are needed.

#### 5. Start the Frontend (React)

The React frontend is **not yet containerized** to simplify development during active changes.
To launch it manually:

```bash
cd multiflow/app/react-app
npm start
```

This should open the app in your browser at `http://localhost:3000`.

##

🎉 You’re all set! Happy prototyping! 🤓
(And hey — if things feel confusing, check out the [Quick Start Guide](#) to get up to speed quickly.)

----

## 📦 Apps in MultiFlow

Apps in Multiflow are Python-based scripts that must have a specific structure, designed to handle specific streaming tasks, implemented in Faust. These can range from basic operations like data aggregation, filtering, or feature extraction, to more advanced algorithms such as detecting concept drift, identifying anomalies, or running machine learning models.

Every App follows a clean and modular structure:

1. **Import Required Libraries**

   * Typical imports include stream processing, machine learning, data manipulation, etc.

   ```python
   import faust
   import pandas as pd
   from influxdb_client import InfluxDBClient
   ```

2. **Set Configurations via Environment Variables**

   * These values are typically provided by the MultiFlow frontend/backend automatically and passed as environment variables.
   * You can still provide default values, which are used only if the frontend hasn't defined them:

   ```python
   APP_NAME = os.getenv('APP_NAME', 'MyApp')  # 'APP_NAME' comes from frontend; 'MyApp' is default fallback
   TOPIC_NAME = os.getenv('TOPIC_NAME', 'my_topic')
   ```

   * Examples of environment configs:
     * App name, topic name, port number
     * Output file name
     * InfluxDB connection data (optional)
     * Model parameters (batch size, threshold, etc.)

3. **Define Custom Parameters**

   * Use env variables or fixed values for:
     * How many samples to use
     * Batch size for analysis
     * Thresholds, time windows, etc.

    ```python
    THRESHOLD_VALUE = float(os.getenv('THRESHOLD', '0.9')) # 0.9 is the default threshold value;
    # THRESHOLD is the variable that receives the configured value
    ```

4. **App Initialization**

   * Set up Faust, connect to Kafka topic, configure any output databases or files.

   ```python
   app = faust.App(APP_NAME, broker='kafka://localhost:9092')
   topic = app.topic(TOPIC_NAME)
   ```

5. **Custom Logic Implementation**

   * The core of your App: what it does with each piece of data.
   * Could be a simple print or a complex model with feedback.

   ```python
   @app.agent(topic)
   async def process(stream):
       async for event in stream:
           print(event)
           # Do stats, ML, alerting...
   ```


6. **Optional Outputs**
   * Write results to:
     * **Logs** (for debugging or monitoring)
     * **Files** (e.g., CSVs)
     * **Databases** (e.g., InfluxDB)
     * **Alerts** (e.g., send notification or trigger some action)

##

Here's a simplified visual breakdown:

<img alt="Apps in Multiflow" src="assets/App-Diagram.png" />

### ✅ Summary

Each App in MultiFlow follows a modular design. You define the logic; MultiFlow takes care of the plumbing — connecting topics, injecting config, managing deployment, and storing results. This makes it easy to reuse and remix logic across different data streams or use cases.

> 💡 Whether you're printing sensor values or detecting drift using a statistical test — you're always following the same structure. That's the power of Apps.

## Acknowledgments

This work has been supported by the European Union under the Next Generation EU, through a grant of the Portuguese Republic's Recovery and Resilience Plan (PRR) Partnership Agreement, within the scope of the project PRODUTECH R3 – "Agenda Mobilizadora da Fileira das Tecnologias de Produção para a Reindustrialização", Total project investment: 166.988.013,71 Euros; Total Grant: 97.111.730,27 Euros. 
