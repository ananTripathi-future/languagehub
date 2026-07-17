/* ==========================================================================
   LinguaSync - Voice and Text Controller
   ========================================================================== */

document.addEventListener('DOMContentLoaded', () => {
    // --- UI Elements ---
    const sourceText = document.getElementById('source-text');
    const targetText = document.getElementById('target-text');
    const targetTextPlaceholder = document.getElementById('target-text-placeholder');
    const targetTextContainer = document.getElementById('target-text-container');
    const sourceLangSelect = document.getElementById('source-language');
    const targetLangSelect = document.getElementById('target-language');
    
    // Character limit & metadata
    const currentCharCount = document.getElementById('current-char-count');
    const translationStatus = document.getElementById('translation-status');
    const shimmerLoader = document.getElementById('translation-shimmer');
    
    // Action buttons
    const micBtn = document.getElementById('mic-btn');
    const clearTextBtn = document.getElementById('clear-text-btn');
    const pasteTextBtn = document.getElementById('paste-text-btn');
    const speakSourceBtn = document.getElementById('speak-source-btn');
    const speakTargetBtn = document.getElementById('speak-target-btn');
    const copyTextBtn = document.getElementById('copy-text-btn');
    const favoriteBtn = document.getElementById('favorite-btn');
    const swapLanguagesBtn = document.getElementById('swap-languages-btn');
    
    // Voice wave indicators
    const voiceWaves = document.getElementById('voice-waves');
    const listeningIndicator = document.getElementById('listening-indicator');
    
    // Side Drawers
    const historyDrawer = document.getElementById('history-drawer');
    const favoritesDrawer = document.getElementById('favorites-drawer');
    const historyToggleBtn = document.getElementById('history-toggle-btn');
    const favoritesToggleBtn = document.getElementById('favorites-toggle-btn');
    const closeHistoryBtn = document.getElementById('close-history-btn');
    const closeFavoritesBtn = document.getElementById('close-favorites-btn');
    const clearHistoryBtn = document.getElementById('clear-history-btn');
    const historyList = document.getElementById('history-list');
    const favoritesList = document.getElementById('favorites-list');
    
    // Settings elements
    const settingsModal = document.getElementById('settings-modal');
    const settingsToggleBtn = document.getElementById('settings-toggle-btn');
    const closeSettingsBtn = document.getElementById('close-settings-btn');
    const saveSettingsBtn = document.getElementById('save-settings-btn');
    const settingsVoiceSpeed = document.getElementById('settings-voice-speed');
    const voiceSpeedVal = document.getElementById('voice-speed-val');
    const settingsVoicePitch = document.getElementById('settings-voice-pitch');
    const voicePitchVal = document.getElementById('voice-pitch-val');
    const settingsVoiceAccent = document.getElementById('settings-voice-accent');
    const settingsAutoplayTTS = document.getElementById('settings-autoplay-tts');
    const settingsContinuousMic = document.getElementById('settings-continuous-mic');
    const settingsApiEndpoint = document.getElementById('settings-api-endpoint');
    const customApiInputs = document.getElementById('custom-api-inputs');
    const customApiUrl = document.getElementById('custom-api-url');
    const customApiKey = document.getElementById('custom-api-key');
    const themeToggleBtn = document.getElementById('theme-toggle-btn');
    const toastContainer = document.getElementById('toast-container');

    // --- State variables ---
    let translationTimeout;
    let recognition;
    let isListening = false;
    let synth = window.speechSynthesis;
    let speechSourceUtterance = null;
    let speechTargetUtterance = null;
    
    // Local storage states
    let translationHistory = JSON.parse(localStorage.getItem('languagehub_history')) || [];
    let starredPhrases = JSON.parse(localStorage.getItem('languagehub_starred')) || [];
    
    let appConfig = JSON.parse(localStorage.getItem('languagehub_config')) || {
        theme: 'dark',
        voiceSpeed: 1.0,
        voicePitch: 1.0,
        autoplayTTS: false,
        continuousMic: false,
        apiEndpoint: 'google',
        customApiUrl: '',
        customApiKey: ''
    };

    // Migration rule: if apiEndpoint is 'mymemory' and they didn't explicitly choose it, migrate to 'google'
    if (appConfig.apiEndpoint === 'mymemory' && !localStorage.getItem('languagehub_migrated_v2')) {
        appConfig.apiEndpoint = 'google';
        localStorage.setItem('languagehub_migrated_v2', 'true');
        localStorage.setItem('languagehub_config', JSON.stringify(appConfig));
    }

    // --- Initial System Setup ---
    initApp();

    function initApp() {
        // Restore theme
        document.body.setAttribute('data-theme', appConfig.theme);
        updateThemeToggleIcon();
        
        // Load UI configurations
        settingsVoiceSpeed.value = appConfig.voiceSpeed;
        voiceSpeedVal.textContent = appConfig.voiceSpeed.toFixed(1) + 'x';
        settingsVoicePitch.value = appConfig.voicePitch;
        voicePitchVal.textContent = appConfig.voicePitch.toFixed(1) + 'x';
        settingsAutoplayTTS.checked = appConfig.autoplayTTS;
        settingsContinuousMic.checked = appConfig.continuousMic;
        settingsApiEndpoint.value = appConfig.apiEndpoint;
        customApiUrl.value = appConfig.customApiUrl;
        customApiKey.value = appConfig.customApiKey;
        
        if (appConfig.apiEndpoint === 'custom') {
            customApiInputs.classList.remove('hidden');
        }
        
        // Set up Speech Synthesis voices dropdown
        populateVoicesList();
        if (synth && synth.onvoiceschanged !== undefined) {
            synth.onvoiceschanged = populateVoicesList;
        }

        // Initialize Speech Recognition
        initSpeechRecognition();
        
        // Render panels
        renderHistory();
        renderFavorites();
        
        // Validate buttons on start
        updateActionButtonsState();
    }

    // --- Core Translation Operations ---
    
    function debouncedTranslate() {
        clearTimeout(translationTimeout);
        translationTimeout = setTimeout(() => {
            performTranslation();
        }, 800); // 800ms debounce
    }

    async function performTranslation() {
        const text = sourceText.value.trim();
        if (!text) {
            clearTranslationOutput();
            return;
        }

        const sourceLang = sourceLangSelect.value;
        const targetLang = targetLangSelect.value;

        // Visual loading trigger
        showLoadingState(true);
        translationStatus.innerHTML = '<i class="fa-solid fa-spinner fa-spin"></i> Translating...';

        try {
            let translatedResult = '';
            
            if (appConfig.apiEndpoint === 'custom' && appConfig.customApiUrl) {
                translatedResult = await translateWithCustomAPI(text, sourceLang, targetLang);
            } else if (appConfig.apiEndpoint === 'mymemory') {
                translatedResult = await translateWithMyMemory(text, sourceLang, targetLang);
            } else {
                translatedResult = await translateWithGoogle(text, sourceLang, targetLang);
            }

            // Display result
            displayTranslationResult(translatedResult);
            
            // Add translation to history
            addToHistory(text, translatedResult, sourceLang, targetLang);

            // Handle Autoplay TTS
            if (appConfig.autoplayTTS) {
                speakText(translatedResult, targetLangSelect.value, 'target');
            }
        } catch (error) {
            console.error("Translation Error: ", error);
            translationStatus.textContent = 'Translation failed';
            showToast('Translation error. Checked connection?', 'error');
            
            // Fallback display
            targetText.textContent = `[Could not connect to translation server. Fallback response: "${text}"]`;
            targetText.classList.remove('hidden');
            targetTextPlaceholder.classList.add('hidden');
        } finally {
            showLoadingState(false);
        }
    }

    // Google Translate API execution
    async function translateWithGoogle(text, fromLocale, toLocale) {
        const fromLang = fromLocale.split('-')[0];
        const toLang = toLocale.split('-')[0];
        
        const url = `https://translate.googleapis.com/translate_a/single?client=gtx&sl=${fromLang}&tl=${toLang}&dt=t&q=${encodeURIComponent(text)}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`Google Translate API HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        let translatedText = '';
        if (data && data[0]) {
            data[0].forEach(row => {
                if (row[0]) {
                    translatedText += row[0];
                }
            });
            return translatedText;
        } else {
            throw new Error('Google translation response structure invalid');
        }
    }

    // MyMemory API execution
    async function translateWithMyMemory(text, fromLocale, toLocale) {
        // Extract basic ISO tags (e.g. en-US -> en)
        const fromLang = fromLocale.split('-')[0];
        const toLang = toLocale.split('-')[0];
        
        const url = `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text)}&langpair=${fromLang}|${toLang}`;
        
        const response = await fetch(url);
        if (!response.ok) {
            throw new Error(`MyMemory API HTTP error: ${response.status}`);
        }
        
        const data = await response.json();
        if (data.responseStatus === 200) {
            return data.responseData.translatedText;
        } else if (data.responseStatus === 403 || data.responseStatus === 429) {
            throw new Error('API Rate limit exceeded or service restricted');
        } else {
            throw new Error(data.responseDetails || 'MyMemory translation failed');
        }
    }

    // Custom API translation (e.g. LibreTranslate endpoint)
    async function translateWithCustomAPI(text, fromLocale, toLocale) {
        const fromLang = fromLocale.split('-')[0];
        const toLang = toLocale.split('-')[0];
        
        const headers = { 'Content-Type': 'application/json' };
        if (appConfig.customApiKey) {
            headers['Authorization'] = `Bearer ${appConfig.customApiKey}`;
        }

        const bodyData = {
            q: text,
            source: fromLang,
            target: toLang,
            format: 'text'
        };

        const response = await fetch(appConfig.customApiUrl, {
            method: 'POST',
            body: JSON.stringify(bodyData),
            headers: headers
        });

        if (!response.ok) {
            throw new Error(`Custom translation API status error: ${response.status}`);
        }

        const data = await response.json();
        // Custom endpoints often return { translatedText: "..." } or { translations: [{ text: "..." }] }
        return data.translatedText || 
               (data.translations && data.translations[0] && data.translations[0].translatedText) || 
               data.text ||
               JSON.stringify(data);
    }

    // UI Helpers
    function clearTranslationOutput() {
        targetText.textContent = '';
        targetText.classList.add('hidden');
        targetTextPlaceholder.classList.remove('hidden');
        translationStatus.textContent = 'Ready';
        favoriteBtn.disabled = true;
        copyTextBtn.disabled = true;
        speakTargetBtn.disabled = true;
        favoriteBtn.querySelector('i').className = 'fa-regular fa-star'; // Reset icon
    }

    function showLoadingState(isLoading) {
        if (isLoading) {
            shimmerLoader.classList.remove('hidden');
            targetText.classList.add('hidden');
            targetTextPlaceholder.classList.add('hidden');
            favoriteBtn.disabled = true;
            copyTextBtn.disabled = true;
            speakTargetBtn.disabled = true;
        } else {
            shimmerLoader.classList.add('hidden');
        }
    }

    function displayTranslationResult(translatedText) {
        targetText.innerHTML = escapeHTML(translatedText);
        targetText.classList.remove('hidden');
        targetTextPlaceholder.classList.add('hidden');
        translationStatus.textContent = 'Translated';
        
        favoriteBtn.disabled = false;
        copyTextBtn.disabled = false;
        speakTargetBtn.disabled = false;
        
        // Check if this translation is already favorited
        const isFav = starredPhrases.some(item => 
            item.sourceText.toLowerCase() === sourceText.value.trim().toLowerCase() && 
            item.targetText.toLowerCase() === translatedText.toLowerCase()
        );
        
        if (isFav) {
            favoriteBtn.querySelector('i').className = 'fa-solid fa-star text-gold';
        } else {
            favoriteBtn.querySelector('i').className = 'fa-regular fa-star';
        }
    }

    // --- Speech Synthesis (Text-to-Speech TTS) ---

    function populateVoicesList() {
        if (!synth) return;
        
        // Fetch voices
        const voices = synth.getVoices();
        settingsVoiceAccent.innerHTML = '<option value="default">System Default Voice</option>';
        
        voices.forEach(voice => {
            const option = document.createElement('option');
            option.value = voice.name;
            option.textContent = `${voice.name} (${voice.lang})`;
            settingsVoiceAccent.appendChild(option);
        });
    }

    function speakText(text, locale, type) {
        if (!synth) {
            showToast('Voice playback not supported in this browser', 'error');
            return;
        }

        // If currently playing, cancel first (acts as toggle)
        if (synth.speaking) {
            synth.cancel();
            updateSpeakButtons(false, type);
            return;
        }

        if (!text) return;

        const utterance = new SpeechSynthesisUtterance(text);
        utterance.lang = locale;
        utterance.rate = appConfig.voiceSpeed;
        utterance.pitch = appConfig.voicePitch;

        // Custom voice setting
        if (settingsVoiceAccent.value !== 'default') {
            const voices = synth.getVoices();
            const selectedVoice = voices.find(v => v.name === settingsVoiceAccent.value);
            if (selectedVoice) {
                utterance.voice = selectedVoice;
            }
        }

        utterance.onstart = () => {
            updateSpeakButtons(true, type);
        };

        utterance.onend = () => {
            updateSpeakButtons(false, type);
        };

        utterance.onerror = (e) => {
            console.error('Speech synthesis error: ', e);
            updateSpeakButtons(false, type);
        };

        if (type === 'source') {
            speechSourceUtterance = utterance;
        } else {
            speechTargetUtterance = utterance;
        }

        synth.speak(utterance);
    }

    function updateSpeakButtons(isPlaying, type) {
        const btn = type === 'source' ? speakSourceBtn : speakTargetBtn;
        const icon = btn.querySelector('i');
        if (isPlaying) {
            icon.className = 'fa-solid fa-pause';
            btn.classList.add('active-play');
        } else {
            icon.className = 'fa-solid fa-volume-up';
            btn.classList.remove('active-play');
        }
    }

    // --- Speech Recognition (Speech-to-Text STT) ---

    function initSpeechRecognition() {
        const SpeechRecognitionClass = window.SpeechRecognition || window.webkitSpeechRecognition;
        
        if (!SpeechRecognitionClass) {
            micBtn.style.opacity = '0.4';
            micBtn.disabled = true;
            micBtn.setAttribute('data-tooltip', 'Speech input not supported on this browser');
            return;
        }

        recognition = new SpeechRecognitionClass();
        recognition.continuous = appConfig.continuousMic;
        recognition.interimResults = true;

        recognition.onstart = () => {
            isListening = true;
            micBtn.classList.add('recording');
            document.getElementById('source-card').classList.add('active-mic');
            voiceWaves.classList.remove('hidden');
            listeningIndicator.classList.remove('hidden');
            showToast('Listening voice input...', 'success');
        };

        recognition.onresult = (event) => {
            let interimTranscript = '';
            let finalTranscript = '';

            for (let i = event.resultIndex; i < event.results.length; ++i) {
                if (event.results[i].isFinal) {
                    finalTranscript += event.results[i][0].transcript;
                } else {
                    interimTranscript += event.results[i][0].transcript;
                }
            }

            if (finalTranscript) {
                // If text already exists, append with spacing
                if (sourceText.value.trim() !== '') {
                    sourceText.value = sourceText.value.trim() + ' ' + finalTranscript;
                } else {
                    sourceText.value = finalTranscript;
                }
                
                // Fire translation processing
                triggerTextChangeEffects();
            }
        };

        recognition.onerror = (event) => {
            console.error('Speech recognition error: ', event.error);
            if (event.error === 'not-allowed') {
                showToast('Microphone access blocked. Enable permissions in address bar.', 'error');
            } else {
                showToast(`Speech input error: ${event.error}`, 'error');
            }
            stopSpeechRecognition();
        };

        recognition.onend = () => {
            stopSpeechRecognition();
        };
    }

    function toggleSpeechRecognition() {
        if (!recognition) {
            showToast('Speech recognition not supported in this browser.', 'error');
            return;
        }

        if (isListening) {
            recognition.stop();
        } else {
            // Set input language dynamically based on select dropdown
            recognition.lang = sourceLangSelect.value;
            recognition.continuous = appConfig.continuousMic;
            
            try {
                // Cancel active synthesis speech to prevent loop feedback
                if (synth && synth.speaking) synth.cancel();
                
                recognition.start();
            } catch(e) {
                console.error(e);
            }
        }
    }

    function stopSpeechRecognition() {
        isListening = false;
        micBtn.classList.remove('recording');
        document.getElementById('source-card').classList.remove('active-mic');
        voiceWaves.classList.add('hidden');
        listeningIndicator.classList.add('hidden');
    }

    // --- Event Listeners and Triggers ---

    // Source inputs
    sourceText.addEventListener('input', () => {
        triggerTextChangeEffects();
    });

    function triggerTextChangeEffects() {
        const text = sourceText.value;
        currentCharCount.textContent = text.length;
        updateActionButtonsState();
        
        if (text.trim() === '') {
            clearTranslationOutput();
        } else {
            debouncedTranslate();
        }
    }

    function updateActionButtonsState() {
        const hasText = sourceText.value.trim().length > 0;
        clearTextBtn.disabled = !hasText;
        speakSourceBtn.disabled = !hasText;
    }

    // Languages pickers change triggers translate
    sourceLangSelect.addEventListener('change', () => {
        performTranslation();
    });
    
    targetLangSelect.addEventListener('change', () => {
        performTranslation();
    });

    // Clear input action
    clearTextBtn.addEventListener('click', () => {
        sourceText.value = '';
        currentCharCount.textContent = '0';
        updateActionButtonsState();
        clearTranslationOutput();
        sourceText.focus();
        if (synth && synth.speaking) synth.cancel();
    });

    // Paste Action
    pasteTextBtn.addEventListener('click', async () => {
        try {
            const text = await navigator.clipboard.readText();
            if (text) {
                sourceText.value = text;
                triggerTextChangeEffects();
                showToast('Text pasted from clipboard', 'success');
            }
        } catch (err) {
            showToast('Unable to access clipboard', 'error');
        }
    });

    // Copy Action
    copyTextBtn.addEventListener('click', () => {
        const text = targetText.textContent;
        if (text) {
            navigator.clipboard.writeText(text).then(() => {
                showToast('Translation copied to clipboard!', 'success');
            }).catch(() => {
                showToast('Failed to copy text', 'error');
            });
        }
    });

    // Swap Languages action
    swapLanguagesBtn.addEventListener('click', () => {
        const tempLang = sourceLangSelect.value;
        const tempText = sourceText.value;

        // Swap selected values
        sourceLangSelect.value = targetLangSelect.value;
        targetLangSelect.value = tempLang;

        // Swap text content (target becomes source, perform translate again)
        sourceText.value = targetText.textContent.includes('Translation will appear') ? '' : targetText.textContent;
        currentCharCount.textContent = sourceText.value.length;
        
        updateActionButtonsState();
        performTranslation();
    });

    // Speak Source / Target audio click trigger
    speakSourceBtn.addEventListener('click', () => {
        speakText(sourceText.value, sourceLangSelect.value, 'source');
    });

    speakTargetBtn.addEventListener('click', () => {
        speakText(targetText.textContent, targetLangSelect.value, 'target');
    });

    // Mic Button voice start
    micBtn.addEventListener('click', () => {
        toggleSpeechRecognition();
    });

    // Favorite Button pin/save toggle
    favoriteBtn.addEventListener('click', () => {
        const srcVal = sourceText.value.trim();
        const trgVal = targetText.textContent;
        const sLang = sourceLangSelect.value;
        const tLang = targetLangSelect.value;

        if (!srcVal || !trgVal) return;

        // Check if already in favorites
        const index = starredPhrases.findIndex(item => 
            item.sourceText.toLowerCase() === srcVal.toLowerCase() && 
            item.targetText.toLowerCase() === trgVal.toLowerCase()
        );

        if (index > -1) {
            // Remove from favorites
            starredPhrases.splice(index, 1);
            favoriteBtn.querySelector('i').className = 'fa-regular fa-star';
            showToast('Removed from Starred Phrases', 'success');
        } else {
            // Add to favorites
            starredPhrases.unshift({
                id: Date.now().toString(),
                sourceText: srcVal,
                targetText: trgVal,
                sourceLang: sLang,
                targetLang: tLang,
                timestamp: new Date().toISOString()
            });
            favoriteBtn.querySelector('i').className = 'fa-solid fa-star text-gold';
            showToast('Added to Starred Phrases!', 'success');
        }

        localStorage.setItem('languagehub_starred', JSON.stringify(starredPhrases));
        renderFavorites();
    });

    // --- Side Drawer Renderings & Persistence ---

    function addToHistory(source, target, sLang, tLang) {
        // Prevent duplicate consecutive translations in history
        if (translationHistory.length > 0) {
            const last = translationHistory[0];
            if (last.sourceText.toLowerCase() === source.toLowerCase() && last.targetLang === tLang) {
                return; // duplicate, skip adding
            }
        }

        const historyItem = {
            id: Date.now().toString(),
            sourceText: source,
            targetText: target,
            sourceLang: sLang,
            targetLang: tLang,
            timestamp: new Date().toISOString()
        };

        translationHistory.unshift(historyItem);
        
        // Limit to 20 items
        if (translationHistory.length > 25) {
            translationHistory.pop();
        }

        localStorage.setItem('languagehub_history', JSON.stringify(translationHistory));
        renderHistory();
    }

    function renderHistory() {
        if (translationHistory.length === 0) {
            historyList.innerHTML = '<p class="empty-state-text">No translations in history yet.</p>';
            return;
        }

        historyList.innerHTML = '';
        translationHistory.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="item-languages">${item.sourceLang.split('-')[0]} <i class="fa-solid fa-arrow-right"></i> ${item.targetLang.split('-')[0]}</div>
                <div class="item-text">${escapeHTML(item.sourceText)}</div>
                <div class="item-translated">${escapeHTML(item.targetText)}</div>
                <div class="item-actions">
                    <button class="item-btn use-item" data-id="${item.id}" title="Load into translator"><i class="fa-solid fa-cloud-arrow-up"></i> Restore</button>
                    <button class="item-btn delete-item" data-id="${item.id}" title="Delete"><i class="fa-solid fa-trash"></i></button>
                </div>
            `;
            
            // Delete action
            el.querySelector('.delete-item').addEventListener('click', (e) => {
                e.stopPropagation();
                deleteHistoryItem(item.id);
            });

            // Restore action
            el.querySelector('.use-item').addEventListener('click', () => {
                loadIntoTranslator(item);
            });

            historyList.appendChild(el);
        });
    }

    function renderFavorites() {
        if (starredPhrases.length === 0) {
            favoritesList.innerHTML = '<p class="empty-state-text">No starred phrases yet. Click the star icon to save important translations.</p>';
            return;
        }

        favoritesList.innerHTML = '';
        starredPhrases.forEach(item => {
            const el = document.createElement('div');
            el.className = 'history-item';
            el.innerHTML = `
                <div class="item-languages">${item.sourceLang.split('-')[0]} <i class="fa-solid fa-arrow-right"></i> ${item.targetLang.split('-')[0]}</div>
                <div class="item-text">${escapeHTML(item.sourceText)}</div>
                <div class="item-translated">${escapeHTML(item.targetText)}</div>
                <div class="item-actions">
                    <button class="item-btn speak-item" data-id="${item.id}" title="Speak translated text"><i class="fa-solid fa-volume-up"></i></button>
                    <button class="item-btn use-item" data-id="${item.id}" title="Load into translator"><i class="fa-solid fa-cloud-arrow-up"></i> Restore</button>
                    <button class="item-btn delete-item" data-id="${item.id}" title="Unstar"><i class="fa-solid fa-star text-gold"></i></button>
                </div>
            `;
            
            // Unstar action
            el.querySelector('.delete-item').addEventListener('click', (e) => {
                e.stopPropagation();
                unstarPhrase(item.id);
            });

            // Restore action
            el.querySelector('.use-item').addEventListener('click', () => {
                loadIntoTranslator(item);
            });

            // Speak action
            el.querySelector('.speak-item').addEventListener('click', () => {
                speakText(item.targetText, item.targetLang, 'target');
            });

            favoritesList.appendChild(el);
        });
    }

    function deleteHistoryItem(id) {
        translationHistory = translationHistory.filter(item => item.id !== id);
        localStorage.setItem('languagehub_history', JSON.stringify(translationHistory));
        renderHistory();
        showToast('History item deleted', 'success');
    }

    function unstarPhrase(id) {
        starredPhrases = starredPhrases.filter(item => item.id !== id);
        localStorage.setItem('languagehub_starred', JSON.stringify(starredPhrases));
        renderFavorites();
        
        // Also update favorite state icon on active panel if matching
        const srcVal = sourceText.value.trim();
        const trgVal = targetText.textContent;
        if (srcVal && trgVal) {
            const remainsFav = starredPhrases.some(item => 
                item.sourceText.toLowerCase() === srcVal.toLowerCase() && 
                item.targetText.toLowerCase() === trgVal.toLowerCase()
            );
            if (!remainsFav) {
                favoriteBtn.querySelector('i').className = 'fa-regular fa-star';
            }
        }
        
        showToast('Phrase unstarred', 'success');
    }

    function loadIntoTranslator(item) {
        sourceLangSelect.value = item.sourceLang;
        targetLangSelect.value = item.targetLang;
        sourceText.value = item.sourceText;
        currentCharCount.textContent = item.sourceText.length;
        
        updateActionButtonsState();
        performTranslation();
        
        // Close drawers on selection
        historyDrawer.classList.remove('open');
        favoritesDrawer.classList.remove('open');
    }

    // Clear entire history
    clearHistoryBtn.addEventListener('click', () => {
        if (confirm('Clear entire translation history?')) {
            translationHistory = [];
            localStorage.setItem('languagehub_history', JSON.stringify(translationHistory));
            renderHistory();
            showToast('History cleared successfully', 'success');
        }
    });

    // --- Slide Drawers Controls ---
    historyToggleBtn.addEventListener('click', () => {
        historyDrawer.classList.toggle('open');
        favoritesDrawer.classList.remove('open'); // Close other drawer
    });
    
    closeHistoryBtn.addEventListener('click', () => {
        historyDrawer.classList.remove('open');
    });

    favoritesToggleBtn.addEventListener('click', () => {
        favoritesDrawer.classList.toggle('open');
        historyDrawer.classList.remove('open'); // Close other drawer
    });
    
    closeFavoritesBtn.addEventListener('click', () => {
        favoritesDrawer.classList.remove('open');
    });

    // --- Settings Panels Controls ---
    settingsToggleBtn.addEventListener('click', () => {
        settingsModal.classList.remove('hidden');
    });

    closeSettingsBtn.addEventListener('click', () => {
        settingsModal.classList.add('hidden');
    });

    settingsApiEndpoint.addEventListener('change', () => {
        if (settingsApiEndpoint.value === 'custom') {
            customApiInputs.classList.remove('hidden');
        } else {
            customApiInputs.classList.add('hidden');
        }
    });

    // Ranges sliders value change update
    settingsVoiceSpeed.addEventListener('input', () => {
        voiceSpeedVal.textContent = parseFloat(settingsVoiceSpeed.value).toFixed(1) + 'x';
    });

    settingsVoicePitch.addEventListener('input', () => {
        voicePitchVal.textContent = parseFloat(settingsVoicePitch.value).toFixed(1) + 'x';
    });

    // Save configuration settings modal
    saveSettingsBtn.addEventListener('click', () => {
        appConfig.voiceSpeed = parseFloat(settingsVoiceSpeed.value);
        appConfig.voicePitch = parseFloat(settingsVoicePitch.value);
        appConfig.autoplayTTS = settingsAutoplayTTS.checked;
        appConfig.continuousMic = settingsContinuousMic.checked;
        appConfig.apiEndpoint = settingsApiEndpoint.value;
        appConfig.customApiUrl = customApiUrl.value.trim();
        appConfig.customApiKey = customApiKey.value.trim();
        
        localStorage.setItem('languagehub_config', JSON.stringify(appConfig));
        settingsModal.classList.add('hidden');
        showToast('Settings saved successfully!', 'success');
        
        // Re-run translate if endpoint changes
        performTranslation();
    });

    // --- Theme Switch settings ---
    themeToggleBtn.addEventListener('click', () => {
        const currentTheme = document.body.getAttribute('data-theme');
        const nextTheme = currentTheme === 'light' ? 'dark' : 'light';
        
        document.body.setAttribute('data-theme', nextTheme);
        appConfig.theme = nextTheme;
        localStorage.setItem('languagehub_config', JSON.stringify(appConfig));
        
        updateThemeToggleIcon();
        showToast(`Theme switched to ${nextTheme} mode`, 'success');
    });

    function updateThemeToggleIcon() {
        const icon = themeToggleBtn.querySelector('i');
        const currentTheme = document.body.getAttribute('data-theme');
        if (currentTheme === 'light') {
            icon.className = 'fa-solid fa-sun';
        } else {
            icon.className = 'fa-solid fa-moon';
        }
    }

    // --- Utility / Toast Helpers ---
    
    function showToast(message, type = 'success') {
        const toast = document.createElement('div');
        toast.className = `toast ${type === 'error' ? 'toast-error' : 'toast-success'}`;
        
        let iconClass = 'fa-check-circle';
        if (type === 'error') {
            iconClass = 'fa-exclamation-circle';
        }
        
        toast.innerHTML = `<i class="fa-solid ${iconClass}"></i> <span>${message}</span>`;
        toastContainer.appendChild(toast);
        
        // Remove toast after 3s
        setTimeout(() => {
            toast.style.animation = 'slideInToast 0.3s cubic-bezier(0.4, 0, 0.2, 1) reverse forwards';
            setTimeout(() => {
                toast.remove();
            }, 300);
        }, 3000);
    }

    function escapeHTML(str) {
        return str
            .replace(/&/g, '&amp;')
            .replace(/</g, '&lt;')
            .replace(/>/g, '&gt;')
            .replace(/"/g, '&quot;')
            .replace(/'/g, '&#039;');
    }

    // --- Progressive Web App (PWA) Support & Installation ---

    // Service Worker Registration
    if ('serviceWorker' in navigator) {
        const registerSW = () => {
            navigator.serviceWorker.register('./sw.js')
                .then(reg => console.log('[Service Worker] Registered successfully', reg.scope))
                .catch(err => console.error('[Service Worker] Registration failed', err));
        };
        if (document.readyState === 'complete') {
            registerSW();
        } else {
            window.addEventListener('load', registerSW);
        }
    }

    // PWA Install Prompt wiring
    let deferredPrompt;
    const installAppBtn = document.getElementById('install-app-btn');

    window.addEventListener('beforeinstallprompt', (e) => {
        // Prevent default browser install dialog
        e.preventDefault();
        // Stash prompt event
        deferredPrompt = e;
        // Display custom install button in header controls
        if (installAppBtn) {
            installAppBtn.classList.remove('hidden');
        }
    });

    if (installAppBtn) {
        installAppBtn.addEventListener('click', async () => {
            if (!deferredPrompt) return;
            // Prompt the installation popup
            deferredPrompt.prompt();
            // Check choice
            const { outcome } = await deferredPrompt.userChoice;
            console.log(`[PWA] Install prompt outcome: ${outcome}`);
            deferredPrompt = null;
            // Hide install button
            installAppBtn.classList.add('hidden');
        });
    }

    window.addEventListener('appinstalled', (evt) => {
        console.log('[PWA] Installed successfully');
        showToast('App installed successfully!', 'success');
        if (installAppBtn) {
            installAppBtn.classList.add('hidden');
        }
    });
});
