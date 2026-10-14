export const productPhotos = (product, base) => {
  const names = Array.isArray(product?.imagens) ? product.imagens : (product?.imagem && product.imagem !== 'avatar.png' ? [product.imagem] : [])
  return [...new Set(names)].slice(0, 6).map(name => `${base}/${encodeURIComponent(name)}`)
}
