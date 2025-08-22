// js/websocket.js
// WebSocket utility functions

let ws = null;
let reconnectAttempts = 0;
const maxReconnectAttempts = 5;

function createWebSocketConnection(sessionId) {
    const token = getAuthToken();
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/ws/session/${sessionId}/?token=${token}`;
    
    ws = new WebSocket(wsUrl);
    
    ws.onopen = function() {
        console.log('WebSocket connection established');
        reconnectAttempts = 0;
        
        // Send join message
        const userData = getUserData();
        if (userData) {
            sendWebSocketMessage({
                type: 'join',
                user_id: userData.user_id,
                role: userData.role,
                name: userData.name
            });
        }
    };
    
    ws.onclose = function(event) {
        console.log('WebSocket connection closed', event.code, event.reason);
        
        // Attempt to reconnect if not intentionally closed
        if (event.code !== 1000 && reconnectAttempts < maxReconnectAttempts) {
            reconnectAttempts++;
            const delay = Math.min(1000 * reconnectAttempts, 10000); // Exponential backoff with max 10s
            
            console.log(`Attempting to reconnect in ${delay}ms (attempt ${reconnectAttempts}/${maxReconnectAttempts})`);
            
            setTimeout(() => {
                createWebSocketConnection(sessionId);
            }, delay);
        }
    };
    
    ws.onerror = function(error) {
        console.error('WebSocket error:', error);
    };
    
    return ws;
}

function sendWebSocketMessage(message) {
    if (ws && ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify(message));
        return true;
    } else {
        console.error('WebSocket is not connected');
        return false;
    }
}

function closeWebSocketConnection() {
    if (ws) {
        ws.close(1000, 'User intentionally disconnected');
        ws = null;
    }
}

// Handle page visibility change
document.addEventListener('visibilitychange', function() {
    if (document.hidden) {
        // Page is hidden, might want to pause focus tracking
        console.log('Page hidden');
    } else {
        // Page is visible again
        console.log('Page visible');
    }
});