import { useEffect } from 'react'
import { useHistory, useLocation } from 'react-router'

import { getUrlQuery } from '../utils'

interface UseConnectionURLParameters {
    enabled?: boolean
    first: number
    initialFirst: number
    visible: number
}

/**
 * This hook replicates how FilteredConnection updates the URL when key variables change.
 */
export const useConnectionUrl = ({ enabled, first, initialFirst, visible }: UseConnectionURLParameters): void => {
    const location = useLocation()
    const history = useHistory()
    const searchFragment = getUrlQuery({
        first,
        initialFirst,
        visible,
        location,
    })

    useEffect(() => {
        if (enabled && searchFragment && location.search !== `?${searchFragment}`) {
            history.replace({
                search: searchFragment,
                hash: location.hash,
            })
        }
    }, [enabled, history, location.hash, location.search, searchFragment])
}