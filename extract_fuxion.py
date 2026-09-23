import json
import re

transcript_path = r"C:\Users\Lenovo\.gemini\antigravity\brain\4a8af9b5-c549-4684-b6ab-e1f2e638bbc8\.system_generated\logs\transcript_full.jsonl"

def get_latest_user_request():
    with open(transcript_path, 'r', encoding='utf-8') as f:
        lines = f.readlines()
        for line in reversed(lines):
            try:
                data = json.loads(line)
                if data.get('type') == 'USER_INPUT' and 'AQUI ESTA LO SOLICITADO' in data.get('content', ''):
                    return data['content']
            except:
                pass
    return None

content = get_latest_user_request()
if content:
    # Find all JSON blocks in the content
    # The JSON blocks start with { and end with }
    # We will just parse them manually.
    parts = content.split('</USER_REQUEST>')[1] # the text after the tag
    parts = parts.split('</ADDITIONAL_METADATA>')[1] # the text after metadata
    
    # We have two JSON blocks concatenated like } {
    parts = parts.strip()
    idx = parts.find('}{')
    if idx != -1:
        json1 = parts[:idx+1]
        json2 = parts[idx+1:]
        
        with open('fuxion_seed.json', 'w', encoding='utf-8') as f:
            f.write(json1)
        with open('fuxion_master.json', 'w', encoding='utf-8') as f:
            f.write(json2)
        print("Extracted successfully!")
    else:
        print("Couldn't find }{")
else:
    print("Couldn't find the message")
