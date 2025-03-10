import faust
import os
import pandas as pd
from datetime import datetime, timedelta
from autogluon.timeseries import TimeSeriesDataFrame, TimeSeriesPredictor

# Fetching required environment variables
InstanceName = os.getenv('Name', 'InstanceName')
InstancePort = int(os.getenv('Port', '6066'))
StreamTopic = os.getenv('StreamTopic', 'phd_kafka')
AnomalyOutputFileName = os.getenv('AnomalyOutputFileName', 'anomalies')

# Dynamic parameter configuration
InitialTrainingBatch = int(os.getenv('InitialTrainingBatch', '250'))
MaxWindowSize = int(os.getenv('MaxWindowSize', '500'))
PredictionLength = int(os.getenv('PredictionLength', '50'))
ExpansionFactorDown = float(os.getenv('ExpansionFactorDown', '0.05'))
ExpansionFactorUp = float(os.getenv('ExpansionFactorUp', '0.05'))

# Setting up Faust app
app = faust.App(InstanceName, broker='kafka_server://localhost:9092', web_port=InstancePort)
topic = app.topic(StreamTopic)

# Global variables
received_data = pd.DataFrame()
start_time = datetime.now()  # Snapshot of the current time
global_row_count = 0  # Counter for total rows processed globally

# Function to process and convert data into time-series format
def process_to_timeseries(dataframe, start_row_index):
    timeseries_data = []

    # Generate timestamps by incrementing 1 minute for each row in each column
    for idx, row in dataframe.iterrows():
        for col in dataframe.columns:
            timestamp = (start_time + timedelta(minutes=start_row_index + len(timeseries_data))).strftime('%Y-%m-%d %H:%M:%S')
            timeseries_data.append({
                "item_id": col,
                "timestamp": timestamp,
                "target": row[col]
            })

    # Convert the list of dictionaries into a DataFrame
    timeseries_df = pd.DataFrame(timeseries_data)
    timeseries_df["timestamp"] = pd.to_datetime(timeseries_df["timestamp"])
    timeseries_df.set_index(["item_id", "timestamp"], inplace=True)

    return timeseries_df

# Anomaly detection function using Chronos
def detect_anomalies_streaming_with_dataframe(
    ts_data,
    initial_training_batch=InitialTrainingBatch,
    max_window_size=MaxWindowSize,
    prediction_length=PredictionLength,
    expansion_factor_down=ExpansionFactorDown,
    expansion_factor_up=ExpansionFactorUp,
    model_path="chronos_cache/"
):
    if len(ts_data) < initial_training_batch + prediction_length:
        print(f"Not enough data for anomaly detection. Required: {initial_training_batch + prediction_length} rows.")
        return None

    print(f"Anomaly detection initialized with {len(ts_data)} rows.")

    # Initialize data structures
    current_train_data = ts_data.iloc[:initial_training_batch]
    remaining_data = ts_data.iloc[initial_training_batch:]
    anomalies_list = []

    while len(remaining_data) > 0:
        print("Training new model...")
        predictor = TimeSeriesPredictor(
        target="target",
        freq="min",  # Use 'min' instead of 'T'
        prediction_length=prediction_length,
        eval_metric="MAPE",
        path=f"{model_path}_{datetime.now().strftime('%Y%m%d_%H%M%S')}"
        )
        predictor.fit(train_data=current_train_data, hyperparameters={"SimpleFeedForward": {}}, verbosity=1)

        # Predict on the next batch for all columns
        if len(remaining_data) < prediction_length:
            prediction_length = len(remaining_data)  # Adjust prediction length if remaining data is less

        current_predict_data = remaining_data.iloc[:prediction_length]
        predictions = predictor.predict(current_train_data)

        # Extract prediction components
        mean_values = predictions["mean"].reindex(current_predict_data.index)
        lower_quantile = predictions["0.1"].reindex(current_predict_data.index)
        upper_quantile = predictions["0.9"].reindex(current_predict_data.index)

        # Apply expansion factors
        adjusted_lower = lower_quantile - (lower_quantile * expansion_factor_down)
        adjusted_upper = upper_quantile + (upper_quantile * expansion_factor_up)

        # Detect anomalies
        anomalies = ((current_predict_data["target"] < adjusted_lower) | (current_predict_data["target"] > adjusted_upper))

        # Collect data for export
        interval_data = pd.DataFrame({
            "item_id": current_predict_data.index.get_level_values("item_id"),
            "timestamp": current_predict_data.index.get_level_values("timestamp"),
            "real_value": current_predict_data["target"],
            "predicted_mean": mean_values,
            "lower_bound": adjusted_lower,
            "upper_bound": adjusted_upper,
            "is_anomaly": anomalies,
        })
        anomalies_list.append(interval_data)

        # Update training data with sliding window
        current_train_data = pd.concat([current_train_data, current_predict_data]).tail(max_window_size)
        remaining_data = remaining_data.iloc[prediction_length:]

    if anomalies_list:
        anomaly_data_df = pd.concat(anomalies_list).reset_index(drop=True)
    else:
        print("No anomalies detected.")
        anomaly_data_df = pd.DataFrame()

    return anomaly_data_df

# Faust agent to process messages and format data
@app.agent(topic)
async def timeseries_processing_agent(stream):
    global received_data, start_time, global_row_count

    async for event in stream:
        csv_data = event.get('csv_data', '')
        try:
            row_values = list(map(float, csv_data.split(',')))
            num_columns = len(row_values)
            column_names = [f'col{i+1}' for i in range(num_columns)]
            row_df = pd.DataFrame([row_values], columns=column_names)
        except ValueError:
            print(f"Error: Skipping event due to parsing error: {csv_data}")
            continue

        # Accumulate received data
        received_data = pd.concat([received_data, row_df], ignore_index=True)
        global_row_count += 1

        # Log the number of rows received every 50 rows
        if global_row_count % 50 == 0:
            print(f"Total rows received so far: {global_row_count}")

        # Ensure we have enough data to process
        min_required_rows = InitialTrainingBatch + PredictionLength
        if len(received_data) < min_required_rows:
            continue  # Skip processing until we have enough data

        # Process accumulated data into time-series format
        timeseries_data = process_to_timeseries(received_data.tail(MaxWindowSize), global_row_count - MaxWindowSize)

        # Perform anomaly detection
        print("Starting anomaly detection...")
        anomalies_df = detect_anomalies_streaming_with_dataframe(
            ts_data=timeseries_data,
            initial_training_batch=InitialTrainingBatch,
            max_window_size=MaxWindowSize,
            prediction_length=PredictionLength,
            expansion_factor_down=ExpansionFactorDown,
            expansion_factor_up=ExpansionFactorUp,
            model_path="chronos_cache/"
        )

        if anomalies_df is not None and not anomalies_df.empty:
            anomalies_df.to_csv(
                f"{AnomalyOutputFileName}.csv",
                mode='a',
                header=not os.path.exists(f"{AnomalyOutputFileName}.csv"),
                index=False
            )
            print(f"Anomaly predictions saved to {AnomalyOutputFileName}.csv")

        # Retain only the most recent data within MaxWindowSize
        received_data = received_data.tail(MaxWindowSize)

# Entry point for the application
if __name__ == '__main__':
    app.main()