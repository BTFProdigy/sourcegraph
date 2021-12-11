import { boolean } from '@storybook/addon-knobs'
import { Meta } from '@storybook/react'
import SearchIcon from 'mdi-react/SearchIcon'
import React from 'react'

import { BrandedStory } from '@sourcegraph/branded/src/components/BrandedStory'
import webStyles from '@sourcegraph/web/src/SourcegraphWebApp.scss'

import { ButtonLink } from '../ButtonLink'
import { BUTTON_VARIANTS } from '../constants'
import { AnchorLink, setLinkComponent } from '../Link'

import { ButtonLinkVariants } from './ButtonLinkVariants'

const Story: Meta = {
    title: 'wildcard/ButtonLink',

    decorators: [
        story => (
            <BrandedStory styles={webStyles}>{() => <div className="container mt-3">{story()}</div>}</BrandedStory>
        ),
    ],

    parameters: {
        component: ButtonLink,
        design: {
            type: 'figma',
            name: 'Figma',
            url: 'https://www.figma.com/file/NIsN34NH7lPu04olBzddTw/Wildcard-Design-System?node-id=908%3A1',
        },
    },
}

export default Story
setLinkComponent(AnchorLink)

export const Simple = () => (
    <ButtonLink
        // variant={select('Variant', BUTTON_VARIANTS, 'primary')}
        // size={select('Size', BUTTON_SIZES, undefined)}
        disabled={boolean('Disabled', false)}
    >
        Click me!
    </ButtonLink>
)

export const AllButtonLinks = () => (
    <>
        <h1>Buttons</h1>
        <h2>Variants</h2>
        <ButtonLinkVariants variants={BUTTON_VARIANTS} />
        <h2>Icons</h2>
        <p>We can use icons with our buttons.</p>
        <ButtonLinkVariants variants={['danger']} icon={SearchIcon} />
        <ButtonLinkVariants variants={['danger']} icon={SearchIcon} />
        <h2>Smaller</h2>
        <p>We can make our buttons smaller.</p>
        <ButtonLinkVariants variants={['primary']} />
        <h2>Links</h2>
        <p>Links can be made to look like buttons.</p>
        <ButtonLink to="https://example.com" target="_blank" rel="noopener noreferrer" className="mb-3">
            I am a link
        </ButtonLink>
    </>
)
