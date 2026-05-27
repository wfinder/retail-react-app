/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {useMemo, useRef, useState} from 'react'
import PropTypes from 'prop-types'
import DisplayPrice from '@salesforce/retail-react-app/app/components/display-price'

import {
    AspectRatio,
    Badge,
    Box,
    Button,
    Skeleton as ChakraSkeleton,
    Text,
    Stack,
    useMultiStyleConfig,
    IconButton,
    HStack
} from '@salesforce/retail-react-app/app/components/shared/ui'
import DynamicImage from '@salesforce/retail-react-app/app/components/dynamic-image'
import QuantityPicker from '@salesforce/retail-react-app/app/components/quantity-picker'

// Project Components
import {HeartIcon, HeartSolidIcon} from '@salesforce/retail-react-app/app/components/icons'
import Link from '@salesforce/retail-react-app/app/components/link'
import Swatch from '@salesforce/retail-react-app/app/components/swatch-group/swatch'
import SwatchGroup from '@salesforce/retail-react-app/app/components/swatch-group'
import withRegistration from '@salesforce/retail-react-app/app/components/with-registration'
import PromoCallout from '@salesforce/retail-react-app/app/components/product-tile/promo-callout'
import {useToast} from '@salesforce/retail-react-app/app/hooks/use-toast'
import {useShopperBasketsV2MutationHelper as useShopperBasketsMutationHelper} from '@salesforce/commerce-sdk-react'

// Hooks
import {useIntl} from 'react-intl'

// Other
import {
    PRODUCT_TILE_IMAGE_VIEW_TYPE,
    PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID
} from '@salesforce/retail-react-app/app/constants'
import {productUrlBuilder, rebuildPathWithParams} from '@salesforce/retail-react-app/app/utils/url'
import {getPriceData} from '@salesforce/retail-react-app/app/utils/product-utils'
import {useCurrency} from '@salesforce/retail-react-app/app/hooks'
import {
    filterImageGroups,
    getDecoratedVariationAttributes
} from '@salesforce/retail-react-app/app/utils/product-utils'
import {PRODUCT_BADGE_DETAILS} from '@salesforce/retail-react-app/app/constants'

const IconButtonWithRegistration = withRegistration(IconButton)

// Component Skeleton
const PricingAndPromotionsSkeleton = () => {
    return (
        <Stack spacing={2} data-testid="sf-product-tile-pricing-and-promotions-skeleton">
            <ChakraSkeleton width="80px" height="20px" />
            <ChakraSkeleton width={{base: '120px', md: '220px'}} height="12px" />
        </Stack>
    )
}

export const Skeleton = () => {
    const styles = useMultiStyleConfig('ProductTile')
    return (
        <Box data-testid="sf-product-tile-skeleton">
            <Stack spacing={2}>
                <Box {...styles.imageWrapper}>
                    <AspectRatio ratio={1} {...styles.image}>
                        <ChakraSkeleton />
                    </AspectRatio>
                </Box>
                <PricingAndPromotionsSkeleton />
            </Stack>
        </Box>
    )
}

/**
 * The ProductTile is a simple visual representation of a
 * product object. It will show its default image, name and price.
 * It also supports favourite products, controlled by a heart icon.
 */
const ProductTile = (props) => {
    const {
        dynamicImageProps,
        enableFavourite = false,
        imageViewType = PRODUCT_TILE_IMAGE_VIEW_TYPE,
        isFavourite,
        onFavouriteToggle,
        product,
        selectableAttributeId = PRODUCT_TILE_SELECTABLE_ATTRIBUTE_ID,
        badgeDetails = PRODUCT_BADGE_DETAILS,
        isRefreshingData = false,
        ...rest
    } = props
    const {imageGroups, productId, representedProduct, variants} = product

    const intl = useIntl()
    const {currency} = useCurrency()
    const isFavouriteLoading = useRef(false)
    const styles = useMultiStyleConfig('ProductTile')
    const toast = useToast()
    const {addItemToNewOrExistingBasket} = useShopperBasketsMutationHelper()

    const [selectableAttributeValue, setSelectableAttributeValue] = useState(
        !!variants && !!representedProduct
            ? variants?.find((variant) => variant.productId == product.representedProduct.id)
                  ?.variationValues?.[selectableAttributeId]
            : undefined
    )
    const [quantity, setQuantity] = useState(1)
    const [isAdding, setIsAdding] = useState(false)

    const selectedQuantity = quantity ?? 1

    // Primary image for the tile, the image is determined from the product and selected variation attributes.
    const image = useMemo(() => {
        const hasSelectableAttribute = product?.variationAttributes?.find(
            ({id}) => id === selectableAttributeId
        )

        const variationValues = {[selectableAttributeId]: selectableAttributeValue}
        const filteredImageGroups = filterImageGroups(imageGroups, {
            viewType: imageViewType,
            variationValues: hasSelectableAttribute ? variationValues : {}
        })

        return filteredImageGroups?.[0]?.images[0]
    }, [product, selectableAttributeId, selectableAttributeValue, imageViewType])

    // Primary URL user to wrap the ProductTile.
    const productUrl = useMemo(
        () =>
            rebuildPathWithParams(productUrlBuilder({id: productId}), {
                [selectableAttributeId]: selectableAttributeValue
            }),
        [product, selectableAttributeId, selectableAttributeValue]
    )

    // NOTE: variationAttributes are only defined for master/variant type products.
    const variationAttributes = useMemo(() => getDecoratedVariationAttributes(product), [product])

    // ProductTile is used by two components, RecommendedProducts and ProductList.
    // RecommendedProducts provides a localized product name as `name` and non-localized product
    // name as `productName`. ProductList provides a localized name as `productName` and does not
    // use the `name` property.
    const localizedProductName = product.name ?? product.productName

    const productWithFilteredVariants = useMemo(() => {
        const filteredVariants = product?.variants?.filter(
            ({variationValues}) =>
                variationValues[selectableAttributeId] === selectableAttributeValue
        )
        return {
            ...product,
            variants: filteredVariants
        }
    }, [product, selectableAttributeId, selectableAttributeValue])

    const selectedProduct = useMemo(() => {
        return productWithFilteredVariants?.variants?.[0] || product
    }, [productWithFilteredVariants, product])

    const priceData = useMemo(() => {
        return getPriceData(productWithFilteredVariants)
    }, [productWithFilteredVariants])

    const filteredLabels = useMemo(() => {
        const labelsMap = new Map()
        if (product?.representedProduct) {
            badgeDetails.forEach((item) => {
                if (
                    item.propertyName &&
                    typeof product.representedProduct[item.propertyName] === 'boolean' &&
                    product.representedProduct[item.propertyName] === true
                ) {
                    labelsMap.set(intl.formatMessage(item.label), item.color)
                }
            })
        }
        return labelsMap
    }, [product, badgeDetails])

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
                    productId: selectedProduct?.productId || selectedProduct?.id,
                    price: selectedProduct?.price,
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

    return (
        <Box {...styles.container}>
            <Link data-testid="product-tile" to={productUrl} {...styles.link} {...rest}>
                <Box {...styles.imageWrapper}>
                    <AspectRatio {...styles.image}>
                        <DynamicImage
                            data-testid="product-tile-image"
                            src={`${
                                image?.disBaseLink ||
                                image?.link ||
                                product?.image?.disBaseLink ||
                                product?.image?.link
                            }[?sw={width}&q=60]`}
                            widths={dynamicImageProps?.widths}
                            imageProps={{
                                alt: '',
                                loading: 'lazy',
                                ...dynamicImageProps?.imageProps
                            }}
                        />
                    </AspectRatio>
                </Box>

                {variationAttributes
                    ?.filter(({id}) => selectableAttributeId === id)
                    ?.map(({id, name, values}) => (
                        <SwatchGroup
                            ariaLabel={name}
                            key={id}
                            value={selectableAttributeValue}
                            handleChange={(value) => {
                                setSelectableAttributeValue(value)
                            }}
                        >
                            {values?.map(({name, swatch, value}) => {
                                const content = swatch ? (
                                    <Box
                                        height="100%"
                                        width="100%"
                                        minWidth="32px"
                                        backgroundRepeat="no-repeat"
                                        backgroundSize="cover"
                                        backgroundColor={name.toLowerCase()}
                                        backgroundImage={`url(${
                                            swatch?.disBaseLink || swatch.link
                                        })`}
                                    />
                                ) : (
                                    name
                                )

                                return (
                                    <Swatch
                                        key={value}
                                        value={value}
                                        name={name}
                                        variant={'circle'}
                                        isFocusable={true}
                                    >
                                        {content}
                                    </Swatch>
                                )
                            })}
                        </SwatchGroup>
                    ))}

                <Text {...styles.title}>{localizedProductName}</Text>

                {isRefreshingData ? (
                    <PricingAndPromotionsSkeleton />
                ) : (
                    <>
                        <DisplayPrice priceData={priceData} currency={currency} />
                        {shouldShowPromoCallout(productWithFilteredVariants) && (
                            <PromoCallout product={productWithFilteredVariants} />
                        )}
                    </>
                )}
            </Link>

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

            {enableFavourite && (
                <Box
                    onClick={(e) => {
                        e.preventDefault()
                    }}
                >
                    <IconButtonWithRegistration
                        data-testid="wishlist-button"
                        aria-label={
                            isFavourite
                                ? intl.formatMessage(
                                      {
                                          id: 'product_tile.assistive_msg.remove_from_wishlist',
                                          defaultMessage: 'Remove {product} from wishlist'
                                      },
                                      {product: localizedProductName}
                                  )
                                : intl.formatMessage(
                                      {
                                          id: 'product_tile.assistive_msg.add_to_wishlist',
                                          defaultMessage: 'Add {product} to wishlist'
                                      },
                                      {product: localizedProductName}
                                  )
                        }
                        icon={isFavourite ? <HeartSolidIcon /> : <HeartIcon />}
                        {...styles.favIcon}
                        onClick={async () => {
                            if (!isFavouriteLoading.current) {
                                isFavouriteLoading.current = true
                                await onFavouriteToggle(!isFavourite)
                                isFavouriteLoading.current = false
                            }
                        }}
                    />
                </Box>
            )}
            {filteredLabels.size > 0 && (
                <HStack {...styles.badgeGroup}>
                    {Array.from(filteredLabels.entries()).map(([label, colorScheme]) => (
                        <Badge key={label} data-testid="product-badge" colorScheme={colorScheme}>
                            {label}
                        </Badge>
                    ))}
                </HStack>
            )}
        </Box>
    )
}

ProductTile.displayName = 'ProductTile'

ProductTile.propTypes = {
    /**
     * The product search hit that will be represented in this
     * component.
     */
    product: PropTypes.shape({
        currency: PropTypes.string,
        image: PropTypes.shape({
            alt: PropTypes.string,
            disBaseLink: PropTypes.string,
            link: PropTypes.string
        }),
        imageGroups: PropTypes.array,
        price: PropTypes.number,
        priceRanges: PropTypes.array,
        tieredPrices: PropTypes.array,
        name: PropTypes.string,
        productName: PropTypes.string,
        productId: PropTypes.string,
        productPromotions: PropTypes.array,
        representedProduct: PropTypes.object,
        hitType: PropTypes.string,
        variationAttributes: PropTypes.array,
        variants: PropTypes.array,
        type: PropTypes.shape({
            set: PropTypes.bool,
            bundle: PropTypes.bool,
            item: PropTypes.bool
        })
    }),
    enableFavourite: PropTypes.bool,
    isFavourite: PropTypes.bool,
    onFavouriteToggle: PropTypes.func,
    imageViewType: PropTypes.string,
    selectableAttributeId: PropTypes.string,
    dynamicImageProps: PropTypes.object,
    badgeDetails: PropTypes.array,
    isRefreshingData: PropTypes.bool
}

export default ProductTile

const shouldShowPromoCallout = (productWithFilteredVariants) => {
    return productWithFilteredVariants.variants
        ? Boolean(productWithFilteredVariants.variants.find((variant) => variant.productPromotions))
        : Boolean(productWithFilteredVariants.productPromotions)
}
