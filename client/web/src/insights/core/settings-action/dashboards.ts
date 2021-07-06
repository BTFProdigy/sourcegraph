import { camelCase } from 'lodash'

import { InsightDashboard } from '../../../schema/settings.schema'
import { INSIGHTS_DASHBOARDS_SETTINGS_KEY } from '../types'

import { modify } from './utils'

/**
 * Adds sanitized dashboard configuration to the settings content.
 *
 * @param settings - original subject settings
 * @param dashboardConfiguration - a dashboard configurations
 */
export function addDashboardToSettings(settings: string, dashboardConfiguration: InsightDashboard): string {
    return modify(
        settings,
        [INSIGHTS_DASHBOARDS_SETTINGS_KEY, camelCase(dashboardConfiguration.title)],
        dashboardConfiguration
    )
}

/**
 * Removes dashboard configurations from jsonc settings string
 *
 * @param settings - settings jsonc string
 * @param dashboardId - dashboard id to remove
 */
export function removeDashboardFromSettings(settings: string, dashboardId: string): string {
    return modify(settings, [INSIGHTS_DASHBOARDS_SETTINGS_KEY, dashboardId], undefined)
}