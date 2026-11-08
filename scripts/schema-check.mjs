// Deliberately limited to the vocabulary used by the bundled exchange schema.
// Unknown validation keywords fail closed, so schema changes require review.
const known = new Set(['$schema', '$id', '$defs', '$ref', 'title', 'description', 'type',
  'additionalProperties', 'required', 'properties', 'items', 'minItems', 'uniqueItems',
  'minLength', 'maxLength', 'maxItems', 'pattern', 'minimum', 'const', 'enum', 'anyOf']);
export function checkSchema(value, schema, root = schema, path = '$') {
  const errors = [];
  for (const key of Object.keys(schema)) if (!known.has(key)) errors.push(`${path}: unsupported schema keyword ${key}`);
  if (schema.$ref) {
    if (!schema.$ref.startsWith('#/')) return [`${path}: external schema references are unsupported`];
    const target = schema.$ref.slice(2).split('/').reduce((v, k) => v?.[k.replaceAll('~1', '/').replaceAll('~0', '~')], root);
    if (!target) return [`${path}: missing schema reference ${schema.$ref}`];
    errors.push(...checkSchema(value, target, root, path));
  }
  if (schema.anyOf && !schema.anyOf.some(s => checkSchema(value, s, root, path).length === 0)) errors.push(`${path}: no anyOf alternative matched`);
  const same = (a, b) => JSON.stringify(a) === JSON.stringify(b);
  if ('const' in schema && !same(value, schema.const)) errors.push(`${path}: invalid constant`);
  if (schema.enum && !schema.enum.some(v => same(value, v))) errors.push(`${path}: invalid enum value`);
  if (schema.type) {
    const valid = schema.type === 'null' ? value === null
      : schema.type === 'array' ? Array.isArray(value)
      : schema.type === 'object' ? value !== null && typeof value === 'object' && !Array.isArray(value)
      : schema.type === 'integer' ? Number.isSafeInteger(value)
      : typeof value === schema.type;
    if (!valid) return [...errors, `${path}: expected ${schema.type}`];
  }
  if (typeof value === 'string') {
    if (schema.minLength && [...value].length < schema.minLength) errors.push(`${path}: string too short`);
    if (schema.maxLength !== undefined && [...value].length > schema.maxLength) errors.push(`${path}: string too long`);
    if (schema.pattern && !new RegExp(schema.pattern).test(value)) errors.push(`${path}: invalid string format`);
  }
  if (typeof value === 'number' && schema.minimum !== undefined && value < schema.minimum) errors.push(`${path}: below minimum`);
  if (Array.isArray(value)) {
    if (schema.minItems && value.length < schema.minItems) errors.push(`${path}: too few items`);
    if (schema.maxItems !== undefined && value.length > schema.maxItems) errors.push(`${path}: too many items`);
    if (schema.uniqueItems && new Set(value.map(v => JSON.stringify(v))).size !== value.length) errors.push(`${path}: duplicate items`);
    if (schema.items) value.forEach((v, i) => errors.push(...checkSchema(v, schema.items, root, `${path}[${i}]`)));
  } else if (value !== null && typeof value === 'object') {
    for (const key of schema.required || []) if (!Object.hasOwn(value, key)) errors.push(`${path}: missing ${key}`);
    for (const [key, item] of Object.entries(value)) {
      if (schema.properties?.[key]) errors.push(...checkSchema(item, schema.properties[key], root, `${path}.${key}`));
      else if (schema.additionalProperties === false) errors.push(`${path}: unexpected property ${key}`);
    }
  }
  return errors;
}
