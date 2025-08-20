/**
 * Simple admin UI for Facebook authentication
 * Can be integrated into your existing admin dashboard
 */

export const FacebookAuthUI = `
<!DOCTYPE html>
<html>
<head>
    <title>Facebook Authentication Setup</title>
    <style>
        body { font-family: Arial, sans-serif; max-width: 600px; margin: 50px auto; padding: 20px; }
        .container { background: #f5f5f5; padding: 30px; border-radius: 8px; }
        .form-group { margin-bottom: 20px; }
        label { display: block; margin-bottom: 5px; font-weight: bold; }
        input { width: 100%; padding: 10px; border: 1px solid #ddd; border-radius: 4px; }
        button { background: #007bff; color: white; padding: 12px 24px; border: none; border-radius: 4px; cursor: pointer; }
        button:hover { background: #0056b3; }
        .status { padding: 10px; margin: 10px 0; border-radius: 4px; }
        .success { background: #d4edda; color: #155724; border: 1px solid #c3e6cb; }
        .error { background: #f8d7da; color: #721c24; border: 1px solid #f5c6cb; }
        .warning { background: #fff3cd; color: #856404; border: 1px solid #ffeaa7; }
        .info { background: #d1ecf1; color: #0c5460; border: 1px solid #bee5eb; }
    </style>
</head>
<body>
    <div class="container">
        <h1>🔐 Facebook Authentication Setup</h1>
        
        <div id="status"></div>
        
        <div class="form-group">
            <h3>Current Status</h3>
            <button onclick="checkStatus()">Check Authentication Status</button>
        </div>

        <div class="form-group">
            <h3>Setup New Session</h3>
            <p><strong>Note:</strong> Credentials are used once and immediately discarded. Only session data is saved.</p>
            
            <label for="email">Facebook Email:</label>
            <input type="email" id="email" placeholder="your.email@gmail.com" required>
            
            <label for="password">Facebook Password:</label>
            <input type="password" id="password" placeholder="Your password" required>
            
            <label>
                <input type="checkbox" id="rememberSession" checked> 
                Save session for future use
            </label>
        </div>

        <div class="form-group">
            <button onclick="setupLogin()">Setup Facebook Login</button>
            <button onclick="clearSession()" style="background: #dc3545; margin-left: 10px;">Clear Session</button>
        </div>

        <div class="form-group">
            <h3>Security Notes</h3>
            <ul>
                <li>✅ Credentials are never stored permanently</li>
                <li>✅ Only session cookies are saved</li>
                <li>✅ Sessions auto-expire following Facebook's policies</li>
                <li>✅ All communication is over HTTPS</li>
                <li>⚠️ Only use this on trusted admin machines</li>
            </ul>
        </div>
    </div>

    <script>
        async function checkStatus() {
            try {
                const response = await fetch('/admin/facebook/status', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });
                
                const data = await response.json();
                
                let statusHtml = '<div class="info"><h4>Authentication Status</h4>';
                statusHtml += \`<p>Logged In: \${data.loggedIn ? '✅ Yes' : '❌ No'}</p>\`;
                statusHtml += \`<p>Saved Session: \${data.savedSession ? '✅ Yes' : '❌ No'}</p>\`;
                statusHtml += \`<p>Last Check: \${data.timestamp}</p>\`;
                statusHtml += '</div>';
                
                document.getElementById('status').innerHTML = statusHtml;
            } catch (error) {
                showError('Failed to check status: ' + error.message);
            }
        }

        async function setupLogin() {
            const email = document.getElementById('email').value;
            const password = document.getElementById('password').value;
            const rememberSession = document.getElementById('rememberSession').checked;

            if (!email || !password) {
                showError('Please enter both email and password');
                return;
            }

            try {
                showInfo('Setting up Facebook login...');
                
                const response = await fetch('/admin/facebook/login', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' },
                    body: JSON.stringify({
                        email: email,
                        password: password,
                        rememberSession: rememberSession
                    })
                });

                const data = await response.json();

                if (response.ok) {
                    showSuccess('Facebook session established successfully!');
                    // Clear form
                    document.getElementById('email').value = '';
                    document.getElementById('password').value = '';
                    // Check status
                    setTimeout(checkStatus, 1000);
                } else {
                    showError('Setup failed: ' + data.message);
                }
            } catch (error) {
                showError('Setup failed: ' + error.message);
            }
        }

        async function clearSession() {
            if (!confirm('Are you sure you want to clear the saved session?')) {
                return;
            }

            try {
                const response = await fetch('/admin/facebook/logout', {
                    method: 'POST',
                    headers: { 'Content-Type': 'application/json' }
                });

                const data = await response.json();

                if (response.ok) {
                    showSuccess('Session cleared successfully');
                    setTimeout(checkStatus, 1000);
                } else {
                    showError('Failed to clear session: ' + data.message);
                }
            } catch (error) {
                showError('Failed to clear session: ' + error.message);
            }
        }

        function showSuccess(message) {
            document.getElementById('status').innerHTML = \`<div class="success">\${message}</div>\`;
        }

        function showError(message) {
            document.getElementById('status').innerHTML = \`<div class="error">\${message}</div>\`;
        }

        function showInfo(message) {
            document.getElementById('status').innerHTML = \`<div class="info">\${message}</div>\`;
        }

        function showWarning(message) {
            document.getElementById('status').innerHTML = \`<div class="warning">\${message}</div>\`;
        }

        // Check status on page load
        checkStatus();
    </script>
</body>
</html>
`;

export default FacebookAuthUI;
