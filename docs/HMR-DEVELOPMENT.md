# 🔥 HMR Development Setup - Important Notes

## ⚠️ **DO NOT START SERVERS MANUALLY**

### 🚀 **HMR is Already Running**

- **Frontend**: Running on `http://localhost:5173` with Vite HMR
- **Backend**: Running on `http://localhost:8000` with NestJS HMR
- **Hot Reload**: All changes are automatically detected and updated

### 🔄 **How HMR Works**

1. **File Changes**: When you edit files, HMR detects changes instantly
2. **Auto Rebuild**: Both frontend and backend rebuild automatically
3. **Live Updates**: Changes appear in browser without manual refresh
4. **State Preservation**: Frontend state is preserved during updates

### 🛑 **Commands to AVOID**

- ❌ `npm run dev` (server already running)
- ❌ `npm run start:dev` (backend already running)
- ❌ `npm run build` (unless specifically needed for production)
- ❌ Manual server restarts (HMR handles this)

### ✅ **What You CAN Do**

- ✅ Edit files directly - changes apply instantly
- ✅ Create new components/pages - HMR will detect
- ✅ Update styles/themes - instant visual feedback
- ✅ Modify backend code - auto-restarts server
- ✅ Add dependencies (will require server restart)

### 🌐 **Current Running Services**

- **Frontend Vite Dev**: `http://localhost:5173`
- **Backend NestJS Dev**: `http://localhost:8000`
- **API Endpoints**: `http://localhost:8000/api`
- **WebSocket**: `ws://localhost:8000`

### 📝 **Development Workflow**

1. **Edit Files**: Make changes in VS Code
2. **See Updates**: Check browser automatically
3. **Debug**: Use browser dev tools + VS Code debugger
4. **Test**: Changes are live-tested immediately

### 🔧 **When to Restart Servers**

- **New Dependencies**: After `npm install`
- **Environment Changes**: After updating `.env`
- **Config Changes**: After modifying `vite.config.ts` or `nest-cli.json`
- **Database Schema**: After TypeORM entity changes
- **Port Conflicts**: If ports are blocked

### 🎯 **Current Project Status**

- ✅ KaraokeHub branding updated
- ✅ Font Awesome icons integrated
- ✅ Theme system with light/dark toggle
- ✅ Header title now links to home
- ✅ Map component ready for integration
- ✅ All changes applied via HMR

### 💡 **Pro Tips**

- **Browser Auto-Refresh**: Changes appear instantly
- **Error Overlay**: Vite shows errors in browser
- **Terminal Logs**: Watch for build/server messages
- **State Management**: MobX stores persist through HMR

Remember: **HMR = Hot Module Replacement** - your development environment that automatically updates without manual intervention! 🔥
