import os

from anthropic import AI_PROMPT, HUMAN_PROMPT, Anthropic
from dotenv import load_dotenv

from github_scraper import fetch_python_files_from_github_url

load_dotenv()
CLAUDE_API = os.getenv("CLAUDE_API")

# scrape
github_url = "https://github.com/benthecoder/ClassGPT"
python_files = fetch_python_files_from_github_url(github_url)

# write the file
with open("python_files.txt", "w") as f:
    f.writelines(
        f"<file>\n<file_path>{file_path}</file_path>\n<file_content>{file_content}</file_content>\n</file>\n"
        for file_path, file_content in python_files
    )


# read the file
with open("python_files.txt", "r") as f:
    python_files = f.read()


prompt = f"""{HUMAN_PROMPT} Claude, I'm seeking your expertise in reviewing, optimizing, and modifying Python code files. Your task is to carefully review each file, make improvements to ensure clean and efficient code, and provide the updated code in the following XML structure:

<pr_title>{{PR_TITLE}}</pr_title>
<files>
  <file>
    <file_path>{{PATH}}</file_path>
    <file_content>
      {{CONTENT}}
    </file_content>
  </file>
  <!-- Additional files follow this format -->
</files>
<changes>
  <!-- Include details of the changes made -->
</changes>

Your focus should be on pythonic principles, clean coding practices, efficiency, and optimization.

Please find the files for review and modification below:
{python_files}
{AI_PROMPT}"""

anthropic = Anthropic(
    api_key=CLAUDE_API,
)
completion = anthropic.completions.create(
    model="claude-2",
    max_tokens_to_sample=10000,
    prompt=prompt,
)

with open("completion_output.txt", "w") as file:
    file.write(completion.completion)
