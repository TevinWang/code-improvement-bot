import os, subprocess

from anthropic import AI_PROMPT, HUMAN_PROMPT, Anthropic
from dotenv import load_dotenv

from github_scraper import fetch_python_files_from_github_url

load_dotenv()
CLAUDE_API = os.getenv("CLAUDE_API")

# scrape
github_url = "https://github.com/tevinwang/ClassGPT"
python_files = fetch_python_files_from_github_url(github_url)
# ASSUMING OUTPUT IS A LIST OF TUPLES OF (FILE_PATH, [FILE LINES])
for i in python_files:
    context_list = []
    for j, line in enumerate(i[1]):
        if len(line) < 10:
            continue
        if (not line):
            continue
        p = subprocess.Popen(['node', 'add_doc_context.js', line], stdout=subprocess.PIPE)
        out = p.stdout.read()
        context_list.append((line, j, out))
    python_files[i] += (context_list,)

# python_files is now [(FILE_PATH, [FILE LINES], [(LINE, LINE NUMBER, CONTEXT)])]


# write the file
with open("python_files.txt", "w") as f:
    f.write('<files>\n')
    for file_path, file_content, file_context in python_files:
        f.write(f"<file>\n<file_path>{file_path}</file_path>\n<file_content>\n{file_content}\n</file_content>\n<file_context>\n")
        for context in file_context:
            f.write(f"<line>\n<line_number>{context[1]}</line_number>\n<line_content>{context[0]}</line_content>\n<context>\n{context[2]}\n</context>\n</line>\n")
        f.write("</file_context>\n</file>\n")
    f.write('</files>')

#LOOKS LIKE
"""
<files>
    <file>
        <file_path>path/to/file.py</file_path>
        <file_content>
            import os, subprocess
            etc
            etc
        </file_content>
        <file_context>
            <line>
                <line_number>1</line_number>
                <line_content>import os, subprocess</line_content>
                <context>
                    import os, subprocess
                    context here
                </context>
            </line>
            <line>
                <line_number>2</line_number>
                etc
                etc
            </line>
        </file_context>
    </file>
    <file>
        etc
        etc
    </file>
</files>
"""

# read the file
with open("python_files.txt", "r") as f:
    python_files = f.read()


prompt = f"""{HUMAN_PROMPT} Claude, I'm seeking your expertise in reviewing, optimizing, and modifying Python code files. Your task is to carefully review each file, make improvements to ensure clean and efficient code, and provide the updated code in a xml structure:
<root>
<diff>
<!-- Include github style .diff file, DONT REMOVE ANY OF THE XML, ONLY CHANGE FILE CONTENTS -->
</diff>
<title>
<!-- Include a github pull request title for your changes -->
</title>
<changes>
  <!-- Include details of the changes made -->
</changes>
</root>

Your focus should be on pythonic principles, clean coding practices, efficiency, and optimization.

Please find the files for review and modification below:
{python_files}

XML file (remember, just the file, no comments or any extra information, or introduction):
{AI_PROMPT}"""

anthropic = Anthropic(
    api_key=CLAUDE_API,
)
completion = anthropic.completions.create(
    model="claude-2",
    max_tokens_to_sample=10000,
    prompt=prompt,
)

with open("completion_output.xml", "w") as file:
    file.write(completion.completion)
