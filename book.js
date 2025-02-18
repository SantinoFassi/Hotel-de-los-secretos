
/* =========================================
   CLASE TagProcessor
   Se encarga de procesar el texto y reemplazar nuestras etiquetas personalizadas
   por elementos HTML con clases y atributos de datos.
========================================== */
class TagProcessor {
    static tagConfig = [
        { tag: "shake", className: "shake", attributes: ["force"] },
        { tag: "instant", className: "instant", attributes: [] },
        { tag: "slow", className: "slow", attributes: ["speed"] },
        { tag: "fade", className: "fade", attributes: ["speed"] },
        { tag: "glitch", className: "glitch", attributes: [] }
    ];

    static process(text) {
        this.tagConfig.forEach(({ tag, className, attributes }) => {
            // Construir una expresión regular que capture la etiqueta y sus atributos opcionales
            const attrPattern = attributes.length > 0
                ? attributes.map(attr => `${attr}=(\\d+)`).join("\\s*")
                : "";
            const openTagRegex = new RegExp(`<${tag}(?:\\s*${attrPattern})?>`, "g");
            const closeTagRegex = new RegExp(`</${tag}>`, "g");

            text = text.replace(openTagRegex, (match, ...attrValues) => {
                let attrString = "";
                attributes.forEach((attr, index) => {
                    if (attrValues[index]) {
                        attrString += ` data-${attr}="${attrValues[index]}"`;
                    }
                });
                return `<span class="${className}"${attrString}>`;
            });

            text = text.replace(closeTagRegex, "</span>");
        });

        return text;
    }
}

/* =========================================
   CLASE EffectProcessor
   Se encarga de aplicar (o re-aplicar) los efectos visuales a un contenedor
   basándose en las clases definidas (shake, fade, glitch).
========================================== */
class EffectProcessor {
    static glitchIntervals = new Map(); // Para evitar fugas de memoria

    static effectHandlers = {
        shake: (el) => {
            if (el.dataset.processed) return; // Evita reprocesar
            el.dataset.processed = true;

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
        },
        fade: (el) => {
            if (el.dataset.processed) return; // Evita reprocesar
            el.dataset.processed = true;
            const speed = parseFloat(el.getAttribute('data-speed')) || 1;
            el.style.animationDuration = `${speed}s`;
        },
        glitch: (el) => {
            // Guarda el texto original en el elemento, si aún no existe
            if (!el.dataset.originalText) {
                el.dataset.originalText = el.textContent;
            }

            if (el.dataset.processed) return; // Evita reprocesar
            el.dataset.processed = true;

            const originalText = el.dataset.originalText;
            const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";

            // Función que actualiza el texto con efecto glitch
            const updateGlitch = () => {
                let newText = "";
                for (let i = 0; i < originalText.length; i++) {
                    newText += Math.random() < 0.1
                        ? chars.charAt(Math.floor(Math.random() * chars.length))
                        : originalText[i];
                }
                el.textContent = newText;
                el.setAttribute('data-text', newText);
            };

            // Llama a la función de inmediato para aplicar el efecto sin retraso
            updateGlitch();

            // Luego inicia el intervalo para seguir aplicando el efecto
            const interval = setInterval(updateGlitch, 200);
            EffectProcessor.glitchIntervals.set(el, interval);
        }

    };

    static process(container) {
        Object.keys(this.effectHandlers).forEach(effect => {
            container.querySelectorAll(`.${effect}`).forEach(el => {
                this.effectHandlers[effect](el);
            });
        });
    }
}





/* =========================================
   CLASE Typewriter
   Se encarga del efecto máquina de escribir. Recibe un texto (con etiquetas procesadas)
   y lo escribe en el contenedor carácter a carácter, procesando recursivamente nodos HTML.
   Así se garantiza que, incluso dentro de etiquetas como <fade> o <glitch>,
   el texto se tipeará gradualmente.
========================================== */
class TypeWriter {
    /**
     * @param {string} text - El texto original (con etiquetas personalizadas) a mostrar.
     * @param {HTMLElement} element - El elemento donde se escribirá el texto.
     * @param {Object} [options] - Opciones adicionales.
     * @param {number} [options.baseSpeed=20] - Velocidad base en milisegundos.
     * @param {HTMLAudioElement} [options.typeSound] - Sonido a reproducir en cada tecla.
     * @param {function} [options.callback] - Función a ejecutar al finalizar la animación.
     */
    constructor(text, element, options = {}) {
        this.text = text;
        this.element = element;
        this.callback = options.callback || null;
        this.baseSpeed = options.baseSpeed || 20;
        this.typeSound =
            options.typeSound ||
            (typeof typeSound !== 'undefined' ? typeSound : null); // Permite pasar un audio o usar uno global

        // Variables internas
        this.nodes = [];
        this.currentNodeIndex = 0;
    }

    /**
     * Inicializa el proceso: limpia el contenedor, reproduce el sonido inicial
     * y procesa las etiquetas personalizadas.
     */
    init() {
        // Limpia el contenido del elemento
        this.element.innerHTML = "";

        // Reinicia y reproduce el sonido de tipeo si está definido
        if (this.typeSound) {
            this.typeSound.currentTime = 0;
            this.typeSound.play();
        }

        // Procesa las etiquetas personalizadas
        const processedText = TagProcessor.process(this.text);
        const tempDiv = document.createElement('div');
        tempDiv.innerHTML = processedText;
        this.nodes = Array.from(tempDiv.childNodes);
        this.currentNodeIndex = 0;
    }

    /**
     * Inicia el efecto "máquina de escribir".
     */
    start() {
        this.init();
        this.type();
    }

    /**
     * Procesa el siguiente nodo (ya sea texto o un elemento) y lo escribe en el elemento.
     */
    type() {
        if (this.currentNodeIndex < this.nodes.length) {
            const node = this.nodes[this.currentNodeIndex];
            const speedModifierClasses = ["slow"];
            let speed = this.baseSpeed;
            let specialSpeed = null;


            if (node.classList && node.classList.contains("instant")) {
                specialSpeed = 0;
            }
            else if (node.classList && speedModifierClasses.some(cls => node.classList.contains(cls))) {
                specialSpeed = node.dataset.speed || 100;
            }


            if (node.nodeType === Node.TEXT_NODE || (node.classList && speedModifierClasses.some(cls => node.classList.contains(cls)))) {
                const textContent = node.textContent;
                let charIndex = 0;

                const typeChar = () => {
                    if (charIndex < textContent.length) {
                        // Agrega el siguiente carácter al elemento destino
                        this.element.appendChild(document.createTextNode(textContent.charAt(charIndex)));
                        const char = textContent.charAt(charIndex);

                        // Reproduce el sonido de tipeo, si está definido
                        if (this.typeSound) this.typeSound.play();

                        // Ajusta la velocidad en función del carácter
                        if ('.!?'.includes(char)) {
                            speed = 300;
                            if (this.typeSound) this.typeSound.pause();
                        } else if (',;'.includes(char)) {
                            speed = 150;
                            if (this.typeSound) this.typeSound.pause();
                        } else if (char === ':') {
                            speed = 200;
                            if (this.typeSound) this.typeSound.pause();
                        } else {
                            speed = this.baseSpeed;
                        }
                        // Si el nodo tiene la clase "slow", usamos la velocidad lenta
                        if (node.classList && speedModifierClasses.some(cls => node.classList.contains(cls))) {
                            speed = specialSpeed;
                        }
                        charIndex++;

                        // Asegura que se mantenga el scroll al final
                        this.element.scrollTop = this.element.scrollHeight;
                        document.documentElement.scrollTop = document.documentElement.scrollHeight;

                        setTimeout(typeChar, speed);
                    } else {
                        // Terminado el nodo actual, pasa al siguiente
                        this.currentNodeIndex++;
                        setTimeout(() => this.type(), speed);
                    }
                };
                typeChar();
            } else {
                // Si es un elemento HTML (por ejemplo, <span class="shake"> o <span class="glitch">)
                this.element.appendChild(node);
                // Procesa efectos adicionales (por ejemplo, shake, glitch, fade)
                EffectProcessor.process(this.element);
                this.currentNodeIndex++;
                setTimeout(() => this.type(), this.baseSpeed);
            }
        } else {
            // Finalizó el tipeo: detiene el sonido y ejecuta el callback, si existe.
            if (this.typeSound) {
                this.typeSound.pause();
                this.typeSound.currentTime = 0;
            }
            if (this.callback) {
                this.callback();
            }
        }
    }
}




/* =========================================
   CLASE BookEffects
   Maneja la aplicación y remoción de efectos visuales (por ejemplo, latido) sobre el elemento "libro".
========================================== */
class BookEffects {
    static applyHeartbeatEffect(book, heartbeatSound) {
        book.classList.remove('heartbeat-effect');
        void book.offsetWidth; // Forza el reflow
        book.classList.add('heartbeat-effect');
        heartbeatSound.currentTime = 0;
        heartbeatSound.play();
    }

    static removeHeartbeatEffect(book, heartbeatSound) {
        book.classList.remove('heartbeat-effect'); // Quita la animación
        heartbeatSound.pause(); // Pausa el sonido
        heartbeatSound.currentTime = 0; // Reinicia el audio
    }
}


/* =========================================
   CLASE SaveManager
   Encapsula la lógica de guardar y cargar el progreso en localStorage.
========================================== */
class SaveManager {
    static save(state) {
        localStorage.setItem('storyState', JSON.stringify(state));
        alert('Progress saved!');
    }
    static load() {
        const savedState = localStorage.getItem('storyState');
        return savedState ? JSON.parse(savedState) : null;
    }
    static clear() {
        localStorage.removeItem('storyState');
    }

}

/* =========================================
   CLASE StoryEngine
   Es el núcleo del motor narrativo. Se encarga de:
   - Mantener el estado de la historia (nodo actual, anterior, elección realizada)
   - Mostrar la página actual y la anterior (procesando texto, opciones y efectos)
   - Gestionar la navegación entre nodos
   - Integrar la funcionalidad de guardado/carga
========================================== */
class StoryEngine {
    /**
 * @param {Object} [options] - Referencias al libro.
 * @param {HTMLDivElement} [options.previousTextDiv] - Referencia a la carilla izquierda.
 * @param {HTMLDivElement} [options.previousChoicesDiv] - Referencia opciones anteriores.
 * @param {HTMLDivElement} [options.currentTextDiv] - Referencia a la carilla derecha.
 * @param {HTMLDivElement} [options.currentChoicesDiv] - Referencia opciones actuales.
 * @param {HTMLInputElement} [options.restartBtn] - Referencia boton de reinicio.
 * @param {HTMLInputElement} [options.bookmarkBtn] - Referencia boton de guardado.
 * @param {HTMLDivElement} [options.book] - Referencia al libro.
 * @param {HTMLAudioElement} [options.heartbeatSound] - Sonido de latido.
 * @param {HTMLAudioElement} [options.typeSound] - Sonido de tipeo.
 */
    constructor(options) {
        // Estado inicial
        this.currentNode = 'portada';
        this.previousNode = null;
        this.previousChoiceIndex = null; // Para saber qué opción se eligió
        this.storyNodes = {};

        // Referencias del DOM
        this.previousTextDiv = options.previousTextDiv;
        this.previousChoicesDiv = options.previousChoicesDiv;
        this.currentTextDiv = options.currentTextDiv;
        this.currentChoicesDiv = options.currentChoicesDiv;
        this.restartBtn = options.restartBtn;
        this.bookmarkBtn = options.bookmarkBtn;
        this.book = options.book;
        this.heartbeatSound = options.heartbeatSound;
        this.typeSound = options.typeSound;

        this.restartBtn.addEventListener('click', () => this.restartStory());
        this.bookmarkBtn.addEventListener('click', () => this.saveProgress());

    }
    start(url = "storyNodes.json") {
        this.loadProgress();
        this.loadStory(url);
    }
    loadStory(url) {
        fetch(url)
            .then(response => response.json())
            .then(data => {
                this.storyNodes = data;
                this.displayPreviousPage();
                this.displayCurrentPage(this.currentNode);
            })
            .catch(error => {
                console.error('Error al cargar el archivo JSON:', error)
                this.previousTextDiv.textContent = "Error al cargar la historia :(";
                this.previousChoicesDiv.innerHTML = "";
            });
    }
    saveProgress() {
        const state = {
            currentNode: this.currentNode,
            previousNode: this.previousNode,
            previousChoiceIndex: this.previousChoiceIndex
        };
        SaveManager.save(state);
    }
    loadProgress() {
        const state = SaveManager.load();
        if (state) {
            this.currentNode = state.currentNode;
            this.previousNode = state.previousNode;
            this.previousChoiceIndex = state.previousChoiceIndex;
            console.log('Progreso cargado:', state);
        } else {
            console.log('No hay progreso guardado.');
        }
    }
    restartStory() {
        SaveManager.clear();
        location.reload();
    }
    displayPreviousPage() {
        // Si no hay página anterior, limpiamos y salimos
        if (!this.previousNode) {
            this.previousTextDiv.textContent = "Rules:\nChoose between the two options and discover where your decisions lead you!\nTip: You can save your progress by clicking the bookmark icon!";
            this.previousChoicesDiv.innerHTML = "";
            return;
        }

        // Procesar etiquetas en el texto de la página anterior
        this.previousTextDiv.innerHTML = TagProcessor.process(this.storyNodes[this.previousNode].text);
        EffectProcessor.process(this.previousTextDiv);

        // Mostramos las opciones del nodo anterior
        this.previousChoicesDiv.innerHTML = "";
        this.storyNodes[this.previousNode].options.forEach((opt, idx) => {
            const choiceSpan = document.createElement('span');
            choiceSpan.innerHTML = TagProcessor.process(opt.text); // Por si quiero que el texto anterior tambien tenga efectos
            choiceSpan.classList.add('previous-choice');

            if (idx !== this.previousChoiceIndex) {
                // Opción NO elegida -> más transparente
                choiceSpan.style.opacity = "0.5";
            } else {
                // Opción elegida -> estilo normal o en negrita
                choiceSpan.style.fontWeight = "bold";
            }
            this.previousChoicesDiv.appendChild(choiceSpan);
            EffectProcessor.process(choiceSpan);
        });
    }
    generateOptionButtons() {
        let contador = 0;
        this.storyNodes[this.currentNode].options.forEach((option, idx) => {
            const btn = document.createElement('button');
            btn.innerHTML = TagProcessor.process(option.text);

            if (this.storyNodes[option.next] && this.storyNodes[option.next].isEnding) {
                BookEffects.applyHeartbeatEffect(this.book, this.heartbeatSound);
                contador += 1;
            }
            if (contador === 0) {
                BookEffects.removeHeartbeatEffect(this.book, this.heartbeatSound);
            }

            btn.addEventListener('click', () => {
                this.previousNode = this.currentNode;
                this.previousChoiceIndex = idx;
                this.currentNode = option.next;
                this.displayPreviousPage();
                this.displayCurrentPage(this.currentNode);
            });
            this.currentChoicesDiv.appendChild(btn);
            EffectProcessor.process(btn);
            this.currentTextDiv.scrollTop = this.currentTextDiv.scrollHeight;
            document.documentElement.scrollTop = document.documentElement.scrollHeight;
        });
    }
    displayCurrentPage(nodeId) {
        this.currentTextDiv.innerHTML = "";
        this.currentChoicesDiv.innerHTML = "";

        const writer = new TypeWriter(this.storyNodes[nodeId].text, this.currentTextDiv, {
            baseSpeed: 20,
            typeSound: this.typeSound,
            callback: this.generateOptionButtons.bind(this)
        });
        writer.start();
    }
}

/* =========================================
   INICIALIZAR LA AVENTURA
========================================= */

const engine = new StoryEngine({
    previousTextDiv: document.getElementById('previousText'),
    previousChoicesDiv: document.getElementById('previousChoices'),
    currentTextDiv: document.getElementById('currentText'),
    currentChoicesDiv: document.getElementById('currentChoices'),
    restartBtn: document.getElementById('restartBtn'),
    bookmarkBtn: document.getElementById('bookmarkBtn'),
    book: document.querySelector('.book'),
    typeSound: document.getElementById('typeSound'),
    heartbeatSound: document.getElementById('heartbeatSound')
});


engine.start("storyNodes.json");