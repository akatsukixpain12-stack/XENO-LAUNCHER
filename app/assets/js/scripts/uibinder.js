/**
 * XENO Launcher UI Binder
 * Minimal initialization — the main UI logic lives in xeno.js.
 */
const ConfigManager = require('./assets/js/configmanager')

let fatalStartupError = false

// Load ConfigManager on startup
try {
    ConfigManager.load()
} catch (err) {
    console.error('Failed to load config:', err)
    fatalStartupError = true
}
