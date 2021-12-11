import path from 'path'

import webpack from 'webpack'

import { ROOT_PATH, NODE_MODULES_PATH } from '../paths'

/**
 * Generates array of CSS loaders both for regular CSS and CSS modules.
 * Useful to ensure that we use the same configuration for shared loaders: postcss-loader, sass-loader, etc.
 * */
export const getCSSLoaders = (...loaders: webpack.RuleSetUseItem[]): webpack.RuleSetUse => [
    ...loaders,
    'postcss-loader',
    {
        loader: 'sass-loader',
        options: {
            sassOptions: {
                includePaths: [NODE_MODULES_PATH, path.resolve(ROOT_PATH, 'client')],
            },
        },
    },
]
