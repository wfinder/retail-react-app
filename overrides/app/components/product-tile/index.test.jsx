import React from 'react'
import '@testing-library/jest-dom'
import ProductTile, {Skeleton} from './index'
import ProductTileActions, {isVariationProduct} from './product-tile-actions'
import {render, screen, fireEvent, waitFor} from '@testing-library/react'
import {IntlProvider} from 'react-intl'
import {BrowserRouter as Router} from 'react-router-dom'
import {ChakraProvider} from '@salesforce/retail-react-app/app/components/shared/ui'
import theme from '@salesforce/retail-react-app/app/theme'
import {
    mockStandardProductHit,
    mockMasterProductHitWithOneVariant
} from '@salesforce/retail-react-app/app/mocks/product-search-hit-data'

const mockOpenQuickView = jest.fn()
const mockToast = jest.fn()
const mockAddItemToNewOrExistingBasket = jest.fn().mockResolvedValue(undefined)

jest.mock('@salesforce/retail-react-app/app/components/shared/ui', () => {
    const React = require('react')
    const actual = jest.requireActual('@salesforce/retail-react-app/app/components/shared/ui')

    return {
        ...actual,
        Button: React.forwardRef(
            ({onClick, children, isDisabled, isLoading, colorScheme, variant, width, ...props}, ref) => (
                <button
                    ref={ref}
                    type="button"
                    onClick={onClick}
                    data-disabled={isDisabled || isLoading ? 'true' : 'false'}
                    data-testid={props['data-testid']}
                >
                    {children}
                </button>
            )
        )
    }
})

jest.mock('@salesforce/retail-react-app/app/components/link', () => ({
    __esModule: true,
    default: ({children, ...props}) => <a {...props}>{children}</a>
}))

jest.mock('@salesforce/retail-react-app/app/hooks/use-toast', () => ({
    useToast: () => mockToast
}))

jest.mock('@salesforce/commerce-sdk-react', () => ({
    useShopperBasketsV2MutationHelper: () => ({
        addItemToNewOrExistingBasket: mockAddItemToNewOrExistingBasket
    })
}))

jest.mock('@salesforce/retail-react-app/app/hooks', () => ({
    useCurrency: () => ({currency: 'GBP'})
}))

jest.mock('@salesforce/retail-react-app/app/components/quantity-picker', () => ({
    __esModule: true,
    default: ({onChange, value}) => (
        <div>
            <button
                type="button"
                data-testid="quantity-increment"
                onClick={() => onChange('2', 2)}
            >
                Increment
            </button>
            <button
                type="button"
                data-testid="quantity-clear"
                onClick={() => onChange('', '')}
            >
                Clear
            </button>
            <button
                type="button"
                data-testid="quantity-invalid"
                onClick={() => onChange('0', 0)}
            >
                Invalid
            </button>
            <span data-testid="quantity-value">{value}</span>
        </div>
    )
}))

jest.mock('../../hooks/use-quick-view-modal', () => ({
    useQuickViewModal: () => ({
        openQuickView: mockOpenQuickView,
        closeQuickView: jest.fn(),
        isOpen: false,
        product: null
    })
}))

const renderWithProviders = (ui) =>
    render(
        <IntlProvider locale="en-GB" defaultLocale="en-GB">
            <ChakraProvider theme={theme}>
                <Router>{ui}</Router>
            </ChakraProvider>
        </IntlProvider>
    )

beforeEach(() => {
    mockOpenQuickView.mockClear()
    mockToast.mockClear()
    mockAddItemToNewOrExistingBasket.mockReset()
    mockAddItemToNewOrExistingBasket.mockResolvedValue(undefined)
})

test('renders add to cart and quantity controls for simple products', () => {
    renderWithProviders(<ProductTile product={mockStandardProductHit} />)

    expect(screen.getByTestId('product-tile')).toBeInTheDocument()
    expect(screen.getByTestId('product-tile-add-to-cart-button')).toBeInTheDocument()
    expect(screen.getByText(/Qty/i)).toBeInTheDocument()
    expect(screen.queryByTestId('product-tile-choose-options-button')).not.toBeInTheDocument()
})

test('renders choose options button for variation products', () => {
    renderWithProviders(<ProductTileActions product={mockMasterProductHitWithOneVariant} />)

    expect(screen.getByTestId('product-tile-choose-options-button')).toBeInTheDocument()
    expect(screen.queryByTestId('product-tile-add-to-cart-button')).not.toBeInTheDocument()
    expect(screen.queryByText(/Qty/i)).not.toBeInTheDocument()
})

test('opens quick view when choose options is clicked', () => {
    renderWithProviders(<ProductTileActions product={mockMasterProductHitWithOneVariant} />)

    fireEvent.click(screen.getByTestId('product-tile-choose-options-button'))

    expect(mockOpenQuickView).toHaveBeenCalledWith(mockMasterProductHitWithOneVariant)
})

test('identifies simple vs variation products by hitType', () => {
    expect(isVariationProduct(mockStandardProductHit)).toBe(false)
    expect(isVariationProduct(mockMasterProductHitWithOneVariant)).toBe(true)
    expect(isVariationProduct({variants: [{productId: 'variant-1'}]})).toBe(true)
    expect(isVariationProduct(undefined)).toBe(false)
})

test('shows pricing skeleton when data is refreshing', () => {
    renderWithProviders(<ProductTile product={mockStandardProductHit} isRefreshingData={true} />)

    expect(screen.getByTestId('sf-product-tile-pricing-and-promotions-skeleton')).toBeInTheDocument()
})

test('renders Skeleton fallback component', () => {
    renderWithProviders(<Skeleton />)

    expect(screen.getByTestId('sf-product-tile-skeleton')).toBeInTheDocument()
})

test('updates quantity when quantity picker changes', () => {
    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('quantity-increment'))

    expect(screen.getByTestId('quantity-value')).toHaveTextContent('2')
})

test('ignores invalid quantity values', () => {
    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('quantity-invalid'))

    expect(screen.getByTestId('quantity-value')).toHaveTextContent('1')
})

test('uses productName when name is missing in success toast', async () => {
    const product = {
        ...mockStandardProductHit,
        name: undefined,
        productName: 'Named Via Product Name'
    }

    renderWithProviders(<ProductTileActions product={product} />)

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                status: 'success'
            })
        )
    })
})

test('allows clearing quantity input', () => {
    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('quantity-clear'))

    expect(screen.getByTestId('quantity-value')).toHaveTextContent('')
    expect(screen.getByTestId('product-tile-add-to-cart-button')).toHaveAttribute(
        'data-disabled',
        'true'
    )
})

test('adds simple product to cart and shows success toast', async () => {
    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    await waitFor(() => {
        expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledWith([
            {
                productId: mockStandardProductHit.productId,
                price: mockStandardProductHit.price,
                quantity: 1
            }
        ])
    })

    expect(mockToast).toHaveBeenCalledWith(
        expect.objectContaining({
            status: 'success'
        })
    )
})

test('uses representedProduct id when productId is missing', async () => {
    const product = {
        productName: 'Fallback Product',
        price: 12.5,
        representedProduct: {id: 'represented-id'}
    }

    renderWithProviders(<ProductTileActions product={product} />)

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    await waitFor(() => {
        expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledWith([
            {
                productId: 'represented-id',
                price: 12.5,
                quantity: 1
            }
        ])
    })
})

test('shows error toast when add to cart fails with a message', async () => {
    mockAddItemToNewOrExistingBasket.mockRejectedValueOnce(new Error('Out of stock'))

    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Out of stock',
                status: 'error'
            })
        )
    })
})

test('shows generic error toast when add to cart fails without a message', async () => {
    mockAddItemToNewOrExistingBasket.mockRejectedValueOnce({})

    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    await waitFor(() => {
        expect(mockToast).toHaveBeenCalledWith(
            expect.objectContaining({
                title: 'Unable to add item to cart',
                status: 'error'
            })
        )
    })
})

test('does not add to cart while a previous request is in progress', async () => {
    let resolveAdd
    mockAddItemToNewOrExistingBasket.mockImplementation(
        () =>
            new Promise((resolve) => {
                resolveAdd = resolve
            })
    )

    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    await waitFor(() => {
        expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledTimes(1)
    })

    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    expect(mockAddItemToNewOrExistingBasket).toHaveBeenCalledTimes(1)

    resolveAdd()
    await waitFor(() => {
        expect(mockToast).toHaveBeenCalled()
    })
})

test('does not add to cart when quantity is below one', async () => {
    renderWithProviders(<ProductTileActions product={mockStandardProductHit} />)

    fireEvent.click(screen.getByTestId('quantity-clear'))
    fireEvent.click(screen.getByTestId('product-tile-add-to-cart-button'))

    expect(mockAddItemToNewOrExistingBasket).not.toHaveBeenCalled()
})
