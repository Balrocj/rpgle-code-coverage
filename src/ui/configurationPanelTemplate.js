'use strict';

function getConfigurationPanelTemplate() {
    return `<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>RPGLE Code Coverage Configuration</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            min-height: 100vh;
            padding: 20px;
            position: relative;
        }

        .container {
            max-width: 800px;
            margin: 0 auto;
            background: white;
            border-radius: 20px;
            box-shadow: 0 20px 40px rgba(0, 0, 0, 0.1);
            overflow: hidden;
        }

        .header {
            background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%);
            padding: 30px;
            text-align: center;
            color: white;
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            font-weight: 300;
        }

        .header p {
            font-size: 1.1em;
            opacity: 0.9;
        }

        .form-container {
            padding: 40px;
        }

        .form-group {
            margin-bottom: 25px;
            position: relative;
        }



        .form-group input, .form-group select {
            width: 100%;
            padding: 15px 20px;
            border: 2px solid #e1e5e9;
            border-radius: 12px;
            font-size: 1em;
            transition: all 0.3s ease;
            background: #f8f9fa;
        }

        .form-group input:focus, .form-group select:focus {
            outline: none;
            border-color: #4facfe;
            background: white;
            box-shadow: 0 0 0 3px rgba(79, 172, 254, 0.1);
            transform: translateY(-2px);
        }

        .form-group input::placeholder {
            color: #adb5bd;
            font-style: italic;
        }

        .form-group.full-width {
            grid-column: 1 / -1;
        }

        .form-grid {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 25px;
        }

        .modules-section {
            background: #f8f9fa;
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
        }

        .modules-section h3 {
            color: #495057;
            margin-bottom: 15px;
            font-size: 1.2em;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .module-item {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr auto;
            align-items: center;
            gap: 8px;
            margin-bottom: 10px;
            padding: 12px;
            background: #f8f9fa;
            border-radius: 8px;
            border: 1px solid #dee2e6;
            box-sizing: border-box;
        }

        .module-item input,
        .module-item select {
            margin: 0;
            padding: 6px 8px;
            border: 1px solid #ced4da;
            border-radius: 4px;
            box-sizing: border-box;
            min-width: 0; /* Permite que los elementos se contraigan si es necesario */
        }

        .module-item input:focus,
        .module-item select:focus {
            border-color: #667eea;
            box-shadow: 0 0 0 2px rgba(102, 126, 234, 0.2);
            outline: none;
        }

        .module-item .field-error {
            border-color: #dc3545;
            background-color: #fff5f5;
        }

        .module-headers {
            display: grid;
            grid-template-columns: 1fr 1fr 1fr 1fr auto;
            gap: 8px;
            margin-bottom: 10px;
            padding: 0 12px;
            font-weight: 600;
            color: #495057;
            font-size: 0.9em;
            box-sizing: border-box;
        }

        @media (max-width: 768px) {
            .module-item {
                grid-template-columns: 1fr;
                gap: 8px;
            }
            .module-headers {
                display: none;
            }
        }

        .btn {
            padding: 12px 20px;
            border: none;
            border-radius: 8px;
            cursor: pointer;
            font-size: 1em;
            transition: all 0.3s ease;
            font-weight: 600;
        }

        .btn-primary {
            background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
            color: white;
        }

        .btn-primary:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(102, 126, 234, 0.3);
        }

        .btn-secondary {
            background: #6c757d;
            color: white;
        }

        .btn-secondary:hover {
            background: #5a6268;
            transform: translateY(-2px);
        }

        .btn-success {
            background: linear-gradient(135deg, #56ab2f 0%, #a8e6cf 100%);
            color: white;
        }

        .btn-success:hover {
            transform: translateY(-2px);
            box-shadow: 0 10px 20px rgba(86, 171, 47, 0.3);
        }

        .btn-danger {
            background: #dc3545;
            color: white;
            font-size: 0.9em;
            padding: 8px 12px;
        }

        .btn-danger:hover {
            background: #c82333;
        }

        .btn-add {
            background: #28a745;
            color: white;
            margin-top: 10px;
        }

        .btn-add:hover {
            background: #218838;
        }

        .actions {
            display: flex;
            gap: 15px;
            justify-content: center;
            padding-top: 10px;
            border-top: 2px solid #e9ecef;
            margin-top: 10px;
        }

        .alert {
            padding: 15px 20px;
            border-radius: 8px;
            margin: 20px 0;
            font-weight: 500;
            border: 1px solid transparent;
        }

        .alert-success {
            background: #d4edda;
            border: 1px solid #c3e6cb;
            color: #155724;
        }

        .alert-error {
            background: #f8d7da;
            border: 1px solid #f5c6cb;
            color: #721c24;
        }

        .info-box {
            background: linear-gradient(135deg, #ffecd2 0%, #fcb69f 100%);
            padding: 20px;
            border-radius: 12px;
            margin-bottom: 25px;
            border-left: 5px solid #ff6b6b;
        }

        .info-box h4 {
            color: #333;
            margin-bottom: 10px;
        }

        .info-box p {
            color: #666;
            line-height: 1.5;
        }

        @media (max-width: 768px) {
            .form-grid {
                grid-template-columns: 1fr;
            }
            
            .actions {
                flex-direction: column;
            }
            
            .container {
                margin: 10px;
                border-radius: 15px;
            }
        }

        /* Estilos para secciones */
        .section {
            margin: 25px 0;
            padding: 20px;
            background: #f8f9fa;
            border-radius: 12px;
            border-left: 4px solid #007acc;
        }

        .section h3 {
            margin-top: 0;
            color: #007acc;
            font-size: 1.2em;
        }

        /* Estilos para checkboxes mejorados */
        .checkbox-label {
            display: flex;
            align-items: flex-start; /* Cambiar a flex-start para mejor alineacin */
            cursor: pointer;
            font-weight: 500;
            color: #333;
            margin-bottom: 12px;
            gap: 10px; /* Aumentar espacio entre checkbox y texto */
            line-height: 1.4; /* Mejor espacio de lnea */
        }

        .checkbox-label input[type="checkbox"] {
            margin: 0;
            margin-top: 2px; /* Pequeo ajuste vertical */
            transform: scale(1.2);
            cursor: pointer;
            flex-shrink: 0;
        }



        .checkbox-label span:not(.checkmark) {
            flex: 1; /* El texto toma el espacio restante */
            word-wrap: break-word; /* Envolver texto largo */
        }

        .checkbox-label:hover {
            color: #007acc;
        }

        /* Mejorar la apariencia de los botones de agregar */
        .btn-add {
            background: linear-gradient(135deg, #28a745, #20c997);
            border: none;
            color: white;
            font-weight: 600;
            margin-top: 10px;
        }

        .btn-add:hover {
            background: linear-gradient(135deg, #218838, #1ea384);
            transform: translateY(-2px);
        }

        /* Help icons and tooltips */
        .field-with-help {
            position: relative;
            display: flex;
            align-items: center;
            gap: 8px;
        }

        .help-icon {
            width: 18px;
            height: 18px;
            border-radius: 50%;
            background: #6c757d;
            color: white;
            display: flex;
            align-items: center;
            justify-content: center;
            font-size: 12px;
            font-weight: bold;
            cursor: pointer;
            transition: all 0.3s ease;
            position: relative;
            flex-shrink: 0;
        }

        .help-icon:hover {
            background: #007acc;
            transform: scale(1.1);
        }

        /* Reset stacking context for form-grid to prevent z-index issues */
        .form-grid {
            isolation: auto !important;
            z-index: auto !important;
        }

        .tooltip,
        .tooltip-wide,
        .tooltip-extra-wide {
            position: fixed !important;
            top: 50% !important;
            left: 40% !important;
            transform: translate(-60%, -50%) !important;
            background: #333 !important;
            color: white !important;
            padding: 20px 25px !important;
            border-radius: 8px !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            white-space: normal !important;
            width: 520px !important;
            max-width: 85vw !important;
            max-height: 70vh !important;
            overflow-y: auto !important;
            opacity: 0 !important;
            visibility: hidden !important;
            transition: all 0.3s ease !important;
            z-index: 2147483647 !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
            border: 1px solid #555 !important;
            margin: 0 !important;
            pointer-events: none !important;
        }

        /* Special positioning for Program Execution Command tooltip */
        .form-container .form-group:first-child .help-icon .tooltip-extra-wide {
            left: 60% !important;
            transform: translate(-40%, -50%) !important;
        }

        /* Adjust Coverage View tooltip position */
        .form-container .form-grid .form-group:first-child .help-icon .tooltip-extra-wide {
            left: 70% !important;
            transform: translate(-30%, -50%) !important;
        }


        /* Disable default tooltip hover behavior for ALL help icons to use dynamic system */
        .help-icon .tooltip-extra-wide {
            display: none !important;
        }

        /* Dynamic tooltip that will be created by JavaScript */
        .dynamic-tooltip {
            position: fixed !important;
            background: #333 !important;
            color: white !important;
            padding: 20px 25px !important;
            border-radius: 8px !important;
            font-size: 14px !important;
            line-height: 1.6 !important;
            white-space: normal !important;
            width: 520px !important;
            max-width: 85vw !important;
            max-height: 70vh !important;
            overflow-y: auto !important;
            z-index: 2147483647 !important;
            box-shadow: 0 10px 25px rgba(0,0,0,0.5) !important;
            border: 1px solid #555 !important;
            pointer-events: none !important;
            opacity: 0 !important;
            transition: opacity 0.3s ease !important;
        }

        .dynamic-tooltip.show {
            opacity: 1 !important;
        }

        /* All tooltips now use dynamic system - keep this as fallback only */
        .help-icon:hover .tooltip,
        .help-icon:hover .tooltip-wide {
            opacity: 1 !important;
            visibility: visible !important;
            pointer-events: auto !important;
        }

        /* Remove any conflicting arrows */
        .tooltip::after,
        .tooltip-wide::after,
        .tooltip-extra-wide::after {
            display: none !important;
        }

        .form-group label {
            display: flex;
            align-items: center;
            gap: 8px;
            margin-bottom: 8px;
            font-weight: 600;
            color: #333;
            font-size: 1.1em;
        }

        .module-headers .header-with-help {
            display: flex;
            align-items: center;
            gap: 4px;
            justify-content: center;
        }

        .module-headers .help-icon {
            width: 14px;
            height: 14px;
            font-size: 10px;
        }
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1> RPGLE Code Coverage Configuration</h1>
            <p>Configure the parameters for code coverage execution</p>
        </div>

        <div class="form-container">
            <div class="info-box">
                <h4> Important Information</h4>
                <p>Configure here the parameters required to run CODECOV on your IBM i system. 
                All fields are required for proper code coverage functionality.</p>
            </div>

            <form id="configForm">
                <div class="form-group">
                    <label for="pgm_ejecutar">
                         Program Execution Command
                        <span class="help-icon">?
                            <div class="tooltip-extra-wide">
                            Run the same program that you would run via command line. With or without parameters.
                            You can create your own CL program that loads the libraries and calls the trigger program (CALL or RUCALLTST).  
                            This way, you can use your program's library list instead of the Code for IBM i library list.QDEVTOOLS is indispensable.
                            </div>
                        </span>
                    </label>
                    <input type="text" id="pgm_ejecutar" name="pgm_ejecutar" 
                           placeholder="E.g.: CALL PGM(LIBRARY/PROGRAM) or RUCALLTST TSTPGM(LIBRARY/TEST_PROGRAM)" 
                           title="Command to execute the program to be analyzed">
                </div>



                <div class="modules-section">
                    <h3>
                        <span> Programs, SRVPGM or Modules to Analyze</span>
                        <span class="help-icon">?
                            <div class="tooltip-extra-wide">
                                Configure the IBM i objects to analyze for code coverage:<br><br>
                                 <strong>Library:</strong> IBM i library name.<br>
                                 <strong>Program/SRVPGM:</strong> Program or service program name.<br>
                                 <strong>Type:</strong> *PGM for programs, *SRVPGM for service programs<br>
                                 <strong>Module:</strong> Specific module name or *ALL for all modules                                
                            </div>
                        </span>
                    </h3>
                    <div class="module-headers">
                        <div>Library</div>
                        <div>Program/SRVPGM</div>
                        <div>Type</div>
                        <div>Module</div>
                        <div>Action</div>
                    </div>
                    <div id="modulesList">
                        <!-- Los mdulos se cargarn dinmicamente -->
                    </div>
                    <button type="button" class="btn btn-add" onclick="addModule()">
                         Add PGM/SRVPGM
                    </button>
                </div>



                <div class="form-grid">

                    <div class="form-group">
                        <label for="ccView">
                             Coverage View
                            <span class="help-icon">?
                                <div class="tooltip-extra-wide">
                                    View format for coverage report:<br>
                                     *SOURCE: Shows original source code with coverage highlights<br>
                                    &nbsp;&nbsp;<em> More precise - ignores comments and declarations</em><br>
                                    &nbsp;&nbsp;<em> Requires original source file to exist</em><br>
                                     *LIST: Shows compiler listing format with coverage data<br>
                                    &nbsp;&nbsp;<em> Less precise - may mark non-executable lines as covered</em><br>
                                    &nbsp;&nbsp;<em> Works even if source files are moved/deleted</em>
                                </div>
                            </span>
                        </label>
                        <select id="ccView" name="ccView" title="View type to display coverage">
                            <option value="*SOURCE">*SOURCE - Source code view</option>
                            <option value="*LIST">*LIST - Listing view</option>
                        </select>
                    </div>

                    <div class="form-group">
                        <label for="ccLevel">
                             Coverage Level
                            <span class="help-icon">?
                                <div class="tooltip-extra-wide">
                                    Level of detail for coverage analysis:<br>
                                     *LINE: Coverage measured by source lines executed (Recommended)<br>
                                     *PROC: Coverage measured by individual procedures executed
                                </div>
                            </span>
                        </label>
                        <select id="ccLevel" name="ccLevel" title="Level of detail of the coverage">
                            <option value="*LINE">*LINE - Coverage per line</option>
                            <option value="*PROC">*PROC - Coverage per procedure</option>
                        </select>
                    </div>
                </div>

                <div id="alertContainer"></div>

                <div class="actions">
                    <button type="button" class="btn btn-success" onclick="saveConfiguration()">
                         Save Configuration
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="loadConfiguration()">
                         Reload
                    </button>
                    <button type="button" class="btn btn-primary" onclick="testConfiguration()">
                         Test Configuration
                    </button>
                    <button type="button" class="btn btn-warning" onclick="openAdvancedOptions()">
                         Advanced options
                    </button>
                    <button type="button" class="btn btn-secondary" onclick="closePanel()">
                         Close
                    </button>
                </div>
            </form>
        </div>
    </div>

    <script>
        const vscode = acquireVsCodeApi();
        let moduleCounter = 0;
        let dynamicTooltip = null;

        // Create dynamic tooltip system for grid elements
        function createDynamicTooltip() {
            if (dynamicTooltip) return;
            
            dynamicTooltip = document.createElement('div');
            dynamicTooltip.className = 'dynamic-tooltip';
            document.body.appendChild(dynamicTooltip);
        }

        function showDynamicTooltip(content, x, y) {
            createDynamicTooltip();
            dynamicTooltip.innerHTML = content;
            
            // Position tooltip
            let left, top;
            if (x < window.innerWidth / 2) {
                // Icon on left side, show tooltip more to the right
                left = Math.min(window.innerWidth * 0.7, x + 200);
            } else {
                // Icon on right side, show tooltip more to the left
                left = Math.max(window.innerWidth * 0.3, x - 200);
            }
            
            top = window.innerHeight / 2;
            
            dynamicTooltip.style.left = left + 'px';
            dynamicTooltip.style.top = top + 'px';
            dynamicTooltip.style.transform = 'translate(-50%, -50%)';
            
            // Show tooltip
            setTimeout(() => {
                dynamicTooltip.classList.add('show');
            }, 10);
        }

        function hideDynamicTooltip() {
            if (dynamicTooltip) {
                dynamicTooltip.classList.remove('show');
            }
        }

        // Initialize dynamic tooltip handlers for ALL help icons after DOM load
        document.addEventListener('DOMContentLoaded', () => {
            // Setup handlers for ALL help icons to have consistent appearance
            const allHelpIcons = document.querySelectorAll('.help-icon');
            
            allHelpIcons.forEach((icon, index) => {
                const tooltipContent = icon.querySelector('.tooltip-extra-wide');
                if (tooltipContent) {
                    const content = tooltipContent.innerHTML;
                    
                    icon.addEventListener('mouseenter', (e) => {
                        const rect = icon.getBoundingClientRect();
                        showDynamicTooltip(content, rect.left + rect.width / 2, rect.top + rect.height / 2);
                    });
                    
                    icon.addEventListener('mouseleave', () => {
                        hideDynamicTooltip();
                    });
                }
            });
        });

        function showAlert(message, type = 'success') {
            const alertContainer = document.getElementById('alertContainer');
            const alertClass = type === 'success' ? 'alert-success' : 'alert-error';
            alertContainer.innerHTML = \`
                <div class="alert \${alertClass}">
                    \${message}
                </div>
            \`;
            
            // Auto-hide despus de 5 segundos
            setTimeout(() => {
                alertContainer.innerHTML = '';
            }, 5000);
        }

        function addModule(value = '') {
            const modulesList = document.getElementById('modulesList');
            moduleCounter++;
            
            // Parsear valor existente si se proporciona
            let library = '', program = '', type = '*PGM', module = '*ALL';
            if (value && value.trim()) {
                // Usar un approach ms robusto para dividir por espacios
                const trimmed = value.trim();
                
                // Dividir por espacios, pero filtrar elementos vacos
                const parts = trimmed.split(' ').filter(part => part.trim() !== '');
                
                if (parts.length >= 1) {
                    const libPgm = parts[0].split('/');
                    
                    if (libPgm.length === 2) {
                        library = libPgm[0];
                        program = libPgm[1];
                    } else {
                        // Si no hay slash, asumir que es solo el programa sin biblioteca
                        library = '';
                        program = parts[0];
                    }
                }
                if (parts.length >= 2) {
                    type = parts[1];
                }
                if (parts.length >= 3) {
                    module = parts[2];
                }
            }
            
            const moduleDiv = document.createElement('div');
            moduleDiv.className = 'module-item';
            
            // Create elements directly to avoid template literal issues
            const libraryInput = document.createElement('input');
            libraryInput.type = 'text';
            libraryInput.name = 'library[]';
            libraryInput.value = library;
            libraryInput.placeholder = 'Library';
            libraryInput.maxLength = 10;
            libraryInput.title = 'Library name (max 10 characters)';
            libraryInput.onblur = function() { validateModuleField(this, 'library'); };
            
            const programInput = document.createElement('input');
            programInput.type = 'text';
            programInput.name = 'program[]';
            programInput.value = program;
            programInput.placeholder = 'Program/SRVPGM';
            programInput.maxLength = 10;
            programInput.title = 'Program or SRVPGM name (max 10 characters)';
            programInput.onblur = function() { validateModuleField(this, 'program'); };
            
            const typeSelect = document.createElement('select');
            typeSelect.name = 'type[]';
            typeSelect.title = 'Select object type';
            typeSelect.onchange = function() { updateModuleDefault(this); };
            
            const pgmOption = document.createElement('option');
            pgmOption.value = '*PGM';
            pgmOption.textContent = '*PGM';
            pgmOption.selected = (type === '*PGM');
            
            const srvpgmOption = document.createElement('option');
            srvpgmOption.value = '*SRVPGM';
            srvpgmOption.textContent = '*SRVPGM';
            srvpgmOption.selected = (type === '*SRVPGM');
            
            typeSelect.appendChild(pgmOption);
            typeSelect.appendChild(srvpgmOption);
            
            const moduleInput = document.createElement('input');
            moduleInput.type = 'text';
            moduleInput.name = 'module[]';
            moduleInput.value = module;
            moduleInput.placeholder = '*ALL';
            moduleInput.maxLength = 10;
            moduleInput.title = 'Module name (max 10 characters, *ALL for all modules)';
            moduleInput.onblur = function() { validateModuleField(this, 'module'); };
            
            const removeButton = document.createElement('button');
            removeButton.type = 'button';
            removeButton.className = 'btn btn-danger';
            removeButton.title = 'Remove this entry';
            removeButton.textContent = 'X';
            removeButton.onclick = function() { removeModule(this); };
            
            moduleDiv.appendChild(libraryInput);
            moduleDiv.appendChild(programInput);
            moduleDiv.appendChild(typeSelect);
            moduleDiv.appendChild(moduleInput);
            moduleDiv.appendChild(removeButton);
            
            modulesList.appendChild(moduleDiv);
        }

        function removeModule(button) {
            button.parentElement.remove();
        }

        function validateModuleField(input, fieldType) {
            const value = input.value.trim().toUpperCase();
            input.value = value; // Convert to uppercase
            
            // Remove error class first
            input.classList.remove('field-error');
            
            // Validate based on field type
            if (fieldType === 'library' || fieldType === 'program') {
                if (!value) {
                    input.classList.add('field-error');
                    return false;
                }
                // IBM i naming rules: alphanumeric, $, #, @, first char must be letter, $, #, @
                if (!/^[A-Z$#@][A-Z0-9$#@]*$/.test(value)) {
                    input.classList.add('field-error');
                    return false;
                }
            } else if (fieldType === 'module') {
                if (!value) {
                    input.value = '*ALL'; // Default value
                    return true;
                }
                if (value !== '*ALL' && !/^[A-Z$#@][A-Z0-9$#@]*$/.test(value)) {
                    input.classList.add('field-error');
                    return false;
                }
            }
            
            return true;
        }

        function updateModuleDefault(selectElement) {
            const moduleRow = selectElement.parentElement;
            const moduleInput = moduleRow.querySelector('input[name="module[]"]');
            
            // Set default *ALL if empty
            if (!moduleInput.value.trim()) {
                moduleInput.value = '*ALL';
            }
        }

        function validateAllModules() {
            const moduleItems = document.querySelectorAll('.module-item');
            let isValid = true;
            
            moduleItems.forEach(item => {
                const library = item.querySelector('input[name="library[]"]');
                const program = item.querySelector('input[name="program[]"]');
                const module = item.querySelector('input[name="module[]"]');
                
                if (!validateModuleField(library, 'library') ||
                    !validateModuleField(program, 'program') ||
                    !validateModuleField(module, 'module')) {
                    isValid = false;
                }
            });
            
            return isValid;
        }

        function saveConfiguration() {
            const formData = new FormData(document.getElementById('configForm'));
            
            // Validate all modules first
            if (!validateAllModules()) {
                showAlert(' Please correct the highlighted fields in red', 'error');
                return;
            }
            
            // Recopilar mdulos en el formato original
            const modules = [];
            const libraries = formData.getAll('library[]');
            const programs = formData.getAll('program[]');
            const types = formData.getAll('type[]');
            const moduleNames = formData.getAll('module[]');
            
            for (let i = 0; i < libraries.length; i++) {
                const library = libraries[i].trim().toUpperCase();
                const program = programs[i].trim().toUpperCase();
                const type = types[i];
                const moduleName = moduleNames[i].trim().toUpperCase() || '*ALL';
                
                if (library && program) {
                    // Formato: LIBRARY/PROGRAM *PGM *ALL
                    modules.push(library + '/' + program + ' ' + type + ' ' + moduleName);
                }
            }

            const config = {
                modules: modules,
                programToExecute: formData.get('pgm_ejecutar'),
                ccView: formData.get('ccView'),
                ccLevel: formData.get('ccLevel')
            };

            // Validar campos obligatorios
            if (!config.programToExecute || modules.length === 0) {
                showAlert(' Please complete all required fields', 'error');
                return;
            }

            vscode.postMessage({
                command: 'save',
                config: config
            });
        }

        function loadConfiguration() {
            vscode.postMessage({
                command: 'load'
            });
        }

        function testConfiguration() {
            vscode.postMessage({
                command: 'test'
            });
        }

        function loadConfigurationData(config) {
            if (!config) return;

            const codecov = config.codecov || config; // Compatibilidad con formato anterior

            // Cargar campos bsicos
            document.getElementById('pgm_ejecutar').value = codecov.programToExecute || codecov.pgm_ejecutar || '';
            document.getElementById('ccView').value = codecov.ccView || '*SOURCE';
            document.getElementById('ccLevel').value = codecov.ccLevel || '*LINE';

            // Limpiar listas existentes
            document.getElementById('modulesList').innerHTML = '';
            moduleCounter = 0;

            // Cargar mdulos
            if (codecov.modules || codecov.module) {
                const modules = codecov.modules || codecov.module;
                const moduleArray = Array.isArray(modules) ? modules : [modules];
                moduleArray.forEach(module => {
                    addModule(module);
                });
            }

            // Si no hay elementos, agregar uno vaco de cada tipo
            if (!codecov.sourceLibraries && !codecov.sourceLibrary) {
                addSourceLibrary();
            }
            if (!codecov.modules && !codecov.module) {
                addModule();
            }
        }

        // Inicializar con elementos vacos
        window.addEventListener('load', () => {
            addSourceLibrary();
            // No agregar mdulo vaco aqu, se agrega en loadConfigurationData si es necesario
            loadConfiguration();
        });

        // Escuchar mensajes del panel
        window.addEventListener('message', event => {
            const message = event.data;
            
            switch (message.command) {
                case 'configLoaded':
                    loadConfigurationData(message.config);
                    break;
                case 'configSaved':
                    showAlert(' Configuration saved successfully');
                    break;
                case 'configError':
                    showAlert(' Error: ' + message.error, 'error');
                    break;
                case 'testResult':
                    showAlert(message.success ? 
                        ' Valid configuration - Successful connection' : 
                        ' Configuration error: ' + message.error, 
                        message.success ? 'success' : 'error');
                    break;
            }
        });

        function openAdvancedOptions() {
            vscode.postMessage({ command: 'openGlobalSettings', section: 'rpgleCoverage' });
        }

        function closePanel() {
            vscode.postMessage({ command: 'close' });
        }
    </script>
</body>
</html>`;
}

module.exports = { getConfigurationPanelTemplate };



