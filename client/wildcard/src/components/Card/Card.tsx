import classNames from 'classnames'
import React, { ReactNode } from 'react'

import styles from './Card.module.scss'
import { CardBody, CardHeader, CardSubtitle, CardTitle } from './components'
import { CARD_VARIANTS } from './constants'

interface CardProps extends Omit<React.HTMLAttributes<HTMLDivElement>, 'title'> {
    header?: ReactNode
    title?: ReactNode
    subtitle?: ReactNode
    /**
     * Interactive variant, shows blue border on hover and focus
     */
    variant?: typeof CARD_VARIANTS[number]
}

/**
 * Card Element
 */
export const Card: React.FunctionComponent<CardProps> = ({
    header,
    title,
    subtitle,
    children,
    className,
    variant = 'default',
    ...attributes
}) => {
    const cardHeader = header && <CardHeader>{header}</CardHeader>
    const cardTitle = title && <CardTitle>{title}</CardTitle>
    const cardSubtitle = subtitle && <CardSubtitle>{subtitle}</CardSubtitle>
    const cardBody =
        title || subtitle ? (
            <CardBody>
                {cardTitle}
                {cardSubtitle}
                {children}
            </CardBody>
        ) : (
            children
        )

    return (
        <div
            className={classNames(styles.card, className, variant === 'interactive' && styles.cardInteractive)}
            {...attributes}
        >
            {cardHeader}
            {cardBody}
        </div>
    )
}
