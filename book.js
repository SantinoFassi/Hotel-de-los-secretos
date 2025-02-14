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
   EFECTO MÁQUINA DE ESCRIBIR
========================================= */
function typeWriter(text, element, callback) {
    element.textContent = "";
    let i = 0;
    const speed = 20; // ms por carácter

    // Asegurar que el sonido comienza solo una vez
    typeSound.currentTime = 0;
    typeSound.play();

    function type() {
        if (i < text.length) {
            element.textContent += text.charAt(i);
            i++;

            element.scrollTop = element.scrollHeight;
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
            setTimeout(type, speed);
        } else {
            // Detener el sonido solo cuando termine de escribir todo
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
    // Si no hay página anterior, limpiamos y salimos
    if (!previousNode) {
        previousTextDiv.textContent = "Rules:\nChoose between the two options and discover where your decisions lead you!";
        previousChoicesDiv.innerHTML = "";
        return;
    }

    // Texto del nodo anterior
    previousTextDiv.textContent = storyNodes[previousNode].text;

    // Mostramos las opciones del nodo anterior
    previousChoicesDiv.innerHTML = "";
    storyNodes[previousNode].options.forEach((opt, idx) => {
        const choiceSpan = document.createElement('span');
        choiceSpan.textContent = opt.text;
        choiceSpan.classList.add('previous-choice');

        if (idx !== previousChoiceIndex) {
            // Opción NO elegida -> más transparente
            choiceSpan.style.opacity = "0.5";
        } else {
            // Opción elegida -> estilo normal o en negrita
            choiceSpan.style.fontWeight = "bold";
        }
        previousChoicesDiv.appendChild(choiceSpan);
    });
}

/* =========================================
   MOSTRAR LA PÁGINA ACTUAL
========================================= */
function displayCurrentPage(nodeId) {
    // Limpiamos texto y botones actuales
    currentTextDiv.textContent = "";
    currentChoicesDiv.innerHTML = "";

    // Efecto de máquina de escribir
    typeWriter(storyNodes[nodeId].text, currentTextDiv, function () {
        let contador = 0;
        // Al terminar de escribir, creamos los botones
        storyNodes[nodeId].options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.textContent = option.text;

            if (storyNodes[option.next] && storyNodes[option.next].isEnding) {
                applyHeartbeatEffect(); // Si es un final, activa el efecto
                contador += 1;
            }
            if (contador == 0) {
                removeHeartbeatEffect();
            }

            btn.addEventListener('click', () => {
                // Al hacer clic en una opción:
                previousNode = nodeId;          // Guardamos el nodo actual como "anterior"
                previousChoiceIndex = idx;      // Guardamos el índice de la opción elegida
                currentNode = option.next;      // Actualizamos el nodo actual

                // Volvemos a mostrar
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
    // currentNode = 'portada';
    // previousNode = null;
    // previousChoiceIndex = null;
    // saveProgress();
    // displayPreviousPage();
    // displayCurrentPage(currentNode);
}

/* Evento para el botón "Reiniciar" y "bookmark" */
restartBtn.addEventListener('click', restartStory);
bookmarkBtn.addEventListener('click', saveProgress);

/* =========================================
   LOGICA GUARDAR Y CARGAR PROGRESO
========================================= */

// Guardar el estado actual en el almacenamiento local
function saveProgress() {
    const state = {
        currentNode: currentNode,
        previousNode: previousNode,
        previousChoiceIndex: previousChoiceIndex
    };
    localStorage.setItem('storyState', JSON.stringify(state));
    alert('Progress saved!');
}

// Cargar el estado guardado del almacenamiento local
function loadProgress() {
    const savedState = localStorage.getItem('storyState');
    if (savedState) {
        const state = JSON.parse(savedState);
        currentNode = state.currentNode;
        previousNode = state.previousNode;
        previousChoiceIndex = state.previousChoiceIndex;
        console.log('Progreso cargado:', state);
    } else {
        console.log('No hay progreso guardado.');
    }
}

/* =========================================
   FUNCIONES SONIDOS
========================================= */

function applyHeartbeatEffect() {
    book.classList.add('heartbeat-effect'); // Activa la animación
    heartbeatSound.currentTime = 0; // Reinicia el sonido
    heartbeatSound.play(); // Reproduce el sonido
}

function removeHeartbeatEffect() {
    book.classList.remove('heartbeat-effect'); // Quita la animación
    heartbeatSound.pause(); // Pausa el sonido
    heartbeatSound.currentTime = 0; // Reinicia el audio
}

/* =========================================
   INICIALIZAR LA AVENTURA
========================================= */
let storyNodes = {};

// intento cargar progreso
loadProgress();

// Cargo los nodos y comienza la historia
fetch('storyNodes.json')
    .then(response => response.json())
    .then(data => {
        storyNodes = data;
        displayPreviousPage();
        displayCurrentPage(currentNode);
    })
    .catch(error => {
        console.error('Error al cargar el archivo JSON:', error)
        previousTextDiv.textContent = "Error al cargar la historia :(";
        previousChoicesDiv.innerHTML = "";
    });