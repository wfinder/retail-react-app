/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {useState} from 'react'
import PropTypes from 'prop-types'
import {useIntl} from 'react-intl'
import {
    Button,
    HStack,
    Stack,
    Text
} from '@salesforce/retail-react-app/app/components/shared/ui'
import QuantityPicker from '@salesforce/retail-react-app/app/components/quantity-picker'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import {useShopperBasketsV2MutationHelper as useShopperBasketsMutationHelper} from '@salesforce/commerce-sdk-react'
import {useQuickViewModal} from '../../hooks/use-quick-view-modal'

/**
 * Search results from SCAPI use hitType to describe the product shape:
 * - "product" = a single SKU that can be purchased as-is
 * - "master"  = a parent product with variants (e.g. color and size)
 *
 * We only allow add-to-cart on simple products because the tile has no way to
 * pick a variant. Variation products open a quick view modal instead.
 */
export const isVariationProduct = (product) =>
    product?.hitType === 'master' || Boolean(product?.variants?.length)

/**
 * Tile-level actions below the product image: add-to-cart for simple products,
 * or a quick view entry point for variation products.
 */
const ProductTileActions = ({product}) => {
    const intl = useIntl()
    const toast = useToast()
    const {openQuickView} = useQuickViewModal()
    const {addItemToNewOrExistingBasket} = useShopperBasketsMutationHelper()

    const [quantity, setQuantity] = useState(1)
    const [isAdding, setIsAdding] = useState(false)

    const localizedProductName = product.name ?? product.productName
    const selectedQuantity = quantity ?? 1
    const isVariation = isVariationProduct(product)

    const handleQuantityChange = (stringValue, numberValue) => {
        if (numberValue >= 1) {
            setQuantity(numberValue)
        } else if (stringValue === '') {
            setQuantity(stringValue)
        }
    }

    const handleAddToCart = async () => {
        if (isAdding || selectedQuantity < 1) {
            return
        }

        setIsAdding(true)
        try {
            await addItemToNewOrExistingBasket([
                {
                    productId: product?.productId || product?.representedProduct?.id,
                    price: product?.price,
                    quantity: selectedQuantity
                }
            ])

            toast({
                title: intl.formatMessage(
                    {
                        id: 'product_tile.toast.added_to_cart',
                        defaultMessage: 'Added {productName} to cart'
                    },
                    {productName: localizedProductName}
                ),
                status: 'success'
            })
        } catch (error) {
            toast({
                title:
                    typeof error?.message === 'string'
                        ? error.message
                        : intl.formatMessage({
                              id: 'product_tile.toast.add_to_cart_error',
                              defaultMessage: 'Unable to add item to cart'
                          }),
                status: 'error'
            })
        } finally {
            setIsAdding(false)
        }
    }

    const handleChooseOptionsClick = () => {
        openQuickView(product)
    }

    if (isVariation) {
        return (
            <Stack spacing={3} mt={3}>
                <Button
                    width="100%"
                    variant="outline"
                    colorScheme="blue"
                    onClick={handleChooseOptionsClick}
                    data-testid="product-tile-choose-options-button"
                >
                    {intl.formatMessage({
                        id: 'product_tile.button.choose_options',
                        defaultMessage: 'Choose options'
                    })}
                </Button>
            </Stack>
        )
    }

    return (
        <Stack spacing={3} mt={3}>
            <HStack justify="space-between" align="center">
                <Text fontSize="sm" color="gray.700">
                    {intl.formatMessage({
                        id: 'product_tile.label.quantity',
                        defaultMessage: 'Qty'
                    })}
                </Text>
                <QuantityPicker
                    productName={localizedProductName}
                    min={1}
                    value={quantity}
                    onChange={handleQuantityChange}
                />
            </HStack>
            <Button
                width="100%"
                colorScheme="blue"
                onClick={handleAddToCart}
                isLoading={isAdding}
                isDisabled={isAdding || selectedQuantity < 1}
                data-testid="product-tile-add-to-cart-button"
            >
                {intl.formatMessage({
                    id: 'product_tile.button.add_to_cart',
                    defaultMessage: 'Add to cart'
                })}
            </Button>
        </Stack>
    )
}

ProductTileActions.propTypes = {
    product: PropTypes.object.isRequired
}

export default ProductTileActions
