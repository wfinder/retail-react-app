import React from 'react'
import '@testing-library/jest-dom'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {IntlProvider} from 'react-intl'
import {ChakraProvider} from '@salesforce/retail-react-app/app/components/shared/ui'
import theme from '@salesforce/retail-react-app/app/theme'
import {
    ensureProductMasterLink,
    getInitialVariationValues,
    normalizeSearchHitForQuickView
} from './index'
import {mockMasterProductHitWithOneVariant} from '@salesforce/retail-react-app/app/mocks/product-search-hit-data'

const mockCloseQuickView = jest.fn()
const mockAddItemToNewOrExistingBasket = jest.fn().mockResolvedValue(undefined)
const mockUseProductViewModal = jest.fn()

jest.mock('@salesforce/retail-react-app/app/components/product-view', () => ({
    __esModule: true,
    default: ({addToCart, onVariationChange, controlledVariationValues, product}) => (
        <div data-testid="product-view">
            <span data-testid="product-view-name">{product?.name || product?.productName}</span>
            <span data-testid="product-view-variations">{JSON.stringify(controlledVariationValues)}</span>
            <button
                type="button"
                data-testid="product-view-change-variation"
                onClick={() => onVariationChange('color', 'RED')}
            >
                Change variation
            </button>
            <button
                type="button"
                data-testid="product-view-add-to-cart"
                onClick={() =>
                    addToCart([
                        {
                            variant: {productId: 'variant-id', price: 19.99},
                            quantity: 2,
                            product: {id: 'variant-id', price: 19.99}
                        }
                    ])
                }
            >
                Add to cart
            </button>
            <button
                type="button"
                data-testid="product-view-add-to-cart-product-only"
                onClick={() =>
                    addToCart([
                        {
                            quantity: 1,
                            product: {id: 'product-only-id', price: 9.99}
                        }
                    ])
                }
            >
                Add product only
            </button>
            <button
                type="button"
                data-testid="product-view-add-to-cart-empty"
                onClick={() => addToCart()}
            >
                Add empty selection
            </button>
        </div>
    )
}))

jest.mock('@salesforce/retail-react-app/app/hooks/use-product-view-modal', () => ({
    useProductViewModal: (...args) => mockUseProductViewModal(...args)
}))

jest.mock('@salesforce/commerce-sdk-react', () => ({
    useShopperBasketsV2MutationHelper: () => ({
        addItemToNewOrExistingBasket: mockAddItemToNewOrExistingBasket
    })
}))

const mockUseQuickViewModal = jest.fn()

jest.mock('../../hooks/use-quick-view-modal', () => ({
    useQuickViewModal: () => mockUseQuickViewModal()
}))

import QuickViewModal from './index'

const renderWithProviders = (ui) =>
    render(
        <IntlProvider locale="en-GB" defaultLocale="en-GB">
            <ChakraProvider theme={theme}>{ui}</ChakraProvider>
        </IntlProvider>
    )

const productWithSingleValueAttribute = {
    ...mockMasterProductHitWithOneVariant,
    variationAttributes: [
        {
            id: 'color',
            values: [{value: 'BLACKWL'}]
        }
    ]
}

beforeEach(() => {
    mockCloseQuickView.mockClear()
    mockAddItemToNewOrExistingBasket.mockReset()
    mockAddItemToNewOrExistingBasket.mockResolvedValue(undefined)
    mockUseQuickViewModal.mockReturnValue({
        isOpen: true,
        product: mockMasterProductHitWithOneVariant,
        openQuickView: jest.fn(),
        closeQuickView: mockCloseQuickView
    })
    mockUseProductViewModal.mockImplementation((product) => ({
        product,
        isFetching: false
    }))
})

test('normalizeSearchHitForQuickView maps search hit fields', () => {
    const normalized = normalizeSearchHitForQuickView(mockMasterProductHitWithOneVariant)

    expect(normalized.productId).toBe(mockMasterProductHitWithOneVariant.productId)
    expect(normalized.variants).toEqual(mockMasterProductHitWithOneVariant.variants)
    expect(normalized.variationAttributes).toEqual(
        mockMasterProductHitWithOneVariant.variationAttributes
    )
})

test('normalizeSearchHitForQuickView returns defaults for missing product', () => {
    expect(normalizeSearchHitForQuickView(null)).toEqual({
        productId: undefined,
        variants: [],
        variationAttributes: []
    })
})

test('normalizeSearchHitForQuickView uses id when productId is missing', () => {
    const normalized = normalizeSearchHitForQuickView({
        id: 'product-id-only',
        name: 'Named Product'
    })

    expect(normalized.productId).toBe('product-id-only')
    expect(normalized.id).toBe('product-id-only')
    expect(normalized.name).toBe('Named Product')
})

test('getInitialVariationValues seeds from representedProduct', () => {
    const initialValues = getInitialVariationValues(mockMasterProductHitWithOneVariant)

    expect(initialValues).toEqual(
        mockMasterProductHitWithOneVariant.variants[0].variationValues
    )
})

test('getInitialVariationValues returns empty object when representedProduct is missing', () => {
    expect(getInitialVariationValues({variants: [{productId: 'variant-1'}]})).toEqual({})
})

test('getInitialVariationValues returns empty object when variant has no variationValues', () => {
    const product = {
        representedProduct: {id: 'variant-1'},
        variants: [{productId: 'variant-1'}]
    }

    expect(getInitialVariationValues(product)).toEqual({})
})

test('ensureProductMasterLink adds masterId for search hits', () => {
    const enriched = ensureProductMasterLink(mockMasterProductHitWithOneVariant)

    expect(enriched.master.masterId).toBe(mockMasterProductHitWithOneVariant.productId)
})

test('ensureProductMasterLink returns product unchanged when product is missing', () => {
    expect(ensureProductMasterLink(null)).toBe(null)
})

test('ensureProductMasterLink returns product unchanged when masterId cannot be derived', () => {
    const product = {name: 'No identifiers'}

    expect(ensureProductMasterLink(product)).toBe(product)
})

test('ensureProductMasterLink preserves existing master metadata', () => {
    const product = {
        productId: 'master-id',
        master: {masterId: 'existing-master-id', extra: 'value'}
    }

    expect(ensureProductMasterLink(product).master).toEqual({
        masterId: 'existing-master-id',
        extra: 'value'
    })
})

test('renders quick view modal when open', () => {
    renderWithProviders(<QuickViewModal />)

    expect(screen.getByTestId('quick-view-modal')).toBeInTheDocument()
    expect(screen.getByTestId('product-view')).toBeInTheDocument()
    expect(screen.getByTestId('product-view-variations').textContent).toContain('BLACKWL')
})

test('does not render quick view modal when closed', () => {
    mockUseQuickViewModal.mockReturnValue({
        isOpen: false,
        product: null,
        openQuickView: jest.fn(),
        closeQuickView: mockCloseQuickView
    })

    renderWithProviders(<QuickViewModal />)

    expect(screen.queryByTestId('quick-view-modal')).not.toBeInTheDocument()
})

test('shows loading state while product details are fetching', () => {
    mockUseProductViewModal.mockReturnValue({
        product: null,
        isFetching: true
    })

    renderWithProviders(<QuickViewModal />)

    expect(screen.getByText('Loading product details...')).toBeInTheDocument()
    expect(screen.queryByTestId('product-view')).not.toBeInTheDocument()
})

test('renders nothing when product details are unavailable', () => {
    mockUseProductViewModal.mockReturnValue({
        product: null,
        isFetching: false
    })

    renderWithProviders(<QuickViewModal />)

    expect(screen.queryByTestId('product-view')).not.toBeInTheDocument()
    expect(screen.queryByText('Loading product details...')).not.toBeInTheDocument()
})

test('keeps the last loaded product visible while refetching', async () => {
    const loadedProduct = {
        ...mockMasterProductHitWithOneVariant,
        name: 'Loaded Product'
    }

    mockUseProductViewModal.mockReturnValue({
        product: loadedProduct,
        isFetching: false
    })

    const {rerender} = renderWithProviders(<QuickViewModal />)

    await waitFor(() => {
        expect(screen.getByTestId('product-view-name')).toHaveTextContent('Loaded Product')
    })

    mockUseProductViewModal.mockReturnValue({
        product: null,
        isFetching: true
    })

    rerender(
        <IntlProvider locale="en-GB" defaultLocale="en-GB">
            <ChakraProvider theme={theme}>
                <QuickViewModal />
            </ChakraProvider>
        </IntlProvider>
    )

    expect(screen.getByTestId('product-view-name')).toHaveTextContent('Loaded Product')
})

test('adds product-only selections to cart when variant data is missing', async () => {
    renderWithProviders(<QuickViewModal />)

    fireEvent.click(screen.getByTestId('product-view-add-to-cart-product-only'))

    await waitFor(() => {
        expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledWith([
            {
                productId: 'product-only-id',
                price: 9.99,
                quantity: 1
            }
        ])
    })

    expect(mockCloseQuickView).toHaveBeenCalled()
})

test('handles add to cart with no selected products', async () => {
    renderWithProviders(<QuickViewModal />)

    fireEvent.click(screen.getByTestId('product-view-add-to-cart-empty'))

    await waitFor(() => {
        expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledWith([])
    })

    expect(mockCloseQuickView).toHaveBeenCalled()
})

test('auto-selects single-value variation attributes', () => {
    mockUseQuickViewModal.mockReturnValue({
        isOpen: true,
        product: productWithSingleValueAttribute,
        openQuickView: jest.fn(),
        closeQuickView: mockCloseQuickView
    })

    renderWithProviders(<QuickViewModal />)

    expect(screen.getByTestId('product-view-variations').textContent).toContain('BLACKWL')
})

test('updates controlled variation values when a selection changes', () => {
    renderWithProviders(<QuickViewModal />)

    fireEvent.click(screen.getByTestId('product-view-change-variation'))

    expect(screen.getByTestId('product-view-variations').textContent).toContain('RED')
})

test('adds selected variants to cart and closes the modal', async () => {
    renderWithProviders(<QuickViewModal />)

    fireEvent.click(screen.getByTestId('product-view-add-to-cart'))

    await waitFor(() => {
        expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledWith([
            {
                productId: 'variant-id',
                price: 19.99,
                quantity: 2
            }
        ])
    })

    expect(mockCloseQuickView).toHaveBeenCalled()
})
