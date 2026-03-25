const status = document.getElementById('status');
const login = document.getElementById('login');
const chat = document.getElementById('chat');
const messages = document.getElementById('messages');
const nameInput = document.getElementById('nameInput');
const msgInput = document.getElementById('msgInput');
let ws;

nameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') joinChat();
});

function joinChat() {
    const name = nameInput.value.trim();
    if (!name) return;

    login.style.display = 'none';
    chat.style.display = 'flex';

    const protocol = location.protocol === 'https:' ? 'wss:' : 'ws:';
    ws = new WebSocket(protocol + '//' + location.host + '/api/chat/ws?name=' + encodeURIComponent(name));

    ws.onopen = () => {
        status.textContent = 'connected';
        status.className = 'connected';
        msgInput.focus();
    };

    ws.onclose = () => {
        status.textContent = 'disconnected';
        status.className = 'disconnected';
        addSystem('Connection closed. Refresh to reconnect.');
    };

    ws.onmessage = (e) => {
        const data = JSON.parse(e.data);
        switch (data.type) {
            case 'welcome':
                addSystem(data.message);
                break;
            case 'join':
                addSystem(data.name + ' joined the chat');
                break;
            case 'leave':
                addSystem(data.name + ' left the chat');
                break;
            case 'message':
                addMessage(data.name, data.text);
                break;
        }
    };
}

function sendMessage() {
    const text = msgInput.value.trim();
    if (!text || !ws || ws.readyState !== WebSocket.OPEN) return;
    ws.send(text);
    addMessage('you', text);
    msgInput.value = '';
}

msgInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') sendMessage();
});

function addMessage(name, text) {
    const el = document.createElement('div');
    el.className = 'msg';
    el.innerHTML = '<span class="name">' + esc(name) + '</span> <span class="text">' + esc(text) + '</span>';
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
}

function addSystem(text) {
    const el = document.createElement('div');
    el.className = 'msg system';
    el.textContent = text;
    messages.appendChild(el);
    messages.scrollTop = messages.scrollHeight;
}

function esc(s) {
    const d = document.createElement('div');
    d.textContent = s;
    return d.innerHTML;
}
