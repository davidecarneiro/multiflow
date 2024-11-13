import faust
import os
import pandas as pd
from frouros.detectors.data_drift import MMD
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS

# Environment variable configurations
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = os.getenv('Port', '6066')
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')
concept_samples = int(os.getenv('ConceptSamples', '100'))
batch_size = int(os.getenv('BatchSize', '10'))
mmd_threshold = float(os.getenv('MMDThreshold', '0.8'))
OutputFileName = os.getenv('OutputFileName', 'Received-Events')

# InfluxDB configurations
CollectionName = os.getenv('CollectionName', 'drift_detection')
influxdb_url = os.getenv('INFLUXDB_URL', 'http://influxdb_server:8086')
influxdb_token = os.getenv('INFLUXDB_TOKEN', 'admin')
influxdb_org = os.getenv('INFLUXDB_ORG', 'multiflow')
influxdb_bucket = os.getenv('INFLUXDB_BUCKET', 'faust_app')

# Faust app setup
app = faust.App(
    InstanceName, 
    broker='kafka_server://localhost:9092',  
    web_port=int(InstancePort)
)
topic = app.topic(StreamTopic)

# Data storage
reference_data = pd.DataFrame()
received_data = pd.DataFrame()

# InfluxDB client setup
influx_client = InfluxDBClient(url=influxdb_url, token=influxdb_token, org=influxdb_org)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

# Drift detection variables
detector = None
initialized = False
num_features = None

# Function to send data to InfluxDB
def send_to_influxdb(row_df, CollectionName):
    for _, row in row_df.iterrows():
        point = Point(CollectionName) \
            .tag("drift_detected", row['drift_detected'])
        for column in row.index:
            if column != 'drift_detected':
                point = point.field(column, float(row[column]))
        write_api.write(bucket=influxdb_bucket, record=point)
        print(f"Data point written to InfluxDB: {row.to_dict()}")

# Function to save data to CSV
def save_to_csv():
    received_data.to_csv(f"{OutputFileName}.csv", index=False)
    print(f"Data saved to {OutputFileName}.csv")

# Faust agent for processing
@app.agent(topic)
async def drift_detection_agent(stream):
    global reference_data, received_data, detector, initialized, num_features
    row_count = 0

    async for event in stream:
        csv_data = event.get('csv_data', '')
        
        # Parse incoming data row
        try:
            row_values = list(map(float, csv_data.split(',')))
            
            # Enforce single-column format in DataFrame creation
            if len(row_values) > 1:
                print(f"Warning: Received row with unexpected multiple features: {row_values}. Using only the first feature.")
                row_values = [row_values[0]]  # Keep only the first value
            
            column_names = ['col1']  # Explicitly define a single column name
            row_df = pd.DataFrame([row_values], columns=column_names)
            print("Parsed DataFrame row:", row_df)
            
        except ValueError:
            print(f"Skipping event due to parsing error: {csv_data}")
            continue

        # Check and log dimensions of the incoming row
        if num_features is None:
            num_features = len(row_values)
            print(f"Set number of features to: {num_features}")
        elif len(row_values) != num_features:
            print(f"Skipping row due to dimension mismatch: expected {num_features} features, got {len(row_values)}")
            continue

        # Accumulate data for reference if not initialized
        if not initialized:
            reference_data = pd.concat([reference_data, row_df], ignore_index=True)
            print(f"Accumulating reference data: {len(reference_data)}/{concept_samples}")

            if len(reference_data) >= concept_samples:
                try:
                    detector = MMD()
                    detector.fit(X=reference_data.to_numpy())
                    initialized = True
                    print(f"MMD detector initialized with reference data of shape: {reference_data.shape}")
                except Exception as e:
                    print(f"Error initializing MMD detector: {e}")
            continue

        # Append data to received_data
        received_data = pd.concat([received_data, row_df], ignore_index=True)
        row_count += 1

        # Only check for drift if we have a complete batch
        if row_count % batch_size == 0:
            try:
                X_batch = received_data.iloc[-batch_size:][['col1']].to_numpy()  # Ensure only 'col1' is selected
                print(f"Batch data shape for drift detection: {X_batch.shape}")
                
                # Check shape compatibility
                if X_batch.shape[1] != reference_data.shape[1]:
                    print(f"Skipping drift detection due to dimension mismatch: X_batch has {X_batch.shape[1]} features, reference has {reference_data.shape[1]} features.")
                    continue
                
                mmd_result, _ = detector.compare(X=X_batch)
                mmd_distance = abs(mmd_result.distance)
                drift_detected = mmd_distance > mmd_threshold
                print(f"Batch {row_count // batch_size} - MMD distance: {mmd_distance}, Drift detected: {drift_detected}")

                # Append drift detection result
                received_data.loc[received_data.index[-batch_size:], 'drift_detected'] = 'True' if drift_detected else 'No'

                # Send results to InfluxDB
                send_to_influxdb(received_data.iloc[-batch_size:], CollectionName)

            except Exception as e:
                print(f"Error during drift detection: {e}")

        # Save to CSV every 100 rows
        if row_count % 100 == 0:
            save_to_csv()

# Entry point
if __name__ == '__main__':
    app.main()
