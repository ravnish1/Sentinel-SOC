export function sparklinePoints(values, width = 110, height = 28) {
  const safe = values.length ? values : [0, 0, 0, 0];
  const min = Math.min(...safe);
  const max = Math.max(...safe);
  const range = max - min || 1;

  return safe
    .map((value, index) => {
      const x = (index / (safe.length - 1 || 1)) * width;
      const y = height - ((value - min) / range) * height;
      return `${x.toFixed(1)},${y.toFixed(1)}`;
    })
    .join(' ');
}

export function downloadCsv(rows, fileName, columns = Object.keys(rows[0] || {})) {
  if (!rows.length || !columns.length) {
    return false;
  }

  const csv = [
    columns.join(','),
    ...rows.map((row) => columns.map((column) => {
      const value = row[column] == null ? '' : String(row[column]);
      return `"${value.replace(/"/g, '""')}"`;
    }).join(',')),
  ].join('\n');

  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = fileName;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
  return true;
}
