from flask import Flask, jsonify, request
import claude
import requests
import pr
import os
from flask_cors import CORS

# create flask server for nodejs to call

app = Flask(__name__)
CORS(app)  # Add this line to enable CORS for the entire app


@app.route("/setrepo/<repo_url>", methods=["GET"])
def run_stuff(repo_url):
    repo_url = repo_url.replace("%", "/")
    # receiving "username/repo" from nodejs
    claude.main("https://github.com/" + repo_url)
    pr.main(repo_url)
    return repo_url

# Endpoint to handle GitHub OAuth access token exchange
@app.route('/auth/github/access_token', methods=['POST'])
def get_github_access_token():
    try:
        client_id = os.environ.get('CLIENT_ID')
        client_secret = os.environ.get('CLIENT_SECRET')
        code = request.json['code']

        # Make a request to GitHub API to exchange the code for an access token
        response = requests.post('https://github.com/login/oauth/access_token', json={
            'client_id': client_id,
            'client_secret': client_secret,
            'code': code,
        }, headers={
            'Accept': 'application/json',
        })

        return jsonify(response.json())
    except Exception as e:
        print('Error exchanging code for access token:', e)
        return jsonify({'error': 'An error occurred while exchanging code for access token'}), 500
# New endpoint to fetch public repositories of a user
@app.route('/api/github/repos', methods=['GET'])
def get_public_repositories():
    try:
        access_token = request.headers.get('Authorization', '').split(' ')[-1]

        # Make a request to GitHub API to fetch public repositories
        response = requests.get('https://api.github.com/repositories', headers={
            'Authorization': f'Bearer {access_token}',
        })

        repositories = response.json()
        return jsonify(repositories)
    except Exception as e:
        print('Error fetching public repositories:', e)
        return jsonify({'error': 'An error occurred while fetching public repositories'}), 500
if __name__ == "__main__":
    app.run(debug=True)
