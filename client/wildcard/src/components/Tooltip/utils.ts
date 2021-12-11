import { Tooltip } from './constants'

/**
 * Find the nearest ancestor element to e that contains a tooltip.
 */
export const getSubject = (element: HTMLElement | null): HTMLElement | undefined => {
    while (element) {
        if (element === document.body) {
            break
        }
        if (element.hasAttribute(Tooltip.SUBJECT_ATTRIBUTE)) {
            // If e is not actually attached to the DOM, then abort.
            if (!document.body.contains(element)) {
                return undefined
            }
            return element
        }
        element = element.parentElement
    }
    return undefined
}

export const getContent = (subject: HTMLElement): string | undefined => {
    if (!document.body.contains(subject)) {
        return undefined
    }
    return subject.getAttribute(Tooltip.SUBJECT_ATTRIBUTE) || undefined
}

export const getPlacement = (subject: HTMLElement): string | undefined => {
    if (!document.body.contains(subject)) {
        return undefined
    }
    return subject.getAttribute(Tooltip.PLACEMENT_ATTRIBUTE) || undefined
}

export const getDelay = (subject: HTMLElement): number | undefined => {
    if (!document.body.contains(subject)) {
        return undefined
    }
    const dataDelay = subject.getAttribute(Tooltip.DELAY_ATTRIBUTE)
    return dataDelay ? parseInt(dataDelay, 10) : undefined
}

/**
 * Sets or removes a plain-text tooltip on the HTML element using the native style for Sourcegraph
 * web app.
 *
 * @param element The HTML element whose tooltip to set or remove.
 * @param tooltip The tooltip plain-text content (to add the tooltip) or `null` (to remove the
 * tooltip).
 */
export function setElementTooltip(element: HTMLElement, tooltip: string | null): void {
    if (tooltip) {
        element.dataset.tooltip = tooltip
    } else {
        element.removeAttribute(Tooltip.SUBJECT_ATTRIBUTE)
    }
}
