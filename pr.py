from github import Github
from dotenv import load_dotenv
import os
load_dotenv()

def create_branch(repo, branch_name, base_branch_name):
    base_branch = repo.get_branch(base_branch_name)
    repo.create_git_ref(f"refs/heads/{branch_name}", base_branch.commit.sha)

def commit_changes(repo, branch_name, file_path, commit_message):
    branch = repo.get_branch(branch_name)
    content = repo.get_contents(file_path, ref=branch_name)
    updated_content = "Hi"  # Replace with the content you want to update
    repo.update_file(content.path, commit_message, updated_content, content.sha, branch=branch_name)

def create_pull_request(repo, branch_name, base_branch_name, pr_title, pr_body):
    repo.create_pull(title=pr_title, body=pr_body, head=branch_name, base=base_branch_name)

if __name__ == "__main__":
    username = 'TevinWang'
    access_token = os.environ.get('GITHUB_ACCESS_TOKEN')
    repo_owner = 'TevinWang'
    repo_name = 'code-improvement-bot'
    branch_name = 'test'
    base_branch_name = 'main'
    file_path = 'test.txt'
    commit_message = 'Your commit message here'
    pr_title = 'Your Pull Request Title'
    pr_body = 'Your Pull Request Description'

    g = Github(username, access_token)
    repo = g.get_repo(f"{repo_owner}/{repo_name}")

    create_branch(repo, branch_name, base_branch_name)
    commit_changes(repo, branch_name, file_path, commit_message)
    create_pull_request(repo, branch_name, base_branch_name, pr_title, pr_body)
