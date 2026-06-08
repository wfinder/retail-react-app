/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react'
import PropTypes from 'prop-types'
import QuickViewModal from '../components/quick-view-modal'
import {
    AddToCartModalContext,
    useAddToCartModal
} from '@salesforce/retail-react-app/app/hooks/use-add-to-cart-modal'

export {
    AddToCartModalContext,
    useAddToCartModalContext,
    AddToCartModal,
    useAddToCartModal
} from '@salesforce/retail-react-app/app/hooks/use-add-to-cart-modal'

/**
 * ProductView (used inside QuickViewModal) calls useAddToCartModalContext when
 * add-to-cart succeeds. The modal must render inside this provider, not as a
 * sibling of the app shell in _app-config.
 */
export const AddToCartModalProvider = ({children}) => {
    const addToCartModal = useAddToCartModal()

    return (
        <AddToCartModalContext.Provider value={addToCartModal}>
            {children}
            <QuickViewModal />
        </AddToCartModalContext.Provider>
    )
}

AddToCartModalProvider.propTypes = {
    children: PropTypes.node.isRequired
}
