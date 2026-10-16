import { test } from 'node:test'
import assert from 'node:assert/strict'
import { sortProducts } from './productSort.js'

const products = [
  { referencia: '20', descricao: 'Camisa B', categoria: 'Z', variantes: [{ valor_unitario: 100 }] },
  { referencia: '3', descricao: 'Camisa A', categoria: 'A', variantes: [{ valor_unitario: '9' }] },
  { referencia: '100', descricao: 'Camisa C', categoria: 'B', variantes: [{ valor_unitario: 20 }] }
]
test('default preserves server chronology and column sorting leaves original untouched', () => {
  assert.equal(sortProducts(products, ''), products)
  assert.deepEqual(sortProducts(products, 'referencia').map(p => p.referencia), ['3', '20', '100'])
  assert.equal(products[0].referencia, '20')
})
test('prices sort numerically in both directions across the whole catalog', () => {
  assert.deepEqual(sortProducts(products, 'preco').map(p => p.referencia), ['3', '100', '20'])
  assert.deepEqual(sortProducts(products, 'preco', 'desc').map(p => p.referencia), ['20', '100', '3'])
})
test('description and category support both directions', () => {
  assert.deepEqual(sortProducts(products, 'descricao').map(p => p.referencia), ['3', '20', '100'])
  assert.deepEqual(sortProducts(products, 'categoria', 'desc').map(p => p.referencia), ['20', '100', '3'])
})
