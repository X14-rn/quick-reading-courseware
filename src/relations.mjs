// Cross-record rules shared by the Skill validator and the viewer.
// Indexed lookups keep validation roughly linear in map size.
export function validateRelations(map) {
  const errors = [];
  const fail = message => errors.push(message);
  const v11 = map.schema_version === 'qr-courseware-map/1.1';
  let previousRound = 0;
  for (const review of map.v2.reviews) {
    if (review.round <= previousRound) fail('Review rounds must increase strictly');
    previousRound = review.round;
    if (review.confirming_pass && review.corrections.length) fail('A confirming review cannot contain material corrections');
  }
  const unique = (items, label) => {
    const ids = new Set();
    for (const item of items) {
      if (ids.has(item.id)) fail(`Duplicate ${label} ID ${item.id}`);
      ids.add(item.id);
    }
  };
  unique(map.documents, 'document');
  if (new Set(map.documents.map(d => d.pdf_sha256)).size !== map.documents.length) fail('Distinct document IDs cannot share the same PDF hash');
  unique(map.source_coverage_register, 'source element');
  unique(map.v2.nodes, 'node');
  unique(map.v3.nodes, 'V3 node');
  if (JSON.stringify(map.v2.nodes) !== JSON.stringify(map.v3.nodes)) fail('V3 nodes must copy V2 nodes exactly and in order');
  const docs = new Map(map.documents.map(d => [d.id, d]));
  const docIndex = new Map(map.documents.map((d, i) => [d.id, i]));
  const nodes = new Map(map.v3.nodes.map(n => [n.id, n]));
  const nodeIndex = new Map(map.v3.nodes.map((n, i) => [n.id, i]));
  const childCount = new Map(map.v3.nodes.map(n => [n.id, 0]));
  for (const n of map.v3.nodes) if (n.parent_id !== null && childCount.has(n.parent_id)) childCount.set(n.parent_id, childCount.get(n.parent_id) + 1);
  const elements = new Map(map.source_coverage_register.map(e => [e.id, e]));
  const pages = new Map();
  for (const p of map.page_inventory) {
    const key = `${p.document_id}/${p.page}`;
    if (pages.has(key)) fail(`Duplicate page inventory ${key}`);
    pages.set(key, p);
    const d = docs.get(p.document_id);
    if (!d || p.page > d.page_count) fail(`Page inventory ${key}: invalid document or physical page`);
    for (const id of p.element_ids) {
      const e = elements.get(id);
      if (!e || e.document_id !== p.document_id || e.page !== p.page) fail(`Page inventory ${key}: invalid element ${id}`);
    }
  }
  for (const d of map.documents) for (let page = 1; page <= d.page_count; page++) {
    if (!pages.has(`${d.id}/${page}`)) fail(`Missing page inventory ${d.id}/${page}`);
  }
  const roots = map.v3.nodes.filter(n => n.parent_id === null);
  if (roots.length !== 1) fail('Hierarchy must have exactly one root');
  const usesV11Fields = n => n.importance !== undefined || n.key_points !== undefined || n.supplements !== undefined;
  for (const n of map.v3.nodes) {
    if (n.parent_id !== null && !nodes.has(n.parent_id)) fail(`Node ${n.id}: unknown parent ${n.parent_id}`);
    const seen = new Set();
    let current = n;
    while (current && current.parent_id !== null) {
      if (seen.has(current.id)) { fail(`Node ${n.id}: parent cycle`); break; }
      seen.add(current.id);
      current = nodes.get(current.parent_id);
    }
    const hasChildren = childCount.get(n.id) > 0;
    if (n.kind === 'learning_point' && hasChildren) fail(`Learning point ${n.id} has children`);
    if (n.kind === 'group' && n.evidence_ids.length) fail(`Group ${n.id}: evidence belongs on terminal learning points`);
    if (n.kind === 'group' && !hasChildren) fail(`Group ${n.id}: no children`);
    for (const id of n.evidence_ids) {
      const e = elements.get(id);
      if (!e || e.status !== 'mapped' || !e.node_ids.includes(n.id)) fail(`Node ${n.id}: invalid or asymmetric evidence ${id}`);
    }
    if (!v11 && usesV11Fields(n)) fail(`Node ${n.id}: importance, key_points and supplements require schema_version qr-courseware-map/1.1`);
    if (n.kind === 'group' && (n.key_points !== undefined || n.importance !== undefined)) fail(`Group ${n.id}: key points and importance belong on learning points`);
    if (v11 && n.kind === 'learning_point') {
      if (!n.importance) fail(`Learning point ${n.id}: importance is required in 1.1`);
      if (!n.key_points?.length) fail(`Learning point ${n.id}: at least one key point is required in 1.1`);
    }
    const evidence = new Set(n.evidence_ids);
    for (const [i, kp] of (n.key_points || []).entries())
      for (const id of kp.element_ids) if (!evidence.has(id)) fail(`Node ${n.id}: key point ${i + 1} cites ${id}, which is not in its evidence`);
  }
  for (const e of map.source_coverage_register) {
    const doc = docs.get(e.document_id);
    if (!doc || e.page > doc.page_count) fail(`Element ${e.id}: invalid document or physical page`);
    if (!pages.get(`${e.document_id}/${e.page}`)?.element_ids.includes(e.id)) fail(`Element ${e.id}: absent from page inventory`);
    if (e.status === 'mapped' && e.node_ids.length === 0) fail(`Element ${e.id}: mapped without a node`);
    if (e.status !== 'mapped' && e.node_ids.length) fail(`Element ${e.id}: nonmapped element has nodes`);
    if (e.verification !== 'verified' && !e.uncertainty) fail(`Element ${e.id}: unverified without structured uncertainty`);
    if (e.status === 'unresolved' && e.verification === 'verified') fail(`Element ${e.id}: unresolved status cannot be verified`);
    if (e.status !== 'mapped' && !e.note) fail(`Element ${e.id}: nonmapped element requires a reason`);
    for (const id of e.node_ids) if (!nodes.get(id)?.evidence_ids.includes(e.id)) fail(`Element ${e.id}: asymmetric node ${id}`);
  }
  const refKeys = new Set();
  const referenced = new Map();
  let previousOrder = [-1, -1, -1];
  for (const r of map.v3.references) {
    const key = `${r.node_id}/${r.document_id}/${r.page}`;
    if (refKeys.has(key)) fail(`Duplicate reference ${key}`);
    refKeys.add(key);
    const doc = docs.get(r.document_id);
    if (!doc || r.page > doc.page_count) fail(`Reference ${key}: invalid document or physical page`);
    if (nodes.get(r.node_id)?.kind !== 'learning_point') fail(`Reference ${key}: target must be a learning point`);
    const order = [nodeIndex.get(r.node_id) ?? -1, docIndex.get(r.document_id) ?? -1, r.page];
    if (order[0] < previousOrder[0] || (order[0] === previousOrder[0] && (order[1] < previousOrder[1] || (order[1] === previousOrder[1] && order[2] < previousOrder[2])))) fail(`Reference ${key}: order must follow node, document, physical page`);
    previousOrder = order;
    if (!referenced.has(r.node_id)) referenced.set(r.node_id, new Set());
    for (const id of r.element_ids) {
      referenced.get(r.node_id).add(id);
      const e = elements.get(id);
      if (!e || e.status !== 'mapped' || e.document_id !== r.document_id || e.page !== r.page || !e.node_ids.includes(r.node_id)) fail(`Reference ${key}: unsupported element ${id}`);
    }
  }
  for (const n of map.v3.nodes) {
    if (n.kind !== 'learning_point') continue;
    const cited = referenced.get(n.id);
    if (!cited) fail(`Learning point ${n.id}: no source reference`);
    for (const id of n.evidence_ids) if (!cited?.has(id)) fail(`Learning point ${n.id}: evidence ${id} lacks navigation reference`);
  }
  const counts = { mapped: 0, excluded_administrative: 0, unresolved: 0 };
  for (const e of map.source_coverage_register) if (e.status in counts) counts[e.status]++;
  counts.registered = map.source_coverage_register.length;
  for (const [key, value] of Object.entries(counts)) if (map.validation.counts[key] !== value) fail(`Coverage count ${key}: expected ${value}`);
  const unresolved = map.source_coverage_register.filter(e => e.status === 'unresolved').map(e => e.id).sort();
  if (JSON.stringify(unresolved) !== JSON.stringify([...map.v3.unresolved_supplements].sort())) fail('Unresolved supplement IDs must match register');
  for (const issue of map.validation.issues) {
    if (issue.node_id && !nodes.has(issue.node_id)) fail(`Issue ${issue.code}: unknown node`);
    if (issue.element_id && !elements.has(issue.element_id)) fail(`Issue ${issue.code}: unknown source element`);
    if (!v11 && (issue.category !== undefined || issue.standard_form !== undefined)) fail(`Issue ${issue.code}: category and standard_form require schema_version qr-courseware-map/1.1`);
    if (issue.category === 'source_erratum') {
      if (issue.severity !== 'noncritical') fail(`Issue ${issue.code}: a source erratum is preserved and flagged, so it is noncritical`);
      if (!issue.node_id && !issue.element_id) fail(`Issue ${issue.code}: a source erratum must name the affected node or source element`);
    } else if (issue.standard_form !== undefined) fail(`Issue ${issue.code}: standard_form is only for source errata`);
  }
  if (map.validation.status === 'complete' && (map.project.scope !== 'full_source' || !['ai_reviewed', 'chatgpt_reviewed'].includes(map.project.provenance) || unresolved.length || map.page_inventory.some(p => p.inspection !== 'inspected') || map.source_coverage_register.some(e => e.verification !== 'verified') || map.validation.issues.some(i => i.severity === 'critical') || !map.v2.reviews.at(-1)?.confirming_pass)) fail('Complete status requires full AI-reviewed source, inspected pages, verified elements, no unresolved elements or critical issues, and a final confirming V2 pass');
  if (map.validation.status !== 'blocked' && map.validation.issues.some(i => i.severity === 'critical')) fail('Critical issues require blocked status');
  return errors;
}
