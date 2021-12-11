import { startCase } from 'lodash'
import React from 'react'
import 'storybook-addon-designs'

import { ButtonLink, ButtonLinkProps } from '../ButtonLink'
import { BUTTON_VARIANTS } from '../constants'

import styles from './ButtonLinkVariants.module.scss'

interface ButtonVariantsProps extends Pick<ButtonLinkProps, 'target' | 'rel'> {
    variants: readonly typeof BUTTON_VARIANTS[number][]
    icon?: React.ComponentType<{ className?: string }>
}

export const ButtonLinkVariants: React.FunctionComponent<ButtonVariantsProps> = ({
    variants,
    rel,
    target,
    icon: Icon,
}) => (
    <div className={styles.grid}>
        {variants.map(variant => (
            <React.Fragment key={variant}>
                <ButtonLink target={rel} to={target}>
                    {Icon && <Icon className="icon-inline mr-1" />}
                    {startCase(variant)}
                </ButtonLink>
                <ButtonLink target={rel} to={target} className="focus">
                    {Icon && <Icon className="icon-inline mr-1" />}
                    Focus
                </ButtonLink>
                <ButtonLink target={rel} to={target} disabled={true}>
                    {Icon && <Icon className="icon-inline mr-1" />}
                    Disabled
                </ButtonLink>
            </React.Fragment>
        ))}
    </div>
)
