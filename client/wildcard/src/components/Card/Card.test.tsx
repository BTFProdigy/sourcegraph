import { render, screen } from '@testing-library/react'
import React from 'react'

import { Card } from './Card'

describe('Card', () => {
    it('renders card correctly', () => {
        const { asFragment } = render(
            <Card title="card title" subtitle="card subtitle" variant="interactive">
                <div>Card Body</div>
            </Card>
        )

        expect(screen.getByText(/card title/)).toHaveClass('cardTitle')
        expect(screen.getByText(/card subtitle/)).toHaveClass('cardSubtitle')
        expect(asFragment()).toMatchSnapshot()
    })
})
