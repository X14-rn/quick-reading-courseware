"""Synthetic navigation evidence only; no real courseware claims."""
import json
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
OUT = ROOT / 'fixtures'
from fixture_pdf import pdf

doc = pdf(OUT, 'source-ranges.pdf', [f'SYNTHETIC NAVIGATION TEST - physical page {p}' for p in range(1, 18)])
optics = json.loads((OUT / 'synthetic-valid.json').read_text())['documents'][1]
nodes = [{'id': 'R0', 'parent_id': None, 'title': 'Synthetic source range navigation', 'objective': 'Test source display only.', 'kind': 'group', 'evidence_ids': []}]
elements, references = [], []
for node_id, title, selections in [
    ('R1', 'Continuous pages example', [(doc['id'], [8, 9, 10, 11])]),
    ('R2', 'Scattered pages and two documents example', [(doc['id'], [8, 12, 15, 16, 17]), ('optics', [1])]),
]:
    ids = []
    for doc_id, pages in selections:
        for page in pages:
            eid = f'{doc_id}-{page}'
            ids.append(eid)
            existing = next((e for e in elements if e['id'] == eid), None)
            if existing:
                existing['node_ids'].append(node_id)
            else:
                elements.append({'id': eid, 'document_id': doc_id, 'page': page, 'kind': 'text', 'locator': 'Synthetic test text', 'status': 'mapped', 'node_ids': [node_id], 'verification': 'verified'})
            references.append({'node_id': node_id, 'document_id': doc_id, 'page': page, 'element_ids': [eid]})
    nodes.append({'id': node_id, 'parent_id': 'R0', 'title': title, 'objective': 'Verify complete cited physical pages in the preview.', 'kind': 'learning_point', 'evidence_ids': ids})
data = json.loads((OUT / 'synthetic-valid.json').read_text())
data['project'].update(id='synthetic-source-ranges', title='Synthetic source range navigation')
data['documents'] = [doc, optics]
data['page_inventory'] = [{'document_id': d['id'], 'page': p, 'inspection': 'inspected', 'element_ids': [e['id'] for e in elements if e['document_id'] == d['id'] and e['page'] == p]} for d in data['documents'] for p in range(1, d['page_count'] + 1)]
data['source_coverage_register'] = elements
data['v1'] = {'candidate': ['Source navigation'], 'revision': ['Continuous pages', 'Scattered pages'], 'review_note': 'Synthetic UI test only; not decomposition evidence.'}
data['v2']['nodes'] = nodes
data['v3'].update(nodes=nodes, references=references)
data['validation']['counts'].update(registered=len(elements), mapped=len(elements))
data['validation']['coverage_scope'] = 'Synthetic navigation fixture only; not a reviewed course decomposition.'
(OUT / 'synthetic-page-ranges.json').write_text(json.dumps(data, indent=2) + '\n')
