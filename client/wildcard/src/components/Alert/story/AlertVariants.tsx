import 'storybook-addon-designs'

import { action } from '@storybook/addon-actions'
import classNames from 'classnames'
import { flow } from 'lodash'
import React from 'react'

import { Alert, AlertProps } from '../Alert'
import styles from '../Alert.module.scss'
import { SEMANTIC_COLORS } from '../constants'
import { preventDefault } from '../utils'

interface AlertVariantsProps extends Pick<AlertProps, 'as'> {
    variants: readonly typeof SEMANTIC_COLORS[number][]
}

export const AlertVariants: React.FunctionComponent<AlertVariantsProps> = ({ variants, as }) => (
    <div>
        {variants.map(variant => (
            <Alert key={variant} as={as} variant={variant}>
                <h4>A shiny {variant} alert - check it out!</h4>
                It can also contain{' '}
                <a href="/" onClick={flow(preventDefault, action(classNames('link clicked', styles.alert)))}>
                    links like this
                </a>
                .
            </Alert>
        ))}
        <Alert className={classNames('d-flex align-items-center', styles.alert, styles.alertInfo)}>
            <div className="flex-grow-1">
                <h4>A shiny info alert with a button - check it out!</h4>
                It can also contain text without links.
            </div>
            <button
                type="button"
                className={classNames('btn btn-info')}
                onClick={flow(preventDefault, action(classNames('button clicked', styles.alert)))}
            >
                Call to action
            </button>
        </Alert>
    </div>
)
