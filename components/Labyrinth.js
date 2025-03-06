import React, { useState, useEffect, useRef } from 'react';
import * as THREE from 'three';
import { PointerLockControls } from 'three/addons/controls/PointerLockControls.js';
import MobileControls from './MobileControls.js';

const Labyrinth = ({ labyrinth, onExit }) => {
  const containerRef = useRef(null);
  const cameraRef = useRef(null);
  const sceneRef = useRef(null);
  const rendererRef = useRef(null);
  const controlsRef = useRef(null);
  const raycasterRef = useRef(null);
  const wallsRef = useRef([]);
  const moveStateRef = useRef({
    forward: false,
    backward: false,
    left: false,
    right: false
  });
  const audioRef = useRef(null);
  
  const [showInstructions, setShowInstructions] = useState(true);
  const [isMobile, setIsMobile] = useState(false);
  
  // Size and position constants
  const WALL_HEIGHT = 5;
  const WALL_SIZE = 10;
  const PLAYER_HEIGHT = 2;
  const MOVEMENT_SPEED = 12;
  
  useEffect(() => {
    // Check if device is mobile
    const checkMobile = () => {
      setIsMobile(window.innerWidth <= 768);
    };
    
    checkMobile();
    window.addEventListener('resize', checkMobile);
    
    // Initialize the 3D scene
    initScene();
    
    // Setup audio if available
    if (labyrinth.audioUrl) {
      setupAudio();
    }
    
    // Start animation loop
    let animationId;
    const animate = () => {
      animationId = requestAnimationFrame(animate);
      updateMovement();
      rendererRef.current.render(sceneRef.current, cameraRef.current);
    };
    
    animate();
    
    // Cleanup
    return () => {
      window.removeEventListener('resize', checkMobile);
      cancelAnimationFrame(animationId);
      if (rendererRef.current) {
        rendererRef.current.dispose();
      }
      if (audioRef.current) {
        audioRef.current.pause();
      }
      document.removeEventListener('keydown', handleKeyDown);
      document.removeEventListener('keyup', handleKeyUp);
      window.removeEventListener('resize', handleResize);
    };
  }, []);
  
  const initScene = () => {
    // Create scene
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x000000);
    sceneRef.current = scene;
    
    // Add fog for atmosphere
    scene.fog = new THREE.FogExp2(0x000000, 0.02);
    
    // Create camera
    const camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.y = PLAYER_HEIGHT;
    cameraRef.current = camera;
    
    // Create renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    containerRef.current.appendChild(renderer.domElement);
    rendererRef.current = renderer;
    
    // Handle window resize
    const handleResize = () => {
      camera.aspect = window.innerWidth / window.innerHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(window.innerWidth, window.innerHeight);
    };
    
    window.addEventListener('resize', handleResize);
    
    // Setup controls
    setupControls();
    
    // Add lighting
    addLighting();
    
    // Build the maze
    buildMaze();
    
    // Setup movement controls
    setupMovementControls();
    
    // Setup collision detection
    raycasterRef.current = new THREE.Raycaster(new THREE.Vector3(), new THREE.Vector3(), 0, 2);
  };
  
  const setupControls = () => {
    // Create pointer lock controls
    const controls = new PointerLockControls(cameraRef.current, document.body);
    controlsRef.current = controls;
    
    // Add event listener for when instructions are clicked
    const startGame = () => {
      controls.lock();
      setShowInstructions(false);
    };
    
    // Add event listeners for control lock state
    controls.addEventListener('lock', () => {
      setShowInstructions(false);
    });
    
    controls.addEventListener('unlock', () => {
      setShowInstructions(true);
    });
    
    // Method for mobile play button
    window.startGame = startGame;
  };
  
  const addLighting = () => {
    // Add ambient light
    const ambientLight = new THREE.AmbientLight(0x404040, 1);
    sceneRef.current.add(ambientLight);
    
    // Add directional light
    const directionalLight = new THREE.DirectionalLight(0xffffff, 0.5);
    directionalLight.position.set(1, 1, 1);
    sceneRef.current.add(directionalLight);
    
    // Add point lights for atmosphere
    const colors = [0xe1a1ff, 0x8c61ff, 0x2bd1fc, 0xff61ab];
    
    for (let i = 0; i < 10; i++) {
      const light = new THREE.PointLight(
        colors[Math.floor(Math.random() * colors.length)],
        0.8,
        20
      );
      
      // Random position within the maze
      const mazeSize = Math.max(labyrinth.mazeStructure.width, labyrinth.mazeStructure.height) * WALL_SIZE;
      light.position.set(
        (Math.random() - 0.5) * mazeSize,
        WALL_HEIGHT / 2,
        (Math.random() - 0.5) * mazeSize
      );
      
      sceneRef.current.add(light);
    }
  };
  
  const buildMaze = () => {
    const { grid, width, height, start } = labyrinth.mazeStructure;
    
    // Create floor
    const floorSize = Math.max(width, height) * WALL_SIZE * 1.5;
    const floorGeometry = new THREE.PlaneGeometry(floorSize, floorSize);
    const floorMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x333333,
      roughness: 0.8,
      metalness: 0.2
    });
    const floor = new THREE.Mesh(floorGeometry, floorMaterial);
    floor.rotation.x = -Math.PI / 2;
    floor.position.y = -0.1;
    sceneRef.current.add(floor);
    
    // Create ceiling
    const ceilingMaterial = new THREE.MeshStandardMaterial({ 
      color: 0x222222,
      roughness: 0.9,
      metalness: 0.1
    });
    const ceiling = new THREE.Mesh(floorGeometry, ceilingMaterial);
    ceiling.rotation.x = Math.PI / 2;
    ceiling.position.y = WALL_HEIGHT + 0.1;
    sceneRef.current.add(ceiling);
    
    // Create wall prototype
    const wallGeometry = new THREE.BoxGeometry(WALL_SIZE, WALL_HEIGHT, WALL_SIZE);
    
    // Generate textures for biomes
    const biomesCount = labyrinth.biomes?.length || 0;
    const wallMaterials = [];
    
    if (biomesCount > 0) {
      for (let i = 0; i < biomesCount; i++) {
        wallMaterials.push(new THREE.MeshStandardMaterial({
          color: getRandomColorForBiome(i),
          roughness: 0.7,
          metalness: 0.3
        }));
      }
    } else {
      // Default wall material if no biomes
      wallMaterials.push(new THREE.MeshStandardMaterial({
        color: 0x8844aa,
        roughness: 0.7,
        metalness: 0.3
      }));
    }
    
    // Build walls from grid
    wallsRef.current = [];
    
    for (let y = 0; y < height; y++) {
      for (let x = 0; x < width; x++) {
        if (grid[y][x] === 1) { // Wall
          // Determine which biome this wall belongs to
          const distanceFromStart = Math.sqrt(
            Math.pow(x - start.x, 2) + Math.pow(y - start.y, 2)
          );
          
          let biomeIndex = 0;
          if (biomesCount > 0) {
            // Distribute biomes based on distance from start
            biomeIndex = Math.min(
              Math.floor(distanceFromStart / (Math.max(width, height) / biomesCount)),
              biomesCount - 1
            );
          }
          
          const wallMaterial = wallMaterials[biomeIndex];
          const wall = new THREE.Mesh(wallGeometry, wallMaterial);
          
          // Position wall
          wall.position.x = (x - width / 2) * WALL_SIZE;
          wall.position.z = (y - height / 2) * WALL_SIZE;
          wall.position.y = WALL_HEIGHT / 2;
          
          // Add to scene and track for collision detection
          sceneRef.current.add(wall);
          wallsRef.current.push(wall);
        }
      }
    }
    
    // Set initial player position at start
    cameraRef.current.position.x = (start.x - width / 2) * WALL_SIZE;
    cameraRef.current.position.z = (start.y - height / 2) * WALL_SIZE;
  };
  
  const getRandomColorForBiome = (biomeIndex) => {
    // Generate distinct colors for different biomes
    const biomeColors = [
      0x8844aa, // Purple
      0x44aa88, // Teal
      0xaa8844, // Bronze
      0x4488aa, // Blue
      0xaa4488  // Pink
    ];
    
    return biomeColors[biomeIndex % biomeColors.length];
  };
  
  const setupAudio = () => {
    const audio = new Audio(labyrinth.audioUrl);
    audio.loop = true;
    audio.volume = 0.5;
    audioRef.current = audio;
    
    // Play audio when exploration starts
    const startAudio = () => {
      audioRef.current.play().catch(err => console.error('Audio playback error:', err));
    };
    
    // Method for instructions overlay play button to access
    window.startAudio = startAudio;
  };
  
  const setupMovementControls = () => {
    // Keyboard controls for desktop
    const handleKeyDown = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveStateRef.current.forward = true;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveStateRef.current.backward = true;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          moveStateRef.current.left = true;
          break;
        case 'KeyD':
        case 'ArrowRight':
          moveStateRef.current.right = true;
          break;
        case 'Escape':
          onExit();
          break;
        default:
          break;
      }
    };
    
    const handleKeyUp = (e) => {
      switch (e.code) {
        case 'KeyW':
        case 'ArrowUp':
          moveStateRef.current.forward = false;
          break;
        case 'KeyS':
        case 'ArrowDown':
          moveStateRef.current.backward = false;
          break;
        case 'KeyA':
        case 'ArrowLeft':
          moveStateRef.current.left = false;
          break;
        case 'KeyD':
        case 'ArrowRight':
          moveStateRef.current.right = false;
          break;
        default:
          break;
      }
    };
    
    document.addEventListener('keydown', handleKeyDown);
    document.addEventListener('keyup', handleKeyUp);
    
    // Method for mobile controls to access
    window.setMovement = (direction, active) => {
      moveStateRef.current[direction] = active;
    };
  };
  
  const updateMovement = () => {
    if (!controlsRef.current.isLocked) return;
    
    // Calculate delta time for smooth movement
    const speed = MOVEMENT_SPEED * (1 / 60); // Normalized for 60fps
    
    // Get current camera direction
    const direction = new THREE.Vector3();
    cameraRef.current.getWorldDirection(direction);
    direction.y = 0; // Keep movement on the xz plane
    direction.normalize();
    
    // Sideways direction (perpendicular to forward)
    const sideways = new THREE.Vector3(-direction.z, 0, direction.x);
    
    // Calculate intended movement
    const moveDir = new THREE.Vector3(0, 0, 0);
    
    if (moveStateRef.current.forward) moveDir.add(direction);
    if (moveStateRef.current.backward) moveDir.sub(direction);
    if (moveStateRef.current.left) moveDir.add(sideways);
    if (moveStateRef.current.right) moveDir.sub(sideways);
    
    if (moveDir.length() > 0) {
      moveDir.normalize();
      moveDir.multiplyScalar(speed);
      
      // Perform collision detection before moving
      if (!checkCollision(moveDir)) {
        controlsRef.current.getObject().position.add(moveDir);
      }
    }
  };
  
  const checkCollision = (moveDir) => {
    // Create rays for collision detection in multiple directions
    const rays = [
      new THREE.Vector3(moveDir.x, 0, moveDir.z), // Forward
      new THREE.Vector3(moveDir.x + 0.5, 0, moveDir.z), // Forward-right
      new THREE.Vector3(moveDir.x - 0.5, 0, moveDir.z), // Forward-left
      new THREE.Vector3(moveDir.x, 0, moveDir.z + 0.5), // Forward-up
      new THREE.Vector3(moveDir.x, 0, moveDir.z - 0.5), // Forward-down
    ];
    
    // Check collisions with each ray
    const position = controlsRef.current.getObject().position;
    
    for (const rayDir of rays) {
      raycasterRef.current.set(position, rayDir.normalize());
      const intersections = raycasterRef.current.intersectObjects(wallsRef.current);
      
      if (intersections.length > 0 && intersections[0].distance < 1) {
        return true; // Collision detected
      }
    }
    
    return false; // No collision
  };
  
  const handleStartGame = () => {
    setShowInstructions(false);
    controlsRef.current.lock();
    
    // Play audio if available
    if (audioRef.current) {
      audioRef.current.play().catch(err => {
        console.error('Audio playback error:', err);
      });
    }
  };

  return (
    <div className="maze-container" ref={containerRef}>
      {/* Exit button */}
      <button className="exit-btn" onClick={onExit}>
        Exit Labyrinth
      </button>
      
      {/* Mobile controls (only shown on mobile) */}
      {isMobile && !showInstructions && (
        <MobileControls />
      )}
      
      {/* Instructions overlay */}
      {showInstructions && (
        <div className="instructions-overlay">
          <div className="instructions-panel">
            <h2 className="instructions-title">{labyrinth.theme}</h2>
            <p>Prepare to enter this mysterious labyrinth</p>
            
            <h3>Controls:</h3>
            {isMobile ? (
              <ul className="controls-list">
                <li>Use the on-screen buttons to move</li>
                <li>Drag your finger on the screen to look around</li>
                <li>Press the Exit button to return to the gallery</li>
              </ul>
            ) : (
              <ul className="controls-list">
                <li>WASD or Arrow Keys to move</li>
                <li>Mouse to look around</li>
                <li>ESC to exit the labyrinth</li>
              </ul>
            )}
            
            <p>The goal is to explore and find your way through the labyrinth.</p>
            
            <button className="start-button" onClick={handleStartGame}>
              Enter the Labyrinth
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default Labyrinth;

