from pathlib import Path
import json
import sys
sys.stdout.reconfigure(encoding='utf-8')
label = sys.argv[1] if len(sys.argv) > 1 else 'related'
data = json.loads((Path(__file__).parent / (label + '-tests.json')).read_text(encoding='utf-8'))
for suite in data['testResults']:
    print(Path(suite['name']).name, suite['status'], len(suite['assertionResults']))
    for test in suite['assertionResults']:
        if test['status'] == 'failed':
            print(test['fullName'])
            print('\n'.join(test['failureMessages'])[:1500])
    if suite.get('message') and not suite['assertionResults']:
        print(suite['message'][:1500])
