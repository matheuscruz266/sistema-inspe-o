export function exportToPDF(title: string, sections: { heading: string; body: string }[]) {
  const win = window.open('', '_blank', 'width=900,height=700')
  if (!win) return
  const sectionsHtml = sections
    .map(
      (s) =>
        `<h2 style="color:#444;border-bottom:1px solid #ddd;padding-bottom:4px;">${s.heading}</h2><div>${s.body}</div>`,
    )
    .join('')
  win.document.write(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>${title}</title>
    <style>body{font-family:Arial,sans-serif;padding:24px;color:#222}h1{font-size:22px;margin-bottom:16px}
    table{width:100%;border-collapse:collapse;margin:8px 0}th,td{border:1px solid #ccc;padding:6px 10px;text-align:left;font-size:13px}
    th{background:#f5f5f5}</style></head><body><h1>${title}</h1>${sectionsHtml}
    <script>window.onload=function(){window.print()}</script></body></html>`)
  win.document.close()
}

export function tableHtml(headers: string[], rows: (string | number)[][]): string {
  const th = headers.map((h) => `<th>${h}</th>`).join('')
  const tr = rows.map((r) => `<tr>${r.map((c) => `<td>${c}</td>`).join('')}</tr>`).join('')
  return `<table><thead><tr>${th}</tr></thead><tbody>${tr}</tbody></table>`
}
