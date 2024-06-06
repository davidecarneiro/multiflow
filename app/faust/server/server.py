import subprocess
import os
from flask import Flask, jsonify
from flask_cors import CORS
from flask import request

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

'''@app.route('/start-faust', methods=['POST'])
def start_faust():
    try:
        # Comando para iniciar a aplicação Faust
        command = 'cd .. && cd /app && faust -A my_app worker -l info'
        result = subprocess.run(command, shell=True, capture_output=True, text=True)

        if result.returncode != 0:
            error_message = result.stderr
            print(f"Erro ao iniciar a aplicação Faust: {error_message}")
            return jsonify(error="Erro ao iniciar a aplicação Faust"), 500

        print(f"Aplicação Faust iniciada: {result.stdout}")
        return jsonify(message="Aplicação Faust iniciada com sucesso"), 200

    except Exception as e:
        error_message = str(e)
        print(f"Erro: {error_message}")
        return jsonify(error=error_message), 400'''

@app.route('/start-faust', methods=['POST'])
def start_faust():
    try:
        
        data = request.get_json()
        print('file_name--> ', data)
        #if 'file_name' not in data:
        #    print('file_name--> ')
        #    return jsonify(error="Nome do ficheiro Python não foi enviado corretamente"), 400
        file_name = data['command']

        print('file_name: ', file_name)
        file_name_without_extension = file_name.replace(".py", "")
        print(file_name_without_extension)  # Saída: my_app

        #faust -A my_app.py worker
        #command = f'cd .. && cd /app && faust -A {file_name} worker -l info'
        command = f'cd .. && cd /app && {file_name_without_extension} -l info'
        result = subprocess.run(command, shell=True, capture_output=True, text=True)

        if result.returncode != 0:
            error_message = result.stderr
            print(f"Erro ao iniciar a aplicação Faust: {error_message}")
            return jsonify(error="Erro ao iniciar a aplicação Faust"), 500

        print(f"Aplicação Faust iniciada: {result.stdout}")
        return jsonify(message="Aplicação Faust iniciada com sucesso"), 200

    except Exception as e:
        error_message = str(e)
        print(f"Erro: {error_message}")
        return jsonify(error=error_message), 400


if __name__ == '__main__':
    app.run(debug=True, host='0.0.0.0', port=5010) #5010 #6066
