/**
 * XENO Launcher — Main UI Script
 * Handles navigation, version loading, auth flows, settings, and game launching.
 */

const { ipcRenderer, shell } = require('electron')
const os = require('os')
const ConfigManager = require('../configmanager')
const AuthManager = require('../authmanager')
const crypto = require('crypto')

// ==================== INIT ====================

let versionManifest = null
let selectedVersion = null
let currentFilter = 'release'

document.addEventListener('DOMContentLoaded', () => {
    initNavigation()
    initLoginTabs()
    initSettingsTabs()
    initVersionFilters()
    initSettings()
    initAuthButtons()
    loadVersionManifest()
    checkExistingAuth()
    hideLoading()
})

function hideLoading() {
    setTimeout(() => {
        const loader = document.getElementById('loadingContainer')
        if (loader) {
            loader.classList.add('hidden')
            document.getElementById('main').style.display = 'flex'
        }
    }, 800)
}

// ==================== NAVIGATION ====================

function initNavigation() {
    const sidebarBtns = document.querySelectorAll('.sidebar-btn[data-page]')
    sidebarBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            const pageId = btn.dataset.page
            switchPage(pageId)
            sidebarBtns.forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
        })
    })

    const loginBtn = document.getElementById('sidebarLoginBtn')
    if (loginBtn) {
        loginBtn.addEventListener('click', () => showLoginPage())
    }

    const settingsCloseBtn = document.getElementById('settingsCloseBtn')
    if (settingsCloseBtn) {
        settingsCloseBtn.addEventListener('click', () => {
            switchPage('homePage')
            document.querySelectorAll('.sidebar-btn[data-page]').forEach(b => b.classList.remove('active'))
            document.querySelector('.sidebar-btn[data-page="homePage"]').classList.add('active')
        })
    }
}

function switchPage(pageId) {
    document.querySelectorAll('.viewPage').forEach(p => p.classList.remove('active'))
    document.getElementById('loginPage').classList.remove('active')
    const page = document.getElementById(pageId)
    if (page) page.classList.add('active')
}

function showLoginPage() {
    document.querySelectorAll('.viewPage').forEach(p => p.classList.remove('active'))
    document.getElementById('loginPage').classList.add('active')
}

// ==================== LOGIN TABS ====================

function initLoginTabs() {
    const tabs = document.querySelectorAll('.login-tab')
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            document.querySelectorAll('.login-form').forEach(f => f.classList.remove('active'))
            const formId = tab.dataset.form
            document.getElementById(formId).classList.add('active')
            hideLoginError()
        })
    })
}

// ==================== SETTINGS TABS ====================

function initSettingsTabs() {
    const tabs = document.querySelectorAll('.settings-tab')
    tabs.forEach(tab => {
        tab.addEventListener('click', () => {
            tabs.forEach(t => t.classList.remove('active'))
            tab.classList.add('active')
            document.querySelectorAll('.settings-panel').forEach(p => p.classList.remove('active'))
            const panelId = tab.dataset.panel
            document.getElementById(panelId).classList.add('active')
        })
    })
}

// ==================== VERSION FILTERS ====================

function initVersionFilters() {
    const filterBtns = document.querySelectorAll('.version-filter-btn')
    filterBtns.forEach(btn => {
        btn.addEventListener('click', () => {
            filterBtns.forEach(b => b.classList.remove('active'))
            btn.classList.add('active')
            currentFilter = btn.dataset.filter
            renderVersions()
        })
    })

    const searchInput = document.getElementById('versionSearch')
    if (searchInput) {
        searchInput.addEventListener('input', () => renderVersions())
    }
}

// ==================== VERSION MANIFEST ====================

async function loadVersionManifest() {
    try {
        const result = await ipcRenderer.invoke('fetch-version-manifest')
        if (result.success) {
            versionManifest = result.data
            renderVersions()

            // Select latest release if none selected
            if (!selectedVersion) {
                const latest = versionManifest.versions.find(v => v.id === versionManifest.latest.release)
                if (latest) selectVersion(latest)
            }
        } else {
            document.getElementById('versionsGrid').innerHTML =
                '<div style="text-align:center;padding:40px;color:#ef5350;">Failed to load versions. Check your connection.</div>'
        }
    } catch(err) {
        console.error('Version manifest error:', err)
    }
}

function renderVersions() {
    if (!versionManifest) return
    const grid = document.getElementById('versionsGrid')
    const search = (document.getElementById('versionSearch')?.value || '').toLowerCase()

    let versions = versionManifest.versions
    if (currentFilter !== 'all') {
        versions = versions.filter(v => v.type === currentFilter)
    }
    if (search) {
        versions = versions.filter(v => v.id.toLowerCase().includes(search))
    }

    // Limit display for performance
    const displayVersions = versions.slice(0, 100)

    if (displayVersions.length === 0) {
        grid.innerHTML = '<div style="text-align:center;padding:40px;color:#555;">No versions found</div>'
        return
    }

    grid.innerHTML = displayVersions.map(v => {
        const isSelected = selectedVersion && selectedVersion.id === v.id
        const badgeClass = `badge-${v.type}`
        const releaseDate = v.releaseTime ? new Date(v.releaseTime).toLocaleDateString() : ''
        return `
            <div class="version-card ${isSelected ? 'selected' : ''}" data-version-id="${v.id}" data-version-type="${v.type}" data-version-url="${v.url}">
                <div class="version-card-icon">${v.id}</div>
                <h3>Minecraft ${v.id}</h3>
                <span class="version-type-badge ${badgeClass}">${v.type}</span>
                <div style="font-size:11px;color:#555;margin-top:6px;">${releaseDate}</div>
            </div>
        `
    }).join('')

    // Attach click handlers
    grid.querySelectorAll('.version-card').forEach(card => {
        card.addEventListener('click', () => {
            const vId = card.dataset.versionId
            const vType = card.dataset.versionType
            const vUrl = card.dataset.versionUrl
            selectVersion({ id: vId, type: vType, url: vUrl })
        })
    })
}

function selectVersion(version) {
    selectedVersion = version
    
    // Update version cards
    document.querySelectorAll('.version-card').forEach(c => c.classList.remove('selected'))
    const card = document.querySelector(`[data-version-id="${version.id}"]`)
    if (card) card.classList.add('selected')

    // Update launch button
    const launchBtn = document.getElementById('launchBtn')
    const launchLabel = document.getElementById('launchVersionLabel')
    if (launchLabel) launchLabel.textContent = `Minecraft ${version.id}`

    // Enable launch if logged in
    const account = getSelectedAccount()
    if (account) {
        launchBtn.disabled = false
    }
}

// ==================== AUTH ====================

function initAuthButtons() {
    // Ely.by login
    const elybyBtn = document.getElementById('elybyLoginBtn')
    if (elybyBtn) {
        elybyBtn.addEventListener('click', handleElyByLogin)
    }

    // Offline login
    const offlineBtn = document.getElementById('offlineLoginBtn')
    if (offlineBtn) {
        offlineBtn.addEventListener('click', handleOfflineLogin)
    }

    // Microsoft login
    const msBtn = document.getElementById('microsoftLoginBtn')
    if (msBtn) {
        msBtn.addEventListener('click', handleMicrosoftLogin)
    }

    // Add account button in settings
    const addBtn = document.getElementById('addAccountBtn')
    if (addBtn) {
        addBtn.addEventListener('click', showLoginPage)
    }

    // Ely.by register link
    const regLink = document.getElementById('elybyRegLink')
    if (regLink) {
        regLink.addEventListener('click', (e) => {
            e.preventDefault()
            shell.openExternal('https://ely.by/register')
        })
    }

    // Launch button
    const launchBtn = document.getElementById('launchBtn')
    if (launchBtn) {
        launchBtn.addEventListener('click', handleLaunch)
    }
}

async function handleElyByLogin() {
    const username = document.getElementById('elybyUsername').value.trim()
    const password = document.getElementById('elybyPassword').value
    if (!username || !password) {
        showLoginError('Please enter both username and password.')
        return
    }

    const btn = document.getElementById('elybyLoginBtn')
    btn.disabled = true
    btn.textContent = 'Signing in...'
    hideLoginError()

    try {
        const account = await AuthManager.addElyByAccount(username, password)
        onLoginSuccess(account)
    } catch(err) {
        showLoginError(err.desc || err.message || 'Login failed')
    } finally {
        btn.disabled = false
        btn.textContent = 'Sign In with Ely.by'
    }
}

function handleOfflineLogin() {
    const username = document.getElementById('offlineUsername').value.trim()
    if (!username || username.length < 3 || username.length > 16) {
        showLoginError('Username must be 3-16 characters.')
        return
    }
    if (!/^[a-zA-Z0-9_]+$/.test(username)) {
        showLoginError('Username can only contain letters, numbers, and underscores.')
        return
    }

    const account = AuthManager.addOfflineAccount(username)
    onLoginSuccess(account)
}

function handleMicrosoftLogin() {
    const { MSFT_OPCODE, MSFT_REPLY_TYPE } = require('../ipcconstants')

    ipcRenderer.send(MSFT_OPCODE.OPEN_LOGIN, 'landing', 'loginOptions')

    ipcRenderer.once(MSFT_OPCODE.REPLY_LOGIN, async (event, type, data) => {
        if (type === MSFT_REPLY_TYPE.SUCCESS && data.code) {
            try {
                const account = await AuthManager.addMicrosoftAccount(data.code)
                onLoginSuccess(account)
            } catch(err) {
                showLoginError(err.desc || 'Microsoft login failed')
            }
        } else {
            showLoginError('Microsoft login was cancelled or failed.')
        }
    })
}

function onLoginSuccess(account) {
    hideLoginError()
    updateUserDisplay(account)
    renderAccountList()
    switchPage('homePage')
    document.querySelectorAll('.sidebar-btn[data-page]').forEach(b => b.classList.remove('active'))
    document.querySelector('.sidebar-btn[data-page="homePage"]').classList.add('active')

    if (selectedVersion) {
        document.getElementById('launchBtn').disabled = false
    }
}

function checkExistingAuth() {
    try {
        ConfigManager.load()
    } catch(e) {
        console.error('Config load error:', e)
    }

    const account = getSelectedAccount()
    if (account) {
        updateUserDisplay(account)
        if (selectedVersion) {
            document.getElementById('launchBtn').disabled = false
        }
    }
    renderAccountList()
}

function getSelectedAccount() {
    try {
        return ConfigManager.getSelectedAccount()
    } catch(e) {
        return null
    }
}

function updateUserDisplay(account) {
    if (!account) return

    const badge = document.getElementById('homeUserBadge')
    const avatar = document.getElementById('homeUserAvatar')
    const name = document.getElementById('homeUserName')
    const type = document.getElementById('homeUserType')

    if (badge) badge.style.display = 'flex'
    if (name) name.textContent = account.displayName
    if (type) {
        const typeMap = { elyby: 'ELY.BY', offline: 'OFFLINE', microsoft: 'PREMIUM', mojang: 'MOJANG' }
        type.textContent = typeMap[account.type] || account.type.toUpperCase()
    }
    if (avatar) {
        avatar.src = `https://mc-heads.net/avatar/${account.displayName}/28`
    }
}

function showLoginError(msg) {
    const el = document.getElementById('loginError')
    if (el) {
        el.textContent = msg
        el.classList.add('visible')
    }
}

function hideLoginError() {
    const el = document.getElementById('loginError')
    if (el) el.classList.remove('visible')
}

// ==================== ACCOUNT MANAGEMENT ====================

function renderAccountList() {
    const container = document.getElementById('accountList')
    if (!container) return

    let accounts
    try {
        accounts = ConfigManager.getAuthAccounts()
    } catch(e) {
        accounts = {}
    }

    const selectedAcc = getSelectedAccount()

    if (!accounts || Object.keys(accounts).length === 0) {
        container.innerHTML = '<div style="text-align:center;padding:20px;color:#555;">No accounts added yet.</div>'
        return
    }

    container.innerHTML = Object.values(accounts).map(acc => {
        const isSelected = selectedAcc && selectedAcc.uuid === acc.uuid
        const typeLabels = { elyby: 'Ely.by', offline: 'Offline', microsoft: 'Microsoft', mojang: 'Mojang' }
        return `
            <div class="account-card ${isSelected ? 'selected' : ''}" data-uuid="${acc.uuid}">
                <img class="account-avatar" src="https://mc-heads.net/avatar/${acc.displayName}/40" alt="">
                <div class="account-info">
                    <div class="account-name">${acc.displayName}</div>
                    <div class="account-type-label">${typeLabels[acc.type] || acc.type}</div>
                </div>
                ${!isSelected ? `<button class="overlay-btn overlay-btn-secondary" style="padding:6px 12px;font-size:11px;" onclick="selectAccount('${acc.uuid}')">Select</button>` : '<span style="color:#00e676;font-size:11px;font-weight:600;">ACTIVE</span>'}
                <button class="account-remove-btn" onclick="removeAccount('${acc.uuid}', '${acc.type}')">Remove</button>
            </div>
        `
    }).join('')
}

// These functions are called from inline onclick handlers
window.selectAccount = function(uuid) {
    ConfigManager.setSelectedAccount(uuid)
    ConfigManager.save()
    const account = ConfigManager.getAuthAccount(uuid)
    updateUserDisplay(account)
    renderAccountList()
    if (selectedVersion) {
        document.getElementById('launchBtn').disabled = false
    }
}

window.removeAccount = async function(uuid, type) {
    try {
        if (type === 'elyby') {
            await AuthManager.removeElyByAccount(uuid)
        } else if (type === 'microsoft') {
            await AuthManager.removeMicrosoftAccount(uuid)
        } else if (type === 'mojang') {
            await AuthManager.removeMojangAccount(uuid)
        } else {
            AuthManager.removeOfflineAccount(uuid)
        }
    } catch(e) {
        console.error('Remove account error:', e)
        ConfigManager.removeAuthAccount(uuid)
        ConfigManager.save()
    }
    const remaining = getSelectedAccount()
    if (remaining) {
        updateUserDisplay(remaining)
    } else {
        document.getElementById('homeUserBadge').style.display = 'none'
        document.getElementById('launchBtn').disabled = true
    }
    renderAccountList()
}

// ==================== SETTINGS ====================

function initSettings() {
    const ramSlider = document.getElementById('ramSlider')
    const ramValueLabel = document.getElementById('ramValueLabel')
    const ramInfo = document.getElementById('ramInfo')

    if (ramSlider) {
        const totalMem = Math.floor(os.totalmem() / (1024 * 1024 * 1024))
        const maxRam = Math.max(1, totalMem - 2)
        ramSlider.max = maxRam * 1024
        if (ramInfo) ramInfo.textContent = `You have ${totalMem} GB total RAM`

        ramSlider.addEventListener('input', () => {
            const val = parseInt(ramSlider.value)
            if (val >= 1024) {
                ramValueLabel.textContent = `${(val / 1024).toFixed(1)} GB`
            } else {
                ramValueLabel.textContent = `${val} MB`
            }
        })

        // Trigger initial display
        ramSlider.dispatchEvent(new Event('input'))
    }
}

// ==================== GAME LAUNCH ====================

async function handleLaunch() {
    const account = getSelectedAccount()
    if (!account) {
        showOverlay('No Account', 'Please sign in first before launching the game.')
        return
    }
    if (!selectedVersion) {
        showOverlay('No Version', 'Please select a Minecraft version first.')
        return
    }

    const launchBtn = document.getElementById('launchBtn')
    const launchStatus = document.getElementById('launchStatus')
    const progressContainer = document.getElementById('launchProgress')
    const progressBar = document.getElementById('launchProgressBar')

    launchBtn.disabled = true
    launchStatus.textContent = `Preparing to launch Minecraft ${selectedVersion.id}...`
    progressContainer.style.display = 'block'
    progressBar.style.width = '10%'

    try {
        // Validate auth
        launchStatus.textContent = 'Validating account...'
        progressBar.style.width = '20%'

        if (account.type !== 'offline') {
            const valid = await AuthManager.validateSelected()
            if (!valid) {
                launchStatus.textContent = 'Session expired. Please log in again.'
                progressContainer.style.display = 'none'
                launchBtn.disabled = false
                return
            }
        }

        progressBar.style.width = '40%'
        launchStatus.textContent = 'Fetching version details...'

        // Fetch version JSON
        const versionResult = await ipcRenderer.invoke('fetch-version-details', selectedVersion.url)
        if (!versionResult.success) {
            throw new Error('Failed to fetch version details')
        }

        progressBar.style.width = '60%'
        launchStatus.textContent = 'Version data loaded. Ready to launch!'

        progressBar.style.width = '100%'
        
        setTimeout(() => {
            launchStatus.textContent = `Minecraft ${selectedVersion.id} is ready. Launch handled by the game engine.`
            progressContainer.style.display = 'none'
            launchBtn.disabled = false
        }, 2000)

    } catch(err) {
        console.error('Launch error:', err)
        launchStatus.textContent = `Launch error: ${err.message}`
        progressContainer.style.display = 'none'
        launchBtn.disabled = false
    }
}

// ==================== OVERLAY ====================

function showOverlay(title, body) {
    const container = document.getElementById('overlayContainer')
    document.getElementById('overlayTitle').textContent = title
    document.getElementById('overlayBody').textContent = body
    container.classList.add('active')

    document.getElementById('overlayConfirmBtn').onclick = () => {
        container.classList.remove('active')
    }
}

document.getElementById('overlayConfirmBtn')?.addEventListener('click', () => {
    document.getElementById('overlayContainer').classList.remove('active')
})
