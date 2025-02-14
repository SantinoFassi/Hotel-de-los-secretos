/* =========================================
   VARIABLES PARA GUARDAR ESTADO
========================================== */
let currentNode = 'portada';
let previousNode = null;
let previousChoiceIndex = null; // Para saber qué opción se eligió

/* =========================================
   OBTENEMOS REFERENCIAS DEL DOM
========================================== */
const previousTextDiv = document.getElementById('previousText');
const previousChoicesDiv = document.getElementById('previousChoices');
const currentTextDiv = document.getElementById('currentText');
const currentChoicesDiv = document.getElementById('currentChoices');
const restartBtn = document.getElementById('restartBtn');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const book = document.querySelector('.book'); // Referencia al libro
const heartbeatSound = document.getElementById('heartbeatSound'); // Sonido de latido
const typeSound = document.getElementById('typeSound'); // Sonido de tipeo

/* =========================================
   PROCESAR TEXTO CON ETIQUETAS
========================================== */
function processTextWithTags(text) {
    return text.replace(/<shake force=(\d+)>/g, '<span class="shake" data-force="$1">')
               .replace(/<\/shake>/g, '</span>')
               .replace(/<instant>/g, '<span class="instant">')
               .replace(/<\/instant>/g, '</span>')
               .replace(/<slow(?: speed=(\d+))?>/g, '<span class="slow" data-speed="$1">')
               .replace(/<\/slow>/g, '</span>')
               //.replace(/<fade>/g, '<span class="fade">')
               .replace(/<fade(?: speed=(\d+))?>/g, '<span class="fade" data-speed="$1">')
               .replace(/<\/fade>/g, '</span>')
               .replace(/<glitch>/g, '<span class="glitch">')
               .replace(/<\/glitch>/g, '</span>');
}

/* =========================================
   FUNCIONES PARA PROCESAR EFECTOS ESPECIALES
========================================== */

// Procesa elementos con la clase "shake" para que cada letra se envuelva en un <span>
// y se asigne un retardo aleatorio, usando la variable CSS --shake-force según el atributo "data-force".
function processShakeElements(container) {
    container.querySelectorAll('.shake').forEach(el => {
        const force = el.getAttribute('data-force') || 1;
        el.style.setProperty('--shake-force', force);
        const text = el.textContent;
        el.innerHTML = '';
        for (const letter of text) {
            const span = document.createElement('span');
            span.textContent = letter;
            span.style.display = 'inline-block';
            span.style.animationDelay = Math.random() * 0.5 + 's';
            el.appendChild(span);
        }
    });
}

function processFadeElements(container) {
    container.querySelectorAll('.fade').forEach(el => {
        const speed = parseFloat(el.getAttribute('data-speed')) || 1; // Convierte a número
        el.style.animationDuration = `${speed}s`; // Aplica la velocidad en segundos
    });
}


// Aplica el efecto glitch: cada 200ms, algunas letras se reemplazan aleatoriamente.
function applyGlitchEffect(el) {
    const originalText = el.textContent;
    const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
    setInterval(() => {
        let newText = "";
        for (let i = 0; i < originalText.length; i++) {
            // Con una probabilidad del 10% se reemplaza la letra
            if (Math.random() < 0.1) {
                newText += chars.charAt(Math.floor(Math.random() * chars.length));
            } else {
                newText += originalText[i];
            }
        }
        el.textContent = newText;
        // Actualiza el atributo para que, si usas pseudo-elementos, muestren el texto correcto
        el.setAttribute('data-text', newText);
    }, 200);
}

function processGlitchElements(container) {
    container.querySelectorAll('.glitch').forEach(el => {
        el.setAttribute('data-text', el.textContent);
        applyGlitchEffect(el);
    });
}

/* =========================================
   EFECTO MÁQUINA DE ESCRIBIR CON PAUSAS DINÁMICAS Y ETIQUETAS
========================================== */
function typeWriter(text, element, callback) {
    element.innerHTML = "";
    const baseSpeed = 20; // Velocidad base en ms
    typeSound.currentTime = 0;
    typeSound.play();

    // Procesamos las etiquetas personalizadas
    const processedText = processTextWithTags(text);
    const tempDiv = document.createElement('div');
    tempDiv.innerHTML = processedText;
    const nodes = Array.from(tempDiv.childNodes);
    let i = 0;

    function type() {
        if (i < nodes.length) {
            let node = nodes[i];
            let speed = baseSpeed;
            let slowSpeed = null;
            if (node.nodeType === Node.ELEMENT_NODE)
            {
                slowSpeed = node.dataset.speed || 100;
            }
            if (node.nodeType === Node.TEXT_NODE || (node.classList && node.classList.contains("slow"))) {
                // Escribir el texto carácter por carácter
                let textContent = node.textContent;
                let charIndex = 0;
                function typeChar() {
                    if (charIndex < textContent.length) {
                        element.appendChild(document.createTextNode(textContent.charAt(charIndex)));
                        let char = textContent.charAt(charIndex);
                        typeSound.play();
                        if ('.!?'.includes(char)) {
                            speed = slowSpeed;
                            typeSound.pause();
                        } else if (',;'.includes(char)) {
                            speed = 150;
                            typeSound.pause();
                        } else if (char === ':') {
                            speed = 200;
                            typeSound.pause();
                        } else {
                            speed = baseSpeed;
                        }
                        if (node.classList && node.classList.contains("slow"))
                        {
                            speed = slowSpeed;
                        }
                        charIndex++;
                        element.scrollTop = element.scrollHeight;
                        document.documentElement.scrollTop = document.documentElement.scrollHeight;
                        setTimeout(typeChar, speed);
                    } else {
                        i++;
                        setTimeout(type, speed);
                    }
                }
                typeChar();
            } 
            else {
                // Si es un elemento HTML (por ejemplo, <span class="shake"> o <span class="glitch">)
                element.appendChild(node);
                processShakeElements(element);
                processGlitchElements(element);
                processFadeElements(element);
                i++;
                setTimeout(type, baseSpeed);
            }
        } else {
            typeSound.pause();
            typeSound.currentTime = 0;
            if (callback) callback();
        }
    }
    type();
}

/* =========================================
   MOSTRAR LA PÁGINA ANTERIOR
========================================== */
function displayPreviousPage() {
    if (!previousNode) {
        previousTextDiv.textContent = "Reglas:\nElige entre las opciones y descubre a dónde te llevan tus decisiones!";
        previousChoicesDiv.innerHTML = "";
        return;
    }
    // Procesar etiquetas en el texto de la página anterior
    previousTextDiv.innerHTML = processTextWithTags(storyNodes[previousNode].text);
    processShakeElements(previousTextDiv);
    processGlitchElements(previousTextDiv);
    
    previousChoicesDiv.innerHTML = "";
    storyNodes[previousNode].options.forEach((opt, idx) => {
        const choiceSpan = document.createElement('span');
        //choiceSpan.textContent = opt.text;
        choiceSpan.innerHTML = processTextWithTags(opt.text); // Por si quiero que el texto anterior tambien tenga efectos
        choiceSpan.classList.add('previous-choice');

        if (idx !== previousChoiceIndex) {
            choiceSpan.style.opacity = "0.5";
        } else {
            choiceSpan.style.fontWeight = "bold";
        }
        previousChoicesDiv.appendChild(choiceSpan);
        /* Por si quiero que el texto anterior tambien tenga efectos*/
        processShakeElements(choiceSpan);
        processGlitchElements(choiceSpan);
        processFadeElements(choiceSpan);
    });
}

/* =========================================
   MOSTRAR LA PÁGINA ACTUAL
========================================== */
function displayCurrentPage(nodeId) {
    currentTextDiv.innerHTML = "";
    currentChoicesDiv.innerHTML = "";

    typeWriter(storyNodes[nodeId].text, currentTextDiv, function () {
        let contador = 0;
        storyNodes[nodeId].options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.innerHTML = processTextWithTags(option.text);
            //btn.textContent = option.text;

            if (storyNodes[option.next] && storyNodes[option.next].isEnding) {
                applyHeartbeatEffect();
                contador += 1;
            }
            if (contador === 0) {
                removeHeartbeatEffect();
            }

            btn.addEventListener('click', () => {
                previousNode = nodeId;
                previousChoiceIndex = idx;
                currentNode = option.next;
                displayPreviousPage();
                displayCurrentPage(currentNode);
            });
            currentChoicesDiv.appendChild(btn);
            processShakeElements(btn);
            processGlitchElements(btn);
            processFadeElements(btn);
            currentTextDiv.scrollTop = currentTextDiv.scrollHeight;
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
        });
    });
}

/* =========================================
   REINICIAR HISTORIA
========================================== */
function restartStory() {
    localStorage.removeItem('storyState');
    location.reload();
}

restartBtn.addEventListener('click', restartStory);
bookmarkBtn.addEventListener('click', saveProgress);

/* =========================================
   LÓGICA GUARDAR Y CARGAR PROGRESO
========================================== */
function saveProgress() {
    const state = {
        currentNode: currentNode,
        previousNode: previousNode,
        previousChoiceIndex: previousChoiceIndex
    };
    localStorage.setItem('storyState', JSON.stringify(state));
    alert('¡Progreso guardado!');
}

function loadProgress() {
    const savedState = localStorage.getItem('storyState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentNode = state.currentNode;
        previousNode = state.previousNode;
        previousChoiceIndex = state.previousChoiceIndex;
    }
}

/* =========================================
   FUNCIONES DE SONIDO
========================================== */
function applyHeartbeatEffect() {
    book.classList.remove('heartbeat-effect');
    void book.offsetWidth; // Forzar reflow para reiniciar la animación
    book.classList.add('heartbeat-effect');
    heartbeatSound.currentTime = 0;
    heartbeatSound.play();
}

function removeHeartbeatEffect() {
    book.classList.remove('heartbeat-effect');
    heartbeatSound.pause();
    heartbeatSound.currentTime = 0;
}

/* =========================================
   INICIALIZAR LA AVENTURA
========================================== */
let storyNodes = {};

loadProgress();

fetch('storyNodes.json')
    .then(response => response.json())
    .then(data => {
        storyNodes = data;
        displayPreviousPage();
        displayCurrentPage(currentNode);
    })
    .catch(error => {
        console.error('Error al cargar el archivo JSON:', error);
        previousTextDiv.textContent = "Error al cargar la historia :(";
        previousChoicesDiv.innerHTML = "";
    });
