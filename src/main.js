import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import * as THREE from 'three';
import 'bootstrap/dist/css/bootstrap.min.css';
 
import model_path from './assets/toys.glb'

const canvas = document.querySelector('#c');
const renderer = new THREE.WebGLRenderer({antialias: true, canvas}); // This calls what we pass requestAnimationFrame
const fov = 50;
const aspect = 2;  // the canvas default
const near = 0.01;
const far = 200;
const camera = new THREE.PerspectiveCamera(fov, aspect, near, far);
camera.position.z = 15;
camera.position.y = 15;
camera.rotation.x = Math.PI/-4;

const scene = new THREE.Scene();
scene.background = new THREE.Color('gray');
scene.updateMatrixWorld(true);
scene.add(camera);

const color = 0xFFFFFF;
const intensity = 5;
const light = new THREE.DirectionalLight(color, intensity);
light.position.set(-1, 2, 4);
scene.add(light);


/////////////////////
//   UI vars      //
///////////////////
let choice = "";
let hovered = "";

/////////////////////
// Mechanics vars //
///////////////////
let model = null;
let rotate_active = true;

/////////////////////
// Load model     //
///////////////////
const loader = new GLTFLoader();
loader.load(
    model_path,
    (gltf) => {
        scene.add( gltf.scene );
        model = gltf.scene
    },
    undefined,
    (error) => {console.error( error );}
);

class PickHelper {
    constructor() {
        this.raycaster = new THREE.Raycaster();
        this.pickedObject = null;
    }
// -------mousemove   
    pick(normalizedPosition, scene, camera) {
        if (this.pickedObject) {
          this.pickedObject = undefined;
        }
        // cast a ray through the frustum
        this.raycaster.setFromCamera(normalizedPosition, camera);
        // get the list of objects the ray intersected
        const intersectedObjects = this.raycaster.intersectObjects(scene.children);
        if (intersectedObjects.length) {
          // pick the first object. It's the closest one
          this.pickedObject = intersectedObjects[0].object;
          return this.pickedObject;
        }
    }
}


function inspect() {
    if (choice) {
        const choiceObject = choice;
        const worldPos = new THREE.Vector3();
        choiceObject.getWorldPosition(worldPos);
        const canvas = renderer.domElement;
        const { x, y } = worldToCanvasPos(worldPos, camera, canvas);

        const tag = document.getElementById('inspector');
        tag.style.visibility="visible";

        tag.style.left = `${x}px`;
        tag.style.top  = `${y - 30}px`;
        
        tag.children[0].innerText = choiceObject.name;
        
        const count = document.getElementById('count');
        let num = 2;
        count.innerText = num.toString();
    } else {
        const tag = document.getElementById('inspector');
        tag.style.visibility="hidden";
    }     
}

/////////////////////
// Initializing   //
///////////////////

const pickHelper = new PickHelper();

const pickPosition = {x: 0, y: 0};
clearPickPosition();

requestAnimationFrame(render); // Point WebGL to render() below

//////////////////////
// Render function //
////////////////////

function render(time) {
    time *= 0.001;  // convert time to seconds
    
    if (resizeRendererToDisplaySize(renderer)) {
        const canvas = renderer.domElement;
        camera.aspect = canvas.clientWidth / canvas.clientHeight;
        camera.updateProjectionMatrix();
    }    
    
    if (model && rotate_active) {
        model.rotation.y = time * 0.1;
    }
    
    hovered = pickHelper.pick(pickPosition, scene, camera);
    inspect();
    if (choice) {
        document.getElementById("chosen-part").innerText = choice.name;
    }
    if (hovered) {
        document.getElementById("hover-part").innerText = hovered.name;
    }
    renderer.render(scene, camera);
    requestAnimationFrame(render);
}

///////////////////////
// Helper functions //
/////////////////////

// -------click
function choose(event) {
    choice = pickHelper.pick(pickPosition, scene, camera);
}

function worldToCanvasPos(worldPos, camera, canvas) {
  // Clone so we don't overwrite the original
  const pos = worldPos.clone();

  // 1) Project into NDC space (x,y ∈ [-1,1])
  pos.project(camera);
   
  // 2) Convert to pixels
  const halfW = canvas.clientWidth  / 2;
  const halfH = canvas.clientHeight / 2;

  return {
    x: ( pos.x * halfW ) + halfW,
    y: ( -pos.y * halfH ) + halfH,
  };
}

function getCanvasRelativePosition(event) {
  const rect = canvas.getBoundingClientRect();
  return {
    x: (event.clientX - rect.left) * canvas.width  / rect.width,
    y: (event.clientY - rect.top ) * canvas.height / rect.height,
  };
}
 
function setPickPosition(event) {
  const pos = getCanvasRelativePosition(event);
  pickPosition.x = (pos.x / canvas.width ) *  2 - 1;
  pickPosition.y = (pos.y / canvas.height) * -2 + 1;  // note we flip Y
}

function clearPickPosition() {
  pickPosition.x = -100000;
  pickPosition.y = -100000;
}

function resizeRendererToDisplaySize(renderer) {
    const canvas = renderer.domElement;
    const width = canvas.clientWidth;
    const height = canvas.clientHeight;
    const needResize = canvas.width !== width || canvas.height !== height;
    if (needResize) {
    renderer.setSize(width, height, false);
    }
    return needResize;
}

/////////////////////
//Event Listeners //
///////////////////

window.addEventListener('click', choose);
window.addEventListener('mousemove', setPickPosition);
window.addEventListener('mouseout', clearPickPosition);
window.addEventListener('mouseleave', clearPickPosition);

//mobile
window.addEventListener('touchstart', (event) => {
  // prevent the window from scrolling
  event.preventDefault();
  setPickPosition(event.touches[0]);
}, {passive: false});
 
window.addEventListener('touchmove', (event) => {
  setPickPosition(event.touches[0]);
  choose(event)
});
 
window.addEventListener('touchend', clearPickPosition);

////////////////////////
//Specific Listeners //
//////////////////////

const blButton = document.getElementById('bl-button');

function handleBottomLeftClick(event) {
  console.log('Bottom-left button clicked!', event);
    rotate_active = !rotate_active;
}

blButton.addEventListener('click', handleBottomLeftClick);


