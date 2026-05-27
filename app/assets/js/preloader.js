const { ipcRenderer } = require('electron')
const fs = require('fs-extra')
const os = require('os')
const path = require('path')

const ConfigManager = require('./configmanager')
const { LoggerUtil } = require('helios-core')

const logger = LoggerUtil.getLogger('Preloader')

logger.info('Loading..')

// Load ConfigManager
ConfigManager.load()

// Signal main process that we are ready
ipcRenderer.send('distributionIndexDone', true)

// Clean up temp dir in case previous launches ended unexpectedly.
fs.remove(path.join(os.tmpdir(), ConfigManager.getTempNativeFolder()), (err) => {
    if (err) {
        logger.warn('Error while cleaning natives directory', err)
    } else {
        logger.info('Cleaned natives directory.')
    }
})
