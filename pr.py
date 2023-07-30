from dotenv import load_dotenv
import os
load_dotenv()
import datetime
import patch
import unidiff
from unidiff import PatchSet


import xml.etree.ElementTree as ET
from github import Github, GithubIntegration
import re

_hdr_pat = re.compile("^@@ -(\d+),?(\d+)? \+(\d+),?(\d+)? @@")

def apply_patch(s,patch,revert=False):
  """
  Apply unified diff patch to string s to recover newer string.
  If revert is True, treat s as the newer string, recover older string.
  """
  s = s.splitlines(True)
  p = patch.splitlines(True)
  t = ''
  i = sl = 0
  (midx,sign) = (1,'+') if not revert else (3,'-')
  while i < len(p) and p[i].startswith(("---","+++")): i += 1 # skip header lines
  while i < len(p):
    print(p[i])
    m = _hdr_pat.match(p[i])
    if not m: raise Exception("Cannot process diff")
    i += 1
    l = int(m.group(midx))-1 + (m.group(midx+1) == '0')
    t += ''.join(s[sl:l])
    sl = l
    while i < len(p) and p[i][0] != '@':
      if i+1 < len(p) and p[i+1][0] == '\\': line = p[i][:-1]; i += 2
      else: line = p[i]; i += 1
      if len(line) > 0:
        if line[0] == sign or line[0] == ' ': t += line[1:]
        sl += (line[0] != sign)
  t += ''.join(s[sl:])
  return t
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

def commit_changes(repo, branch_name, file_path, patch_content, file_content):
    commit_message = "Update " + file_path
    # print('\n'.join(patch_content.split('\n')[2:]))
    patched_content = apply_patch(file_content, '\n'.join(patch_content.split('\n')[2:]))
    try:
        # Try to get the existing file
        content = repo.get_contents(file_path, ref=branch_name)
        repo.update_file(content.path, commit_message, patched_content, content.sha, branch=branch_name)
    except Exception as e:
        # If the file doesn't exist, create it
        # print(patched_content.decode())
        repo.create_file(file_path, commit_message, patched_content, branch=branch_name)
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

    with open('python_files.txt', 'r') as output:
      xml_data = output.read()

    # Parse the XML data
    tree = ET.ElementTree(ET.fromstring(xml_data))
    file_root = tree.getroot()

    with open('completion_output.xml', 'r') as output:
      completion_xml_data = output.read()

    # Parse the XML data
    tree = ET.ElementTree(ET.fromstring(completion_xml_data))
    completion_root = tree.getroot()
    diff_string = completion_root.find('diff').text

    diff_chunks = diff_string.split('--- ')

    for chunk in diff_chunks[1:]:
        file_path_line, diff_content = chunk.split('\n', 1)
        file_path_line_parts = file_path_line.split(' ')
        file_path = file_path_line.split('a/')[1].split('\n+++')[0]
        print("file_path: ", file_path)
        for file_elem in file_root.findall('.//file'):
            file_path_elem = file_elem.find('file_path')
            if file_path_elem.text.strip() == file_path.strip():
                commit_changes(repo, branch_name, file_path, 'diff --git ' + chunk, file_elem.find('file_content').text)
                break

    pr_title = completion_root.find('title').text
    pr_body = completion_root.find('changes').text

    create_pull_request(repo, branch_name, base_branch_name, pr_title, pr_body)
