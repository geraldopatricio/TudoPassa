const textOrder = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

export function sortProducts(products, column, direction = 'asc') {
  if (!column) return products
  const sign = direction === 'desc' ? -1 : 1
  const value = product => column === 'preco'
    ? Number(product.variantes?.[0]?.valor_unitario) || 0
    : String(product[column] ?? '')
  return [...products].sort((a, b) => sign * (column === 'preco'
    ? value(a) - value(b)
    : textOrder.compare(value(a), value(b))))
}
