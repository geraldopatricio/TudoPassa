const textOrder = new Intl.Collator('pt-BR', { numeric: true, sensitivity: 'base' })

export function productStock(product) {
  if (product.estoqueGeral != null && Number.isFinite(Number(product.estoqueGeral))) return Number(product.estoqueGeral)
  return (product.variantes || []).reduce((total, variant) => total + (variant.grade
    ? Object.values(variant.grade).reduce((sum, quantity) => sum + (Number(quantity) || 0), 0)
    : Number(variant.quantidade_total) || 0), 0)
}

export function sortProducts(products, column, direction = 'asc') {
  if (!column) return products
  const sign = direction === 'desc' ? -1 : 1
  const value = product => column === 'preco'
    ? Number(product.variantes?.[0]?.valor_unitario) || 0
    : column === 'estoque' ? productStock(product) : String(product[column] ?? '')
  return [...products].sort((a, b) => sign * (column === 'preco' || column === 'estoque'
    ? value(a) - value(b)
    : textOrder.compare(value(a), value(b))))
}
