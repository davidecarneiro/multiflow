import faust
import os
from influxdb_client import InfluxDBClient, Point
from influxdb_client.client.write_api import SYNCHRONOUS
import pandas as pd

# Fetching required environment variables
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = os.getenv('Port', '6066')
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')

# InfluxDB configuration
influxdb_url = os.getenv('INFLUXDB_URL', 'http://influxdb_server:8086')
influxdb_token = os.getenv('INFLUXDB_TOKEN', 'admin')
influxdb_org = os.getenv('INFLUXDB_ORG', 'multiflow')
influxdb_bucket = os.getenv('INFLUXDB_BUCKET', 'faust_app')
CollectionName = os.getenv('CollectionName', 'stream_data')

# Setting up Faust and InfluxDB clients
app = faust.App(InstanceName, broker='kafka_server://localhost:9092', web_port=int(InstancePort))
topic = app.topic(StreamTopic)
influx_client = InfluxDBClient(url=influxdb_url, token=influxdb_token, org=influxdb_org)
write_api = influx_client.write_api(write_options=SYNCHRONOUS)

# Function to send data to InfluxDB
def send_to_influxdb(row_df, measurement_name):
    for _, row in row_df.iterrows():
        point = Point(measurement_name)
        for column in row.index:
            if pd.api.types.is_numeric_dtype(type(row[column])):
                point = point.field(column, float(row[column]))
            else:
                point = point.tag(column, str(row[column]))
        try:
            write_api.write(bucket=influxdb_bucket, record=point)
            print(f"Successfully written to InfluxDB: {row.to_dict()}")
        except Exception as e:
            print(f"Error writing to InfluxDB: {e}")

# Faust agent to process messages and send them to InfluxDB
@app.agent(topic)
async def stream_to_influxdb_agent(stream):
    async for event in stream:
        # Parsing the incoming event to create a DataFrame row
        csv_data = event.get('csv_data', '')
        try:
            # Convert numeric values to floats
            row_values = list(map(lambda x: float(x) if x.replace('.', '', 1).isdigit() else x, csv_data.split(',')))
            column_names = [f'col{i+1}' for i in range(len(row_values))]
            row_df = pd.DataFrame([row_values], columns=column_names)
            print("Parsed DataFrame row:", row_df)
        except ValueError:
            print(f"Skipping event due to parsing error: {csv_data}")
            continue

        # Sending data to InfluxDB
        send_to_influxdb(row_df, CollectionName)

# Entry point for the application
if __name__ == '__main__':
    app.main()