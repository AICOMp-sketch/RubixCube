
        // ==================== RUBIK'S CUBE GAME ====================

        // Scene Setup
        const scene = new THREE.Scene();
        const camera = new THREE.PerspectiveCamera(50, window.innerWidth / window.innerHeight, 0.1, 1000);
        camera.position.set(6, 5, 8);
        camera.lookAt(0, 0, 0);

        const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
        renderer.setSize(window.innerWidth, window.innerHeight);
        renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
        renderer.shadowMap.enabled = true;
        renderer.shadowMap.type = THREE.PCFSoftShadowMap;
        document.getElementById('canvas-container').appendChild(renderer.domElement);

        // Lighting
        const ambientLight = new THREE.AmbientLight(0xffffff, 0.6);
        scene.add(ambientLight);

        const directionalLight = new THREE.DirectionalLight(0xffffff, 0.8);
        directionalLight.position.set(10, 20, 10);
        directionalLight.castShadow = true;
        scene.add(directionalLight);

        const pointLight1 = new THREE.PointLight(0x4ecdc4, 0.5, 50);
        pointLight1.position.set(-10, 10, 10);
        scene.add(pointLight1);

        const pointLight2 = new THREE.PointLight(0xff6b6b, 0.5, 50);
        pointLight2.position.set(10, 10, -10);
        scene.add(pointLight2);

        // Colors
        const COLORS = {
            white: 0xffffff,
            yellow: 0xffd93d,
            green: 0x4ecdc4,
            blue: 0x45b7d1,
            red: 0xff6b6b,
            orange: 0xffa500,
            black: 0x1a1a2e
        };

        // Cube State
        let cubes = [];
        let cubeGroup = new THREE.Group();
        scene.add(cubeGroup);

        const cubeSize = 1;
        const gap = 0.08;
        const totalSize = cubeSize + gap;

        // Game State
        let moveCount = 0;
        let timerInterval = null;
        let startTime = null;
        let isAnimating = false;
        let isSolved = true;
        let autoRotate = false;

        // Create a single cubie
        function createCubie(x, y, z) {
            const geometry = new THREE.BoxGeometry(cubeSize * 0.95, cubeSize * 0.95, cubeSize * 0.95);
            
            // Determine face colors based on position
            const materials = [];
            
            // Right (+X)
            materials.push(new THREE.MeshStandardMaterial({ 
                color: x === 1 ? COLORS.red : COLORS.black,
                metalness: 0.1,
                roughness: 0.3
            }));
            
            // Left (-X)
            materials.push(new THREE.MeshStandardMaterial({ 
                color: x === -1 ? COLORS.orange : COLORS.black,
                metalness: 0.1,
                roughness: 0.3
            }));
            
            // Top (+Y)
            materials.push(new THREE.MeshStandardMaterial({ 
                color: y === 1 ? COLORS.white : COLORS.black,
                metalness: 0.1,
                roughness: 0.3
            }));
            
            // Bottom (-Y)
            materials.push(new THREE.MeshStandardMaterial({ 
                color: y === -1 ? COLORS.yellow : COLORS.black,
                metalness: 0.1,
                roughness: 0.3
            }));
            
            // Front (+Z)
            materials.push(new THREE.MeshStandardMaterial({ 
                color: z === 1 ? COLORS.green : COLORS.black,
                metalness: 0.1,
                roughness: 0.3
            }));
            
            // Back (-Z)
            materials.push(new THREE.MeshStandardMaterial({ 
                color: z === -1 ? COLORS.blue : COLORS.black,
                metalness: 0.1,
                roughness: 0.3
            }));

            const cubie = new THREE.Mesh(geometry, materials);
            cubie.position.set(x * totalSize, y * totalSize, z * totalSize);
            cubie.castShadow = true;
            cubie.receiveShadow = true;
            
            // Store original position for reference
            cubie.userData = { x, y, z };
            
            // Add rounded edges effect
            const edges = new THREE.EdgesGeometry(geometry);
            const edgeMaterial = new THREE.LineBasicMaterial({ 
                color: 0x000000, 
                linewidth: 2,
                transparent: true,
                opacity: 0.3
            });
            const edgeLines = new THREE.LineSegments(edges, edgeMaterial);
            cubie.add(edgeLines);

            return cubie;
        }

        // Initialize the cube
        function initCube() {
            // Clear existing cubes
            cubes.forEach(cube => cubeGroup.remove(cube));
            cubes = [];

            // Create 27 cubies (3x3x3)
            for (let x = -1; x <= 1; x++) {
                for (let y = -1; y <= 1; y++) {
                    for (let z = -1; z <= 1; z++) {
                        const cubie = createCubie(x, y, z);
                        cubes.push(cubie);
                        cubeGroup.add(cubie);
                    }
                }
            }
        }

        // Get cubies for a specific face
        function getFaceCubies(face) {
            const cubies = [];
            
            cubes.forEach(cubie => {
                const pos = cubie.position.clone();
                const threshold = totalSize * 0.5;
                
                switch(face) {
                    case 'U': if (pos.y > threshold) cubies.push(cubie); break;
                    case 'D': if (pos.y < -threshold) cubies.push(cubie); break;
                    case 'R': if (pos.x > threshold) cubies.push(cubie); break;
                    case 'L': if (pos.x < -threshold) cubies.push(cubie); break;
                    case 'F': if (pos.z > threshold) cubies.push(cubie); break;
                    case 'B': if (pos.z < -threshold) cubies.push(cubie); break;
                    case 'M': if (Math.abs(pos.x) < threshold) cubies.push(cubie); break;
                    case 'E': if (Math.abs(pos.y) < threshold) cubies.push(cubie); break;
                    case 'S': if (Math.abs(pos.z) < threshold) cubies.push(cubie); break;
                }
            });
            
            return cubies;
        }

        // Rotate a face
        function rotateFace(face, clockwise = true, duration = 300) {
            if (isAnimating) return Promise.resolve();
            
            isAnimating = true;
            
            const cubies = getFaceCubies(face);
            if (cubies.length === 0) {
                isAnimating = false;
                return Promise.resolve();
            }
            
            // Create temporary group for rotation
            const rotationGroup = new THREE.Group();
            scene.add(rotationGroup);
            
            // Move cubies to rotation group
            cubies.forEach(cubie => {
                cubeGroup.remove(cubie);
                rotationGroup.add(cubie);
            });
            
            // Determine rotation axis and angle
            let axis;
            let angle = clockwise ? -Math.PI / 2 : Math.PI / 2;
            
            switch(face) {
                case 'U': axis = new THREE.Vector3(0, 1, 0); break;
                case 'D': axis = new THREE.Vector3(0, 1, 0); angle *= -1; break;
                case 'R': axis = new THREE.Vector3(1, 0, 0); break;
                case 'L': axis = new THREE.Vector3(1, 0, 0); angle *= -1; break;
                case 'F': axis = new THREE.Vector3(0, 0, 1); break;
                case 'B': axis = new THREE.Vector3(0, 0, 1); angle *= -1; break;
                case 'M': axis = new THREE.Vector3(1, 0, 0); angle *= -1; break;
                case 'E': axis = new THREE.Vector3(0, 1, 0); angle *= -1; break;
                case 'S': axis = new THREE.Vector3(0, 0, 1); break;
            }
            
            return new Promise(resolve => {
                const startRotation = rotationGroup.rotation.clone();
                const startTime = performance.now();
                
                function animateRotation(currentTime) {
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    
                    // Easing function
                    const eased = 1 - Math.pow(1 - progress, 3);
                    
                    // Apply rotation
                    rotationGroup.rotation.set(
                        startRotation.x + axis.x * angle * eased,
                        startRotation.y + axis.y * angle * eased,
                        startRotation.z + axis.z * angle * eased
                    );
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateRotation);
                    } else {
                        // Move cubies back to main group
                        cubies.forEach(cubie => {
                            // Update world position/rotation
                            cubie.position.applyMatrix4(rotationGroup.matrixWorld);
                            cubie.position.sub(cubeGroup.position);
                            
                            // Apply rotation to cubie
                            const quaternion = new THREE.Quaternion();
                            rotationGroup.getWorldQuaternion(quaternion);
                            cubie.quaternion.premultiply(quaternion);
                            
                            // Round position to avoid floating point errors
                            cubie.position.x = Math.round(cubie.position.x / totalSize) * totalSize;
                            cubie.position.y = Math.round(cubie.position.y / totalSize) * totalSize;
                            cubie.position.z = Math.round(cubie.position.z / totalSize) * totalSize;
                            
                            rotationGroup.remove(cubie);
                            cubeGroup.add(cubie);
                        });
                        
                        scene.remove(rotationGroup);
                        isAnimating = false;
                        
                        // Check if solved
                        checkSolved();
                        
                        resolve();
                    }
                }
                
                requestAnimationFrame(animateRotation);
            });
        }

        // Execute a move
        async function executeMove(move) {
            if (isAnimating) return;
            
            // Start timer on first move
            if (!timerInterval && !isSolved) {
                startTimer();
            }
            
            const face = move.charAt(0);
            const clockwise = !move.includes("'");
            
            await rotateFace(face, clockwise);
            
            moveCount++;
            updateMoveCount();
        }

        // Check if cube is solved
        function checkSolved() {
            const faceColors = {
                '+x': [], '-x': [],
                '+y': [], '-y': [],
                '+z': [], '-z': []
            };
            
            cubes.forEach(cubie => {
                const pos = cubie.position;
                const materials = cubie.material;
                
                if (pos.x > totalSize * 0.5) {
                    faceColors['+x'].push(materials[0].color.getHex());
                }
                if (pos.x < -totalSize * 0.5) {
                    faceColors['-x'].push(materials[1].color.getHex());
                }
                if (pos.y > totalSize * 0.5) {
                    faceColors['+y'].push(materials[2].color.getHex());
                }
                if (pos.y < -totalSize * 0.5) {
                    faceColors['-y'].push(materials[3].color.getHex());
                }
                if (pos.z > totalSize * 0.5) {
                    faceColors['+z'].push(materials[4].color.getHex());
                }
                if (pos.z < -totalSize * 0.5) {
                    faceColors['-z'].push(materials[5].color.getHex());
                }
            });
            
            // Check if each face has the same color
            let solved = true;
            Object.values(faceColors).forEach(colors => {
                if (colors.length > 0 && !colors.every(c => c === colors[0])) {
                    solved = false;
                }
            });
            
            if (solved && !isSolved && moveCount > 0) {
                isSolved = true;
                showVictory();
            }
        }

        // Scramble the cube
        async function scramble() {
            if (isAnimating) return;
            
            const moves = ['U', "U'", 'D', "D'", 'R', "R'", 'L', "L'", 'F', "F'", 'B', "B'"];
            const scrambleLength = 20;
            
            isSolved = false;
            resetTimer();
            moveCount = 0;
            updateMoveCount();
            
            for (let i = 0; i < scrambleLength; i++) {
                const randomMove = moves[Math.floor(Math.random() * moves.length)];
                const face = randomMove.charAt(0);
                const clockwise = !randomMove.includes("'");
                await rotateFace(face, clockwise, 100);
            }
            
            moveCount = 0;
            updateMoveCount();
        }

        // Reset the cube
        function resetCube() {
            if (isAnimating) return;
            
            initCube();
            resetTimer();
            moveCount = 0;
            updateMoveCount();
            isSolved = true;
        }

        // Solve animation (just reset for now)
        async function solveCube() {
            if (isAnimating) return;
            
            // Simple "solve" - just reset with animation
            const cubies = [...cubes];
            
            // Animate each cubie back to position
            cubies.forEach((cubie, index) => {
                const targetPos = new THREE.Vector3(
                    cubie.userData.x * totalSize,
                    cubie.userData.y * totalSize,
                    cubie.userData.z * totalSize
                );
                
                const startPos = cubie.position.clone();
                const startQuat = cubie.quaternion.clone();
                const targetQuat = new THREE.Quaternion();
                
                const duration = 1000;
                const delay = index * 30;
                const startTime = performance.now() + delay;
                
                function animateSolve(currentTime) {
                    if (currentTime < startTime) {
                        requestAnimationFrame(animateSolve);
                        return;
                    }
                    
                    const elapsed = currentTime - startTime;
                    const progress = Math.min(elapsed / duration, 1);
                    const eased = 1 - Math.pow(1 - progress, 4);
                    
                    cubie.position.lerpVectors(startPos, targetPos, eased);
                    cubie.quaternion.slerpQuaternions(startQuat, targetQuat, eased);
                    
                    if (progress < 1) {
                        requestAnimationFrame(animateSolve);
                    }
                }
                
                requestAnimationFrame(animateSolve);
            });
            
            setTimeout(() => {
                resetCube();
            }, 1500);
        }

        // Timer functions
        function startTimer() {
            startTime = Date.now();
            timerInterval = setInterval(updateTimer, 100);
        }

        function updateTimer() {
            const elapsed = Date.now() - startTime;
            const minutes = Math.floor(elapsed / 60000);
            const seconds = Math.floor((elapsed % 60000) / 1000);
            document.getElementById('timer').textContent = 
                `${minutes.toString().padStart(2, '0')}:${seconds.toString().padStart(2, '0')}`;
        }

        function resetTimer() {
            if (timerInterval) {
                clearInterval(timerInterval);
                timerInterval = null;
            }
            startTime = null;
            document.getElementById('timer').textContent = '00:00';
        }

        function updateMoveCount() {
            document.getElementById('moves').textContent = moveCount;
        }

        // Victory modal
        function showVictory() {
            if (timerInterval) {
                clearInterval(timerInterval);
            }
            
            document.getElementById('finalTime').textContent = document.getElementById('timer').textContent;
            document.getElementById('finalMoves').textContent = moveCount;
            document.getElementById('victoryModal').classList.add('show');
        }

        function hideVictory() {
            document.getElementById('victoryModal').classList.remove('show');
        }

        // Camera controls
        let isDragging = false;
        let previousMousePosition = { x: 0, y: 0 };
        let spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 12 };

        function updateCameraPosition() {
            camera.position.x = spherical.radius * Math.sin(spherical.phi) * Math.cos(spherical.theta);
            camera.position.y = spherical.radius * Math.cos(spherical.phi);
            camera.position.z = spherical.radius * Math.sin(spherical.phi) * Math.sin(spherical.theta);
            camera.lookAt(0, 0, 0);
        }

        renderer.domElement.addEventListener('mousedown', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        renderer.domElement.addEventListener('mousemove', (e) => {
            if (!isDragging) return;
            
            const deltaX = e.clientX - previousMousePosition.x;
            const deltaY = e.clientY - previousMousePosition.y;
            
            spherical.theta += deltaX * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.01));
            
            updateCameraPosition();
            
            previousMousePosition = { x: e.clientX, y: e.clientY };
        });

        renderer.domElement.addEventListener('mouseup', () => {
            isDragging = false;
        });

        renderer.domElement.addEventListener('mouseleave', () => {
            isDragging = false;
        });

        // Touch controls
        renderer.domElement.addEventListener('touchstart', (e) => {
            isDragging = true;
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        renderer.domElement.addEventListener('touchmove', (e) => {
            if (!isDragging) return;
            e.preventDefault();
            
            const deltaX = e.touches[0].clientX - previousMousePosition.x;
            const deltaY = e.touches[0].clientY - previousMousePosition.y;
            
            spherical.theta += deltaX * 0.01;
            spherical.phi = Math.max(0.1, Math.min(Math.PI - 0.1, spherical.phi + deltaY * 0.01));
            
            updateCameraPosition();
            
            previousMousePosition = { x: e.touches[0].clientX, y: e.touches[0].clientY };
        });

        renderer.domElement.addEventListener('touchend', () => {
            isDragging = false;
        });

        // Mouse wheel zoom
        renderer.domElement.addEventListener('wheel', (e) => {
            e.preventDefault();
            spherical.radius = Math.max(8, Math.min(20, spherical.radius + e.deltaY * 0.01));
            updateCameraPosition();
        });

        // Keyboard controls
        document.addEventListener('keydown', (e) => {
            if (isAnimating) return;
            
            const key = e.key.toUpperCase();
            const validMoves = ['U', 'D', 'R', 'L', 'F', 'B', 'M', 'E', 'S'];
            
            if (validMoves.includes(key)) {
                const move = e.shiftKey ? key + "'" : key;
                executeMove(move);
            }
        });

        // Button event listeners
        document.querySelectorAll('.move-btn').forEach(btn => {
            btn.addEventListener('click', () => {
                executeMove(btn.dataset.move);
            });
        });

        document.getElementById('scrambleBtn').addEventListener('click', scramble);
        document.getElementById('resetBtn').addEventListener('click', resetCube);
        document.getElementById('solveBtn').addEventListener('click', solveCube);
        document.getElementById('playAgainBtn').addEventListener('click', () => {
            hideVictory();
            resetCube();
        });

        document.getElementById('autoRotateBtn').addEventListener('click', function() {
            autoRotate = !autoRotate;
            this.classList.toggle('active', autoRotate);
        });

        document.getElementById('resetViewBtn').addEventListener('click', () => {
            spherical = { theta: Math.PI / 4, phi: Math.PI / 4, radius: 12 };
            updateCameraPosition();
        });

        // Window resize
        window.addEventListener('resize', () => {
            camera.aspect = window.innerWidth / window.innerHeight;
            camera.updateProjectionMatrix();
            renderer.setSize(window.innerWidth, window.innerHeight);
        });

        // Animation loop
        function animate() {
            requestAnimationFrame(animate);
            
            if (autoRotate && !isDragging && !isAnimating) {
                spherical.theta += 0.003;
                updateCameraPosition();
            }
            
            renderer.render(scene, camera);
        }

        // Initialize
        initCube();
        updateCameraPosition();
        animate();

        console.log('🎮 Rubik\'s Cube loaded! Use mouse to rotate view, buttons or keyboard to make moves.');