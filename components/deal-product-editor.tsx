'use client'

import { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'
import { Edit2, Check, X, Loader2, DollarSign, Package } from 'lucide-react'
import { toast } from 'sonner'
import { updateDealValueAndProduct } from '@/app/actions/call-analysis'
import { getAllProducts } from '@/app/actions/products'
import { Product } from '@/lib/types'
import { useRouter } from 'next/navigation'

interface DealProductEditorProps {
  callAnalysisId: string
  initialValue?: number
  initialProductId?: string
  canEdit: boolean
}

export function DealProductEditor({ callAnalysisId, initialValue, initialProductId, canEdit }: DealProductEditorProps) {
  const router = useRouter()
  const [isEditing, setIsEditing] = useState(false)
  const [value, setValue] = useState(initialValue?.toString() || '0')
  const [productId, setProductId] = useState(initialProductId || '')
  const [isLoading, setIsLoading] = useState(false)
  const [products, setProducts] = useState<Product[]>([])

  const selectedProduct = products.find(p => p._id?.toString() === productId)

  useEffect(() => {
    const fetchProducts = async () => {
      try {
        const data = await getAllProducts()
        setProducts(data.filter(p => p.isActive))
      } catch (error) {
        console.error('Error fetching products:', error)
      }
    }

    if (isEditing) {
      fetchProducts()
    }
  }, [isEditing])

  const formatValue = (val?: number) => {
    if (!val) return '—'
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency: 'EUR',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0
    }).format(val)
  }

  const handleSave = async () => {
    setIsLoading(true)
    try {
      const numericValue = value && value.trim() !== '' ? parseFloat(value.replace(/[^\d.-]/g, '')) : 0
      const result = await updateDealValueAndProduct(callAnalysisId, numericValue, productId || null)

      if (result.success) {
        toast.success('Montant et produit mis à jour')
        setIsEditing(false)
        router.refresh()
      } else {
        toast.error(result.message || 'Erreur lors de la mise à jour')
      }
    } catch (error) {
      console.error('Error updating deal value and product:', error)
      toast.error('Une erreur est survenue')
    } finally {
      setIsLoading(false)
    }
  }

  const handleCancel = () => {
    setValue(initialValue?.toString() || '0')
    setProductId(initialProductId || '')
    setIsEditing(false)
  }

  // Auto-fill price when product is selected
  const handleProductChange = (newProductId: string) => {
    setProductId(newProductId)
    if (newProductId) {
      const product = products.find(p => p._id?.toString() === newProductId)
      if (product) {
        setValue(product.price.toString())
      }
    }
  }

  if (!canEdit) {
    return (
      <div className="space-y-3">
        <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
          <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-gray-700 mb-0.5">Montant du deal</div>
            <div className="text-lg font-semibold text-gray-900">
              {formatValue(initialValue)}
            </div>
          </div>
        </div>
        {selectedProduct && (
          <div className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
            <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
            <div className="flex-1">
              <div className="text-xs text-gray-700 mb-0.5">Produit vendu</div>
              <div className="text-sm font-semibold text-gray-900">
                {selectedProduct.name}
              </div>
              {selectedProduct.category && (
                <div className="text-xs text-gray-700">
                  {selectedProduct.category}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    )
  }

  if (isEditing) {
    return (
      <div className="space-y-3 p-4 rounded-lg border-2 border-emerald-400 bg-white shadow-sm">
        {/* Deal Value */}
        <div className="flex items-center gap-3">
          <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="text-xs text-gray-800 font-medium">Montant du deal</div>
            <div className="relative">
              <Input
                type="number"
                value={value}
                onChange={(e) => setValue(e.target.value)}
                className="text-lg text-gray-800 font-semibold pr-8 h-9 border-emerald-300 focus:border-emerald-500 focus:ring-emerald-500 [appearance:textfield] [&::-webkit-outer-spin-button]:appearance-none [&::-webkit-inner-spin-button]:appearance-none"
                disabled={isLoading}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') {
                    handleSave()
                  } else if (e.key === 'Escape') {
                    handleCancel()
                  }
                }}
              />
              <span className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-800 text-sm font-medium">€</span>
            </div>
          </div>
        </div>

        {/* Product Selection */}
        <div className="flex items-center gap-3">
          <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1 space-y-2">
            <div className="text-xs text-gray-800 font-medium">Produit vendu</div>
            <Select value={productId || 'none'} onValueChange={(val) => handleProductChange(val === 'none' ? '' : val)} disabled={isLoading}>
              <SelectTrigger className="h-9 border-blue-300 focus:border-blue-500 focus:ring-blue-500">
                <SelectValue placeholder="Sélectionner un produit..." />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none" className="text-gray-700">Aucun produit sélectionné</SelectItem>
                {products.map((product) => (
                  <SelectItem key={product._id?.toString()} value={product._id?.toString() || 'unknown'}>
                    <div className="flex items-center justify-between w-full">
                      <div>
                        <div className="font-medium text-gray-900">{product.name}</div>
                        {product.category && (
                          <div className="text-xs text-gray-700">{product.category}</div>
                        )}
                      </div>
                      <div className="text-sm text-gray-800 ml-2">
                        {formatValue(product.price)}
                      </div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 pt-2">
          <Button
            size="sm"
            onClick={handleSave}
            disabled={isLoading}
            className="h-7 text-xs bg-emerald-600 hover:bg-emerald-700"
          >
            {isLoading ? (
              <>
                <Loader2 className="h-3 w-3 mr-1 animate-spin" />
                Sauvegarde...
              </>
            ) : (
              <>
                <Check className="h-3 w-3 mr-1" />
                Sauver
              </>
            )}
          </Button>
          <Button
            size="sm"
            variant="outline"
            onClick={handleCancel}
            disabled={isLoading}
            className="h-7 text-xs text-gray-800 border-gray-300 hover:bg-gray-50"
          >
            <X className="h-3 w-3 mr-1" />
            Annuler
          </Button>
        </div>
      </div>
    )
  }

  return (
    <div className="space-y-3">
      <div
        className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-emerald-400 hover:bg-emerald-50 transition-all cursor-pointer"
        onClick={() => {
          setValue(initialValue?.toString() || '')
          setProductId(initialProductId || '')
          setIsEditing(true)
        }}
      >
        <DollarSign className="h-5 w-5 text-emerald-600 flex-shrink-0" />
        <div className="flex-1">
          <div className="text-xs text-gray-700 mb-0.5">Montant du deal</div>
          <div className="text-lg font-semibold text-gray-900">
            {formatValue(initialValue)}
          </div>
        </div>
        <Edit2 className="h-4 w-4 text-gray-600" />
      </div>

      {selectedProduct ? (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border border-gray-200 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
          onClick={() => {
            setValue(initialValue?.toString() || '')
            setProductId(initialProductId || '')
            setIsEditing(true)
          }}
        >
          <Package className="h-5 w-5 text-blue-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-gray-700 mb-0.5">Produit vendu</div>
            <div className="text-sm font-semibold text-gray-900">
              {selectedProduct.name}
            </div>
            {selectedProduct.category && (
              <div className="text-xs text-gray-700">
                {selectedProduct.category}
              </div>
            )}
          </div>
          <Edit2 className="h-4 w-4 text-gray-600" />
        </div>
      ) : (
        <div
          className="flex items-center gap-3 p-3 rounded-lg border border-dashed border-gray-300 hover:border-blue-400 hover:bg-blue-50 transition-all cursor-pointer"
          onClick={() => {
            setValue(initialValue?.toString() || '')
            setProductId('')
            setIsEditing(true)
          }}
        >
          <Package className="h-5 w-5 text-gray-600 flex-shrink-0" />
          <div className="flex-1">
            <div className="text-xs text-gray-700 mb-0.5">Produit vendu</div>
            <div className="text-sm text-gray-700 italic">
              Cliquer pour sélectionner un produit
            </div>
          </div>
          <Edit2 className="h-4 w-4 text-gray-600" />
        </div>
      )}
    </div>
  )
}