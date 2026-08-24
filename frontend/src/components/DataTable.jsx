export default function DataTable({
  columns, data, emptyMessage = 'No records found', onRowClick,
  selectable = false, selectedIds = [], onSelectionChange,
}) {
  if (!data || data.length === 0) {
    return (
      <div className="card">
        <div className="empty-state">
          <div className="icon">□</div>
          <div className="title">{emptyMessage}</div>
          <div>Add your first record to see it listed here.</div>
        </div>
      </div>
    )
  }

  const allSelected = data.length > 0 && data.every((row) => selectedIds.includes(row.id))
  const someSelected = data.some((row) => selectedIds.includes(row.id))

  const toggleAll = () => {
    if (allSelected) {
      onSelectionChange(selectedIds.filter((id) => !data.some((row) => row.id === id)))
    } else {
      const newIds = new Set(selectedIds)
      data.forEach((row) => newIds.add(row.id))
      onSelectionChange([...newIds])
    }
  }

  const toggleOne = (id) => {
    if (selectedIds.includes(id)) {
      onSelectionChange(selectedIds.filter((x) => x !== id))
    } else {
      onSelectionChange([...selectedIds, id])
    }
  }

  return (
    <div className="card" style={{ overflowX: 'auto' }}>
      <table>
        <thead>
          <tr>
            {selectable && (
              <th style={{ width: 36 }}>
                <input
                  type="checkbox"
                  checked={allSelected}
                  ref={(el) => { if (el) el.indeterminate = someSelected && !allSelected }}
                  onChange={toggleAll}
                />
              </th>
            )}
            {columns.map((col) => (
              <th key={col.key}>{col.label}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {data.map((row, idx) => (
            <tr
              key={row.id ?? idx}
              onClick={onRowClick ? () => onRowClick(row) : undefined}
              style={onRowClick ? { cursor: 'pointer' } : undefined}
            >
              {selectable && (
                <td onClick={(e) => e.stopPropagation()}>
                  <input type="checkbox" checked={selectedIds.includes(row.id)} onChange={() => toggleOne(row.id)} />
                </td>
              )}
              {columns.map((col) => (
                <td key={col.key}>{col.render ? col.render(row) : row[col.key]}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}
