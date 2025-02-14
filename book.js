/* =========================================
   VARIABLES PARA GUARDAR ESTADO
========================================= */
let currentNode = 'portada';
let previousNode = null;
let previousChoiceIndex = null; // Para saber qué opción se eligió

/* =========================================
   OBTENEMOS REFERENCIAS DEL DOM
========================================= */
const previousTextDiv = document.getElementById('previousText');
const previousChoicesDiv = document.getElementById('previousChoices');
const currentTextDiv = document.getElementById('currentText');
const currentChoicesDiv = document.getElementById('currentChoices');
const restartBtn = document.getElementById('restartBtn');
const bookmarkBtn = document.getElementById('bookmarkBtn');
const book = document.querySelector('.book'); // Referencia al libro
const heartbeatSound = document.getElementById('heartbeatSound'); // Sonido de latido
const typeSound = document.getElementById('typeSound'); // sonido de tipeo

/* =========================================
   EFECTO MÁQUINA DE ESCRIBIR CON PAUSAS DINÁMICAS
========================================= */
function typeWriter(text, element, callback) {
    element.textContent = "";
    let i = 0;
    const baseSpeed = 20; // Velocidad base en ms
    
    typeSound.currentTime = 0;
    typeSound.play();

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            
            let speed = baseSpeed;
            const char = text.charAt(i);
            typeSound.play();
            
            // Ajustar la velocidad dependiendo del carácter
            if (char === '.' || char === '!' || char === '?') {
                speed = 300; // Pausa larga para puntos
                typeSound.pause();
            } else if (char === ',' || char === ';') {
                speed = 150; // Pausa media para comas y punto y coma
                typeSound.pause();
            } else if (char === ':') {
                speed = 200; // Pausa intermedia para dos puntos
                typeSound.pause();
            }

            i++;
            element.scrollTop = element.scrollHeight;
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
            setTimeout(type, speed);
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
========================================= */
function displayPreviousPage() {
    if (!previousNode) {
        previousTextDiv.textContent = "Reglas:\nElige entre las opciones y descubre a dónde te llevan tus decisiones!";
        previousChoicesDiv.innerHTML = "";
        return;
    }

    previousTextDiv.textContent = storyNodes[previousNode].text;
    previousChoicesDiv.innerHTML = "";
    storyNodes[previousNode].options.forEach((opt, idx) => {
        const choiceSpan = document.createElement('span');
        choiceSpan.textContent = opt.text;
        choiceSpan.classList.add('previous-choice');

        if (idx !== previousChoiceIndex) {
            choiceSpan.style.opacity = "0.5";
        } else {
            choiceSpan.style.fontWeight = "bold";
        }
        previousChoicesDiv.appendChild(choiceSpan);
    });
}

/* =========================================
   MOSTRAR LA PÁGINA ACTUAL
========================================= */
function displayCurrentPage(nodeId) {
    currentTextDiv.textContent = "";
    currentChoicesDiv.innerHTML = "";

    typeWriter(storyNodes[nodeId].text, currentTextDiv, function () {
        let contador = 0;
        storyNodes[nodeId].options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option.text;

            if (storyNodes[option.next] && storyNodes[option.next].isEnding) {
                applyHeartbeatEffect();
                contador += 1;
            }
            if (contador == 0) {
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
            currentTextDiv.scrollTop = currentTextDiv.scrollHeight;
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
        });
    });
}

/* =========================================
   REINICIAR HISTORIA
========================================= */
function restartStory() {
    localStorage.removeItem('storyState');
    location.reload();
}

restartBtn.addEventListener('click', restartStory);
bookmarkBtn.addEventListener('click', saveProgress);

/* =========================================
   LOGICA GUARDAR Y CARGAR PROGRESO
========================================= */
function saveProgress() {
    const state = {
        currentNode: currentNode,
        previousNode: previousNode,
        previousChoiceIndex: previousChoiceIndex
    };
    localStorage.setItem('storyState', JSON.stringify(state));
    alert('Progreso guardado!');
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
   FUNCIONES SONIDOS
========================================= */
function applyHeartbeatEffect() {
    book.classList.remove('heartbeat-effect');
    void book.offsetWidth; // Forza el reflow
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
========================================= */
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
