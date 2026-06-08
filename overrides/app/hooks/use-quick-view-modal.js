/*
 * Copyright (c) 2022, Salesforce, Inc.
 * All rights reserved.
 * SPDX-License-Identifier: BSD-3-Clause
 * For full license text, see the LICENSE file in the repo root or https://opensource.org/licenses/BSD-3-Clause
 */

import React, {useCallback, useContext, useEffect, useMemo, useState} from 'react'
import {useLocation} from 'react-router-dom'

export const QuickViewModalContext = React.createContext()

export const useQuickViewModal = () => {
    const context = useContext(QuickViewModalContext)

    if (!context) {
        throw new Error('useQuickViewModal must be used within a QuickViewModalProvider')
    }

    return context
}

export const useQuickViewModalState = () => {
    const [isOpen, setIsOpen] = useState(false)
    const [product, setProduct] = useState(null)
    const {pathname} = useLocation()

    useEffect(() => {
        setIsOpen(false)
        setProduct(null)
    }, [pathname])

    const openQuickView = useCallback((nextProduct) => {
        setIsOpen(true)
        setProduct(nextProduct)
    }, [])

    const closeQuickView = useCallback(() => {
        setIsOpen(false)
        setProduct(null)
    }, [])

    return useMemo(
        () => ({
            isOpen,
            product,
            openQuickView,
            closeQuickView
        }),
        [isOpen, product, openQuickView, closeQuickView]
    )
}
