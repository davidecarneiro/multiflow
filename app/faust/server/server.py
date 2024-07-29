import subprocess
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request
import signal

app = Flask(__name__)
CORS(app)

@app.route('/list-python-files', methods=['GET'])
def list_python_files():
    try:
        # Comando para listar ficheiros Python no diretório /appfaust
        command = 'ls -l /app'
        result = subprocess.run(command, shell=True, capture_output=True, text=True)

        if result.returncode != 0:
            error_message = result.stderr
            print(f"Erro ao listar arquivos Python: {error_message}")
            return jsonify(error="Erro ao listar ficheiros Python"), 500

        python_files = [file.split()[-1] for file in result.stdout.strip().split('\n')]
        python_files_filtered = [file for file in python_files if file.endswith('.py')]
        
        return jsonify(python_files_filtered), 200

    except Exception as e:
        error_message = str(e)
        print(f"Erro: {error_message}")
        return jsonify(error=error_message), 400

@app.route('/start-faust', methods=['POST'])
def start_faust():
    try:
        data = request.get_json()
        command = data.get('command')
        
        if not command:
            return jsonify(error="No command provided"), 400
        
        print(f"Received command: {command}")
        
        # Preliminary command to change the directory
        preliminary_command = "cd .. && cd /app"
        preliminary_result = subprocess.run(preliminary_command, shell=True, capture_output=True, text=True)

        if preliminary_result.returncode != 0:
            error_message = preliminary_result.stderr
            print(f"Error executing preliminary command: {error_message}")
            return jsonify(status="Error", message=error_message), 500

        # Command to start the Faust process
        faust_command = f'{command}'

        # Start the Faust process using Popen
        process = subprocess.Popen(faust_command, shell=True, cwd='/app')

        # Capture the PID of the process
        pid = process.pid

        print(f"Faust application started with PID: {pid}")

        # Write the PID to a text file
        #with open(f'{pid}.txt', 'w') as pid_file:
        #    pid_file.write(f"{pid} - {data.get('instanceName')}")

        return jsonify(status="Running", pid=pid), 200

    except Exception as e:
        error_message = str(e)
        print(f"Error: {error_message}")
        return jsonify(status="Error", message=error_message), 400
    

@app.route('/stop-faust', methods=['POST'])
def stop_faust():
    try:
        data = request.get_json()
        pid = data.get('pid')

        if not pid:
            return jsonify(status="Error", message="No PID provided"), 400

        try:
            pid = int(pid)
        except ValueError:
            return jsonify(status="Error", message="Invalid PID"), 400

        # Check if the process exists before attempting to kill it
        try:
            os.kill(pid, 0)
        except ProcessLookupError:
            return jsonify(status="Error", message="Process not found"), 404
        except Exception as e:
            return jsonify(status="Error", message=str(e)), 500

        # Attempt to kill the process
        try:
            os.kill(pid, signal.SIGTERM)
            os.kill(pid+1, signal.SIGTERM) #kill process pid+1 (faust app)
        except Exception as e:
            return jsonify(status="Error", message=str(e)), 500

        return jsonify(status="Stopped", message=f"Process {pid} stopped successfully"), 200

    except Exception as e:
        return jsonify(status="Error", message=str(e)), 400


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5010) #5010 #6066
