import classNames from 'classnames'
import * as Popper from 'popper.js'
import React, { useImperativeHandle } from 'react'
import { Tooltip as BootstrapTooltip } from 'reactstrap'

import styles from './Tooltip.module.scss'
import { useTooltipState } from './useTooltipState'

interface TooltipProps {
    className?: string
}

export const Tooltip: React.FunctionComponent<TooltipProps> = React.forwardRef(({ className }, reference) => {
    const { forceUpdate, ...state } = useTooltipState()

    useImperativeHandle(reference, () => ({ forceUpdate }))

    return state.subject && state.content ? (
        <BootstrapTooltip
            // Set key prop to work around a bug where quickly mousing between 2 elements with tooltips
            // displays the 2nd element's tooltip as still pointing to the first.
            key={state.subjectSeq}
            isOpen={true}
            target={state.subject}
            placement={(state.placement ?? 'auto') as Popper.Placement}
            className={classNames(styles.tooltip, className)}
            innerClassName={styles.tooltipInner}
            // This is a workaround to an issue with tooltips in reactstrap that causes the entire page to freeze.
            // Remove when https://github.com/reactstrap/reactstrap/issues/1482 is fixed.
            modifiers={{
                flip: {
                    enabled: false,
                },
                preventOverflow: {
                    boundariesElement: 'window',
                },
            }}
            delay={state.delay}
        >
            {state.content}
        </BootstrapTooltip>
    ) : null
})
