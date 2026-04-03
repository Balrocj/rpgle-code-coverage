# Development Guide - RPGLE Code Coverage

## 🚀 Getting Started

### Prerequisites
- Node.js 16+ installed
- Git installed  
- VS Code with extension development setup

### Quick Setup
```bash
git clone https://github.com/Balrocj/rpgle-code-coverage.git
cd rpgle-code-coverage
npm run dev-setup
```

This will:
1. Install all npm dependencies
2. Download Chromium (~385MB) for PDF generation
3. Compile the extension
4. Prepare for development

### Manual Setup
If `dev-setup` fails:
```bash
npm install                           # Install dependencies
npx puppeteer browsers install chrome # Download Chromium manually
npm run compile-debug                 # Compile extension
```

## 🔧 Architecture

### PDF Generation
- **Bundled Chromium**: Extension includes Chrome browser for universal compatibility
- **No external dependencies**: Works on any Windows system without Node.js
- **Graceful fallback**: HTML reports if PDF fails

### File Structure
```
├── src/                     # Source code
│   ├── extension.js         # Main extension logic
│   ├── CodeCoverage.js      # Coverage analysis
│   ├── ConfigurationPanel.js # Settings UI
│   └── ...
├── chromium/                # Bundled Chrome (auto-downloaded)
│   └── chrome-win64/        # Chrome executable and libs
├── scripts/                 # Build and setup scripts
│   ├── install-chromium.js  # Auto-install Chromium
│   └── dev-setup.js         # Development setup
└── dist/                    # Compiled extension
```

## 📦 Build Process

### Development
```bash
npm run watch-debug          # Watch mode with source maps
npm run compile-debug        # Single compilation with debug info
```

### Production
```bash
npm run package             # Production build (minified)
npx vsce package           # Create .vsix for marketplace
```

## 🧪 Testing

### Running Extension
1. Open project in VS Code
2. Press `F5` to launch Extension Development Host
3. Install "Code for IBM i" in the development window
4. Test your changes

### Testing PDF Generation
```javascript
// In development console
await isPdfAvailable()      // Should return true with bundled Chrome
```

## 📁 Important Files

- **package.json**: Extension manifest and dependencies
- **webpack.config.js**: Build configuration  
- **.vscodeignore**: Files excluded from package
- **scripts/install-chromium.js**: Auto-installs Chrome for new clones

## ⚠️ Common Issues

### Chromium Not Found
```bash
# Manually install
npx puppeteer browsers install chrome
# Copy to project
copy C:\Users\{user}\.cache\puppeteer\chrome\win64-*/chrome-win64 ./chromium/
```

### Large File Push Errors
- Chromium directory is in `.gitignore`
- Only source code is pushed to Git
- Each clone downloads its own Chromium

### Extension Size  
- Final package: ~175MB (includes Chromium)
- Source code: ~2MB  
- VS Code marketplace limit: 200MB ✅

## 🚀 Deployment

### Marketplace Publication
```bash
npm run package              # Build production version
npx vsce package            # Create .vsix (174.8MB)
npx vsce publish            # Publish to marketplace
```

### Local Installation
```bash
code --install-extension rpgle-code-coverage-1.0.1.vsix
```

## 💡 Development Tips

1. **PDF Testing**: Use bundled Chrome path in development
2. **Size Optimization**: Keep non-essential files in `.vscodeignore`
3. **Auto-Setup**: `postinstall` script handles Chromium automatically
4. **Universal Compatibility**: Extension works without external dependencies

## 📝 Contributing

1. Fork the repository
2. Run `npm run dev-setup`
3. Make your changes
4. Test with `F5` in VS Code
5. Submit pull request

---

**Happy coding!** 🎉