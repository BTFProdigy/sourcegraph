import { render } from '@testing-library/react'
import React from 'react'

import { ButtonLink } from './ButtonLink'
import { AnchorLink, setLinkComponent } from './Link'

describe('Button link', () => {
    test('renders correctly', () => {
        setLinkComponent(AnchorLink)
        const { asFragment } = render(<ButtonLink to="http://example.com">Button link</ButtonLink>)
        expect(asFragment()).toMatchSnapshot()
    })
})
