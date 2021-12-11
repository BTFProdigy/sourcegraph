import { render } from '@testing-library/react'
import React from 'react'

import { Link, AnchorLink, setLinkComponent } from './Link'

describe('Link', () => {
    it('renders link correctly', () => {
        setLinkComponent(AnchorLink)
        const { asFragment } = render(<Link to="#"> Link to docs </Link>)
        expect(asFragment()).toMatchSnapshot()
    })
})
