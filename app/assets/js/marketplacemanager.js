const { ipcRenderer } = require('electron')
const { MARKET_OPCODE } = require('./ipcconstants')
const fs = require('fs-extra')
const path = require('path')

/**
 * MarketplaceManager
 * Handles discovery of different server distributions.
 */
exports.getFeaturedPacks = async function() {
    try {
        const packs = await ipcRenderer.invoke(MARKET_OPCODE.FETCH_ALL)
        return packs
    } catch (err) {
        console.error('Failed to fetch marketplace packs', err)
        return []
    }
}

exports.addPackToLibrary = function(packUrl) {
    // Logic to save a custom pack URL to ConfigManager
}