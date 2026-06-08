/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react'
import {Box} from '@salesforce/retail-react-app/app/components/shared/ui'

/**
 * PWA Kit extensibility uses two related ideas:
 *
 * 1. Override (shadowing): A file in /overrides with the same path as the base
 *    template replaces that file at build time. package.json points to this via
 *    ccExtensibility.overridesDir.
 *
 * 2. Extend (composition): Instead of copying the entire base component, import
 *    it from @salesforce/retail-react-app and wrap it with your custom behavior.
 *    That way you inherit bug fixes and new features from Salesforce automatically.
 */
import BaseProductTile, {
    Skeleton as BaseProductTileSkeleton
} from '@salesforce/retail-react-app/app/components/product-tile'
import ProductTileActions from './product-tile-actions'

/**
 * Re-export the base Skeleton unchanged.
 *
 * Other parts of the app (for example, product list loading states) import
 * {Skeleton} from the product-tile module. Re-exporting keeps the same public
 * API while avoiding duplicated loading UI code.
 */
export {BaseProductTileSkeleton as Skeleton}

/**
 * Custom ProductTile that extends the Retail React App default.
 *
 * Simple products (hitType "product") get a quantity picker and add-to-cart.
 * Variation products (hitType "master") get a "Choose options" button that
 * opens the global quick view modal.
 */
const ProductTile = (props) => {
    const {product, ...rest} = props

    return (
        <Box>
            <BaseProductTile product={product} {...rest} />

            <ProductTileActions product={product} />
        </Box>
    )
}

ProductTile.propTypes = BaseProductTile.propTypes
ProductTile.displayName = 'ProductTile'

export default ProductTile
