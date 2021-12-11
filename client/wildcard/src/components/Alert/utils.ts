import styles from './Alert.module.scss'
import { SEMANTIC_COLORS } from './constants'

export const preventDefault = <E extends React.SyntheticEvent>(event: E): E => {
    event.preventDefault()
    return event
}

interface GetAlertStyleParameters {
    variant: typeof SEMANTIC_COLORS[number]
}

// eslint-disable-next-line @typescript-eslint/no-unsafe-return
export const getAlertStyle = ({ variant }: GetAlertStyleParameters): string =>
    `${styles.alert} ${styles[`alert${variant}`]}`
