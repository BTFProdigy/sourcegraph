import { Meta } from '@storybook/react'
import React from 'react'

import { BrandedStory } from '@sourcegraph/branded/src/components/BrandedStory'
import webStyles from '@sourcegraph/web/src/SourcegraphWebApp.scss'

import { SourcegraphIcon } from '../SourcegraphIcon'

import { Icon } from './Icon'

const Story: Meta = {
    title: 'wildcard/Icon',

    decorators: [
        // eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
        story => (
            <BrandedStory styles={webStyles}>{() => <div className="container mt-3">{story()}</div>}</BrandedStory>
        ),
    ],

    parameters: {
        component: Icon,
        design: {
            type: 'figma',
            name: 'Figma',
            url: 'https://www.figma.com/file/NIsN34NH7lPu04olBzddTw/Wildcard-Design-System?node-id=908%3A1',
        },
    },
}

export default Story

// eslint-disable-next-line @typescript-eslint/explicit-module-boundary-types
export const Simple = () => (
    <>
        <h3>Default Icon</h3>
        <Icon svg={<SourcegraphIcon />} variant="inline" />

        <h3>Inline Medium icon</h3>
        <Icon svg={<SourcegraphIcon />} variant="inline-md" />
    </>
)
