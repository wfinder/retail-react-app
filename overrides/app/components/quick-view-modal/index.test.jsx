import React from 'react'
import '@testing-library/jest-dom'
import {render, screen} from '@testing-library/react'
import {IntlProvider} from 'react-intl'
import {
    ensureProductMasterLink,
    getInitialVariationValues,
    normalizeSearchHitForQuickView
} from './index'
import {mockMasterProductHitWithOneVariant} from '@salesforce/retail-react-app/app/mocks/product-search-hit-data'

jest.mock('@salesforce/retail-react-app/app/components/product-view', () => ({
    __esModule: true,
    default: ({product, controlledVariationValues}) => (
        <div data-testid="product-view">
            <span data-testid="product-view-name">{product?.name || product?.productName}</span>
            <span data-testid="product-view-variations">{JSON.stringify(controlledVariationValues)}</span>
        </div>
    )
}))

jest.mock('@salesforce/retail-react-app/app/hooks/use-product-view-modal', () => ({
    useProductViewModal: (product) => ({
        product,
        isFetching: false
    })
}))

jest.mock('@salesforce/commerce-sdk-react', () => ({
    useShopperBasketsV2MutationHelper: () => ({
        addItemToNewOrExistingBasket: jest.fn().mockResolvedValue(undefined)
    })
}))

const mockCloseQuickView = jest.fn()

jest.mock('../../hooks/use-quick-view-modal', () => ({
    useQuickViewModal: () => ({
        isOpen: true,
        product: mockMasterProductHitWithOneVariant,
        openQuickView: jest.fn(),
        closeQuickView: mockCloseQuickView
    })
}))

import QuickViewModal from './index'

const renderWithProviders = (ui) =>
    render(
        <IntlProvider locale="en-GB" defaultLocale="en-GB">
            {ui}
        </IntlProvider>
    )

test('normalizeSearchHitForQuickView maps search hit fields', () => {
    const normalized = normalizeSearchHitForQuickView(mockMasterProductHitWithOneVariant)

    expect(normalized.productId).toBe(mockMasterProductHitWithOneVariant.productId)
    expect(normalized.variants).toEqual(mockMasterProductHitWithOneVariant.variants)
    expect(normalized.variationAttributes).toEqual(
        mockMasterProductHitWithOneVariant.variationAttributes
    )
})

test('getInitialVariationValues seeds from representedProduct', () => {
    const initialValues = getInitialVariationValues(mockMasterProductHitWithOneVariant)

    expect(initialValues).toEqual(
        mockMasterProductHitWithOneVariant.variants[0].variationValues
    )
})

test('ensureProductMasterLink adds masterId for search hits', () => {
    const enriched = ensureProductMasterLink(mockMasterProductHitWithOneVariant)

    expect(enriched.master.masterId).toBe(mockMasterProductHitWithOneVariant.productId)
})

test('renders quick view modal when open', () => {
    renderWithProviders(<QuickViewModal />)

    expect(screen.getByTestId('quick-view-modal')).toBeInTheDocument()
    expect(screen.getByTestId('product-view')).toBeInTheDocument()
    expect(screen.getByTestId('product-view-variations').textContent).toContain('BLACKWL')
})
