from flask import Flask, request, jsonify
import pymongo
import json
from bson import json_util
from datetime import datetime

def create_app():
    app = Flask(__name__)

    # Function to connect to MongoDB based on the provided information
    def connect_to_mongodb(database_name, collection_name):
        try:
            client = pymongo.MongoClient("mongodb://mongodb_server:27017/")
            db = client[database_name]
            collection = db[collection_name]
            return collection
        except Exception as e:
            raise Exception(f"Error connecting to MongoDB: {str(e)}")

    def format_timestamp(result):
        for item in result:
            if "timestamp" in item:
                timestamp = item["timestamp"]
                if isinstance(timestamp, datetime):
                    item["timestamp"] = timestamp.strftime("%Y-%m-%dT%H:%M:%S.%fZ")

    @app.route('/query', methods=['GET'])
    def run_query():
        try:
            database_name = request.args.get('database')
            collection_name = request.args.get('collection')
            query = request.args.get('query')

            if not database_name or not collection_name:
                return jsonify({'error': 'Insufficient data'}), 400

            collection = connect_to_mongodb(database_name, collection_name)

            if query:
                query = json.loads(query)  # Convert the query string to a dictionary
            else:
                query = {}  # Create an empty dictionary if the query is missing

            # Execute the query in MongoDB
            result = list(collection.find(query, projection={'_id': False}))

            # Format the "timestamp" field in the documents
            format_timestamp(result)

            # Convert the result to JSON using json_util
            result_json = json_util.dumps(result)

            return result_json, 200, {'Content-Type': 'application/json'}
        except Exception as e:
            return jsonify({'error': str(e)}), 500

    return app

if __name__ == '__main__':
    app = create_app()
    app.run(debug=True, host='0.0.0.0', port=8081)
