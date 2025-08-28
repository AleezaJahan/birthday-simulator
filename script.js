
// Messages to display in typewriter effect
const lines = [
    { text: "shhhh", position: "center"},
    { text: "be quiet!!! he's almost here", position: "center"},
    { text: "OUCH! You stepped on my foot", position: "top-left"},
    { text: "Watch it bozo", position: "top-right"},
    { text: "GUYS, SHUT UP!!!", position: "center"},
    { text: "wait, I think I hear something", position: "bottom-left"},
    { text: "I think he's coming down the stairs", position: "bottom-right"},
    { text: "get ready everyone!", position: "center"},
    { text: "3...2...1...", position: "center"}
];

// DOM elements
const overlay = document.getElementById('overlay');
const textElement = document.getElementById('text');
const mainContent = document.getElementById('main-content');
const videoModal = document.getElementById('video-modal');
const videoPlayer = document.getElementById('video-player');
const drivePlayer = document.getElementById('drive-player');
const closeVideoBtn = document.getElementById('close-video');

// Google Drive video IDs
const driveVideos = {
    'aleeza-racoon.MOV': '1BufYkNQ0VRlQH1aOu91ubiqS0I2uIVRR',
    'nimai-baboon.mov': '1_bBWS7WQAmOy7Zb11Fuk8vVsoce1M_Y9'
};
const startPrompt = document.getElementById('start-prompt');
const continuePrompt = document.getElementById('continue-prompt');

let currentLineIndex = 0;
let isTyping = false;
let currentTimeout = null;
let gameStarted = false;

// Initialize game state
continuePrompt.classList.add('hidden');
textElement.style.opacity = '0';

// Typewriter effect function
function typeWriter(text, callback) {
    let i = 0;
    textElement.style.opacity = '1';
    continuePrompt.classList.add('hidden');
    
    function type() {
        if (i < text.length) {
            textElement.textContent += text.charAt(i);
            i++;
            currentTimeout = setTimeout(type, 80); // Faster typing speed
        } else {
            setTimeout(() => {
                isTyping = false;
                if (!gameStarted) {
                    gameStarted = true;
                }
                continuePrompt.classList.remove('hidden');
                if (callback) callback();
            }, 500);
        }
    }
    
    textElement.textContent = '';
    isTyping = true;
    type();
}

// Handle overlay clicks
overlay.addEventListener('click', () => {
    if (!gameStarted && !isTyping) {
        // First click - hide start prompt and show first message
        startPrompt.classList.add('hidden');
        textElement.classList.add('pos-' + lines[0].position);
        typeWriter(lines[0].text);
        currentLineIndex = 1; // Set to 1 since we're showing first message
        return;
    }

    if (isTyping) {
        return; // Don't do anything if still typing
    }

    if (currentLineIndex < lines.length) {
        // Clear previous text position classes
        textElement.className = '';
        continuePrompt.classList.add('hidden');
        
        // Add new position class
        textElement.classList.add('pos-' + lines[currentLineIndex].position);
        
        // Start typing the next line
        typeWriter(lines[currentLineIndex].text);
        currentLineIndex++;
    } else {
        // Show the main content
        overlay.style.opacity = '0';
        setTimeout(() => {
            overlay.classList.add('hidden');
            mainContent.classList.remove('hidden');
            setTimeout(() => {
                mainContent.classList.add('visible');
            }, 100);
        }, 1000);
    }
});

// Create visual indicators for clickable areas
function createClickIndicators() {
    const drawing = document.getElementById('drawing');
    const mainContent = document.getElementById('main-content');
    
    document.querySelectorAll('area').forEach(area => {
        const coords = area.getAttribute('coords').split(',');
        const indicator = document.createElement('div');
        indicator.className = 'click-indicator';
        indicator.setAttribute('data-name', area.getAttribute('alt'));
        
        // Position indicator
        indicator.style.left = coords[0] + 'px';
        indicator.style.top = coords[1] + 'px';
        indicator.style.width = (coords[2] - coords[0]) + 'px';
        indicator.style.height = (coords[3] - coords[1]) + 'px';
        
        mainContent.appendChild(indicator);
    });
}

// Handle character clicks
document.querySelectorAll('area').forEach(area => {
    area.addEventListener('click', (e) => {
        e.preventDefault();
        const videoFile = area.getAttribute('data-video');
        if (videoFile) {
            if (driveVideos[videoFile]) {
                // Use Google Drive embed for large videos
                const driveId = driveVideos[videoFile];
                drivePlayer.src = `https://drive.google.com/file/d/${driveId}/preview`;
                videoPlayer.classList.add('hidden');
                drivePlayer.classList.remove('hidden');
            } else {
                // Use regular video player for small videos
                videoPlayer.src = '/birthday-simulator/assets/videos/' + videoFile;
                videoPlayer.classList.remove('hidden');
                drivePlayer.classList.add('hidden');
                
                // Play video after a short delay to ensure loading
                videoPlayer.load();
                videoPlayer.addEventListener('loadeddata', () => {
                    videoPlayer.play().catch(error => {
                        console.error('Error playing video:', error);
                    });
                });
            }
            
            videoModal.classList.remove('hidden');
            videoModal.classList.add('visible');
        }
    });
});

// Blow detection setup
let audioContext;
let microphoneStream;
let analyser;
let isBlowing = false;
let blowTimeout;
let blowStartTime = null;

async function setupBlowDetection() {
    try {
        // Request microphone access
        const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
        microphoneStream = stream;
        
        // Set up audio analysis
        audioContext = new (window.AudioContext || window.webkitAudioContext)();
        analyser = audioContext.createAnalyser();
        const source = audioContext.createMediaStreamSource(stream);
        source.connect(analyser);
        
        // Configure analyser
        analyser.fftSize = 2048;
        const bufferLength = analyser.frequencyBinCount;
        const dataArray = new Uint8Array(bufferLength);
        
        // Monitor audio levels
        function checkAudioLevel() {
            analyser.getByteFrequencyData(dataArray);
            
            // Focus on frequencies typical of blowing (low-mid range)
            const lowFreq = dataArray.slice(0, 50);  // Low frequencies
            const midFreq = dataArray.slice(50, 150); // Mid frequencies
            const highFreq = dataArray.slice(150, 250); // High frequencies
            
            // Calculate averages for different frequency ranges
            const lowAvg = lowFreq.reduce((a, b) => a + b, 0) / lowFreq.length;
            const midAvg = midFreq.reduce((a, b) => a + b, 0) / midFreq.length;
            const highAvg = highFreq.reduce((a, b) => a + b, 0) / highFreq.length;
            
            // Blowing characteristics:
            // 1. Very strong in low frequencies (wind noise)
            // 2. Lower in mid frequencies
            // 3. Very low in high frequencies
            // 4. Requires more force
            const isBlowPattern = lowAvg > 120 && // Increased threshold
                                midAvg < lowAvg * 0.6 && // Stricter ratio
                                highAvg < lowAvg * 0.3 && // Check high frequencies
                                lowAvg > 150; // Additional force check
            
            if (isBlowPattern && !isBlowing) {
                // Start tracking potential blow
                if (!blowStartTime) {
                    blowStartTime = Date.now();
                } else if (Date.now() - blowStartTime > 500) { // Sustained for 500ms
                    isBlowing = true;
                    handleBlow();
                    
                    // Reset detection
                    clearTimeout(blowTimeout);
                    blowTimeout = setTimeout(() => {
                        isBlowing = false;
                        blowStartTime = null;
                    }, 1000);
                }
            } else if (!isBlowPattern) {
                blowStartTime = null;
            }
            
            requestAnimationFrame(checkAudioLevel);
        }
        
        checkAudioLevel();
    } catch (error) {
        console.error('Error accessing microphone:', error);
    }
}

function handleBlow() {
    console.log('Blow detected!'); // Debug log
    const litCandles = document.getElementById('drawing-lit');
    const unlitCandles = document.getElementById('drawing-unlit');
    
    if (litCandles && unlitCandles) {
        console.log('Found both images'); // Debug log
        litCandles.classList.remove('active');
        unlitCandles.classList.add('active');
    } else {
        console.error('Could not find one or both images');
    }
    
    // Optional: Play blowing out candles sound
    // const blowSound = new Audio('path/to/blow-sound.mp3');
    // blowSound.play();
}

// Set up blow detection when content is revealed
const observer = new MutationObserver((mutations) => {
    mutations.forEach((mutation) => {
        if (mutation.target.classList.contains('visible')) {
            setupBlowDetection();
            observer.disconnect();
        }
    });
});

observer.observe(mainContent, { attributes: true });

// Update image map on window resize
function updateImageMap() {
    const drawingLit = document.getElementById('drawing-lit');
    const drawingUnlit = document.getElementById('drawing-unlit');
    if (drawingLit && drawingUnlit) {
        // Use whichever drawing is currently visible
        const drawing = drawingLit.classList.contains('active') ? drawingLit : drawingUnlit;
        const rect = drawing.getBoundingClientRect();
        const areas = document.querySelectorAll('area');
        
        // Original image dimensions
        const ORIGINAL_WIDTH = 2816;
        const ORIGINAL_HEIGHT = 1536;
        
        // Get the actual displayed image dimensions
        const displayedRect = drawing.getBoundingClientRect();
        const scale = Math.min(
            displayedRect.width / ORIGINAL_WIDTH,
            displayedRect.height / ORIGINAL_HEIGHT
        );
        
        // Calculate offsets to center the image
        const offsetX = (displayedRect.width - (ORIGINAL_WIDTH * scale)) / 2;
        const offsetY = (displayedRect.height - (ORIGINAL_HEIGHT * scale)) / 2;
        
        areas.forEach(area => {
            const originalCoords = area.getAttribute('coords').split(',').map(Number);
            const newCoords = [
                offsetX + (originalCoords[0] * scale),
                offsetY + (originalCoords[1] * scale),
                offsetX + (originalCoords[2] * scale),
                offsetY + (originalCoords[3] * scale)
            ];
            area.setAttribute('coords', newCoords.join(','));
        });
    }
}

// Update on resize
window.addEventListener('resize', updateImageMap);
// Update on load
window.addEventListener('load', updateImageMap);

// Close video modal
closeVideoBtn.addEventListener('click', () => {
    videoModal.classList.remove('visible');
    setTimeout(() => {
        videoModal.classList.add('hidden');
        videoPlayer.pause();
        videoPlayer.src = '';
    }, 300);
});