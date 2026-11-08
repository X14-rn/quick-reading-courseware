// Physical page numbers are explicit citations; never infer uncited gap pages.
export function sortedPages(pages) {
  return [...new Set(pages)].sort((a, b) => a - b);
}

export function formatPages(pages) {
  const values = sortedPages(pages);
  const ranges = [];
  for (let i = 0; i < values.length; i++) {
    const start = values[i];
    let end = start;
    while (values[i + 1] === end + 1) end = values[++i];
    ranges.push(start === end ? `${start}` : `${start}-${end}`);
  }
  return values.length ? `${values.length === 1 ? 'page' : 'pages'} ${ranges.join(', ')}` : 'No cited pages';
}

export function groupSources(documents, references) {
  return documents.flatMap(document => {
    const pages = sortedPages(references.filter(r => r.document_id === document.id).map(r => r.page));
    return pages.length ? [{ document, pages, label: formatPages(pages) }] : [];
  });
}
