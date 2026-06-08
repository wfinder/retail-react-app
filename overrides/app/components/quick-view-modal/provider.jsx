/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React from 'react'
import PropTypes from 'prop-types'
import {QuickViewModalContext, useQuickViewModalState} from '../../hooks/use-quick-view-modal'

/**
 * Provides quick view open/close state. The modal UI itself is rendered inside
 * AddToCartModalProvider so ProductView can access the add-to-cart modal context.
 */
export const QuickViewModalProvider = ({children}) => {
    const quickViewModal = useQuickViewModalState()

    return (
        <QuickViewModalContext.Provider value={quickViewModal}>
            {children}
        </QuickViewModalContext.Provider>
    )
}

QuickViewModalProvider.propTypes = {
    children: PropTypes.node.isRequired
}
