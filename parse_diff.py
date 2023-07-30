import xml.etree.ElementTree as ET

def apply_diff(xml_string, diff_string):
    # Parse the XML structure
    root = ET.fromstring(xml_string)

    # Split the diff into individual chunks
    diff_chunks = diff_string.split('diff --git ')

    for chunk in diff_chunks[1:]:
        # Parse the file path and diff content from the chunk
        file_path_line, diff_content = chunk.split('\n', 1)
        file_path_line_parts = file_path_line.split(' ')
        file_path_b = file_path_line.split('a/')[1].split('b/')[0]

        # Find the corresponding <file> element in the XML structure
        for file_elem in root.findall('.//file'):
            file_path_elem = file_elem.find('file_path')
            print(file_path_elem.text.strip())
            print(file_path_b.strip())
            if file_path_elem.text.strip() == file_path_b.strip():
                print('hi')
                # Apply the diff changes to the <file_content> element
                file_content_elem = file_elem.find('file_content')
                file_content_lines = file_content_elem.text.split('\n')
                new_content_lines = apply_diff_content(file_content_lines, diff_content)
                # Update the <file_content> element with the new content
                file_content_elem.text = '\n'.join(new_content_lines)
                break

    # Return the modified XML structure as a string
    return ET.tostring(root, encoding='unicode')

def apply_diff_content(content_lines, diff_content):
    new_content_lines = content_lines.copy()
    line_number = 1

    for line in diff_content.split('\n'):
        if line.startswith('+++') or line.startswith('---'):
            continue
        elif line.startswith('@@ '):
            # Extract line numbers from diff chunk
            start_line, line_count = parse_diff_line_numbers(line)
            line_number = start_line
            continue
        elif line.startswith('+'):
            # Add new lines from the diff
            new_content_lines.insert(line_number - 1, line[1:])
            line_number += 1
        elif line.startswith('-'):
            # Skip lines removed from the diff
            line_number += 1

    return new_content_lines

def parse_diff_line_numbers(line):
    # Extract line numbers from the diff chunk
    line_info = line.split(' ')[1]
    start_line, line_count = map(int, line_info[1:].split(','))
    return start_line, line_count

# Sample input data
with open('python_files.txt', 'r') as py:
    original_xml = py.read()

with open('completion_output.xml', 'r') as completion:
    claude_xml = completion.read()
    claude_tree = ET.ElementTree(ET.fromstring(claude_xml))
    claude_root = claude_tree.getroot()
    title = claude_root.find('title').text
    github_diff = claude_root.find('diff').text
    changes = claude_root.find('changes').text

# Applying the diff to the XML structure
result_xml = apply_diff(original_xml, github_diff)
# Output the updated XML
with open('python_files_new.txt', 'w') as py_n:
    py_n.write('<root>')
    py_n.write(result_xml)
    py_n.write('\n<title>')
    py_n.write(title)
    py_n.write('</title>')
    py_n.write('\n<changes>')
    py_n.write(changes)
    py_n.write('</changes>')
    py_n.write('</root>')