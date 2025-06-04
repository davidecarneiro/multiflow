import faust
import os
import pandas as pd
from sklearn.ensemble import IsolationForest
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Fetching environment variables and configurations
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = os.getenv('Port', '6066')
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')
influxdb_url = os.getenv('INFLUXDB_URL', 'http://influxdb_server:8086')
influxdb_token = os.getenv('INFLUXDB_TOKEN', 'admin')
influxdb_org = os.getenv('INFLUXDB_ORG', 'multiflow')
influxdb_bucket = os.getenv('INFLUXDB_BUCKET', 'faust_app')

# Setting up Faust and InfluxDB clients
app = faust.App(InstanceName, broker='kafka_server://localhost:9092', web_port=int(InstancePort))
topic = app.topic(StreamTopic)
influx_client = InfluxDBClient(url=influxdb_url, token=influxdb_token, org=influxdb_org)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

# Fetching values for Custom Fields
OutputFileName = os.getenv('OutputFileName', 'AnomalyDetection-Test')
CollectionName = os.getenv('CollectionName', 'AD-Ensemble-Method')
initial_block_size = int(os.getenv('InitialBlockSize', '100'))
update_interval = int(os.getenv('UpdateInterval', '25'))

# Placeholder for data
received_data = pd.DataFrame()
isolation_forest_model = None

# Function to train or update the Isolation Forest model
def train_isolation_forest(dataframe, contamination=0.1):
    model = IsolationForest(n_estimators=100, max_samples='auto', contamination=contamination, random_state=42)
    model.fit(dataframe)
    return model

# Function to detect anomalies using the Isolation Forest model
def detect_anomalies(model, data):
    # Prediction: -1 indicates anomaly, 1 indicates normal
    scores = model.decision_function(data)
    predictions = model.predict(data)
    return scores, predictions

# Function to send data to InfluxDB
def send_to_influxdb(row_df, CollectionName):
    for _, row in row_df.iterrows():
        point = Point(CollectionName).tag("anomaly", row['anomaly'])
        for column in row.index:
            if column != 'anomaly':
                point = point.field(column, float(row[column]))
        write_api.write(bucket=influxdb_bucket, record=point)
        print(f"Data point written to InfluxDB: {row.to_dict()}")

# Faust agent to process messages and detect anomalies
@app.agent(topic)
async def anomaly_detection_agent(stream):
    global received_data, isolation_forest_model

    row_count = 0
    numeric_columns = None

    async for event in stream:
        # Parsing the incoming event to create a DataFrame row
        csv_data = event.get('csv_data', '')
        try:
            row_values = list(map(float, csv_data.split(',')))
            num_columns = len(row_values)
            column_names = [f'col{i+1}' for i in range(num_columns)]
            row_df = pd.DataFrame([row_values], columns=column_names)
            print("Parsed DataFrame row:", row_df)
        except ValueError:
            print(f"Skipping event due to parsing error: {csv_data}")
            continue

        # Initializing columns and training initial Isolation Forest model
        if numeric_columns is None:
            numeric_columns = row_df.select_dtypes(include='number').columns.tolist()
            initial_data = pd.concat([received_data, row_df]).head(initial_block_size)
            isolation_forest_model = train_isolation_forest(initial_data[numeric_columns])
            print("Initial Isolation Forest model trained.")

        # Ensuring numeric column consistency
        row_df = row_df[numeric_columns]

        # Detecting anomalies
        scores, predictions = detect_anomalies(isolation_forest_model, row_df)
        row_df['scores'] = scores
        row_df['anomaly'] = ['yes' if pred == -1 else 'no' for pred in predictions]
        
        # Appending row to received data and update row count
        received_data = pd.concat([received_data, row_df], ignore_index=True)
        row_count += 1

        # Sending data to InfluxDB
        send_to_influxdb(row_df, CollectionName=CollectionName)

        # Periodically updating the Isolation Forest model every `update_interval` rows
        if row_count % update_interval == 0:
            recent_data = received_data[numeric_columns].iloc[-initial_block_size:]
            isolation_forest_model = train_isolation_forest(recent_data)
            print(f"Isolation Forest model updated after {row_count} rows.")

        # Saving to CSV in batches of 100 rows
        if row_count % 100 == 0:
            received_data.to_csv(f"{OutputFileName}.csv", index=False)
            print("CSV file updated with latest events.")

# Entry point for the application
if __name__ == '__main__':
    app.main()