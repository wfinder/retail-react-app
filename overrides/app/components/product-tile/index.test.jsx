import React from 'react'
import '@testing-library/jest-dom'
import ProductTile, {Skeleton} from './index'
import ProductTileActions, {isVariationProduct} from './product-tile-actions'
import {render, screen} from '@testing-library/react'
import {IntlProvider} from 'react-intl'
import {BrowserRouter as Router} from 'react-router-dom'
import {ChakraProvider} from '@salesforce/retail-react-app/app/components/shared/ui'
import theme from '@salesforce/retail-react-app/app/theme'
import {
    mockStandardProductHit,
    mockMasterProductHitWithOneVariant
} from '@salesforce/retail-react-app/app/mocks/product-search-hit-data'

jest.mock('@salesforce/retail-react-app/app/components/link', () => ({
    __esModule: true,
    default: ({children, ...props}) => <a {...props}>{children}</a>
}))

jest.mock('@salesforce/retail-react-app/app/hooks/use-toast', () => ({
    useToast: () => jest.fn()
}))

jest.mock('@salesforce/commerce-sdk-react', () => ({
    useShopperBasketsV2MutationHelper: () => ({
        addItemToNewOrExistingBasket: jest.fn().mockResolvedValue(undefined)
    })
}))

jest.mock('@salesforce/retail-react-app/app/hooks', () => ({
    useCurrency: () => ({currency: 'GBP'})
}))

const renderWithProviders = (ui) =>
    render(
        <IntlProvider locale="en-GB" defaultLocale="en-GB">
            <ChakraProvider theme={theme}>
                <Router>{ui}</Router>
            </ChakraProvider>
        </IntlProvider>
    )

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

test('identifies simple vs variation products by hitType', () => {
    expect(isVariationProduct(mockStandardProductHit)).toBe(false)
    expect(isVariationProduct(mockMasterProductHitWithOneVariant)).toBe(true)
})

test('shows pricing skeleton when data is refreshing', () => {
    renderWithProviders(<ProductTile product={mockStandardProductHit} isRefreshingData={true} />)

    expect(screen.getByTestId('sf-product-tile-pricing-and-promotions-skeleton')).toBeInTheDocument()
})

test('renders Skeleton fallback component', () => {
    renderWithProviders(<Skeleton />)

    expect(screen.getByTestId('sf-product-tile-skeleton')).toBeInTheDocument()
})
