/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {useCallback, useEffect, useMemo, useRef, useState} from 'react'
import {
    Box,
    Modal,
    ModalBody,
    ModalCloseButton,
    ModalContent,
    ModalOverlay,
    Text
} from '@salesforce/retail-react-app/app/components/shared/ui'
import ProductView from '@salesforce/retail-react-app/app/components/product-view'
import {useProductViewModal} from '@salesforce/retail-react-app/app/hooks/use-product-view-modal'
import {useIntl} from 'react-intl'
import {useShopperBasketsV2MutationHelper as useShopperBasketsMutationHelper} from '@salesforce/commerce-sdk-react'
import {productViewModalTheme} from '@salesforce/retail-react-app/app/theme/components/project/product-view-modal'
import {useQuickViewModal} from '../../hooks/use-quick-view-modal'

export const normalizeSearchHitForQuickView = (product) => {
    if (!product) {
        return {productId: undefined, variants: [], variationAttributes: []}
    }

    const id = product.productId || product.id

    return {
        productId: id,
        id,
        variants: product.variants || [],
        variationAttributes: product.variationAttributes || [],
        imageGroups: product.imageGroups || [],
        type: product.type || product.productType || {set: false, bundle: false},
        price: product.price,
        name: product.name || product.productName,
        representedProduct: product.representedProduct
    }
}

export const getInitialVariationValues = (product) => {
    if (!product?.representedProduct?.id || !product?.variants?.length) {
        return {}
    }

    const defaultVariant = product.variants.find(
        ({productId}) => productId === product.representedProduct.id
    )

    return defaultVariant?.variationValues ? {...defaultVariant.variationValues} : {}
}

/**
 * ProductView's "See full details" link reads product.master.masterId. That exists
 * on variant API responses but not on search hits or master product records, so we
 * derive it from the master productId before rendering ProductView.
 */
export const ensureProductMasterLink = (product) => {
    if (!product) {
        return product
    }

    const masterId = product.master?.masterId || product.productId || product.id

    if (!masterId) {
        return product
    }

    return {
        ...product,
        master: {
            ...(product.master || {}),
            masterId
        }
    }
}

const useQuickViewVariations = (product) => {
    const [controlledVariationValues, setControlledVariationValues] = useState({})

    useEffect(() => {
        const initialValues = getInitialVariationValues(product)
        const autoSelections = {}

        product?.variationAttributes?.forEach((attr) => {
            if (attr.values?.length === 1) {
                autoSelections[attr.id] = attr.values[0].value
            }
        })

        setControlledVariationValues({...initialValues, ...autoSelections})
    }, [product?.productId])

    const handleVariationChange = useCallback((attributeId, value) => {
        setControlledVariationValues((prev) => ({
            ...prev,
            [attributeId]: value
        }))
    }, [])

    return {controlledVariationValues, handleVariationChange}
}

const QuickViewModalContent = ({product, onClose}) => {
    const intl = useIntl()
    const {addItemToNewOrExistingBasket} = useShopperBasketsMutationHelper()
    const safeProduct = useMemo(() => normalizeSearchHitForQuickView(product), [product])
    const {controlledVariationValues, handleVariationChange} = useQuickViewVariations(product)
    const productViewModalData = useProductViewModal(safeProduct, controlledVariationValues, {
        keepPreviousData: true
    })
    const lastLoadedProductRef = useRef(productViewModalData.product)

    useEffect(() => {
        if (productViewModalData.product && !productViewModalData.isFetching) {
            lastLoadedProductRef.current = productViewModalData.product
        }
    }, [productViewModalData.product, productViewModalData.isFetching])

    const stableProductViewModalData = useMemo(
        () => ({
            ...productViewModalData,
            product:
                productViewModalData.isFetching && lastLoadedProductRef.current
                    ? lastLoadedProductRef.current
                    : productViewModalData.product
        }),
        [productViewModalData]
    )

    const productToRender = ensureProductMasterLink(stableProductViewModalData.product)
    const localizedProductName = product?.name ?? product?.productName

    const handleAddToCart = useCallback(
        async (productSelectionValues = []) => {
            const productItems = productSelectionValues.map(({variant, quantity, product: selectedProduct}) => ({
                productId: variant?.productId || selectedProduct?.id,
                price: variant?.price || selectedProduct?.price,
                quantity
            }))

            await addItemToNewOrExistingBasket(productItems)
            onClose()

            return productSelectionValues
        },
        [addItemToNewOrExistingBasket, onClose]
    )

    const label = intl.formatMessage(
        {
            id: 'quick_view.modal.label',
            defaultMessage: 'Quick view for {productName}'
        },
        {productName: localizedProductName}
    )

    return (
        <ModalContent
            containerProps={{'data-testid': 'quick-view-modal'}}
            aria-label={label}
            margin={productViewModalTheme.layout.content.margin}
            borderRadius={productViewModalTheme.layout.content.borderRadius}
            maxHeight={productViewModalTheme.layout.content.maxHeight}
            overflowY={productViewModalTheme.layout.content.overflowY}
            bg={productViewModalTheme.layout.content.background}
        >
            <ModalCloseButton size="sm" />
            <ModalBody
                bg={productViewModalTheme.layout.body.background}
                px={productViewModalTheme.layout.body.padding}
                pt={productViewModalTheme.layout.body.marginTop}
                pb={productViewModalTheme.layout.body.paddingBottom}
            >
                {stableProductViewModalData.isFetching && !productToRender ? (
                    <Box p={8} textAlign="center">
                        <Text>
                            {intl.formatMessage({
                                id: 'quick_view.message.loading',
                                defaultMessage: 'Loading product details...'
                            })}
                        </Text>
                    </Box>
                ) : productToRender ? (
                    <ProductView
                        showFullLink={true}
                        imageSize={productViewModalTheme.productView.imageSize}
                        showImageGallery={productViewModalTheme.productView.showImageGallery}
                        product={productToRender}
                        isLoading={stableProductViewModalData.isFetching}
                        addToCart={handleAddToCart}
                        isProductLoading={false}
                        showReviews={true}
                        showVariationAttributes={true}
                        alignItems="stretch"
                        controlledVariationValues={controlledVariationValues}
                        onVariationChange={handleVariationChange}
                    />
                ) : null}
            </ModalBody>
        </ModalContent>
    )
}

const QuickViewModal = () => {
    const {isOpen, product, closeQuickView} = useQuickViewModal()

    if (!isOpen) {
        return null
    }

    return (
        <Modal
            size={productViewModalTheme.modal.size}
            isOpen={isOpen}
            onClose={closeQuickView}
            scrollBehavior={productViewModalTheme.modal.scrollBehavior}
            isCentered
        >
            <ModalOverlay />
            <QuickViewModalContent product={product} onClose={closeQuickView} />
        </Modal>
    )
}

export default QuickViewModal
