import json

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
    with open('raw_message.txt', 'w', encoding='utf-8') as f:
        f.write(content)
