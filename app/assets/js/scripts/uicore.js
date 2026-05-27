/**
 * Core UI functions for XENO Launcher.
 * Handles window controls, keyboard shortcuts, and basic initialization.
 */
const $ = require('jquery')
const { ipcRenderer, shell, webFrame } = require('electron')
const remote = require('@electron/remote')
const isDev = require('./assets/js/isdev')
const { LoggerUtil } = require('helios-core')

const loggerUICore = LoggerUtil.getLogger('UICore')
const loggerAutoUpdater = LoggerUtil.getLogger('AutoUpdater')

process.traceProcessWarnings = true
process.traceDeprecation = true

window.eval = global.eval = function () {
    throw new Error('Sorry, this app does not support window.eval().')
}

remote.getCurrentWebContents().on('devtools-opened', () => {
    console.log('%cXENO Launcher Console', 'color: #00e676; font-size: 32px; font-weight: bold')
    console.log('%cDo not paste anything here unless you know what you are doing.', 'font-size: 14px; color: #ff5252')
})

webFrame.setZoomLevel(0)
webFrame.setVisualZoomLevelLimits(1, 1)

// Auto-updater (production only)
if (!isDev) {
    ipcRenderer.on('autoUpdateNotification', (event, arg, info) => {
        switch (arg) {
            case 'checking-for-update':
                loggerAutoUpdater.info('Checking for update..')
                break
            case 'update-available':
                loggerAutoUpdater.info('New update available', info.version)
                break
            case 'update-downloaded':
                loggerAutoUpdater.info('Update ' + info.version + ' ready to be installed.')
                break
            case 'update-not-available':
                loggerAutoUpdater.info('No new update found.')
                break
            case 'ready':
                setInterval(() => {
                    ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
                }, 1800000)
                ipcRenderer.send('autoUpdateAction', 'checkForUpdate')
                break
            case 'realerror':
                if (info != null && info.code != null) {
                    loggerAutoUpdater.error('Error during update check..', info)
                }
                break
            default:
                loggerAutoUpdater.info('Unknown argument', arg)
                break
        }
    })
}

document.addEventListener('readystatechange', function () {
    if (document.readyState === 'interactive') {
        loggerUICore.info('UICore Initializing..')

        // Bind close button
        Array.from(document.getElementsByClassName('fCb')).map((val) => {
            val.addEventListener('click', () => {
                remote.getCurrentWindow().close()
            })
        })

        // Bind maximize/restore button
        Array.from(document.getElementsByClassName('fRb')).map((val) => {
            val.addEventListener('click', () => {
                const window = remote.getCurrentWindow()
                if (window.isMaximized()) {
                    window.unmaximize()
                } else {
                    window.maximize()
                }
                document.activeElement.blur()
            })
        })

        // Bind minimize button
        Array.from(document.getElementsByClassName('fMb')).map((val) => {
            val.addEventListener('click', () => {
                remote.getCurrentWindow().minimize()
                document.activeElement.blur()
            })
        })
    }
}, false)

// Open external links in browser
$(document).on('click', 'a[href^="http"]', function (event) {
    event.preventDefault()
    shell.openExternal(this.href)
})

// DevTools shortcut
document.addEventListener('keydown', function (e) {
    if ((e.key === 'I' || e.key === 'i') && e.ctrlKey && e.shiftKey) {
        remote.getCurrentWindow().toggleDevTools()
    }
})
