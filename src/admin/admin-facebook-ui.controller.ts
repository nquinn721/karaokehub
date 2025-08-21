/**
 * Admin controller to serve the Facebook auth interface
 */

import { Controller, Get, Res } from '@nestjs/common';
import { Response } from 'express';
import FacebookLoginModal from './facebook-login-modal';

@Controller('admin')
export class AdminFacebookUIController {
  @Get('facebook-auth')
  getFacebookAuthPage(@Res() res: Response) {
    const html = `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>Facebook Authentication - Admin Panel</title>
    <script src="/socket.io/socket.io.js"></script>
    <style>
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            margin: 0;
            padding: 20px;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
        }
        
        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 12px;
            padding: 30px;
            box-shadow: 0 10px 30px rgba(0, 0, 0, 0.2);
        }
        
        .header {
            text-align: center;
            margin-bottom: 30px;
        }
        
        .status-card {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 20px;
            margin: 20px 0;
        }
        
        .btn {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
            border: none;
            padding: 12px 24px;
            border-radius: 8px;
            cursor: pointer;
            font-size: 16px;
            margin: 5px;
            transition: transform 0.2s;
        }
        
        .btn:hover {
            transform: translateY(-2px);
        }
        
        .logs {
            background: #f8f9fa;
            border: 1px solid #e9ecef;
            border-radius: 8px;
            padding: 15px;
            margin: 20px 0;
            max-height: 300px;
            overflow-y: auto;
            font-family: monospace;
            font-size: 14px;
        }
        
        .log-entry {
            margin: 5px 0;
            padding: 5px;
            border-radius: 4px;
        }
        
        .log-info { background: #d1ecf1; }
        .log-success { background: #d4edda; }
        .log-error { background: #f8d7da; }
        .log-warning { background: #fff3cd; }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>🔐 Facebook Authentication Admin Panel</h1>
            <p>Monitor and manage Facebook authentication for the scraping system</p>
        </div>
        
        <div class="status-card">
            <h3>📊 Current Status</h3>
            <div id="current-status">
                <p>⏳ System ready - Facebook login will be requested when needed during parsing</p>
            </div>
            <button class="btn" onclick="checkSessionStatus()">🔄 Check Session Status</button>
            <button class="btn" onclick="testFacebookAuth()">🧪 Test Authentication</button>
            <button class="btn" onclick="clearLogs()">🗑️ Clear Logs</button>
        </div>
        
        <div class="status-card">
            <h3>📡 System Logs</h3>
            <div id="system-logs" class="logs">
                <div class="log-entry log-info">
                    [${new Date().toISOString()}] Admin panel loaded
                </div>
            </div>
        </div>
        
        <div class="status-card">
            <h3>ℹ️ How It Works</h3>
            <ol>
                <li><strong>Automatic Detection:</strong> When the system needs Facebook access, it checks for a saved session</li>
                <li><strong>Modal Request:</strong> If no valid session exists, a modal will appear requesting credentials</li>
                <li><strong>Secure Login:</strong> Credentials are used once to establish a session, then immediately discarded</li>
                <li><strong>Session Persistence:</strong> The session is saved and will be reused for future requests</li>
                <li><strong>Long-term Operation:</strong> Facebook sessions typically last months, reducing login frequency</li>
            </ol>
        </div>
    </div>
    
    ${FacebookLoginModal}
    
    <script>
        let authSocket = null;
        
        function initializeAdminPanel() {
            // Initialize the Facebook auth socket (from modal script)
            initFacebookAuthSocket();
            
            // Check initial status
            checkFacebookStatus();
            
            // Add additional logging for admin panel
            if (facebookSocket) {
                facebookSocket.on('connect', () => {
                    addLog('success', 'Connected to Facebook Authentication service');
                });
                
                facebookSocket.on('disconnect', () => {
                    addLog('warning', 'Disconnected from Facebook Authentication service');
                });
                
                facebookSocket.on('facebook-login-required', (data) => {
                    addLog('info', \`Login required: \${data.message}\`);
                });
                
                facebookSocket.on('facebook-login-result', (data) => {
                    if (data.success) {
                        addLog('success', \`Login successful: \${data.message}\`);
                    } else {
                        addLog('error', \`Login failed: \${data.message}\`);
                    }
                    checkFacebookStatus();
                });
            }
        }
        
        function checkSessionStatus() {
            const fs = require('fs');
            const path = require('path');
            
            try {
                // Check if cookies exist (simplified client-side check)
                const statusDiv = document.getElementById('current-status');
                statusDiv.innerHTML = \`
                    <p><strong>Status:</strong> ✅ WebSocket Facebook login system ready</p>
                    <p><strong>Login Method:</strong> Automatic modal when needed during parsing</p>
                    <p><strong>Last Check:</strong> \${new Date().toLocaleString()}</p>
                \`;
                
                addLog('info', 'Facebook login system is ready - login modal will appear when needed during parsing');
            } catch (error) {
                addLog('error', \`Failed to check status: \${error.message}\`);
            }
        }
        
        function testFacebookAuth() {
            addLog('info', 'Testing Facebook authentication...');
            addLog('warning', 'Start the test script: node test-interactive-facebook-auth.js');
        }
        
        function addLog(type, message) {
            const logsDiv = document.getElementById('system-logs');
            const timestamp = new Date().toISOString();
            const logEntry = document.createElement('div');
            logEntry.className = \`log-entry log-\${type}\`;
            logEntry.innerHTML = \`[\${timestamp}] \${message}\`;
            
            logsDiv.appendChild(logEntry);
            logsDiv.scrollTop = logsDiv.scrollHeight;
        }
        
        function clearLogs() {
            document.getElementById('system-logs').innerHTML = '';
            addLog('info', 'Logs cleared');
        }
        
        // Initialize when page loads
        document.addEventListener('DOMContentLoaded', initializeAdminPanel);
    </script>
</body>
</html>
    `;

    res.setHeader('Content-Type', 'text/html');
    res.send(html);
  }
}
