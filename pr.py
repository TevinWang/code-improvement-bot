from dotenv import load_dotenv
import os
load_dotenv()
import datetime

import xml.etree.ElementTree as ET
from github import Github, GithubIntegration

def authenticate_github_app(app_id, private_key_path, target_id):
    with open(private_key_path, 'r') as key_file:
        private_key = key_file.read()
    integration = GithubIntegration(app_id, private_key)
    access_token = integration.get_access_token(target_id)
    return Github(access_token.token)
def create_branch(repo, branch_name, base_branch_name):
    try:
        # Try to get the existing file
        base_branch = repo.get_branch(base_branch_name)
        repo.create_git_ref(f"refs/heads/{branch_name}", base_branch.commit.sha)
    except Exception as e:
        print("Warning: ", e)

def commit_changes(repo, branch_name, file_path, updated_content):
    branch = repo.get_branch(branch_name)
    commit_message = "Update " + file_path
    try:
        # Try to get the existing file
        content = repo.get_contents(file_path, ref=branch_name)
        repo.update_file(content.path, commit_message, updated_content, content.sha, branch=branch_name)
    except Exception as e:
        # If the file doesn't exist, create it
        print(updated_content)
        repo.create_file(file_path, commit_message, updated_content, branch=branch_name)
def create_pull_request(repo, branch_name, base_branch_name, pr_title, pr_body):
    repo.create_pull(title=pr_title, body=pr_body, head=branch_name, base=base_branch_name)

if __name__ == "__main__":
    username = 'TevinWang'
    app_id = '368612'
    private_key_path = 'gooddiff.pem'
    target_id = '40181391'
    full_repo_name = f'{username}/ClassGPT'
    timestamp = datetime.datetime.now().strftime("%Y-%m-%d-%H-%M-%S")
    branch_name = f'gooddiff-{timestamp}'
    base_branch_name = 'main'

    g = authenticate_github_app(app_id, private_key_path, target_id)
    repo = g.get_repo(full_repo_name)

    create_branch(repo, branch_name, base_branch_name)

    with open('python_files_new.txt', 'r') as output:
      xml_data = output.read()

    # Parse the XML data
    tree = ET.ElementTree(ET.fromstring(xml_data))
    root = tree.getroot()

    # Process each <file> element
    files = []
    for file_element in root.findall('file'):
        file_path = file_element.find('file_path').text
        file_content = file_element.find('file_content').text
        files.append({'file_path': file_path, 'file_content': file_content})
    pr_title = root.find('title').text
    pr_body = root.find('changes').text

    # Print the parsed data
    for file in files:
        commit_changes(repo, branch_name, file['file_path'], file['file_content'])
    create_pull_request(repo, branch_name, base_branch_name, pr_title, pr_body)
