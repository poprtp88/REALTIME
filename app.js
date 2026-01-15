// Supabase and Telegram Configuration
let SUPABASE_URL = ''
let SUPABASE_ANON_KEY = ''
let TELEGRAM_BOT_TOKEN = ''
let TELEGRAM_CHAT_IDS = []
let supabaseClient = null

// State management
const state = {
    loading: false,
    connected: false,
    messages: []
}

// Initialize Supabase client
function initSupabase() {
    SUPABASE_URL = window.SUPABASE_URL || ''
    SUPABASE_ANON_KEY = window.SUPABASE_ANON_KEY || ''
    TELEGRAM_BOT_TOKEN = window.TELEGRAM_BOT_TOKEN || ''
    TELEGRAM_CHAT_IDS = window.TELEGRAM_CHAT_IDS || []
    
    if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
        console.warn('Missing Supabase credentials')
        showError('Please configure Supabase credentials in config.js')
        addLog('ERROR: Missing Supabase credentials', 'error')
        return false
    }
    
    const SupabaseLib = window.supabase || (typeof supabase !== 'undefined' ? supabase : null)
    
    if (SupabaseLib && typeof SupabaseLib.createClient === 'function') {
        try {
            supabaseClient = SupabaseLib.createClient(SUPABASE_URL, SUPABASE_ANON_KEY)
            console.log('✅ Supabase client initialized')
            addLog('Supabase client initialized', 'success')
            return true
        } catch (error) {
            console.error('Error initializing Supabase:', error)
            showError('Failed to initialize Supabase: ' + error.message)
            addLog('ERROR: Failed to initialize Supabase', 'error')
            return false
        }
    } else {
        console.warn('Supabase library not loaded')
        showError('Supabase library not loaded. Check your internet connection.')
        addLog('ERROR: Supabase library not loaded', 'error')
        return false
    }
}

// Utility functions
function showError(message) {
    const errorBanner = document.getElementById('errorBanner')
    const errorMessage = document.getElementById('errorMessage')
    errorMessage.textContent = message
    errorBanner.style.display = 'block'
    
    setTimeout(() => {
        errorBanner.style.display = 'none'
    }, 5000)
}

function hideError() {
    document.getElementById('errorBanner').style.display = 'none'
}

function setLoading(isLoading) {
    state.loading = isLoading
    const submitBtn = document.getElementById('submitBtn')
    const submitText = document.getElementById('submitText')
    const submitLoader = document.getElementById('submitLoader')
    
    submitBtn.disabled = isLoading
    if (isLoading) {
        submitText.textContent = 'Sending...'
        submitLoader.style.display = 'inline-block'
    } else {
        submitText.textContent = 'Send Message'
        submitLoader.style.display = 'none'
    }
}

function updateConnectionStatus(connected) {
    state.connected = connected
    const statusDot = document.getElementById('statusDot')
    const statusText = document.getElementById('statusText')
    
    if (connected) {
        statusDot.className = 'status-dot connected'
        statusText.textContent = 'Connected'
    } else {
        statusDot.className = 'status-dot disconnected'
        statusText.textContent = 'Disconnected'
    }
}

function addLog(message, type = 'info') {
    const activityLog = document.getElementById('activityLog')
    const timestamp = new Date().toLocaleTimeString()
    const logEntry = document.createElement('p')
    logEntry.className = `log-entry ${type}`
    logEntry.textContent = `[${timestamp}] ${message}`
    activityLog.appendChild(logEntry)
    activityLog.scrollTop = activityLog.scrollHeight
}

function clearLog() {
    const activityLog = document.getElementById('activityLog')
    activityLog.innerHTML = '<p class="log-entry">Log cleared.</p>'
}

// Load saved name from localStorage
function loadSavedName() {
    const savedName = localStorage.getItem('messageBoardUserName')
    if (savedName) {
        document.getElementById('userName').value = savedName
    }
}

// Save name to localStorage
function saveName(name) {
    localStorage.setItem('messageBoardUserName', name)
}

// Load messages from Supabase
async function loadMessages() {
    if (!supabaseClient) {
        addLog('ERROR: Supabase client not initialized', 'error')
        return
    }
    
    try {
        const { data, error } = await supabaseClient
            .from('public_messages')
            .select('*')
            .order('created_at', { ascending: false })
            .limit(50)
        
        if (error) throw error
        
        state.messages = data || []
        renderMessages()
        addLog(`Loaded ${state.messages.length} messages`, 'success')
    } catch (err) {
        console.error('Error loading messages:', err)
        addLog(`ERROR: Failed to load messages - ${err.message}`, 'error')
        document.getElementById('messagesContainer').innerHTML = 
            '<p class="empty-state">Error loading messages. Check console for details.</p>'
    }
}

// Render messages to UI
function renderMessages() {
    const container = document.getElementById('messagesContainer')
    
    if (state.messages.length === 0) {
        container.innerHTML = '<p class="empty-state">No messages yet. Be the first to post!</p>'
        return
    }
    
    const html = state.messages.map(msg => {
        const date = new Date(msg.created_at)
        const timeStr = date.toLocaleString()
        const telegramStatus = msg.telegram_sent ? 'success' : (msg.telegram_sent === false ? 'failed' : 'pending')
        const telegramIcon = msg.telegram_sent ? '✓' : (msg.telegram_sent === false ? '✗' : '⏳')
        
        return `
            <div class="message-item" data-id="${msg.id}">
                <div class="message-header">
                    <span class="message-name">${escapeHtml(msg.name)}</span>
                    <span class="message-time">${timeStr}</span>
                </div>
                <div class="message-content">${escapeHtml(msg.message)}</div>
                <div class="message-footer">
                    <span class="telegram-status ${telegramStatus}">
                        <span>${telegramIcon}</span>
                        <span>Telegram</span>
                    </span>
                    <span>ID: ${msg.id}</span>
                </div>
            </div>
        `
    }).join('')
    
    container.innerHTML = html
}

// Add new message to UI (for real-time updates)
function addMessageToUI(message) {
    const container = document.getElementById('messagesContainer')
    
    // Remove empty state if present
    if (container.querySelector('.empty-state')) {
        container.innerHTML = ''
    }
    
    const date = new Date(message.created_at)
    const timeStr = date.toLocaleString()
    const telegramStatus = message.telegram_sent ? 'success' : (message.telegram_sent === false ? 'failed' : 'pending')
    const telegramIcon = message.telegram_sent ? '✓' : (message.telegram_sent === false ? '✗' : '⏳')
    
    const messageHTML = `
        <div class="message-item new-message" data-id="${message.id}">
            <div class="message-header">
                <span class="message-name">${escapeHtml(message.name)}</span>
                <span class="message-time">${timeStr}</span>
            </div>
            <div class="message-content">${escapeHtml(message.message)}</div>
            <div class="message-footer">
                <span class="telegram-status ${telegramStatus}">
                    <span>${telegramIcon}</span>
                    <span>Telegram</span>
                </span>
                <span>ID: ${message.id}</span>
            </div>
        </div>
    `
    
    container.insertAdjacentHTML('afterbegin', messageHTML)
    
    // Remove 'new-message' class after animation
    setTimeout(() => {
        const newMsg = container.querySelector('.new-message')
        if (newMsg) {
            newMsg.classList.remove('new-message')
        }
    }, 500)
    
    addLog(`New message from ${escapeHtml(message.name)}`, 'info')
}

// Send message to Telegram
async function sendToTelegram(name, message) {
    if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHAT_IDS.length === 0) {
        addLog('WARNING: Telegram not configured', 'warning')
        return { success: false, error: 'Telegram not configured' }
    }
    
    const telegramMessage = `<b>${escapeHtml(name)}</b>: ${escapeHtml(message)}`
    const results = []
    
    for (const chatId of TELEGRAM_CHAT_IDS) {
        try {
            const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
                method: 'POST',
                headers: {
                    'Content-Type': 'application/json',
                },
                body: JSON.stringify({
                    chat_id: chatId,
                    text: telegramMessage,
                    parse_mode: 'HTML'
                })
            })
            
            const data = await response.json()
            
            if (data.ok) {
                results.push({ chatId, success: true })
                addLog(`Telegram sent to chat ${chatId}`, 'success')
            } else {
                results.push({ chatId, success: false, error: data.description })
                addLog(`ERROR: Telegram failed for chat ${chatId} - ${data.description}`, 'error')
            }
        } catch (error) {
            results.push({ chatId, success: false, error: error.message })
            addLog(`ERROR: Telegram API error for chat ${chatId} - ${error.message}`, 'error')
        }
    }
    
    const allSuccess = results.every(r => r.success)
    return {
        success: allSuccess,
        results: results
    }
}

// Submit new message
async function submitMessage(e) {
    e.preventDefault()
    
    if (!supabaseClient) {
        showError('Supabase client not initialized. Please check your credentials.')
        return
    }
    
    const nameInput = document.getElementById('userName')
    const messageInput = document.getElementById('messageText')
    const name = nameInput.value.trim()
    const message = messageInput.value.trim()
    
    if (!name || !message) {
        showError('Please fill in both name and message fields.')
        return
    }
    
    setLoading(true)
    hideError()
    saveName(name)
    
    try {
        // Insert message into Supabase
        const { data: insertedData, error: insertError } = await supabaseClient
            .from('public_messages')
            .insert([{
                name: name,
                message: message,
                telegram_sent: false
            }])
            .select()
            .single()
        
        if (insertError) throw insertError
        
        addLog(`Message inserted with ID: ${insertedData.id}`, 'success')
        
        // Send to Telegram
        const telegramResult = await sendToTelegram(name, message)
        
        // Update telegram_sent status
        if (telegramResult.success) {
            const { error: updateError } = await supabaseClient
                .from('public_messages')
                .update({ telegram_sent: true })
                .eq('id', insertedData.id)
            
            if (updateError) {
                console.error('Error updating telegram status:', updateError)
            }
            
            // Update UI if message is already displayed
            const messageElement = document.querySelector(`[data-id="${insertedData.id}"]`)
            if (messageElement) {
                const statusEl = messageElement.querySelector('.telegram-status')
                if (statusEl) {
                    statusEl.className = 'telegram-status success'
                    statusEl.innerHTML = '<span>✓</span><span>Telegram</span>'
                }
            }
        } else {
            // Mark as failed
            const { error: updateError } = await supabaseClient
                .from('public_messages')
                .update({ telegram_sent: false })
                .eq('id', insertedData.id)
            
            if (updateError) {
                console.error('Error updating telegram status:', updateError)
            }
        }
        
        // Clear form
        messageInput.value = ''
        updateCharCount()
        
        addLog(`Message sent successfully!`, 'success')
    } catch (err) {
        console.error('Error submitting message:', err)
        showError(err.message || 'Failed to send message')
        addLog(`ERROR: Failed to send message - ${err.message}`, 'error')
    } finally {
        setLoading(false)
    }
}

// Update character count
function updateCharCount() {
    const messageInput = document.getElementById('messageText')
    const charCount = document.getElementById('charCount')
    charCount.textContent = messageInput.value.length
}

// Setup real-time subscription
function setupRealtimeSubscription() {
    if (!supabaseClient) {
        addLog('ERROR: Cannot setup real-time - Supabase not initialized', 'error')
        return
    }
    
    const channel = supabaseClient
        .channel('public_messages_channel')
        .on('postgres_changes', 
            { 
                event: 'INSERT', 
                schema: 'public', 
                table: 'public_messages' 
            },
            (payload) => {
                addLog(`Real-time: New message received (ID: ${payload.new.id})`, 'info')
                addMessageToUI(payload.new)
            }
        )
        .on('postgres_changes',
            {
                event: 'UPDATE',
                schema: 'public',
                table: 'public_messages'
            },
            (payload) => {
                addLog(`Real-time: Message updated (ID: ${payload.new.id})`, 'info')
                // Update the message in UI if it exists
                const messageElement = document.querySelector(`[data-id="${payload.new.id}"]`)
                if (messageElement) {
                    const statusEl = messageElement.querySelector('.telegram-status')
                    if (statusEl && payload.new.telegram_sent) {
                        statusEl.className = 'telegram-status success'
                        statusEl.innerHTML = '<span>✓</span><span>Telegram</span>'
                    }
                }
            }
        )
        .subscribe((status) => {
            if (status === 'SUBSCRIBED') {
                updateConnectionStatus(true)
                addLog('Real-time subscription active', 'success')
            } else if (status === 'CHANNEL_ERROR') {
                updateConnectionStatus(false)
                addLog('ERROR: Real-time subscription error', 'error')
            } else if (status === 'TIMED_OUT') {
                updateConnectionStatus(false)
                addLog('WARNING: Real-time subscription timed out', 'warning')
            } else {
                updateConnectionStatus(false)
                addLog(`Real-time status: ${status}`, 'warning')
            }
        })
    
    return channel
}

// Security: Escape HTML to prevent XSS
function escapeHtml(text) {
    const div = document.createElement('div')
    div.textContent = text
    return div.innerHTML
}

// Event Listeners
document.addEventListener('DOMContentLoaded', () => {
    // Initialize
    setTimeout(() => {
        if (initSupabase()) {
            loadMessages()
            setupRealtimeSubscription()
        }
        
        // Load saved name
        loadSavedName()
        
        // Form submission
        document.getElementById('messageForm').addEventListener('submit', submitMessage)
        
        // Character count
        document.getElementById('messageText').addEventListener('input', updateCharCount)
        
        // Clear log button
        document.getElementById('clearLogBtn').addEventListener('click', clearLog)
        
        // Check Telegram configuration
        if (!TELEGRAM_BOT_TOKEN || TELEGRAM_CHAT_IDS.length === 0) {
            addLog('WARNING: Telegram bot not configured. Edit config.js to enable Telegram notifications.', 'warning')
        } else {
            addLog(`Telegram configured for ${TELEGRAM_CHAT_IDS.length} chat(s)`, 'success')
        }
    }, 100)
})

