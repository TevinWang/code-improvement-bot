import fnmatch
import os
import base64
import requests
from dotenv import load_dotenv

load_dotenv()


GITHUB_TOKEN = os.getenv("GITHUB_TOKEN")


def fetch_python_files_from_github_url(url, token=GITHUB_TOKEN):
    owner, repo = url.strip("/").split("/")[-2:]
    tree_url = f"https://api.github.com/repos/{owner}/{repo}/git/trees/main?recursive=1"
    headers = {
        "Authorization": f"token {token}",
        "Accept": "application/vnd.github.v3+json",
    }

    tree_response = requests.get(tree_url, headers=headers)
    if tree_response.status_code != 200:
        raise ValueError(f"Error fetching repo contents: {tree_response.status_code}")

    contents_list = []
    for file in tree_response.json()["tree"]:
        if file["type"] == "blob" and fnmatch.fnmatch(file["path"], "*.py"):
            file_url = file["url"]
            print(f"scrapping file: {file['path']}")
            file_response = requests.get(file_url, headers=headers)
            if file_response.status_code == 200:
                content_base64 = file_response.json()["content"]
                content_decoded = base64.b64decode(content_base64).decode("utf-8")
                contents_list.append((file["path"], content_decoded))
    return contents_list


if __name__ == "__main__":
    github_url = "https://github.com/benthecoder/ClassGPT"
    python_files = fetch_python_files_from_github_url(github_url)

    with open("python_files.txt", "w") as f:
        for file_path, file_content in python_files:
            f.write(
                f"<file>\n<file_path>{file_path}</file_path>\n<file_content>{file_content}</file_content>\n</file>\n"
            )
