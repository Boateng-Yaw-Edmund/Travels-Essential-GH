import { fireEvent, render, screen, waitFor, within } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from '../src/App'

describe('Travel Essentials GH storefront', () => {
  it('renders the core storefront landmarks and business identity', () => {
    render(<App />)

    expect(screen.getByRole('banner')).toBeInTheDocument()
    expect(screen.getByRole('main')).toBeInTheDocument()
    expect(screen.getByRole('contentinfo')).toBeInTheDocument()
    expect(screen.getAllByRole('link', { name: /travel essentials gh/i }).length).toBeGreaterThan(0)
    expect(screen.getByRole('heading', { name: /pack smarter/i })).toBeInTheDocument()
  })

  it('filters products through search and shows an empty state', () => {
    render(<App />)
    const search = screen.getByRole('searchbox', { name: /search products/i })

    fireEvent.change(search, { target: { value: 'passport' } })
    expect(screen.getAllByTestId('product-card')).toHaveLength(1)

    fireEvent.change(search, { target: { value: 'not-a-product' } })
    expect(screen.getByText(/no travel essentials match/i)).toBeInTheDocument()
  })

  it('shows progress before adding a product and displays a dismissible success message', async () => {
    render(<App />)
    const packingButton = screen.getByRole('button', { name: 'Packing Cubes', pressed: false })

    fireEvent.click(packingButton)
    expect(packingButton).toHaveAttribute('aria-pressed', 'true')

    const product = screen.getAllByTestId('product-card')[0]
    const addButton = within(product).getByRole('button', { name: /add .* to cart/i })
    fireEvent.click(addButton)

    expect(within(product).getByRole('button', { name: /adding .* to cart/i })).toBeDisabled()
    expect(screen.getByLabelText(/cart with 0 items/i)).toBeInTheDocument()

    const search = screen.getByRole('searchbox', { name: /search products/i })
    fireEvent.change(search, { target: { value: 'passport' } })
    fireEvent.change(search, { target: { value: '' } })
    const remountedProduct = screen.getAllByTestId('product-card')[0]
    expect(within(remountedProduct).getByRole('button', { name: /adding .* to cart/i })).toBeDisabled()

    expect(await screen.findByLabelText(/cart with 1 item/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent(/added to your cart/i)

    fireEvent.click(screen.getByRole('button', { name: /dismiss cart notification/i }))
    expect(screen.queryByRole('status')).not.toBeInTheDocument()
  })

  it('supports category cards, explore all, and footer category shortcuts', () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Packing CubesA place for everything' }))
    expect(screen.getAllByTestId('product-card')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: /explore all/i }))
    expect(screen.getAllByTestId('product-card')).toHaveLength(5)

    const footer = screen.getByRole('contentinfo')
    fireEvent.click(within(footer).getByRole('button', { name: 'Passport Covers' }))
    expect(screen.getAllByTestId('product-card')).toHaveLength(1)

    fireEvent.click(screen.getByRole('button', { name: 'All', pressed: false }))
    expect(screen.getAllByTestId('product-card')).toHaveLength(5)
  })

  it('selects an available suitcase colour and carries it into the cart', async () => {
    render(<App />)
    const search = screen.getByRole('searchbox', { name: /search products/i })
    fireEvent.change(search, { target: { value: 'suitcase' } })

    const suitcase = screen.getByTestId('product-card')
    expect(within(suitcase).getByText(/colour: mint green/i)).toBeInTheDocument()

    fireEvent.click(within(suitcase).getByRole('button', { name: /select pink/i }))
    expect(within(suitcase).getByText(/colour: pink/i)).toBeInTheDocument()
    expect(within(suitcase).getByRole('img', { name: /cabin suitcase in pink product photograph/i })).toBeInTheDocument()

    fireEvent.change(search, { target: { value: 'passport' } })
    fireEvent.change(search, { target: { value: 'suitcase' } })
    const remountedSuitcase = screen.getByTestId('product-card')
    expect(within(remountedSuitcase).getByText(/colour: pink/i)).toBeInTheDocument()

    fireEvent.click(within(remountedSuitcase).getByRole('button', { name: /add cabin suitcase in pink to cart/i }))
    expect(await screen.findByRole('status')).toHaveTextContent(/cabin suitcase in pink added to your cart/i)

    fireEvent.click(screen.getByRole('button', { name: /cart with 1 item/i }))
    const dialog = screen.getByRole('dialog', { name: /shopping cart/i })
    expect(within(dialog).getByText('Colour: Pink')).toBeInTheDocument()
  })

  it('queues confirmations when different products are added together', async () => {
    render(<App />)
    const productCards = screen.getAllByTestId('product-card')

    fireEvent.click(within(productCards[0]).getByRole('button', { name: /add .* to cart/i }))
    fireEvent.click(within(productCards[1]).getByRole('button', { name: /add .* to cart/i }))

    expect(await screen.findByLabelText(/cart with 2 items/i)).toBeInTheDocument()
    expect(screen.getByRole('status')).toHaveTextContent('Classic Passport Cover added to your cart.')

    fireEvent.click(screen.getByRole('button', { name: /dismiss cart notification/i }))
    expect(screen.getByRole('status')).toHaveTextContent('9-Piece Packing Cube Set added to your cart.')
  })

  it('validates and accepts the mock newsletter form without navigation', () => {
    render(<App />)
    const email = screen.getByRole('textbox', { name: /email address/i })
    const submit = screen.getByRole('button', { name: /join the list/i })

    fireEvent.change(email, { target: { value: 'invalid' } })
    fireEvent.click(submit)
    expect(screen.getByText(/enter a valid email/i)).toBeInTheDocument()

    fireEvent.change(email, { target: { value: 'traveller@example.com' } })
    fireEvent.click(submit)
    expect(screen.getByText(/no email was submitted or stored/i)).toBeInTheDocument()
  })

  it('opens the cart as a modal, manages focus, and updates quantities', async () => {
    render(<App />)
    fireEvent.click(screen.getByRole('button', { name: /add classic passport cover to cart/i }))

    const cartTrigger = await screen.findByRole('button', { name: /cart with 1 item/i })
    fireEvent.click(cartTrigger)

    const dialog = screen.getByRole('dialog', { name: /shopping cart/i })
    const closeButton = within(dialog).getByRole('button', { name: /close cart/i })
    await waitFor(() => expect(closeButton).toHaveFocus())

    fireEvent.click(within(dialog).getByRole('button', { name: /increase classic passport cover quantity/i }))
    expect(within(dialog).getByText('GH₵259.00')).toBeInTheDocument()

    fireEvent.click(within(dialog).getByRole('button', { name: /decrease classic passport cover quantity/i }))
    expect(within(dialog).getAllByText('GH₵129.50')).toHaveLength(2)

    fireEvent.click(closeButton)
    await waitFor(() => expect(cartTrigger).toHaveFocus())
  })

  it('opens and closes the mobile menu with accessible state', () => {
    render(<App />)
    const toggle = screen.getByRole('button', { name: /open navigation/i })

    fireEvent.click(toggle)
    expect(toggle).toHaveAttribute('aria-expanded', 'true')

    fireEvent.keyDown(document, { key: 'Escape' })
    expect(toggle).toHaveAttribute('aria-expanded', 'false')
  })
})
