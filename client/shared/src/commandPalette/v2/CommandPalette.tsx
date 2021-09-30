import { Remote } from 'comlink'
import * as H from 'history'
import MagnifyIcon from 'mdi-react/MagnifyIcon'
import CloseCircleIcon from 'mdi-react/CloseCircleIcon'
import React, { useMemo, useCallback, useEffect, useRef } from 'react'
import { Modal } from 'reactstrap'
import { from, Observable } from 'rxjs'
import { filter, map, switchMap } from 'rxjs/operators'

import { ActionItemAction, urlForClientCommandOpen } from '../../actions/ActionItem'
import { wrapRemoteObservable } from '../../api/client/api/common'
import { FlatExtensionHostAPI } from '../../api/contract'
import { haveInitialExtensionsLoaded } from '../../api/features'
import { ContributableMenu } from '../../api/protocol'
import { SourcegraphIcon } from '../../components/SourcegraphIcon'
import { getContributedActionItems } from '../../contributions/contributions'
import { ExtensionsControllerProps } from '../../extensions/controller'
import { PlatformContextProps } from '../../platform/context'
import { TelemetryProps } from '../../telemetry/telemetryService'
import { memoizeObservable } from '../../util/memoizeObservable'
import { useObservable } from '../../util/useObservable'

import styles from './CommandPalette.module.scss'
import { CommandPaletteModesResult } from './components/CommandPaletteModesResult'
import { CommandResult, CommandItem } from './components/CommandResult'
import { FuzzyFinderResult } from './components/FuzzyFinderResult'
import { JumpToLineResult } from './components/JumpToLineResult'
import { JumpToSymbolResult } from './components/JumpToSymbolResult'
import { RecentSearchesResult } from './components/RecentSearchesResult'
import { ShortcutController, KeyboardShortcutWithCallback } from './components/ShortcutController'
import { COMMAND_PALETTE_COMMANDS, CommandPaletteMode } from './constants'
import { useCommandPaletteStore } from './store'
import { Key } from 'ts-key-enum'

const getMode = (text: string): CommandPaletteMode | undefined =>
    Object.values(CommandPaletteMode).find(value => text.startsWith(value))

// Memoize contributions to prevent flashing loading spinners on subsequent mounts
const getContributions = memoizeObservable(
    (extensionHostAPI: Promise<Remote<FlatExtensionHostAPI>>) =>
        from(extensionHostAPI).pipe(switchMap(extensionHost => wrapRemoteObservable(extensionHost.getContributions()))),
    () => 'getContributions' // only one instance
)

// eslint-disable-next-line @typescript-eslint/explicit-function-return-type
function useCommandList(value: string, extensionsController: CommandPaletteProps['extensionsController']) {
    const { extraCommands } = useCommandPaletteStore()

    const extensionContributions = useObservable(
        useMemo(
            () =>
                haveInitialExtensionsLoaded(extensionsController.extHostAPI).pipe(
                    // Don't listen for contributions until all initial extensions have loaded (to prevent UI jitter)
                    filter(haveLoaded => haveLoaded),
                    switchMap(() => getContributions(extensionsController.extHostAPI))
                ),
            [extensionsController]
        )
    )

    const onRunAction = useCallback(
        (action: ActionItemAction['action']) => {
            if (!action.command) {
                // Unexpectedly arrived here; noop actions should not have event handlers that trigger
                // this.
                return
            }

            extensionsController
                .executeCommand({ command: action.command, args: action.commandArguments })
                .catch(error => console.error(error))
        },
        [extensionsController]
    )

    const extensionCommands: CommandItem[] = useMemo(() => {
        if (!extensionContributions) {
            return []
        }
        return getContributedActionItems(extensionContributions, ContributableMenu.CommandPalette).map(
            ({ action, keybinding }) => {
                const href = urlForClientCommandOpen(action, window.location)

                return {
                    id: action.id,
                    title: [action.category, action.title || action.command].filter(Boolean).join(': '),
                    keybindings: keybinding ? [keybinding] : [],
                    onClick: () => {
                        // Don't execute command since clicking on the link will essentially do the same thing.
                        if (!href) {
                            onRunAction(action)
                        }
                    },
                    icon: action.iconURL ?? action.actionItem?.iconURL,
                    href,
                }
            }
        )
    }, [extensionContributions, onRunAction])

    const shortcuts: KeyboardShortcutWithCallback[] = useMemo(
        () =>
            [...extensionCommands, ...COMMAND_PALETTE_COMMANDS]
                .filter(({ keybindings }) => keybindings?.length)
                .map(({ id, keybindings = [], onClick, title }) => ({
                    keybindings,
                    onMatch: onClick,
                    id,
                    title,
                })),
        [extensionCommands]
    )

    const builtInCommands: CommandItem[] = useMemo(
        () => [
            // Note: KEYBOARD_SHORTCUTS are shortcuts are already handled in different places
            ...extraCommands,
            ...COMMAND_PALETTE_COMMANDS,
        ],
        [extraCommands]
    )

    const actions = useMemo(() => [...extensionCommands, ...builtInCommands], [extensionCommands, builtInCommands])

    return { actions, shortcuts }
}

export interface CommandPaletteProps
    extends ExtensionsControllerProps,
        PlatformContextProps<
            'forceUpdateTooltip' | 'settings' | 'requestGraphQL' | 'clientApplication' | 'sourcegraphURL' | 'urlToFile'
        >,
        TelemetryProps {
    initialIsOpen?: boolean
    location: H.Location
    // TODO: different for web and bext. change name
    getAuthenticatedUserID: () => Observable<string | null>
}

/**
 * Note:
- Mention existing (we learned)
    - command palette
    - fuzzy finder
    - builtin actions (aka shortcuts)
    - recent searches
    - symbol mode

Why:
    - Make those cool features ACCESSIBLE, NOTICABLE and better by grouping them in a single awesome cool UI
    - Fast/quick navigation + make users more productive
    - Creating a room for new built-in common commands/patterns
    - Extending an extension API to set shortcut for commands

Future improvements:
    - codehost integration + ability to customize and extend
    - customizing shortcuts for each command

What we learned:
    - value of prototyping
    - a bit more about existing codebase (fuzzy finder, etc)
    - zustand state management
    - pair programming productivty boost

 */

/**
 * EXPERIMENTAL: New command palette (RFC 467)
 *
 * TODO: WRAP WITH ERROR BOUNDARY AT ALL CALL SITES
 *
 * @description this is a singleton component that is always rendered.
 */
export const CommandPalette: React.FC<CommandPaletteProps> = ({
    initialIsOpen = false,
    // TODO: add ability to set default/initial mode
    extensionsController,
    platformContext,
    telemetryService,
    location,
    getAuthenticatedUserID,
}) => {
    const { isOpen, toggleIsOpen, value, setValue } = useCommandPaletteStore()
    const { actions, shortcuts } = useCommandList(value, extensionsController)
    const inputReference = useRef<HTMLInputElement>(null)
    const mode = getMode(value)

    useEffect(() => {
        if (initialIsOpen) {
            toggleIsOpen()
        }
    }, [toggleIsOpen, initialIsOpen])

    const handleClose = useCallback(() => {
        toggleIsOpen()
    }, [toggleIsOpen])

    const handleInputFocus = useCallback(() => {
        inputReference.current?.focus()
    }, [])

    const handleChange = useCallback(
        (event: React.ChangeEvent<HTMLInputElement>) => {
            setValue(event.target.value)
        },
        [setValue]
    )

    const handleClearKeyDown: React.KeyboardEventHandler<HTMLSpanElement> = event => {
        if (event.key === Key.Enter) {
            if (mode) {
                // Clearing when a mode is selected doesn't restore focus to input
                setTimeout(() => {
                    inputReference.current?.focus()
                }, 0)
            }

            event.stopPropagation()
            setValue('')
        }
    }

    const activeTextDocument = useObservable(
        useMemo(
            () =>
                from(extensionsController.extHostAPI).pipe(
                    switchMap(extensionHostAPI => wrapRemoteObservable(extensionHostAPI.getActiveTextDocument()))
                ),
            [extensionsController]
        )
    )

    const workspaceRoot = useObservable(
        useMemo(
            () =>
                from(extensionsController.extHostAPI).pipe(
                    switchMap(extensionHostAPI => wrapRemoteObservable(extensionHostAPI.getWorkspaceRoots())),
                    map(workspaceRoots => workspaceRoots[0])
                ),
            [extensionsController]
        )
    )

    const searchText = mode ? value.slice(1) : value

    return (
        <>
            <ShortcutController shortcuts={shortcuts} />
            {/* Can be rendered at the main app shell level */}

            {isOpen && (
                <Modal
                    isOpen={isOpen}
                    toggle={() => {
                        toggleIsOpen()
                    }}
                    autoFocus={false}
                    backdropClassName={styles.modalBackdrop}
                    keyboard={true}
                    fade={false}
                    className={styles.modalDialog}
                    contentClassName={styles.modalContent}
                    returnFocusAfterClose={false}
                >
                    <div className={styles.inputContainer}>
                        {platformContext.clientApplication === 'sourcegraph' ? (
                            <MagnifyIcon className={styles.inputIcon} />
                        ) : (
                            <SourcegraphIcon className={styles.inputIcon} />
                        )}
                        <input
                            ref={inputReference}
                            autoComplete="off"
                            spellCheck="false"
                            aria-autocomplete="list"
                            className={styles.input}
                            placeholder="Select a mode (prefix or click)"
                            value={value}
                            onChange={handleChange}
                            autoFocus={true}
                            type="text"
                        />
                        {value && (
                            <span
                                role="button"
                                tabIndex={0}
                                data-tooltip="Clear"
                                className={styles.clearInputIcon}
                                onClick={() => setValue('')}
                                onKeyDown={handleClearKeyDown}
                            >
                                <CloseCircleIcon />
                            </span>
                        )}
                    </div>
                    {!mode && <CommandPaletteModesResult onSelect={handleInputFocus} />}
                    {mode === CommandPaletteMode.Command && (
                        <CommandResult actions={actions} value={searchText} onClick={handleClose} />
                    )}
                    {mode === CommandPaletteMode.RecentSearches && (
                        <RecentSearchesResult
                            value={searchText}
                            onClick={handleClose}
                            getAuthenticatedUserID={getAuthenticatedUserID}
                            platformContext={platformContext}
                        />
                    )}
                    {/* TODO: Only when repo open */}
                    {mode === CommandPaletteMode.Fuzzy && (
                        <FuzzyFinderResult
                            value={searchText}
                            onClick={handleClose}
                            workspaceRoot={workspaceRoot}
                            platformContext={platformContext}
                        />
                    )}
                    {/* TODO: Only when code editor open (possibly only when single open TODO) */}
                    {mode === CommandPaletteMode.JumpToLine && (
                        <JumpToLineResult
                            value={searchText}
                            onClick={handleClose}
                            textDocumentData={activeTextDocument}
                        />
                    )}
                    {mode === CommandPaletteMode.JumpToSymbol && (
                        <JumpToSymbolResult
                            value={searchText}
                            onClick={handleClose}
                            textDocumentData={activeTextDocument}
                            platformContext={platformContext}
                        />
                    )}
                </Modal>
            )}
        </>
    )
}
