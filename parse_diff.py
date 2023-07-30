import xml.etree.ElementTree as ET

def apply_github_diff_to_xml(original_xml, github_diff):
    # Step 1: Parse the original XML
    original_tree = ET.ElementTree(ET.fromstring(original_xml))
    root = original_tree.getroot()

    diffs = github_diff.split('diff --git')

    # Apply each diff
    for diff in diffs[1:]:

      # Get file path
      file_path = diff.split('\n--- a/')[1].split(' b/')[0]
      
      # Find file node
      file_node = root.find(f"./file[file_path='{file_path}']")
      
      if file_node is None:
        print(f"File not found: {file_path}")
        continue
      
      # Get content node
      content_node = file_node.find('file_content')
      
      # Apply diff lines
      for line in diff.split('\n'):
        if line.startswith('+'):
          content_node.text += '\n' + line[1:]  
        elif line.startswith('-'):
          content_node.text = content_node.text.replace(line[1:], '')
          
    # Print modified XML  
    return ET.tostring(root, encoding='unicode')

# Sample input data
with open('python_files.txt', 'r') as py:
    original_xml = py.read()

with open('completion_output.xml', 'r') as completion:
    claude_xml = completion.read()
    claude_tree = ET.ElementTree(ET.fromstring(claude_xml))
    claude_root = claude_tree.getroot()
    title = claude_root.find('title').text
    github_diff = claude_root.find('diff').text
    print(github_diff)
    changes = claude_root.find('changes').text


# Apply the GitHub diff to the XML content and get the updated
updated_xml = apply_github_diff_to_xml(original_xml, github_diff)

# Output the updated XML
with open('python_files_new.txt', 'w') as py_n:
    py_n.write('<root>')
    py_n.write(updated_xml)
    py_n.write('\n<title>')
    py_n.write(title)
    py_n.write('</title>')
    py_n.write('\n<changes>')
    py_n.write(changes)
    py_n.write('</changes>')
    py_n.write('</root>')