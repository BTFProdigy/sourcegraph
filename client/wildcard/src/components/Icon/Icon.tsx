import classNames from 'classnames'
import React from 'react'

import { ICON_VARIANT } from './constants'
import styles from './Icon.module.scss'
interface IconProps {
    className?: string
    svg: React.SVGAttributes<SVGSVGElement>
    /**
     * The variant style of the icon. defaults to 'inline'
     */
    variant?: typeof ICON_VARIANT[number]
}

export const Icon: React.FunctionComponent<IconProps> = ({ svg, className, variant, ...attributes }) => (
    <div
        className={classNames(styles.iconInline, variant === 'inline-md' && styles.iconInlineMd, className)}
        {...attributes}
    >
        {svg}
    </div>
)
