/**
 * Facebook Login Modal for Admin UI
 * Triggered when Puppeteer needs credentials
 */

export const FacebookLoginModal = `
<div id="facebook-login-modal" class="modal" style="display: none;">
  <div class="modal-content">
    <div class="modal-header">
      <h2>🔐 Facebook Login Required</h2>
      <span class="close" onclick="closeFacebookModal()">&times;</span>
    </div>
    
    <div class="modal-body">
      <div id="facebook-modal-status" class="status-info">
        <p>📡 The system needs Facebook credentials to continue scraping.</p>
        <p><strong>Note:</strong> Credentials are used once and immediately discarded.</p>
      </div>
      
      <form id="facebook-login-form" onsubmit="submitFacebookCredentials(event)">
        <div class="form-group">
          <label for="fb-email">Facebook Email:</label>
          <input type="email" id="fb-email" required placeholder="your.email@gmail.com">
        </div>
        
        <div class="form-group">
          <label for="fb-password">Facebook Password:</label>
          <input type="password" id="fb-password" required placeholder="Your Facebook password">
        </div>
        
        <div class="form-actions">
          <button type="submit" class="btn-primary" id="fb-submit-btn">
            🔑 Login to Facebook
          </button>
          <button type="button" class="btn-secondary" onclick="closeFacebookModal()">
            Cancel
          </button>
        </div>
      </form>
      
      <div class="security-note">
        <h4>🛡️ Security Information:</h4>
        <ul>
          <li>✅ Credentials are never stored</li>
          <li>✅ Used only for session establishment</li>
          <li>✅ Connection is encrypted</li>
          <li>✅ Session cookies are saved for future use</li>
        </ul>
      </div>
    </div>
  </div>
</div>

<style>
.modal {
  display: none;
  position: fixed;
  z-index: 1000;
  left: 0;
  top: 0;
  width: 100%;
  height: 100%;
  background-color: rgba(0, 0, 0, 0.5);
  backdrop-filter: blur(5px);
}

.modal-content {
  background-color: #ffffff;
  margin: 5% auto;
  padding: 0;
  border-radius: 12px;
  width: 90%;
  max-width: 500px;
  box-shadow: 0 10px 30px rgba(0, 0, 0, 0.3);
  animation: modalSlideIn 0.3s ease-out;
}

@keyframes modalSlideIn {
  from { transform: translateY(-50px); opacity: 0; }
  to { transform: translateY(0); opacity: 1; }
}

.modal-header {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  padding: 20px;
  border-radius: 12px 12px 0 0;
  display: flex;
  justify-content: space-between;
  align-items: center;
}

.modal-header h2 {
  margin: 0;
  font-size: 1.5em;
}

.close {
  font-size: 28px;
  font-weight: bold;
  cursor: pointer;
  transition: color 0.3s;
}

.close:hover {
  color: #ffcccb;
}

.modal-body {
  padding: 25px;
}

.status-info {
  background: #e3f2fd;
  border: 1px solid #bbdefb;
  border-radius: 8px;
  padding: 15px;
  margin-bottom: 20px;
}

.status-info p {
  margin: 5px 0;
  color: #1565c0;
}

.form-group {
  margin-bottom: 20px;
}

.form-group label {
  display: block;
  margin-bottom: 8px;
  font-weight: 600;
  color: #333;
}

.form-group input {
  width: 100%;
  padding: 12px;
  border: 2px solid #e0e0e0;
  border-radius: 8px;
  font-size: 16px;
  transition: border-color 0.3s;
  box-sizing: border-box;
}

.form-group input:focus {
  outline: none;
  border-color: #667eea;
  box-shadow: 0 0 0 3px rgba(102, 126, 234, 0.1);
}

.form-actions {
  display: flex;
  gap: 10px;
  justify-content: flex-end;
  margin-top: 25px;
}

.btn-primary {
  background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  color: white;
  border: none;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  font-weight: 600;
  transition: transform 0.2s, box-shadow 0.2s;
}

.btn-primary:hover {
  transform: translateY(-2px);
  box-shadow: 0 5px 15px rgba(102, 126, 234, 0.4);
}

.btn-primary:disabled {
  opacity: 0.6;
  cursor: not-allowed;
  transform: none;
}

.btn-secondary {
  background: #f5f5f5;
  color: #666;
  border: 2px solid #e0e0e0;
  padding: 12px 24px;
  border-radius: 8px;
  cursor: pointer;
  font-size: 16px;
  transition: background-color 0.3s;
}

.btn-secondary:hover {
  background: #eeeeee;
}

.security-note {
  background: #f8f9fa;
  border: 1px solid #e9ecef;
  border-radius: 8px;
  padding: 15px;
  margin-top: 20px;
}

.security-note h4 {
  margin: 0 0 10px 0;
  color: #495057;
}

.security-note ul {
  margin: 0;
  padding-left: 20px;
}

.security-note li {
  margin: 5px 0;
  color: #6c757d;
  font-size: 14px;
}

.status-success {
  background: #d4edda;
  color: #155724;
  border: 1px solid #c3e6cb;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
}

.status-error {
  background: #f8d7da;
  color: #721c24;
  border: 1px solid #f5c6cb;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
}

.status-loading {
  background: #fff3cd;
  color: #856404;
  border: 1px solid #ffeaa7;
  border-radius: 8px;
  padding: 15px;
  margin: 10px 0;
  display: flex;
  align-items: center;
  gap: 10px;
}

.spinner {
  width: 20px;
  height: 20px;
  border: 2px solid #ffeaa7;
  border-top: 2px solid #856404;
  border-radius: 50%;
  animation: spin 1s linear infinite;
}

@keyframes spin {
  0% { transform: rotate(0deg); }
  100% { transform: rotate(360deg); }
}
</style>

<script>
// Global variables for Facebook auth
let currentRequestId = null;
let facebookSocket = null;

// Initialize Facebook WebSocket connection
function initFacebookAuthSocket() {
  if (facebookSocket) return;
  
  facebookSocket = io('/facebook-auth');
  
  facebookSocket.on('connect', () => {
    console.log('📡 Connected to Facebook Auth service');
  });
  
  facebookSocket.on('facebook-login-required', (data) => {
    console.log('🔐 Facebook login required:', data);
    currentRequestId = data.requestId;
    showFacebookModal(data.message);
  });
  
  facebookSocket.on('credentials-received', (data) => {
    console.log('✅ Credentials received:', data);
    showFacebookStatus('status-loading', 'Attempting Facebook login...');
  });
  
  facebookSocket.on('facebook-login-result', (data) => {
    console.log('📊 Login result:', data);
    if (data.success) {
      showFacebookStatus('status-success', data.message);
      setTimeout(closeFacebookModal, 2000);
    } else {
      showFacebookStatus('status-error', data.message);
    }
  });
  
  facebookSocket.on('facebook-status-update', (data) => {
    console.log('📊 Status update:', data);
  });
}

function showFacebookModal(message) {
  const modal = document.getElementById('facebook-login-modal');
  const statusDiv = document.getElementById('facebook-modal-status');
  
  statusDiv.innerHTML = \`
    <p>📡 \${message}</p>
    <p><strong>Note:</strong> Credentials are used once and immediately discarded.</p>
  \`;
  
  modal.style.display = 'block';
  document.getElementById('fb-email').focus();
}

function closeFacebookModal() {
  const modal = document.getElementById('facebook-login-modal');
  modal.style.display = 'none';
  
  // Clear form
  document.getElementById('facebook-login-form').reset();
  currentRequestId = null;
}

function submitFacebookCredentials(event) {
  event.preventDefault();
  
  if (!currentRequestId || !facebookSocket) {
    showFacebookStatus('status-error', 'Connection error. Please refresh the page.');
    return;
  }
  
  const email = document.getElementById('fb-email').value;
  const password = document.getElementById('fb-password').value;
  
  if (!email || !password) {
    showFacebookStatus('status-error', 'Please enter both email and password.');
    return;
  }
  
  // Disable form
  document.getElementById('fb-submit-btn').disabled = true;
  document.getElementById('fb-email').disabled = true;
  document.getElementById('fb-password').disabled = true;
  
  showFacebookStatus('status-loading', 'Sending credentials...');
  
  // Send credentials via WebSocket
  facebookSocket.emit('provide-facebook-credentials', {
    email: email,
    password: password,
    requestId: currentRequestId
  });
  
  // Clear form immediately for security
  document.getElementById('fb-email').value = '';
  document.getElementById('fb-password').value = '';
}

function showFacebookStatus(className, message) {
  const statusDiv = document.getElementById('facebook-modal-status');
  
  let content = \`<p>\${message}</p>\`;
  if (className === 'status-loading') {
    content = \`
      <div style="display: flex; align-items: center; gap: 10px;">
        <div class="spinner"></div>
        <p>\${message}</p>
      </div>
    \`;
  }
  
  statusDiv.className = className;
  statusDiv.innerHTML = content;
}

// Initialize on page load
document.addEventListener('DOMContentLoaded', () => {
  initFacebookAuthSocket();
});

// Close modal when clicking outside
window.onclick = function(event) {
  const modal = document.getElementById('facebook-login-modal');
  if (event.target === modal) {
    closeFacebookModal();
  }
}
</script>
`;

export default FacebookLoginModal;
