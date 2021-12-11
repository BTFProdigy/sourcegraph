import { render, RenderResult, cleanup, fireEvent } from '@testing-library/react'
import React from 'react'

import { Tooltip } from './Tooltip'

/*
    https://github.com/react-bootstrap/react-bootstrap/issues/4997
    Popper causes "Warning: `NaN` is an invalid value for the `left` css style property."
    This mock prevents that.
*/
jest.mock('popper.js', () => {
    const StockPopperJs = jest.requireActual('popper.js')

    return function PopperJs() {
        const placements = StockPopperJs.placements

        return {
            destroy: () => {},
            scheduleUpdate: () => {},
            update: () => {},
            placements,
        }
    }
})

const TooltipTest = () => (
    <>
        <Tooltip />
        <div>
            Hover on{' '}
            <strong data-testid="hoverable 1" data-tooltip="Tooltip 1">
                me
            </strong>
            , or{' '}
            <strong data-testid="hoverable 2" data-tooltip="Tooltip 2">
                me
            </strong>
        </div>
    </>
)

describe('Tooltip', () => {
    let queries: RenderResult

    afterEach(cleanup)

    describe('Hoverable Tooltip', () => {
        beforeEach(() => {
            queries = render(<TooltipTest />)
        })

        it('shows tooltip properly on hover', () => {
            fireEvent.mouseOver(queries.getByTestId('hoverable 1'))
            expect(queries.getByText('Tooltip 1')).toBeInTheDocument()
            expect(queries.baseElement).toMatchSnapshot()
        })

        it('Handles multiple tooltips properly', () => {
            fireEvent.mouseOver(queries.getByTestId('hoverable 1'))
            expect(queries.getByText('Tooltip 1')).toBeInTheDocument()
            fireEvent.mouseOver(queries.getByTestId('hoverable 2'))
            expect(queries.queryByText('Tooltip 1')).not.toBeInTheDocument()
            expect(queries.getByText('Tooltip 2')).toBeInTheDocument()
        })
    })
})
